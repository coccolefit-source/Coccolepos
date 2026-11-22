-- ============================================================================
-- COCCOLE FIT POS — MIGRACIÓN DE SEGURIDAD: PGCRYPTO PIN RPC + RLS RESTRICTIVO
-- Fecha: 2026-11-21
-- Ejecutar en Supabase SQL Editor (idempotente y compatible con datos actuales)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Columnas seguras para almacenamiento hasheado (bcrypt vía pgcrypto)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS clave_maestra_hash TEXT;

-- 2. Migrar PINs y claves maestras existentes en texto plano a hash bcrypt
UPDATE public.profiles
SET pin_hash = crypt(TRIM(pin), gen_salt('bf', 10))
WHERE pin IS NOT NULL
  AND TRIM(pin) <> ''
  AND (pin_hash IS NULL OR TRIM(pin_hash) = '');

UPDATE public.profiles
SET clave_maestra_hash = crypt(TRIM(clave_maestra), gen_salt('bf', 10))
WHERE clave_maestra IS NOT NULL
  AND TRIM(clave_maestra) <> ''
  AND (clave_maestra_hash IS NULL OR TRIM(clave_maestra_hash) = '');

-- Una vez verificada la migración de hashes, limpiar texto plano en profiles
UPDATE public.profiles
SET pin = NULL
WHERE pin_hash IS NOT NULL;

UPDATE public.profiles
SET clave_maestra = NULL
WHERE clave_maestra_hash IS NOT NULL;

-- 3. RPC PÚBLICA SEGURA: Listado mínimo para selector de login (SIN PIN, SIN EMAIL, SIN CLAVE MAESTRA)
CREATE OR REPLACE FUNCTION public.list_public_staff_names()
RETURNS TABLE (
  id TEXT,
  nombre TEXT,
  rol TEXT,
  area_preferida TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id::text AS id,
    COALESCE(p.full_name, p.nombre, 'Colaborador')::text AS nombre,
    CASE
      WHEN LOWER(COALESCE(p.role, p.rol, 'empleado')) IN ('admin', 'administrador') THEN 'admin'
      ELSE 'empleado'
    END::text AS rol,
    p.area_preferida::text AS area_preferida
  FROM public.profiles p
  ORDER BY COALESCE(p.full_name, p.nombre, '') ASC;
$$;

-- 4. RPC SEGURA: Validar PIN de 4 dígitos con pgcrypto sin exponer PIN ni clave_maestra
CREATE OR REPLACE FUNCTION public.verify_user_pin(
  p_pin TEXT,
  p_user_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  nombre TEXT,
  rol TEXT,
  area_preferida TEXT,
  meta_tareas_diarias INTEGER,
  foto_avatar TEXT,
  insignia_actual TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_pin TEXT := TRIM(COALESCE(p_pin, ''));
  v_clean_id  TEXT := NULLIF(TRIM(COALESCE(p_user_id, '')), '');
BEGIN
  IF v_clean_pin !~ '^\d{4}$' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id::text AS id,
    COALESCE(p.full_name, p.nombre, 'Colaborador')::text AS nombre,
    CASE
      WHEN LOWER(COALESCE(p.role, p.rol, 'empleado')) IN ('admin', 'administrador') THEN 'admin'
      ELSE 'empleado'
    END::text AS rol,
    p.area_preferida::text AS area_preferida,
    COALESCE(p.daily_goal, p.meta_tareas_diarias, 6)::integer AS meta_tareas_diarias,
    p.foto_avatar::text AS foto_avatar,
    p.insignia_actual::text AS insignia_actual
  FROM public.profiles p
  WHERE (v_clean_id IS NULL OR p.id::text = v_clean_id)
    AND (
      (p.pin_hash IS NOT NULL AND p.pin_hash = crypt(v_clean_pin, p.pin_hash))
      OR (p.pin_hash IS NULL AND p.pin IS NOT NULL AND TRIM(p.pin) = v_clean_pin)
    )
  LIMIT 1;
END;
$$;

-- 5. RPC SEGURA: Cambiar PIN de un colaborador desde panel admin validando p_admin_pin
CREATE OR REPLACE FUNCTION public.update_user_pin(
  p_target_user_id TEXT,
  p_new_pin TEXT,
  p_admin_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_new_pin   TEXT := TRIM(COALESCE(p_new_pin, ''));
  v_clean_admin_pin TEXT := TRIM(COALESCE(p_admin_pin, ''));
  v_target_id       TEXT := TRIM(COALESCE(p_target_user_id, ''));
  v_admin_valid     BOOLEAN := FALSE;
BEGIN
  IF v_target_id = '' THEN
    RAISE EXCEPTION 'Debes indicar el colaborador al que se le actualizará el PIN.';
  END IF;

  IF v_clean_new_pin !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'El nuevo PIN debe contener exactamente 4 dígitos numéricos.';
  END IF;

  IF v_clean_admin_pin !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'El PIN del administrador debe contener 4 dígitos numéricos.';
  END IF;

  -- Verificar el PIN actual de un administrador contra pin_hash (o pin previo a migración)
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles a
    WHERE LOWER(COALESCE(a.role, a.rol, '')) IN ('admin', 'administrador')
      AND (
        (a.pin_hash IS NOT NULL AND a.pin_hash = crypt(v_clean_admin_pin, a.pin_hash))
        OR (a.pin_hash IS NULL AND a.pin IS NOT NULL AND TRIM(a.pin) = v_clean_admin_pin)
      )
  ) INTO v_admin_valid;

  IF NOT v_admin_valid THEN
    RAISE EXCEPTION 'PIN de administrador incorrecto.';
  END IF;

  UPDATE public.profiles
  SET
    pin_hash = crypt(v_clean_new_pin, gen_salt('bf', 10)),
    pin = NULL
  WHERE id::text = v_target_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el colaborador indicado.';
  END IF;

  RETURN jsonb_build_object('success', true, 'user_id', v_target_id);
END;
$$;

-- 6. RPC SEGURA: Restablecer PIN validando la Clave Maestra almacenada en hash (sin claves hardcodeadas)
CREATE OR REPLACE FUNCTION public.reset_pin_with_master_key(
  p_target_user_id TEXT,
  p_master_key TEXT,
  p_new_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_pin TEXT := TRIM(COALESCE(p_new_pin, ''));
  v_clean_key TEXT := TRIM(COALESCE(p_master_key, ''));
  v_valid_key BOOLEAN := FALSE;
BEGIN
  IF v_clean_pin !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'El nuevo PIN debe tener exactamente 4 dígitos.';
  END IF;

  IF LENGTH(v_clean_key) < 6 THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles a
    WHERE LOWER(COALESCE(a.role, a.rol, '')) IN ('admin', 'administrador')
      AND (
        (a.clave_maestra_hash IS NOT NULL AND a.clave_maestra_hash = crypt(v_clean_key, a.clave_maestra_hash))
        OR (a.clave_maestra_hash IS NULL AND a.clave_maestra IS NOT NULL AND TRIM(a.clave_maestra) = v_clean_key)
      )
  ) INTO v_valid_key;

  IF NOT v_valid_key THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles
  SET
    pin_hash = crypt(v_clean_pin, gen_salt('bf', 10)),
    pin = NULL
  WHERE id::text = TRIM(p_target_user_id);

  RETURN FOUND;
END;
$$;

-- Permisos estrictos sobre las funciones RPC
REVOKE ALL ON FUNCTION public.list_public_staff_names() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_staff_names() TO anon, authenticated;

REVOKE ALL ON FUNCTION public.verify_user_pin(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_user_pin(TEXT, TEXT) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.update_user_pin(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_user_pin(TEXT, TEXT, TEXT) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.reset_pin_with_master_key(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_pin_with_master_key(TEXT, TEXT, TEXT) TO anon, authenticated;

-- 7. FUNCIÓN AUXILIAR DE ROL ADMIN PARA POLÍTICAS RLS
CREATE OR REPLACE FUNCTION public.is_coccole_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE (p.id::text = auth.uid()::text OR LOWER(p.email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')))
      AND LOWER(COALESCE(p.role, p.rol, '')) IN ('admin', 'administrador')
  );
$$;

-- 8. REVOCAR PERMISOS ABIERTOS (GRANT ALL TO anon) Y REEMPLAZAR POLÍTICAS WITH CHECK (true)
DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['profiles', 'sales', 'customers', 'gastos', 'gift_cards', 'daily_tasks', 'task_progress', 'time_entries']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon;', tbl);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

      -- Eliminar políticas permisivas previas (ej. "Enable all", "Allow anon", WITH CHECK (true))
      FOR pol IN
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, tbl);
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- 9. POLÍTICAS RLS RESTRICTIVAS POR TABLA

-- 9.1 PROFILES: Sin acceso directo para anon (login usa RPC verify_employee_pin).
-- Usuarios autenticados leen su propio perfil; solo admin gestiona perfiles completos.
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT INSERT, DELETE ON TABLE public.profiles TO authenticated;

CREATE POLICY "profiles_select_self_or_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id::text = auth.uid()::text OR public.is_coccole_admin());

CREATE POLICY "profiles_insert_admin_only"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_coccole_admin());

CREATE POLICY "profiles_update_self_or_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id::text = auth.uid()::text OR public.is_coccole_admin())
  WITH CHECK (id::text = auth.uid()::text OR public.is_coccole_admin());

CREATE POLICY "profiles_delete_admin_only"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_coccole_admin());

-- 9.2 SALES: Solo usuarios autenticados leen/crean ventas; solo admin edita o anula ventas.
GRANT SELECT, INSERT, UPDATE ON TABLE public.sales TO authenticated;

CREATE POLICY "sales_select_authenticated"
  ON public.sales FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "sales_insert_authenticated"
  ON public.sales FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND COALESCE(total_amount, total, 0) >= 0
  );

CREATE POLICY "sales_update_admin_only"
  ON public.sales FOR UPDATE
  TO authenticated
  USING (public.is_coccole_admin())
  WITH CHECK (public.is_coccole_admin());

CREATE POLICY "sales_delete_admin_only"
  ON public.sales FOR DELETE
  TO authenticated
  USING (public.is_coccole_admin());

-- 9.3 CUSTOMERS: Auto-registro público limitado (INSERT validado con teléfono),
-- lectura/edición restringida a usuarios autenticados y eliminación solo admin.
GRANT INSERT ON TABLE public.customers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customers TO authenticated;

CREATE POLICY "customers_public_qr_insert"
  ON public.customers FOR INSERT
  TO anon
  WITH CHECK (
    LENGTH(REGEXP_REPLACE(COALESCE(phone, telefono, ''), '\D', '', 'g')) >= 10
    AND LENGTH(TRIM(COALESCE(full_name, nombre, ''))) >= 2
  );

CREATE POLICY "customers_select_authenticated"
  ON public.customers FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "customers_insert_authenticated"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "customers_update_authenticated"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "customers_delete_admin_only"
  ON public.customers FOR DELETE
  TO authenticated
  USING (public.is_coccole_admin());

-- 9.4 GASTOS: Empleados solo ven y registran sus gastos del día actual (hora Bogotá);
-- administradores tienen acceso completo.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gastos TO authenticated;

CREATE POLICY "gastos_select_admin_or_own_today"
  ON public.gastos FOR SELECT
  TO authenticated
  USING (
    public.is_coccole_admin()
    OR (
      usuario_id::text = auth.uid()::text
      AND fecha = TO_CHAR(NOW() AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD')
    )
  );

CREATE POLICY "gastos_insert_authenticated"
  ON public.gastos FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND COALESCE(monto, 0) > 0
  );

CREATE POLICY "gastos_update_delete_admin_only"
  ON public.gastos FOR UPDATE
  TO authenticated
  USING (public.is_coccole_admin())
  WITH CHECK (public.is_coccole_admin());

CREATE POLICY "gastos_delete_admin_only"
  ON public.gastos FOR DELETE
  TO authenticated
  USING (public.is_coccole_admin());

-- 9.5 GIFT_CARDS: Usuarios autenticados pueden consultar y redimir (saldo >= 0);
-- creación y eliminación restringidas a administradores.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gift_cards TO authenticated;

CREATE POLICY "gift_cards_select_authenticated"
  ON public.gift_cards FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "gift_cards_insert_admin_only"
  ON public.gift_cards FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_coccole_admin()
    AND COALESCE(monto_inicial, 0) > 0
    AND COALESCE(saldo_actual, 0) >= 0
  );

CREATE POLICY "gift_cards_update_authenticated_redeem"
  ON public.gift_cards FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND COALESCE(saldo_actual, 0) >= 0
  );

CREATE POLICY "gift_cards_delete_admin_only"
  ON public.gift_cards FOR DELETE
  TO authenticated
  USING (public.is_coccole_admin());
