-- ============================================================================
-- COCCOLE FIT POS — RESTAURAR ACCESO A TABLAS OPERATIVAS POS (COMPATIBLE CON LOGIN POR PIN)
-- Fecha: 2026-11-21
-- Ejecutar en Supabase SQL Editor.
--
-- Mantiene public.profiles protegido (PINs y claves maestras en bcrypt vía RPC)
-- y restaura el acceso de lectura/escritura a las tablas operativas del POS
-- (sales, customers, gastos, gift_cards, daily_tasks, task_progress, time_entries)
-- para que los usuarios autenticados por PIN puedan ver y registrar información.
-- ============================================================================

-- 1. RPC segura para listar perfiles sin exponer pin, pin_hash ni clave_maestra
CREATE OR REPLACE FUNCTION public.list_staff_profiles_safe()
RETURNS TABLE (
  id TEXT,
  nombre TEXT,
  email TEXT,
  rol TEXT,
  area_preferida TEXT,
  meta_tareas_diarias INTEGER,
  foto_avatar TEXT,
  insignia_actual TEXT,
  telefono TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id::text AS id,
    COALESCE(p.full_name, p.nombre, 'Colaborador')::text AS nombre,
    COALESCE(p.email, '')::text AS email,
    CASE
      WHEN LOWER(COALESCE(p.role, p.rol, 'empleado')) IN ('admin', 'administrador') THEN 'admin'
      ELSE 'empleado'
    END::text AS rol,
    p.area_preferida::text AS area_preferida,
    COALESCE(p.daily_goal, p.meta_tareas_diarias, 6)::integer AS meta_tareas_diarias,
    p.foto_avatar::text AS foto_avatar,
    p.insignia_actual::text AS insignia_actual,
    p.telefono::text AS telefono
  FROM public.profiles p
  ORDER BY COALESCE(p.full_name, p.nombre, '') ASC;
$$;

REVOKE ALL ON FUNCTION public.list_staff_profiles_safe() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_staff_profiles_safe() TO anon, authenticated;

-- 2. Restaurar permisos y políticas operativas en las tablas del POS
DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'sales',
    'customers',
    'gastos',
    'gift_cards',
    'daily_tasks',
    'task_progress',
    'time_entries'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO anon, authenticated, service_role;', tbl);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

      FOR pol IN
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, tbl);
      END LOOP;

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);',
        tbl || '_pos_access',
        tbl
      );
    END IF;
  END LOOP;
END $$;
