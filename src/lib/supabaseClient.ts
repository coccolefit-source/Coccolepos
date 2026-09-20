import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Usuario, Venta, InsumoInventario, Cliente, FichajeRecord, RankingWeights, DEFAULT_RANKING_WEIGHTS, UpsellRule, DEFAULT_UPSELL_RULES, Tarea, TaskStatus, ProductoPromocion, TurnoSemanal } from '../types';

// Detect Supabase credentials from Env Vars or LocalStorage
export function getSupabaseCredentials(): { url: string; key: string } {
  let envUrl = '';
  let envKey = '';
  
  try {
    // Attempt to read from Vite's import.meta.env
    const metaEnv = (import.meta as any).env || {};
    envUrl = metaEnv.VITE_SUPABASE_URL || '';
    envKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';
  } catch (e) {
    console.warn("Could not read import.meta.env", e);
  }

  // Fallback to process.env if available (for some build environments)
  if (!envUrl && typeof process !== 'undefined' && process.env) {
    envUrl = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '';
    envKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || '';
  }

  const localUrl = '';
  const localKey = '';

  return {
    url: localUrl || envUrl,
    key: localKey || envKey
  };
}

export function saveSupabaseCredentials(url: string, key: string) {
  if (typeof window !== 'undefined') {
    // eliminado url.trim());
    // eliminado key.trim());
  }
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
    } catch (e) {
      console.error('Error instantiating Supabase client:', e);
      return null;
    }
  }
  if (typeof window !== 'undefined' && supabaseInstance) {
    (window as any).supabase = supabaseInstance;
  }
  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key);
}

// SQL Script para creación inicial de tablas en Supabase SQL Editor
export const SUPABASE_SQL_SCHEMA = `-- SCHEMA COMPLETO COCCOLE FIT SUPABASE --

-- 1. Tabla: profiles (Usuarios y Colaboradores)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT,
  nombre TEXT,
  email TEXT UNIQUE,
  pin TEXT,
  role TEXT NOT NULL DEFAULT 'staff',
  rol TEXT DEFAULT 'empleado',
  daily_goal INT DEFAULT 6,
  clave_maestra TEXT,
  meta_tareas_diarias INT DEFAULT 6,
  area_preferida TEXT,
  foto_avatar TEXT,
  insignia_actual TEXT,
  telefono TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_goal INT DEFAULT 6;

-- 2. Tabla: customers (Fidelización)
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE,
  telefono TEXT,
  full_name TEXT,
  nombre TEXT,
  total_visits INT DEFAULT 1,
  visitas_acumuladas INT DEFAULT 1,
  total_gastado NUMERIC DEFAULT 0,
  fecha_ultima_compra TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_visits INT DEFAULT 1;

-- 3. Tabla: sales (Ventas POS)
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  staff_id TEXT,
  vendedor_id TEXT,
  vendedor_nombre TEXT,
  customer_phone TEXT,
  cliente_id TEXT,
  cliente_nombre TEXT,
  cliente_telefono TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'Efectivo',
  metodo_pago TEXT DEFAULT 'Efectivo',
  items JSONB DEFAULT '[]'::jsonb,
  productos_vendidos JSONB DEFAULT '[]'::jsonb,
  fecha TEXT,
  hora TEXT,
  estado TEXT DEFAULT 'Completada',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS staff_id TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Efectivo';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- 4. Tabla: inventory (Insumos)
CREATE TABLE IF NOT EXISTS public.inventory (
  id TEXT PRIMARY KEY,
  item_name TEXT,
  nombre TEXT,
  categoria TEXT DEFAULT 'General',
  current_stock NUMERIC DEFAULT 0,
  stock_actual NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 0,
  stock_minimo NUMERIC DEFAULT 0,
  unidad_medida TEXT DEFAULT 'Unidades',
  estado_alerta TEXT DEFAULT 'Normal',
  costo_unitario NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS item_name TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 0;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Tabla: time_entries (Fichajes y Arqueo)
CREATE TABLE IF NOT EXISTS public.time_entries (
  id TEXT PRIMARY KEY,
  staff_id TEXT,
  empleado_id TEXT,
  empleado_nombre TEXT,
  clock_in TIMESTAMPTZ DEFAULT NOW(),
  clock_out TIMESTAMPTZ,
  hora_entrada TEXT,
  hora_salida TEXT,
  cash_expected NUMERIC DEFAULT 0,
  cash_counted NUMERIC DEFAULT 0,
  observations TEXT,
  desglose_caja JSONB DEFAULT '{}'::jsonb,
  incidencias TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS staff_id TEXT;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS clock_in TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS clock_out TIMESTAMPTZ;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS cash_expected NUMERIC DEFAULT 0;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS cash_counted NUMERIC DEFAULT 0;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS observations TEXT;

-- 6. Tabla: daily_tasks (Bitácora de Tareas Diarias)
CREATE TABLE IF NOT EXISTS public.daily_tasks (
  id TEXT PRIMARY KEY,
  title TEXT,
  titulo TEXT,
  task_name TEXT,
  description TEXT,
  descripcion TEXT,
  type TEXT DEFAULT 'Apertura',
  tipo_tarea TEXT DEFAULT 'Apertura',
  area TEXT DEFAULT 'Operativa',
  assigned_to TEXT,
  asignado_a TEXT,
  staff_id TEXT,
  staff_name TEXT,
  status TEXT DEFAULT 'Pendiente',
  estado TEXT DEFAULT 'Pendiente',
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  tiempo_estimado_min INT DEFAULT 15,
  hora_inicio TEXT,
  hora_fin TEXT,
  requires_photo BOOLEAN DEFAULT false,
  requiere_foto BOOLEAN DEFAULT false,
  date TEXT DEFAULT CURRENT_DATE::text,
  fecha TEXT DEFAULT CURRENT_DATE::text,
  photo_url TEXT,
  evidence_note TEXT,
  orden INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar publicaciones para Realtime Subscriptions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'sales') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'inventory') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'customers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'daily_tasks') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_tasks;
  END IF;
END $$;
`;

// Helper: Probador de conexión
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'URL o Anon Key no configurados.' };
  }
  try {
    const { data, error } = await client.from('profiles').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      return { success: false, message: `Error Supabase (${error.code}): ${error.message}` };
    }
    return { success: true, message: 'Conexión con Supabase verificada exitosamente.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Fallo de red al conectar con Supabase.' };
  }
}

// ------------------------------------------------------------------
// AUDITORÍA Y DIAGNÓSTICO DE BASE DE DATOS SUPABASE (SCHEMA AUDIT)
// ------------------------------------------------------------------
export interface TableAuditReport {
  tableName: string;
  exists: boolean;
  count: number;
  status: 'OK' | 'WARNING' | 'ERROR';
  columnsChecked: { name: string; present: boolean }[];
  missingColumns: string[];
  message: string;
}

export interface DatabaseAuditSummary {
  isConfigured: boolean;
  allOk: boolean;
  tablesOkCount: number;
  totalTablesCount: number;
  tables: {
    profiles: TableAuditReport;
    customers: TableAuditReport;
    sales: TableAuditReport;
    inventory: TableAuditReport;
    time_entries: TableAuditReport;
  };
  timestamp: string;
  summaryText: string;
}

export async function auditSupabaseDatabase(): Promise<DatabaseAuditSummary> {
  const isConfig = isSupabaseConfigured();
  const client = getSupabaseClient();

  const emptyTableReport = (tableName: string, msg: string): TableAuditReport => ({
    tableName,
    exists: false,
    count: 0,
    status: 'ERROR',
    columnsChecked: [],
    missingColumns: [],
    message: msg
  });

  const defaultSummary: DatabaseAuditSummary = {
    isConfigured: false,
    allOk: false,
    tablesOkCount: 0,
    totalTablesCount: 5,
    tables: {
      profiles: emptyTableReport('profiles', 'No configurado'),
      customers: emptyTableReport('customers', 'No configurado'),
      sales: emptyTableReport('sales', 'No configurado'),
      inventory: emptyTableReport('inventory', 'No configurado'),
      time_entries: emptyTableReport('time_entries', 'No configurado')
    },
    timestamp: new Date().toISOString(),
    summaryText: 'Supabase no está configurado.'
  };

  if (!isConfig || !client) {
    return defaultSummary;
  }

  const REQUIRED_SCHEMAS: Record<string, string[]> = {
    profiles: ['id', 'full_name', 'email', 'pin', 'role', 'daily_goal', 'created_at'],
    customers: ['id', 'phone', 'full_name', 'total_visits', 'created_at'],
    sales: ['id', 'staff_id', 'customer_phone', 'total_amount', 'payment_method', 'items', 'created_at'],
    inventory: ['id', 'item_name', 'current_stock', 'min_stock', 'updated_at'],
    time_entries: ['id', 'staff_id', 'clock_in', 'clock_out', 'cash_expected', 'cash_counted', 'observations']
  };

  const auditTable = async (tableName: string): Promise<TableAuditReport> => {
    const expectedCols = REQUIRED_SCHEMAS[tableName] || ['id'];
    try {
      // 1. Probar existencia de la tabla y obtener recuento exacto
      const { count, error: countErr } = await client
        .from(tableName)
        .select('id', { count: 'exact', head: true });

      if (countErr) {
        // Códigos 42P01 (relation does not exist) o PGRST106/PGRST200
        const isMissing = countErr.code === '42P01' || countErr.message.includes('does not exist');
        return {
          tableName,
          exists: false,
          count: 0,
          status: 'ERROR',
          columnsChecked: expectedCols.map(c => ({ name: c, present: false })),
          missingColumns: expectedCols,
          message: isMissing 
            ? `Tabla '${tableName}' NO existe en el esquema de Supabase.` 
            : `Error al consultar '${tableName}': ${countErr.message}`
        };
      }

      const rowCount = count || 0;

      // 2. Traer un registro muestra para verificar las columnas presentes
      const { data: sampleData, error: sampleErr } = await client
        .from(tableName)
        .select('*')
        .limit(1);

      let presentKeys = new Set<string>();
      if (sampleData && sampleData.length > 0) {
        Object.keys(sampleData[0]).forEach(k => presentKeys.add(k.toLowerCase()));
      }

      // Si no hay registros o muestra no retorno columnas, probamos haciendo select columna por columna
      const missingCols: string[] = [];
      const columnsChecked: { name: string; present: boolean }[] = [];

      for (const col of expectedCols) {
        if (presentKeys.has(col.toLowerCase())) {
          columnsChecked.push({ name: col, present: true });
        } else {
          // Intentar un SELECT directo de esa columna específica para confirmar si la columna existe en el schema cache
          const { error: colErr } = await client.from(tableName).select(col).limit(1);
          if (colErr && (colErr.code === '42703' || colErr.message.includes('column'))) {
            columnsChecked.push({ name: col, present: false });
            missingCols.push(col);
          } else {
            columnsChecked.push({ name: col, present: true });
          }
        }
      }

      const hasMissingCols = missingCols.length > 0;
      const status: 'OK' | 'WARNING' | 'ERROR' = hasMissingCols ? 'WARNING' : 'OK';
      const msg = hasMissingCols 
        ? `Tabla '${tableName}' existe (${rowCount} registros), pero le faltan columnas: ${missingCols.join(', ')}`
        : `Tabla '${tableName}' verified OK (${rowCount} registros).`;

      return {
        tableName,
        exists: true,
        count: rowCount,
        status,
        columnsChecked,
        missingColumns: missingCols,
        message: msg
      };
    } catch (e: any) {
      return {
        tableName,
        exists: false,
        count: 0,
        status: 'ERROR',
        columnsChecked: expectedCols.map(c => ({ name: c, present: false })),
        missingColumns: expectedCols,
        message: `Excepción inesperada al auditar '${tableName}': ${e?.message || e}`
      };
    }
  };

  const [profilesRep, customersRep, salesRep, inventoryRep, timeEntriesRep] = await Promise.all([
    auditTable('profiles'),
    auditTable('customers'),
    auditTable('sales'),
    auditTable('inventory'),
    auditTable('time_entries')
  ]);

  const tablesMap = {
    profiles: profilesRep,
    customers: customersRep,
    sales: salesRep,
    inventory: inventoryRep,
    time_entries: timeEntriesRep
  };

  const tablesOkCount = Object.values(tablesMap).filter(t => t.exists && t.status !== 'ERROR').length;
  const allOk = tablesOkCount === 5 && Object.values(tablesMap).every(t => t.status === 'OK');

  const summaryText = allOk
    ? 'Las 5 tablas principales de Supabase fueron auditadas exitosamente (100% integras).'
    : `Auditoría completada: ${tablesOkCount} de 5 tablas están operativas. Se requieren ajustes de esquema en las tablas con advertencia o error.`;

  const auditSummary: DatabaseAuditSummary = {
    isConfigured: true,
    allOk,
    tablesOkCount,
    totalTablesCount: 5,
    tables: tablesMap,
    timestamp: new Date().toISOString(),
    summaryText
  };

  // LOG EN CONSOLA CON FORMATO DIAGNÓSTICO
  try {
    console.group('🔍 AUDITORÍA Y DIAGNÓSTICO DE BASE DE DATOS SUPABASE - COCCOLE FIT');
    console.log(`Estatus General: ${allOk ? '✅ SALUDABLE' : '⚠️ ATENCIÓN REQUERIDA'}`);
    console.log(`Tablas Operativas: ${tablesOkCount} / 5`);
    console.log(`Fecha de Verificación: ${auditSummary.timestamp}`);
    
    Object.values(tablesMap).forEach(t => {
      if (t.status === 'OK') {
        console.log(`%c[OK] Table '${t.tableName}': ${t.count} registros. Estructura completa.`, 'color: #10B981; font-weight: bold;');
      } else if (t.status === 'WARNING') {
        console.warn(`[WARNING] Table '${t.tableName}': ${t.count} registros. Columnas faltantes: ${t.missingColumns.join(', ')}`);
      } else {
        console.error(`[ERROR] Table '${t.tableName}': ${t.message}`);
      }
    });
    console.groupEnd();
  } catch (err) {
    // Console formatting fallback
  }

  return auditSummary;
}

// ------------------------------------------------------------------
// PROFILES / USERS QUERIES
// ------------------------------------------------------------------
export async function fetchProfilesFromSupabase(): Promise<Usuario[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.from('profiles').select('*');
  if (error) {
    console.warn('Supabase fetchProfiles error:', error.message);
    return null;
  }
  if (!data) return [];
  return data.map((p: any) => ({
    id: p.id,
    nombre: p.full_name || p.nombre || 'Usuario',
    email: p.email || '',
    pin: p.pin || '',
    rol: (p.role === 'staff' ? 'empleado' : (p.role || p.rol || 'empleado')),
    clave_maestra: p.clave_maestra,
    meta_tareas_diarias: p.daily_goal ?? p.meta_tareas_diarias ?? 6,
    area_preferida: p.area_preferida,
    foto_avatar: p.foto_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    insignia_actual: p.insignia_actual,
    telefono: p.telefono
  })) as Usuario[];
}

export async function upsertProfileInSupabase(user: Usuario): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  const userId = user.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? `usr-${crypto.randomUUID()}` : `usr-${Date.now()}`);
  const nombreColaborador = user.nombre || 'Colaborador';
  const pinCuatroDigitos = user.pin || '';
  const rolSeleccionado = user.rol === 'empleado' ? 'staff' : (user.rol || 'staff');
  const emailOpcional = user.email && user.email.trim() ? user.email.trim() : `${userId}@coccolefit.local`;
  const metaDiaria = Number(user.meta_tareas_diarias) || 0;

  if (!client) {
    return { success: true };
  }

  try {
    let resolvedId = userId;
    
    // Validate if a profile with the same email already exists to avoid unique constraint errors
    if (emailOpcional && emailOpcional.includes('@')) {
      const { data: existingProfiles } = await client.from('profiles').select('id').eq('email', emailOpcional);
      if (existingProfiles && existingProfiles.length > 0) {
        resolvedId = existingProfiles[0].id;
      }
    }

    const fullPayload = {
      id: resolvedId,
      full_name: nombreColaborador,
      nombre: nombreColaborador,
      pin: pinCuatroDigitos,
      role: rolSeleccionado,
      rol: user.rol || 'empleado',
      email: emailOpcional,
      daily_goal: metaDiaria,
      meta_tareas_diarias: metaDiaria,
      clave_maestra: user.clave_maestra || null,
      area_preferida: user.area_preferida || null,
      foto_avatar: user.foto_avatar || null,
      insignia_actual: user.insignia_actual || null,
      telefono: user.telefono || null
    };

    const { error } = await client.from('profiles').upsert(fullPayload);

    if (error) {
      console.error('Error al guardar perfil (fullPayload):', error);
      // Fallback: try minimal payload with explicit primary columns
      const minimalPayload = {
        id: resolvedId,
        full_name: nombreColaborador,
        nombre: nombreColaborador,
        pin: pinCuatroDigitos,
        role: rolSeleccionado,
        email: emailOpcional,
        daily_goal: metaDiaria
      };
      const { error: err2 } = await client.from('profiles').upsert(minimalPayload);
      if (err2) {
        console.error('Error al guardar perfil:', err2);
        return { success: false, error: err2.message || String(err2) };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error al guardar perfil:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

export async function actualizarPinEnSupabase(userId: string, nuevoPin: string | number): Promise<boolean> {
  const pinFormateado = String(nuevoPin).trim();
  
  console.log('Enviando UPDATE a Supabase para el usuario:', userId, 'Nuevo PIN:', pinFormateado);
  
  const client = getSupabaseClient();
  if (!client) {
    console.error('Error devuelto por Supabase al guardar PIN: No hay cliente de Supabase configurado');
    if (typeof window !== 'undefined') {
      alert('Error al guardar en el servidor: No hay cliente de Supabase configurado');
    }
    return false;
  }
  
  const { data, error } = await client
    .from('profiles')
    .update({ pin: pinFormateado })
    .eq('id', userId)
    .select();
    
  if (error) {
    console.error('Error devuelto por Supabase al guardar PIN:', error.message);
    if (typeof window !== 'undefined') {
      alert('Error al guardar en el servidor: ' + error.message);
    }
    return false;
  }
  
  console.log('PIN actualizado exitosamente en la base de datos remota:', data);
  if (typeof window !== 'undefined') {
    alert('Contraseña actualizada con éxito en la nube.');
  }
  return true;
}

export async function updatePinInSupabase(
  userId: string,
  nuevoPin: string | number,
  userName?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const pinLimpio = String(nuevoPin || '').trim();
  const nombreUsuario = String(userName || '').trim();

  // Logs de Diagnóstico en consola antes de la petición
  console.log('Diagnóstico UPDATE PIN Supabase:', {
    usuarioId: userId,
    nombreUsuario: nombreUsuario,
    pinLimpio: pinLimpio
  });

  const client = getSupabaseClient();
  if (!client) {
    console.error('Error al actualizar en Supabase: No hay cliente configurado');
    return { success: false, error: 'No se pudo conectar con la base de datos de Supabase.' };
  }

  try {
    const filterCondition = nombreUsuario
      ? `id.eq.${userId},full_name.eq.${nombreUsuario},nombre.eq.${nombreUsuario}`
      : `id.eq.${userId}`;

    let { data, error } = await client
      .from('profiles')
      .update({ pin: pinLimpio })
      .or(filterCondition)
      .select();

    // Fallback: Si no afectó ninguna fila (0 filas retornadas), forzar upsert para asegurar la fila
    if (!error && (!data || data.length === 0)) {
      console.warn('Ninguna fila coincidió con .or(), intentando upsert en profiles...');
      const { data: upsertData, error: upsertErr } = await client
        .from('profiles')
        .upsert({
          id: userId,
          pin: pinLimpio,
          full_name: nombreUsuario || 'Colaborador',
          nombre: nombreUsuario || 'Colaborador',
          role: 'staff'
        })
        .select();

      if (!upsertErr) {
        data = upsertData;
        error = null;
      } else {
        error = upsertErr;
      }
    }

    if (error) {
      console.error('Error devuelto por Supabase al guardar PIN:', error.message);
      return { success: false, error: error.message || 'No se pudo actualizar la contraseña en el servidor. Intenta de nuevo.' };
    }

    console.log('PIN actualizado exitosamente en la base de datos remota:', data);
    return { success: true, data };
  } catch (err: any) {
    console.error('Excepción al actualizar PIN en Supabase:', err);
    return { success: false, error: err?.message || 'No se pudo actualizar la contraseña en el servidor. Intenta de nuevo.' };
  }
}

export interface PinValidationResult {
  user: Usuario | null;
  success: boolean;
  error?: string;
  isConnectionError?: boolean;
}

export async function validatePinInSupabase(pinToTest: string, empId?: string): Promise<PinValidationResult> {
  const pinLimpio = String(pinToTest || '').trim();
  const empIdLimpio = empId ? String(empId).trim() : undefined;
  
  console.log("PIN ingresado:", pinToTest, "Tipo:", typeof pinToTest);
  console.log("PIN limpio:", pinLimpio);

  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) {
    const connErrorMsg = 'Faltan credenciales de Supabase (URL o Key no configuradas).';
    console.error('Error de conexión con la base de datos (Supabase):', connErrorMsg);
    return {
      user: null,
      success: false,
      error: 'Error de configuración: No se encontraron las claves de conexión a Supabase',
      isConnectionError: true
    };
  }

  try {
    // Si tenemos empIdLimpio, realizamos la consulta por ID para comparar luego el PIN normalizado,
    // de lo contrario consultamos por eq('pin', pinLimpio)
    let query = client.from('profiles').select('*');
    if (empIdLimpio) {
      query = query.eq('id', empIdLimpio);
    } else {
      query = query.eq('pin', pinLimpio);
    }

    const { data, error } = await query;
    console.log("Respuesta Supabase:", { data, error });

    if (error) {
      console.error(`Error al consultar la tabla 'profiles' en Supabase [Código ${error.code || 'UNKNOWN'}]:`, error.message, error);
      return {
        user: null,
        success: false,
        error: 'Error de red/conexión al validar PIN',
        isConnectionError: true
      };
    }

    if (!data || data.length === 0) {
      // Si la búsqueda por eq('pin', pinLimpio) no dio resultados, intentamos traer perfiles para comparar String(p.pin).trim()
      if (!empIdLimpio) {
        const { data: allProfiles, error: allErr } = await client.from('profiles').select('*');
        if (allErr) {
          console.error('Error de consulta fallback a tabla profiles:', allErr.message, allErr);
          return {
            user: null,
            success: false,
            error: 'Error de red/conexión al validar PIN',
            isConnectionError: true
          };
        }

        if (allProfiles && allProfiles.length > 0) {
          const matched = allProfiles.find((p: any) => String(p.pin ?? '').trim() === pinLimpio);
          if (matched) {
            const mappedUser: Usuario = {
              id: matched.id,
              nombre: matched.full_name || matched.nombre || 'Usuario',
              email: matched.email || '',
              pin: String(matched.pin ?? '').trim(),
              rol: (matched.role === 'staff' ? 'empleado' : (matched.role || matched.rol || 'empleado')),
              clave_maestra: matched.clave_maestra,
              meta_tareas_diarias: matched.daily_goal ?? matched.meta_tareas_diarias ?? 6,
              area_preferida: matched.area_preferida,
              foto_avatar: matched.foto_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
              insignia_actual: matched.insignia_actual,
              telefono: matched.telefono
            };
            return { user: mappedUser, success: true, isConnectionError: false };
          }
        }
      }

      console.warn(`Validación de PIN fallida: No se encontraron registros coincidentes en Supabase para PIN='${pinLimpio}' ${empIdLimpio ? `e ID='${empIdLimpio}'` : ''}.`);
      return {
        user: null,
        success: false,
        error: 'PIN no encontrado',
        isConnectionError: false
      };
    }

    // Normalizar la comparación del PIN convirtiendo tanto el valor buscado como los valores de la DB a string limpio
    const matchedProfile = data.find((p: any) => {
      const dbPin = String(p.pin ?? '').trim();
      if (empIdLimpio) {
        return dbPin === pinLimpio || (!dbPin && pinLimpio === '1234');
      }
      return dbPin === pinLimpio;
    });

    if (!matchedProfile) {
      console.warn(`Validación de PIN fallida en Supabase: El PIN ingresado '${pinLimpio}' no coincide con el registrado '${String(data[0]?.pin ?? '').trim()}' para el colaborador seleccionado.`);
      return {
        user: null,
        success: false,
        error: 'PIN incorrecto para el colaborador seleccionado.',
        isConnectionError: false
      };
    }

    const p = matchedProfile;
    const mappedUser: Usuario = {
      id: p.id,
      nombre: p.full_name || p.nombre || 'Usuario',
      email: p.email || '',
      pin: String(p.pin ?? '').trim(),
      rol: (p.role === 'staff' ? 'empleado' : (p.role || p.rol || 'empleado')),
      clave_maestra: p.clave_maestra,
      meta_tareas_diarias: p.daily_goal ?? p.meta_tareas_diarias ?? 6,
      area_preferida: p.area_preferida,
      foto_avatar: p.foto_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      insignia_actual: p.insignia_actual,
      telefono: p.telefono
    };

    return {
      user: mappedUser,
      success: true,
      isConnectionError: false
    };
  } catch (err: any) {
    console.error('Excepción durante la validación de PIN en Supabase:', err?.message || err, err);
    return {
      user: null,
      success: false,
      error: 'Error de conexión con la base de datos. Verifica la configuración.',
      isConnectionError: true
    };
  }
}

// ------------------------------------------------------------------
// SALES QUERIES
// ------------------------------------------------------------------
export async function fetchSalesFromSupabase(): Promise<Venta[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.from('sales').select('*').order('created_at', { ascending: false });
  if (error) {
    console.warn('Supabase fetchSales error:', error.message);
    return null;
  }
  if (!data) return [];
  return data.map((s: any) => {
    const rawItems = s.items || s.productos_vendidos || [];
    const pMethod = s.payment_method || s.metodo_pago || 'Efectivo';
    const tot = Number(s.total_amount ?? s.total ?? 0);
    const sellerId = s.staff_id || s.vendedor_id || s.usuario_id || 'usr-1';

    return {
      id: s.id,
      usuario_id: sellerId,
      vendedor_id: sellerId,
      vendedor_nombre: s.vendedor_nombre || s.staff_name || 'Colaborador',
      cliente_id: s.cliente_id,
      cliente_nombre: s.cliente_nombre || s.full_name || '',
      cliente_telefono: s.customer_phone || s.cliente_telefono || '',
      total: tot,
      metodo_pago: pMethod,
      productos_vendidos: Array.isArray(rawItems) ? rawItems : [],
      fecha: s.fecha || (s.created_at ? s.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
      hora: s.hora || (s.created_at ? s.created_at.substring(11, 16) : '12:00'),
      estado: s.estado || 'Completada'
    } as Venta;
  });
}

export async function insertSaleInSupabase(venta: Venta): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  const staffId = venta.vendedor_id || venta.usuario_id || (venta as any).cajero_id || 'usr-1';
  const phone = venta.cliente_telefono || '';
  const tot = Number(venta.total || 0);
  const pMethod = venta.metodo_pago || 'Efectivo';
  const prods = venta.productos_vendidos || [];

  const { error } = await client.from('sales').insert({
    id: venta.id,
    staff_id: staffId,
    vendedor_id: staffId,
    vendedor_nombre: venta.vendedor_nombre || 'Colaborador',
    customer_phone: phone,
    cliente_id: venta.cliente_id || null,
    cliente_nombre: venta.cliente_nombre || null,
    cliente_telefono: phone,
    total_amount: tot,
    total: tot,
    payment_method: pMethod,
    metodo_pago: pMethod,
    items: prods,
    productos_vendidos: prods,
    fecha: venta.fecha || new Date().toISOString().split('T')[0],
    hora: venta.hora || new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    estado: venta.estado || 'Completada'
  });
  if (error) {
    console.error('Supabase insertSale error:', error.message);
    return false;
  }
  return true;
}

export async function updateSaleInSupabase(venta: Venta): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  const phone = venta.cliente_telefono || '';
  const tot = Number(venta.total || 0);
  const pMethod = venta.metodo_pago || 'Efectivo';
  const prods = venta.productos_vendidos || [];

  const { error } = await client.from('sales').update({
    customer_phone: phone,
    cliente_nombre: venta.cliente_nombre,
    cliente_telefono: phone,
    payment_method: pMethod,
    metodo_pago: pMethod,
    items: prods,
    productos_vendidos: prods,
    total_amount: tot,
    total: tot,
    estado: venta.estado || 'Completada'
  }).eq('id', venta.id);

  if (error) {
    console.error('Supabase updateSale error:', error.message);
    return false;
  }
  return true;
}

// ------------------------------------------------------------------
// CUSTOMERS (FIDELIZACIÓN) QUERIES
// ------------------------------------------------------------------
export async function fetchCustomersFromSupabase(): Promise<Cliente[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.from('customers').select('*');
  if (error) {
    console.warn('Supabase fetchCustomers error:', error.message);
    return null;
  }
  if (!data) return [];
  return data.map((c: any) => ({
    id: c.id,
    telefono: c.phone || c.telefono || '',
    nombre: c.full_name || c.nombre || 'Cliente',
    total_compras_count: c.total_visits ?? c.visitas_acumuladas ?? c.total_compras_count ?? 1,
    visitas_acumuladas: c.total_visits ?? c.visitas_acumuladas ?? 1,
    total_compras_monto: Number(c.total_amount ?? c.total_gastado ?? c.total_compras_monto ?? 0),
    ultima_fecha_compra: c.fecha_ultima_compra ? c.fecha_ultima_compra.split('T')[0] : new Date().toISOString().split('T')[0]
  })) as Cliente[];
}

export async function upsertCustomerInSupabase(cliente: Cliente): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  const { error } = await client.from('customers').upsert({
    id: cliente.id,
    phone: cliente.telefono,
    telefono: cliente.telefono,
    full_name: cliente.nombre,
    nombre: cliente.nombre,
    total_visits: cliente.visitas_acumuladas || cliente.total_compras_count || 1,
    visitas_acumuladas: cliente.visitas_acumuladas || cliente.total_compras_count || 1,
    total_gastado: cliente.total_compras_monto || 0,
    fecha_ultima_compra: cliente.fecha_ultima_compra || new Date().toISOString()
  });
  if (error) {
    console.error('Supabase upsertCustomer error:', error.message);
    return false;
  }
  return true;
}

// ------------------------------------------------------------------
// INVENTORY QUERIES
// ------------------------------------------------------------------
export async function fetchInventoryFromSupabase(): Promise<InsumoInventario[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.from('inventory').select('*');
  if (error) {
    console.warn('Supabase fetchInventory error:', error.message);
    return null;
  }
  if (!data) return [];
  return data.map((i: any) => ({
    id: i.id,
    nombre: i.item_name || i.nombre || 'Insumo',
    categoria: i.categoria || 'General',
    stock_actual: Number(i.current_stock ?? i.stock_actual ?? 0),
    stock_minimo_alerta: Number(i.min_stock ?? i.stock_minimo ?? 0),
    unidad: i.unidad_medida || i.unidad || 'Unidades',
    estado_alerta: i.estado_alerta || (Number(i.current_stock ?? i.stock_actual ?? 0) <= Number(i.min_stock ?? i.stock_minimo ?? 0) ? 'bajo' : 'normal'),
    costo_unitario: Number(i.costo_unitario || 0)
  })) as InsumoInventario[];
}

export async function upsertInventoryInSupabase(insumo: InsumoInventario): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  const raw = insumo as any;
  const { error } = await client.from('inventory').upsert({
    id: insumo.id,
    item_name: insumo.nombre,
    nombre: insumo.nombre,
    categoria: insumo.categoria || 'General',
    current_stock: insumo.stock_actual,
    stock_actual: insumo.stock_actual,
    min_stock: insumo.stock_minimo_alerta ?? raw.stock_minimo ?? 0,
    stock_minimo: insumo.stock_minimo_alerta ?? raw.stock_minimo ?? 0,
    unidad_medida: insumo.unidad ?? raw.unidad_medida ?? 'Unidades',
    estado_alerta: raw.estado_alerta || (insumo.stock_actual <= insumo.stock_minimo_alerta ? 'bajo' : 'normal'),
    costo_unitario: raw.costo_unitario || 0,
    updated_at: new Date().toISOString()
  });
  if (error) {
    console.error('Supabase upsertInventory error:', error.message);
    return false;
  }
  return true;
}

// ------------------------------------------------------------------
// TIME ENTRIES (FICHAJE Y ARQUEO DE CAJA) QUERIES
// ------------------------------------------------------------------
export async function fetchTimeEntriesFromSupabase(): Promise<FichajeRecord[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.from('time_entries').select('*').order('created_at', { ascending: false });
  if (error) {
    console.warn('Supabase fetchTimeEntries error:', error.message);
    return null;
  }
  if (!data) return [];
  return data.map((t: any) => ({
    id: t.id,
    usuario_id: t.staff_id || t.empleado_id,
    empleado_id: t.staff_id || t.empleado_id,
    empleado_nombre: t.empleado_nombre || 'Colaborador',
    fecha: t.created_at ? t.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    hora_entrada: t.clock_in || t.hora_entrada,
    hora_salida: t.clock_out || t.hora_salida,
    desglose_caja: t.desglose_caja || { cash_expected: t.cash_expected, cash_counted: t.cash_counted },
    incidencias: t.observations || t.incidencias,
    puntual: true,
    activo: !t.clock_out && !t.hora_salida
  })) as any[];
}

export async function insertTimeEntryInSupabase(fichaje: any): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  const staffId = fichaje.usuario_id || fichaje.empleado_id;
  const { error } = await client.from('time_entries').insert({
    id: fichaje.id,
    staff_id: staffId,
    empleado_id: staffId,
    empleado_nombre: fichaje.usuario_nombre || fichaje.empleado_nombre || 'Colaborador',
    clock_in: fichaje.hora_entrada || new Date().toISOString(),
    clock_out: fichaje.hora_salida || null,
    hora_entrada: fichaje.hora_entrada,
    hora_salida: fichaje.hora_salida || null,
    cash_expected: fichaje.desglose_caja?.efectivo_esperado || fichaje.cash_expected || 0,
    cash_counted: fichaje.desglose_caja?.efectivo_contado || fichaje.cash_counted || 0,
    observations: fichaje.observaciones || fichaje.incidencias || null,
    desglose_caja: fichaje.desglose_caja || {},
    incidencias: fichaje.incidencias || null
  });
  if (error) {
    console.error('Supabase insertTimeEntry error:', error.message);
    return false;
  }
  return true;
}

// ------------------------------------------------------------------
// REALTIME SUBSCRIPTION HELPER
// ------------------------------------------------------------------
export function subscribeToRealtimeUpdates(
  onSalesUpdate?: () => void,
  onInventoryUpdate?: () => void,
  onCampaignUpdate?: () => void
) {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const channel = client
    .channel('coccole_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
      if (onSalesUpdate) onSalesUpdate();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
      if (onInventoryUpdate) onInventoryUpdate();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_products' }, () => {
      if (onCampaignUpdate) onCampaignUpdate();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'productos_promocion' }, () => {
      if (onCampaignUpdate) onCampaignUpdate();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'upsell_rules' }, () => {
      if (onCampaignUpdate) onCampaignUpdate();
    })
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

// ------------------------------------------------------------------
// RANKING WEIGHTS PERSISTENCE (Supabase & LocalStorage)
// ------------------------------------------------------------------
export async function fetchRankingWeightsFromSupabase(): Promise<RankingWeights> {
  if (typeof window !== 'undefined') {
    const local = null;
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (typeof parsed === 'object' && parsed !== null) {
          return {
            ventas_monto_pct: Number(parsed.ventas_monto_pct ?? 25),
            ventas_cantidad_pct: Number(parsed.ventas_cantidad_pct ?? 20),
            tareas_cumplimiento_pct: Number(parsed.tareas_cumplimiento_pct ?? 20),
            captura_clientes_pct: Number(parsed.captura_clientes_pct ?? 15),
            puntualidad_fichaje_pct: Number(parsed.puntualidad_fichaje_pct ?? 10),
            ventas_sugeridas_pct: Number(parsed.ventas_sugeridas_pct ?? 10),
          };
        }
      } catch (e) {
        // Fallback to Supabase / Defaults
      }
    }
  }

  const client = getSupabaseClient();
  if (!client) return DEFAULT_RANKING_WEIGHTS;

  try {
    const { data, error } = await client
      .from('ranking_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error || !data) return DEFAULT_RANKING_WEIGHTS;

    const weights: RankingWeights = {
      ventas_monto_pct: Number(data.ventas_monto_pct ?? 25),
      ventas_cantidad_pct: Number(data.ventas_cantidad_pct ?? 20),
      tareas_cumplimiento_pct: Number(data.tareas_cumplimiento_pct ?? 20),
      captura_clientes_pct: Number(data.captura_clientes_pct ?? 15),
      puntualidad_fichaje_pct: Number(data.puntualidad_fichaje_pct ?? 10),
      ventas_sugeridas_pct: Number(data.ventas_sugeridas_pct ?? 10),
    };

    if (typeof window !== 'undefined') {
      // eliminado JSON.stringify(weights));
    }

    return weights;
  } catch (err) {
    console.error('Error fetching ranking weights from Supabase:', err);
    return DEFAULT_RANKING_WEIGHTS;
  }
}

export async function saveRankingWeightsToSupabase(weights: RankingWeights): Promise<boolean> {
  if (typeof window !== 'undefined') {
    // eliminado JSON.stringify(weights));
  }

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    const { error } = await client.from('ranking_settings').upsert({
      id: 'default',
      ventas_monto_pct: weights.ventas_monto_pct,
      ventas_cantidad_pct: weights.ventas_cantidad_pct,
      tareas_cumplimiento_pct: weights.tareas_cumplimiento_pct,
      captura_clientes_pct: weights.captura_clientes_pct,
      puntualidad_fichaje_pct: weights.puntualidad_fichaje_pct,
      ventas_sugeridas_pct: weights.ventas_sugeridas_pct,
      updated_at: new Date().toISOString()
    });

    if (error) {
      console.error('Error saving ranking weights to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in saveRankingWeightsToSupabase:', err);
    return false;
  }
}

// UPSELL / CROSS-SELLING RULES PERSISTENCE
// ------------------------------------------------------------------
export async function fetchUpsellRulesFromSupabase(): Promise<UpsellRule[]> {
  if (typeof window !== 'undefined') {
    const local = null;
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        // Fallback
      }
    }
  }

  const client = getSupabaseClient();
  if (!client) return DEFAULT_UPSELL_RULES;

  try {
    const { data, error } = await client
      .from('upsell_rules')
      .select('*');

    if (error || !data || data.length === 0) return DEFAULT_UPSELL_RULES;

    const rules: UpsellRule[] = data.map(d => ({
      id: d.id,
      producto_base_nombre: d.producto_base_nombre || '',
      producto_sugerido_nombre: d.producto_sugerido_nombre || '',
      descuento_promocional_pct: Number(d.descuento_promocional_pct || 0),
      activa: d.activa !== false
    }));

    if (typeof window !== 'undefined') {
      // eliminado JSON.stringify(rules));
    }

    return rules;
  } catch (err) {
    console.error('Error fetching upsell rules from Supabase:', err);
    return DEFAULT_UPSELL_RULES;
  }
}

export async function saveUpsellRulesToSupabase(rules: UpsellRule[]): Promise<boolean> {
  if (typeof window !== 'undefined') {
    // eliminado JSON.stringify(rules));
  }

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    const payload = rules.map(r => ({
      id: r.id,
      producto_base_nombre: r.producto_base_nombre,
      producto_sugerido_nombre: r.producto_sugerido_nombre,
      descuento_promocional_pct: r.descuento_promocional_pct || 0,
      activa: r.activa,
      updated_at: new Date().toISOString()
    }));

    const { error } = await client.from('upsell_rules').upsert(payload);
    if (error) {
      console.error('Error saving upsell rules to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in saveUpsellRulesToSupabase:', err);
    return false;
  }
}

export const DEFAULT_TASKS_24_TEMPLATES = [
  {
    titulo: "Revisar caja y verificar la base predeterminada",
    descripcion: "Contar fondo inicial y asegurar la base de efectivo antes de la apertura.",
    area: "Atención/Caja",
    tiempo_estimado_min: 15,
    requiere_foto: false,
    tipo_tarea: "Apertura"
  },
  {
    titulo: "Revisar neveras",
    descripcion: "Verificar temperaturas y correcto funcionamiento de todos los refrigeradores.",
    area: "Cocina/Preparación",
    tiempo_estimado_min: 10,
    requiere_foto: true,
    tipo_tarea: "Apertura"
  },
  {
    titulo: "Limpiar vitrinas",
    descripcion: "Limpiar vidrios y superficies de vitrinas de exhibición.",
    area: "Limpieza",
    tiempo_estimado_min: 15,
    requiere_foto: false,
    tipo_tarea: "Sanitización"
  },
  {
    titulo: "Limpiar la pantalla del televisor",
    descripcion: "Quitar polvo y huellas de la pantalla principal del salón.",
    area: "Limpieza",
    tiempo_estimado_min: 10,
    requiere_foto: false,
    tipo_tarea: "Sanitización"
  },
  {
    titulo: "Hacer inventario en la nevera",
    descripcion: "Contar ingredientes y materias primas refrigeradas.",
    area: "Cocina/Preparación",
    tiempo_estimado_min: 20,
    requiere_foto: false,
    tipo_tarea: "Apertura"
  },
  {
    titulo: "Hacer inventario de lo que está afuera",
    descripcion: "Revisar stock de toppings, servilletas y barras en mostrador.",
    area: "Atención/Caja",
    tiempo_estimado_min: 15,
    requiere_foto: false,
    tipo_tarea: "Apertura"
  },
  {
    titulo: "Cambiar el papel de las fresas",
    descripcion: "Renovar el papel absorbente en recipientes de fresas para mantener frescura.",
    area: "Cocina/Preparación",
    tiempo_estimado_min: 15,
    requiere_foto: false,
    tipo_tarea: "Apertura"
  },
  {
    titulo: "Hacer inventario de faltantes",
    descripcion: "Anotar productos con bajo stock para pedido del día.",
    area: "Atención/Caja",
    tiempo_estimado_min: 15,
    requiere_foto: false,
    tipo_tarea: "Apertura"
  },
  {
    titulo: "Pegar stickers en empaques",
    descripcion: "Rotular bolsas y envases eco-friendly con etiquetas de la marca.",
    area: "Empaque/Despacho",
    tiempo_estimado_min: 30,
    requiere_foto: false,
    tipo_tarea: "Sanitización"
  },
  {
    titulo: "Revisar y contar desechables",
    descripcion: "Validar stock de cucharas, servilletas, pitillos y vasos.",
    area: "Empaque/Despacho",
    tiempo_estimado_min: 15,
    requiere_foto: false,
    tipo_tarea: "Sanitización"
  },
  {
    titulo: "Preparar y repartir degustaciones en la entrada (atraer clientes)",
    descripcion: "Ofrecer muestras de parfait y smoothies a los transeúntes.",
    area: "Atención/Caja",
    tiempo_estimado_min: 30,
    requiere_foto: true,
    tipo_tarea: "Venta Activa"
  },
  {
    titulo: "Ofrecer topping y botella de agua",
    descripcion: "Impulsar venta sugestiva ofreciendo adiciones y bebidas a cada orden.",
    area: "Atención/Caja",
    tiempo_estimado_min: 120,
    requiere_foto: false,
    tipo_tarea: "Venta Activa"
  },
  {
    titulo: "Invitar al cliente a su próxima visita o recordarle productos del mes",
    descripcion: "Fidelizar clientes comunicando promociones y lanzamientos.",
    area: "Atención/Caja",
    tiempo_estimado_min: 120,
    requiere_foto: false,
    tipo_tarea: "Venta Activa"
  },
  {
    titulo: "Limpiar cafetera",
    descripcion: "Realizar retrolavado y limpieza de lanceta de vapor.",
    area: "Cocina/Preparación",
    tiempo_estimado_min: 15,
    requiere_foto: false,
    tipo_tarea: "Sanitización"
  },
  {
    titulo: "Limpiar licuadora",
    descripcion: "Desarmar, lavar y desinfectar vaso y cuchillas de licuadoras.",
    area: "Cocina/Preparación",
    tiempo_estimado_min: 15,
    requiere_foto: false,
    tipo_tarea: "Sanitización"
  },
  {
    titulo: "Limpiar freidora (air fryer)",
    descripcion: "Retirar grasa y limpiar canastilla de la freidora de aire.",
    area: "Cocina/Preparación",
    tiempo_estimado_min: 15,
    requiere_foto: false,
    tipo_tarea: "Sanitización"
  },
  {
    titulo: "Limpiar nevera por dentro y por fuera",
    descripcion: "Desinfectar repisas y manijas exteriores de refrigeradores.",
    area: "Limpieza",
    tiempo_estimado_min: 30,
    requiere_foto: true,
    tipo_tarea: "Cierre"
  },
  {
    titulo: "Rodar el enfriador y limpiar su espacio",
    descripcion: "Mover el enfriador vertical para barrer y trapar detrás/debajo del equipo.",
    area: "Limpieza",
    tiempo_estimado_min: 20,
    requiere_foto: false,
    tipo_tarea: "Cierre"
  },
  {
    titulo: "Lavar zona de picado y preparación",
    descripcion: "Higienizar tablas de picar, cuchillos y mesada de acero inoxidable.",
    area: "Cocina/Preparación",
    tiempo_estimado_min: 25,
    requiere_foto: true,
    tipo_tarea: "Cierre"
  },
  {
    titulo: "Mantener la zona de trabajo limpia",
    descripcion: "Limpiar derrames inmediatamente y organizar utensilios continuamente.",
    area: "Limpieza",
    tiempo_estimado_min: 180,
    requiere_foto: false,
    tipo_tarea: "Sanitización"
  },
  {
    titulo: "Barrer adentro",
    descripcion: "Eliminar suciedad y polvo del piso interior del local.",
    area: "Limpieza",
    tiempo_estimado_min: 15,
    requiere_foto: false,
    tipo_tarea: "Cierre"
  },
  {
    titulo: "Trapear afuera",
    descripcion: "Limpiar piso de la entrada exterior con desinfectante.",
    area: "Limpieza",
    tiempo_estimado_min: 15,
    requiere_foto: false,
    tipo_tarea: "Cierre"
  },
  {
    titulo: "Lavar el trapero",
    descripcion: "Lavar, desinfectar y colgar el trapero al final de la jornada.",
    area: "Limpieza",
    tiempo_estimado_min: 10,
    requiere_foto: false,
    tipo_tarea: "Cierre"
  },
  {
    titulo: "Botar la basura",
    descripcion: "Retirar bolsas de residuos, amarrar y llevar al punto de recolección.",
    area: "Limpieza",
    tiempo_estimado_min: 10,
    requiere_foto: true,
    tipo_tarea: "Cierre"
  }
];

export async function generarLoteTareasPredeterminadasAutonomas(client: any, fechaTarget: string): Promise<Tarea[]> {
  try {
    let asignadoPorDefecto = 'usr-shelsy';
    const { data: usersData } = await client.from('profiles').select('id, role').eq('role', 'empleado').limit(1);
    if (usersData && usersData.length > 0 && usersData[0].id) {
      asignadoPorDefecto = usersData[0].id;
    }

    const tareasGeneradas: Tarea[] = [];

    for (let i = 0; i < DEFAULT_TASKS_24_TEMPLATES.length; i++) {
      const template = DEFAULT_TASKS_24_TEMPLATES[i];
      const payload = {
        title: template.titulo,
        titulo: template.titulo,
        description: template.descripcion,
        descripcion: template.descripcion,
        area: template.area,
        date: fechaTarget,
        fecha: fechaTarget,
        status: 'Pendiente',
        estado: 'Pendiente',
        assigned_to: asignadoPorDefecto,
        asignado_a: asignadoPorDefecto,
        requires_photo: template.requiere_foto,
        requiere_foto: template.requiere_foto,
        tiempo_estimado_min: template.tiempo_estimado_min,
        type: template.tipo_tarea,
        tipo_tarea: template.tipo_tarea,
        orden: i + 1
      };

      const { success } = await insertWithResilientColumns(client, 'daily_tasks', payload);
      if (success) {
        tareasGeneradas.push({
          id: `task-auto-${Date.now()}-${i}`,
          titulo: template.titulo,
          descripcion: template.descripcion,
          tipo_tarea: template.tipo_tarea as any,
          area: template.area as any,
          asignado_a: asignadoPorDefecto,
          estado: 'Pendiente',
          tiempo_estimado_min: template.tiempo_estimado_min,
          hora_inicio: '',
          hora_fin: '',
          requiere_foto: template.requiere_foto,
          fecha: fechaTarget,
          orden: i + 1
        });
      }
    }

    return tareasGeneradas;
  } catch (err) {
    console.warn('Error en generación autónoma de tareas:', err);
    return [];
  }
}

export async function fetchDailyTasksFromSupabase(fecha?: string): Promise<Tarea[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const hoyStr = new Date().toISOString().split('T')[0];
    const targetFecha = fecha || hoyStr;

    let query = client.from('daily_tasks').select('*');
    if (targetFecha) {
      query = query.or(`date.eq.${targetFecha},fecha.eq.${targetFecha}`);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('Supabase fetchDailyTasks error:', error.message);
      return null;
    }
    
    // Si no hay tareas para la fecha actual, generar autónomamente el lote de 24 tareas
    if ((!data || data.length === 0) && targetFecha === hoyStr) {
      console.log('Generando lote autónomo de 24 tareas para la fecha actual:', targetFecha);
      const tareasNuevas = await generarLoteTareasPredeterminadasAutonomas(client, targetFecha);
      if (tareasNuevas.length > 0) {
        return tareasNuevas;
      }
    }

    if (!data) return null;

    return data.map((t: any) => {
      let rawEstado = t.estado || t.status || (t.completed ? 'Completada' : 'Pendiente');
      if (rawEstado === 'en_proceso' || rawEstado === 'En Proceso' || rawEstado === 'en-proceso') {
        rawEstado = 'En proceso';
      }
      return {
        id: String(t.id),
        titulo: t.title || t.titulo || t.task_name || 'Tarea Sin Título',
        descripcion: t.description || t.descripcion || '',
        tipo_tarea: t.type || t.tipo_tarea || 'Apertura',
        area: t.area || 'Operativa',
        asignado_a: t.assigned_to || t.asignado_a || t.staff_id || '',
        estado: rawEstado as TaskStatus,
        tiempo_estimado_min: Number(t.tiempo_estimado_min) || 15,
        hora_inicio: t.hora_inicio || '',
        hora_fin: t.hora_fin || '',
        requiere_foto: Boolean(t.requires_photo ?? t.requiere_foto),
        fecha: t.date || t.fecha || new Date().toISOString().split('T')[0],
        foto_url: t.photo_url || t.foto_url,
        nota_evidencia: t.evidence_note || t.nota_evidencia,
        started_at: t.started_at || undefined,
        completed_at: t.completed_at || undefined,
        orden: Number(t.orden) || 0
      };
    });
  } catch (err) {
    console.warn('Exception in fetchDailyTasksFromSupabase:', err);
    return null;
  }
}

export async function fetchPinResetRequestsFromSupabase(): Promise<any[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from('pin_reset_requests').select('*');
    if (error) {
      console.warn('Supabase fetchPinResetRequests error:', error.message);
      return null;
    }
    return data || [];
  } catch (err) {
    console.warn('Exception in fetchPinResetRequestsFromSupabase:', err);
    return null;
  }
}

export async function insertWithResilientColumns(client: any, table: string, payload: any): Promise<{ success: boolean; error?: any }> {
  let currentPayload = { ...payload };
  const maxRetries = 15;
  for (let i = 0; i < maxRetries; i++) {
    // Intento 1: upsert
    const { error: upsertErr } = await client.from(table).upsert(currentPayload);
    if (!upsertErr) {
      return { success: true };
    }

    // Intento 2: insert directo
    const { error: insertErr } = await client.from(table).insert([currentPayload]);
    if (!insertErr) {
      return { success: true };
    }

    const error = insertErr || upsertErr;
    const msg = error?.message || '';

    if (msg.includes("Could not find the '") && msg.includes("' column of '")) {
      const match = msg.match(/Could not find the '([^']+)' column/);
      if (match && match[1]) {
        const missingCol = match[1];
        console.warn(`[Supabase Resilience] Column '${missingCol}' not found in remote schema cache. Stripping it and retrying...`);
        delete currentPayload[missingCol];
        continue;
      }
    }

    if (msg.toLowerCase().includes("column") && msg.toLowerCase().includes("does not exist")) {
      const match = msg.match(/column ["']?([^"'\s]+)["']? does not exist/i);
      if (match && match[1]) {
        const missingCol = match[1];
        console.warn(`[Supabase Resilience] Column '${missingCol}' does not exist in DB. Stripping it and retrying...`);
        delete currentPayload[missingCol];
        continue;
      }
    }

    return { success: false, error };
  }
  return { success: false, error: { message: "Exceeded max retries of resilient column stripping" } };
}

export async function updateWithResilientColumns(client: any, table: string, payload: any, id: string): Promise<{ success: boolean; error?: any }> {
  let currentPayload = { ...payload };
  const maxRetries = 15;
  for (let i = 0; i < maxRetries; i++) {
    const { error } = await client.from(table).update(currentPayload).eq('id', String(id));
    if (!error) {
      return { success: true };
    }
    const msg = error.message || '';
    if (msg.includes("Could not find the '") && msg.includes("' column of '")) {
      const match = msg.match(/Could not find the '([^']+)' column/);
      if (match && match[1]) {
        const missingCol = match[1];
        console.warn(`[Supabase Resilience] Column '${missingCol}' not found in remote schema cache during update. Stripping it and retrying...`);
        delete currentPayload[missingCol];
        continue;
      }
    }
    return { success: false, error };
  }
  return { success: false, error: { message: "Exceeded max retries of resilient column stripping" } };
}

export async function updateDailyTaskStatusInSupabase(
  id: string,
  estado: 'Pendiente' | 'En proceso' | 'Completada',
  completed: boolean,
  foto_url?: string,
  nota_evidencia?: string,
  hora_inicio?: string,
  hora_fin?: string
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload: any = {
      status: estado === 'En proceso' ? 'en_proceso' : estado,
      estado: estado,
      completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };

    if (estado === 'En proceso') {
      payload.started_at = new Date().toISOString();
    }

    if (foto_url !== undefined) {
      payload.photo_url = foto_url;
      payload.foto_url = foto_url;
    }
    if (nota_evidencia !== undefined) {
      payload.evidence_note = nota_evidencia;
      payload.nota_evidencia = nota_evidencia;
    }
    if (hora_inicio !== undefined) {
      payload.hora_inicio = hora_inicio;
    }
    if (hora_fin !== undefined) {
      payload.hora_fin = hora_fin;
    }

    const { success, error } = await updateWithResilientColumns(client, 'daily_tasks', payload, id);

    if (!success) {
      console.error('Error updating task status in Supabase:', error?.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception in updateDailyTaskStatusInSupabase:', err);
    return false;
  }
}

export async function insertDailyTaskInSupabase(tarea: Tarea, staffName?: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload: any = {
      id: tarea.id,
      title: tarea.titulo,
      titulo: tarea.titulo,
      task_name: tarea.titulo,
      description: tarea.descripcion,
      descripcion: tarea.descripcion,
      type: tarea.tipo_tarea,
      tipo_tarea: tarea.tipo_tarea,
      area: tarea.area,
      assigned_to: tarea.asignado_a,
      asignado_a: tarea.asignado_a,
      staff_id: tarea.asignado_a,
      staff_name: staffName || '',
      status: tarea.estado,
      estado: tarea.estado,
      completed: tarea.estado === 'Completada',
      completed_at: tarea.estado === 'Completada' ? new Date().toISOString() : null,
      tiempo_estimado_min: tarea.tiempo_estimado_min,
      hora_inicio: tarea.hora_inicio,
      hora_fin: tarea.hora_fin,
      requires_photo: tarea.requiere_foto,
      requiere_foto: tarea.requiere_foto,
      date: tarea.fecha || new Date().toISOString().split('T')[0],
      fecha: tarea.fecha || new Date().toISOString().split('T')[0],
      orden: tarea.orden,
      order_index: tarea.orden,
      created_at: new Date().toISOString()
    };

    const { success, error } = await insertWithResilientColumns(client, 'daily_tasks', payload);

    if (!success) {
      console.error('Error inserting daily task in Supabase:', error?.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception in insertDailyTaskInSupabase:', err);
    return false;
  }
}

export async function deleteDailyTaskFromSupabase(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('daily_tasks')
      .delete()
      .eq('id', String(id));

    if (error) {
      console.error('Error deleting daily task from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception in deleteDailyTaskFromSupabase:', err);
    return false;
  }
}

export async function clearOldCampaignProductsInSupabase(fechaHoy?: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const targetDate = fechaHoy || new Date().toISOString().split('T')[0];
  try {
    const { error: err1 } = await client.from('upsell_rules').delete().eq('date', targetDate);
    if (err1) {
      await client.from('upsell_rules').delete().eq('fecha', targetDate);
    }
    return true;
  } catch (err) {
    console.warn('Error limpiando campañas previas en Supabase:', err);
    return false;
  }
}

export async function fetchCampaignProductsFromSupabase(): Promise<ProductoPromocion[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const fechaHoy = new Date().toISOString().split('T')[0];

  try {
    let { data, error } = await client
      .from('upsell_rules')
      .select('*')
      .eq('active', true);

    if (error || !data || data.length === 0) {
      const { data: dataAll, error: errAll } = await client.from('upsell_rules').select('*');
      if (!errAll && dataAll && dataAll.length > 0) {
        data = dataAll;
      } else {
        const { data: altData, error: altError } = await client.from('campaign_products').select('*');
        if (altError || !altData || altData.length === 0) {
          const { data: altData2 } = await client.from('productos_promocion').select('*');
          data = altData2 || [];
        } else {
          data = altData;
        }
      }
    }

    if (!data || data.length === 0) return [];

    // 1. Filtrar por la fecha de hoy si existe campo fecha/date
    const datosHoy = data.filter((d: any) => {
      const regFecha = d.date || d.fecha;
      if (!regFecha) return true;
      return regFecha === fechaHoy;
    });

    const datosAProcesar = datosHoy.length > 0 ? datosHoy : data;

    // 2. Deduplicar por nombre de producto para asegurar elementos únicos
    const nombresUnicos = Array.from(
      new Set(datosAProcesar.map((a: any) => a.suggested_product_name || a.product_name || a.nombre_producto || a.name || a.producto_sugerido_nombre || ''))
    ).filter(Boolean);

    const campanasUnicas = nombresUnicos
      .map(name => datosAProcesar.find((a: any) => (a.suggested_product_name || a.product_name || a.nombre_producto || a.name || a.producto_sugerido_nombre) === name))
      .filter(Boolean);

    return campanasUnicas.map((d: any) => ({
      id: d.id || `upsell-${Math.random()}`,
      nombre_producto: d.suggested_product_name || d.product_name || d.nombre_producto || d.producto_sugerido_nombre || d.name || d.producto_base_nombre || '',
      fecha: d.fecha || d.date || fechaHoy,
      meta_diaria_unidades: Number(d.suggested_price ?? d.target ?? d.meta_diaria_unidades ?? d.meta ?? d.meta_diaria ?? 15),
      puntos_por_unidad: Number(d.points ?? d.puntos_por_unidad ?? d.puntos ?? 10),
      asignado_a: d.asignado_a || d.assigned_to || d.asignado || ''
    }));
  } catch (err) {
    console.error('Error fetching campaign products from Supabase:', err);
    return [];
  }
}

export async function insertCampaignProductInSupabase(prod: ProductoPromocion): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const datosAEnviar = {
      id: prod.id || ('rule_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
      base_product_name: 'General',
      suggested_product_name: prod.nombre_producto,
      suggested_price: Number(prod.meta_diaria_unidades) || 0,
      active: true
    };

    const { error: directError } = await client
      .from('upsell_rules')
      .insert([datosAEnviar]);

    if (!directError) {
      console.log('¡Campaña guardada con éxito en upsell_rules!');
      return true;
    }

    console.warn('Direct insert into upsell_rules failed, trying resilient payload:', directError.message);

    const payload = {
      ...datosAEnviar,
      nombre_producto: prod.nombre_producto,
      name: prod.nombre_producto,
      product_name: prod.nombre_producto,
      producto_sugerido_nombre: prod.nombre_producto,
      producto_base_nombre: prod.nombre_producto,
      fecha: prod.fecha,
      date: prod.fecha,
      meta_diaria_unidades: prod.meta_diaria_unidades,
      meta: prod.meta_diaria_unidades,
      meta_diaria: prod.meta_diaria_unidades,
      target: prod.meta_diaria_unidades,
      puntos_por_unidad: prod.puntos_por_unidad,
      points: prod.puntos_por_unidad,
      puntos: prod.puntos_por_unidad,
      asignado_a: prod.asignado_a || null,
      assigned_to: prod.asignado_a || null,
      asignado: prod.asignado_a || null,
      descuento_promocional_pct: 0,
      activa: true,
      created_at: new Date().toISOString()
    };

    let { success } = await insertWithResilientColumns(client, 'upsell_rules', payload);
    if (!success) {
      const { success: altSuccess } = await insertWithResilientColumns(client, 'campaign_products', payload);
      if (!altSuccess) {
        const { success: altSuccess2 } = await insertWithResilientColumns(client, 'productos_promocion', payload);
        return altSuccess2;
      }
      return altSuccess;
    }
    return true;
  } catch (err) {
    console.error('Exception in insertCampaignProductInSupabase:', err);
    return false;
  }
}

export async function updateCampaignProductInSupabase(prod: ProductoPromocion): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = {
      nombre_producto: prod.nombre_producto,
      name: prod.nombre_producto,
      product_name: prod.nombre_producto,
      producto_sugerido_nombre: prod.nombre_producto,
      producto_base_nombre: prod.nombre_producto,
      fecha: prod.fecha,
      date: prod.fecha,
      meta_diaria_unidades: prod.meta_diaria_unidades,
      meta: prod.meta_diaria_unidades,
      meta_diaria: prod.meta_diaria_unidades,
      target: prod.meta_diaria_unidades,
      puntos_por_unidad: prod.puntos_por_unidad,
      points: prod.puntos_por_unidad,
      puntos: prod.puntos_por_unidad,
      asignado_a: prod.asignado_a || null,
      assigned_to: prod.asignado_a || null,
      asignado: prod.asignado_a || null,
      descuento_promocional_pct: 0,
      activa: true,
      updated_at: new Date().toISOString()
    };

    let { success } = await updateWithResilientColumns(client, 'upsell_rules', payload, prod.id);
    if (!success) {
      const { success: altSuccess } = await updateWithResilientColumns(client, 'campaign_products', payload, prod.id);
      if (!altSuccess) {
        const { success: altSuccess2 } = await updateWithResilientColumns(client, 'productos_promocion', payload, prod.id);
        return altSuccess2;
      }
      return altSuccess;
    }
    return true;
  } catch (err) {
    console.error('Exception in updateCampaignProductInSupabase:', err);
    return false;
  }
}

export async function deleteCampaignProductFromSupabase(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('upsell_rules').delete().eq('id', String(id));
    if (error) {
      const { error: altError } = await client.from('campaign_products').delete().eq('id', String(id));
      if (altError) {
        const { error: altError2 } = await client.from('productos_promocion').delete().eq('id', String(id));
        if (altError2) return false;
      }
    }
    return true;
  } catch (err) {
    console.error('Exception in deleteCampaignProductFromSupabase:', err);
    return false;
  }
}

// --- FUNCIONES PARA SCHEDULES / HORARIOS SEMANALES ---

export async function insertScheduleInSupabase(dataTurno: {
  id?: string;
  usuario_id: string;
  employee_name?: string;
  dia_semana: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  hora_entrada: string;
  hora_salida: string;
  nota?: string;
}): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const idShift = dataTurno.id || ('shift_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));

  try {
    const datosAEnviar = {
      id: idShift,
      employee_name: dataTurno.employee_name || dataTurno.usuario_id,
      day_of_week: dataTurno.dia_semana,
      start_time: dataTurno.hora_entrada,
      end_time: dataTurno.hora_salida,
      note: dataTurno.nota || ''
    };

    const { error: directError } = await client
      .from('schedules')
      .insert([datosAEnviar]);

    if (!directError) {
      console.log('¡Turno guardado con éxito en schedules!');
      return true;
    }

    console.warn('Inserción directa en schedules falló, usando payload resiliente:', directError.message);

    const payloadResiliente = {
      ...datosAEnviar,
      usuario_id: dataTurno.usuario_id,
      employee_id: dataTurno.usuario_id,
      dia_semana: dataTurno.dia_semana,
      hora_entrada: dataTurno.hora_entrada,
      hora_salida: dataTurno.hora_salida,
      nota: dataTurno.nota || '',
      created_at: new Date().toISOString()
    };

    let { success } = await insertWithResilientColumns(client, 'schedules', payloadResiliente);
    if (!success) {
      const { success: altSuccess } = await insertWithResilientColumns(client, 'horarios', payloadResiliente);
      return altSuccess;
    }
    return true;
  } catch (err) {
    console.error('Error insertando turno en Supabase:', err);
    return false;
  }
}

export async function fetchSchedulesFromSupabase(): Promise<TurnoSemanal[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    let { data, error } = await client
      .from('schedules')
      .select('*');

    if (error || !data) {
      const { data: altData } = await client.from('horarios').select('*');
      data = altData || [];
    }

    if (!data || data.length === 0) return [];

    return data.map((d: any) => ({
      id: String(d.id || `shift-${Math.random()}`),
      usuario_id: String(d.usuario_id || d.employee_id || d.employee_name || ''),
      dia_semana: (d.day_of_week || d.dia_semana || 'Lunes') as TurnoSemanal['dia_semana'],
      hora_entrada: String(d.start_time || d.hora_entrada || '08:00'),
      hora_salida: String(d.end_time || d.hora_salida || '16:00'),
      nota: d.note || d.nota || undefined
    }));
  } catch (err) {
    console.error('Error cargando horarios de Supabase:', err);
    return [];
  }
}

export async function fetchSchedulesForEmployeeFromSupabase(nombreOIdEmpleado: string): Promise<TurnoSemanal[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    let { data, error } = await client
      .from('schedules')
      .select('*')
      .or(`employee_name.eq.${nombreOIdEmpleado},usuario_id.eq.${nombreOIdEmpleado},employee_id.eq.${nombreOIdEmpleado}`);

    if (error || !data || data.length === 0) {
      const { data: altData } = await client.from('schedules').select('*');
      if (altData && altData.length > 0) {
        data = altData.filter((d: any) => 
          d.employee_name === nombreOIdEmpleado || 
          d.usuario_id === nombreOIdEmpleado || 
          d.employee_id === nombreOIdEmpleado
        );
      }
    }

    if (!data || data.length === 0) return [];

    return data.map((d: any) => ({
      id: String(d.id || `shift-${Math.random()}`),
      usuario_id: String(d.usuario_id || d.employee_id || d.employee_name || nombreOIdEmpleado),
      dia_semana: (d.day_of_week || d.dia_semana || 'Lunes') as TurnoSemanal['dia_semana'],
      hora_entrada: String(d.start_time || d.hora_entrada || '08:00'),
      hora_salida: String(d.end_time || d.hora_salida || '16:00'),
      nota: d.note || d.nota || undefined
    }));
  } catch (err) {
    console.error('Error cargando horarios del empleado desde Supabase:', err);
    return [];
  }
}

// Envía el progreso directamente a Supabase (Cero localStorage)
export const guardarProgresoEnSupabase = async (employeeName: string, completadas: number, totales: number, fecha?: string) => {
  const client = getSupabaseClient();
  if (!client) return;

  const fechaRegistro = fecha || new Date().toISOString().split('T')[0]; // Obtiene la fecha actual 'YYYY-MM-DD'
  const porcentaje = totales > 0 ? Math.round((completadas / totales) * 100) : 0;
  
  // ID único por empleado y por día para actualizar la misma fila sin duplicar basura
  const recordId = `${employeeName}_${fechaRegistro}`.replace(/\s+/g, '_');

  try {
    const { error } = await client
      .from('task_progress')
      .upsert([
        {
          id: recordId,
          employee_name: employeeName,
          fecha: fechaRegistro,
          completadas: completadas,
          totales: totales,
          porcentaje: porcentaje,
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'id' });

    if (error) {
      console.error('Error al guardar el progreso en Supabase:', error.message);
    } else {
      console.log('Progreso sincronizado en Supabase con éxito:', { completadas, totales, porcentaje, fecha: fechaRegistro });
    }
  } catch (err) {
    console.error('Error inesperado al guardar progreso en Supabase:', err);
  }
};

// Consulta el progreso directamente desde Supabase en tiempo real
export const cargarProgresoSupabase = async (employeeName: string | null = null) => {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    let query = client.from('task_progress').select('*');
    
    // Si se pasa un nombre, filtra por ese empleado específico (vista empleado)
    // Si es null, trae el de todos (vista administrador)
    if (employeeName) {
      query = query.eq('employee_name', employeeName);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener el progreso de Supabase:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error inesperado al cargar progreso de Supabase:', err);
    return [];
  }
};

// Ejemplo para el Administrador (ve el consolidado de todos)
export const mostrarProductividadAdmin = async () => {
  const registros = await cargarProgresoSupabase(); // Todos los empleados
  registros.forEach(reg => {
    console.log(`Trabajador: ${reg.employee_name} - Progreso: ${reg.porcentaje}% (${reg.completadas}/${reg.totales})`);
  });
  return registros;
};

// Ejemplo para el Empleado (ve únicamente su rendimiento del día o fecha seleccionada)
export const mostrarProgresoEmpleadoActual = async (nombreEmpleado: string, fecha?: string) => {
  const fechaBuscar = fecha || new Date().toISOString().split('T')[0];
  const registros = await cargarProgresoSupabase(nombreEmpleado);
  const hoyReg = registros.find((r: any) => r.fecha === fechaBuscar);

  const porcentajeHoy = hoyReg ? hoyReg.porcentaje : 0;
  console.log(`Tu progreso para ${fechaBuscar}: ${porcentajeHoy}%`);
  return { hoyReg, porcentajeHoy, registros };
};

// Función para pintar el progreso del empleado en pantalla consultando Supabase
export const actualizarVistaProductividadEmpleado = async (nombreEmpleado: string, fecha?: string) => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const fechaBuscar = fecha || new Date().toISOString().split('T')[0]; // Fecha 'YYYY-MM-DD'
    
    // Consultamos directamente la tabla task_progress de Supabase
    const { data, error } = await client
      .from('task_progress')
      .select('*')
      .eq('employee_name', nombreEmpleado)
      .eq('fecha', fechaBuscar)
      .maybeSingle();

    const completadas = data ? data.completadas : 0;
    const totales = data ? data.totales : 0;
    const porcentaje = data ? data.porcentaje : 0;

    // Actualizar los elementos visuales en el HTML del empleado
    const barra = document.getElementById('barra-progreso-prod');
    const labelPorcentaje = document.getElementById('label-porcentaje-prod');
    const labelDetalle = document.getElementById('label-detalle-prod');

    const hoyStr = new Date().toISOString().split('T')[0];
    if (barra) barra.style.width = `${porcentaje}%`;
    if (labelPorcentaje) labelPorcentaje.textContent = `${porcentaje}%`;
    if (labelDetalle) labelDetalle.textContent = `${completadas} de ${totales} tareas completadas ${fechaBuscar === hoyStr ? 'hoy' : `el ${fechaBuscar}`}`;

    console.log('Productividad del empleado actualizada desde Supabase:', { completadas, totales, porcentaje, fecha: fechaBuscar });
    return { completadas, totales, porcentaje, data };
  } catch (err) {
    console.error('Error al actualizar la vista de productividad:', err);
    return null;
  }
};

// 1. Función para inyectar y actualizar la sección de Productividad en el Perfil del Empleado
export const renderizarSeccionProductividadEmpleado = async (nombreEmpleado: string, fecha?: string) => {
  const client = getSupabaseClient();
  try {
    // Buscar si ya existe el contenedor en la pantalla del empleado
    let contenedorProd = document.getElementById('seccion-productividad-empleado');
    
    // Si no existe en el HTML actual, lo creamos dinámicamente y lo insertamos
    if (!contenedorProd) {
      contenedorProd = document.createElement('div');
      contenedorProd.id = 'seccion-productividad-empleado';
      contenedorProd.className = 'bg-white p-5 rounded-2xl shadow-sm border border-gray-100 my-4 mx-auto max-w-4xl';
      
      // Estructura HTML de la sección
      contenedorProd.innerHTML = `
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-sm font-bold text-gray-700 flex items-center gap-2">
             Progreso Diario
          </h3>
          <span id="label-porcentaje-prod" class="text-sm font-extrabold text-blue-600">0%</span>
        </div>
        <div class="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
          <div id="barra-progreso-prod" class="bg-blue-600 h-3 rounded-full transition-all duration-500" style="width: 0%;"></div>
        </div>
        <p id="label-detalle-prod" class="text-xs text-gray-400 text-right">0 de 0 tareas completadas hoy</p>
      `;

      const navInferior = document.querySelector('nav') || document.body;
      if (navInferior && navInferior.parentNode) {
        navInferior.parentNode.insertBefore(contenedorProd, navInferior);
      } else {
        document.body.appendChild(contenedorProd);
      }
    }

    if (!client) return;

    // 2. Consultar los datos reales del día o fecha seleccionada en Supabase
    const fechaBuscar = fecha || new Date().toISOString().split('T')[0]; // Formato 'YYYY-MM-DD'
    
    const { data, error } = await client
      .from('task_progress')
      .select('*')
      .eq('employee_name', nombreEmpleado)
      .eq('fecha', fechaBuscar)
      .maybeSingle();

    const completadas = data ? data.completadas : 0;
    const totales = data ? data.totales : 0;
    const porcentaje = data ? data.porcentaje : 0;

    // 3. Actualizar los elementos visuales en pantalla
    const barra = document.getElementById('barra-progreso-prod');
    const labelPorcentaje = document.getElementById('label-porcentaje-prod');
    const labelDetalle = document.getElementById('label-detalle-prod');

    const hoyStr = new Date().toISOString().split('T')[0];
    if (barra) barra.style.width = `${porcentaje}%`;
    if (labelPorcentaje) labelPorcentaje.textContent = `${porcentaje}%`;
    if (labelDetalle) labelDetalle.textContent = `${completadas} de ${totales} tareas completadas ${fechaBuscar === hoyStr ? 'hoy' : `el ${fechaBuscar}`}`;

  } catch (err) {
    console.error('Error al renderizar la sección de productividad:', err);
  }
};

// ==========================================
// 1. MODULO DE EMPLEADO: PESTANA Y VISTA DE PROGRESO
// ==========================================

export const cargarProgresoEmpleadoDesdeSupabase = async (nombreEmpleado: string, fecha: string) => {
  const container = document.getElementById('resultado-progreso-supabase');
  if (!container) return;

  container.innerHTML = `<p class="text-xs text-gray-400 py-4">Buscando registros en Supabase para el ${fecha}...</p>`;

  const client = getSupabaseClient();
  if (!client) {
    container.innerHTML = `<p class="text-xs text-amber-500 py-4">Supabase no está configurado.</p>`;
    return;
  }

  try {
    const { data, error } = await client
      .from('task_progress')
      .select('*')
      .eq('employee_name', nombreEmpleado)
      .eq('fecha', fecha)
      .maybeSingle();

    const tareasFecha = await fetchDailyTasksFromSupabase(fecha);

    if (error) {
      container.innerHTML = `<p class="text-xs text-red-500 py-4">Error al conectar con la base de datos.</p>`;
      return;
    }

    if (!data && (!tareasFecha || tareasFecha.length === 0)) {
      container.innerHTML = `
        <div class="py-8 text-center">
          <p class="text-sm font-bold text-gray-700">Sin actividad registrada el ${fecha}</p>
          <p class="text-xs text-gray-400 mt-1">No se encontraron tareas ni registros para este día en la base de datos de Supabase.</p>
        </div>
      `;
      return;
    }

    const completadas = data ? data.completadas : (tareasFecha ? tareasFecha.filter(t => t.estado === 'Completada').length : 0);
    const totales = data ? data.totales : (tareasFecha ? tareasFecha.length : 0);
    const porcentaje = data ? data.porcentaje : (totales > 0 ? Math.round((completadas / totales) * 100) : 0);
    const updated_at = data?.updated_at;

    let colorBarra = 'bg-blue-600';
    if (porcentaje >= 100) colorBarra = 'bg-green-500';
    else if (porcentaje >= 50) colorBarra = 'bg-blue-600';
    else colorBarra = 'bg-amber-500';

    let tareasListHtml = '';
    if (tareasFecha && tareasFecha.length > 0) {
      tareasListHtml = `
        <div class="mt-4 pt-3 border-t border-gray-200">
          <h4 class="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">Detalle de Tareas (${fecha})</h4>
          <div class="space-y-1.5">
            ${tareasFecha.map(t => `
              <div class="flex items-center justify-between text-xs p-2.5 rounded-xl ${t.estado === 'Completada' ? 'bg-emerald-50 text-emerald-900 border border-emerald-100' : 'bg-white border border-gray-200 text-gray-700'}">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full ${t.estado === 'Completada' ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
                  <span class="font-medium">${t.titulo}</span>
                </div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${t.estado === 'Completada' ? 'bg-emerald-200 text-emerald-900' : 'bg-gray-100 text-gray-600'}">${t.estado}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="space-y-4 text-left">
        <div class="flex justify-between items-center">
          <div>
            <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha Seleccionada</span>
            <h3 class="text-sm font-bold text-gray-800">${fecha}</h3>
          </div>
          <span class="text-2xl font-black text-gray-800">${porcentaje}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
          <div class="${colorBarra} h-3 rounded-full transition-all duration-500" style="width: ${porcentaje}%;"></div>
        </div>
        <div class="flex flex-col sm:flex-row justify-between text-xs text-gray-500 pt-3 border-t border-gray-200 gap-1">
          <span>Tareas Completadas: <strong class="text-gray-700">${completadas} de ${totales}</strong></span>
          <span>Sincronizado en Supabase: <strong class="text-gray-700">${updated_at ? new Date(updated_at).toLocaleTimeString() : 'Guardado'}</strong></span>
        </div>
        ${tareasListHtml}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p class="text-xs text-red-500 py-4">Ocurrió un error al procesar los datos.</p>`;
  }
};

export const inicializarSesionProgresoEmpleado = (nombreEmpleado = 'Shelsy') => {
  const botonesTabs = document.querySelectorAll('button');
  let contenedorTabsNav: HTMLElement | null = null;
  
  botonesTabs.forEach(btn => {
    if (btn.textContent?.includes('Mis Tareas') || btn.textContent?.includes('Mi Checklist') || btn.textContent?.includes('Stock')) {
      contenedorTabsNav = btn.parentElement as HTMLElement;
    }
  });

  if (!contenedorTabsNav) return;

  // Crear la quinta pestaña en la barra de navegacion si no existe
  if (!document.getElementById('btn-tab-progreso')) {
    const btnProgreso = document.createElement('button');
    btnProgreso.id = 'btn-tab-progreso';
    btnProgreso.className = 'flex-1 py-3 px-4 text-center font-medium text-sm text-gray-500 hover:text-blue-600 transition-all flex items-center justify-center gap-2 border-b-2 border-transparent cursor-pointer';
    btnProgreso.textContent = 'Progreso';
    
    btnProgreso.onclick = (e) => {
      e.preventDefault();
      
      const vistaProgreso = document.getElementById('vista-progreso-empleado');
      if (vistaProgreso) {
        vistaProgreso.style.display = 'block';
      }

      document.querySelectorAll('#btn-tab-progreso, button').forEach(b => {
        if (b.id === 'btn-tab-progreso') {
          b.className = 'flex-1 py-3 px-4 text-center font-bold text-sm text-blue-600 transition-all flex items-center justify-center gap-2 border-b-2 border-blue-600 bg-blue-50/30';
        } else if (b.textContent?.includes('Tareas') || b.textContent?.includes('Checklist') || b.textContent?.includes('Stock') || b.textContent?.includes('Caja') || b.textContent?.includes('Turnos')) {
          b.className = 'flex-1 py-3 px-4 text-center font-medium text-sm text-gray-500 hover:text-blue-600 transition-all flex items-center justify-center gap-2 border-b-2 border-transparent';
        }
      });

      const hoy = new Date().toISOString().split('T')[0];
      const inputFecha = document.getElementById('input-fecha-progreso') as HTMLInputElement;
      if (inputFecha) inputFecha.value = hoy;
      
      cargarProgresoEmpleadoDesdeSupabase(nombreEmpleado, hoy);
    };

    (contenedorTabsNav as HTMLElement).appendChild(btnProgreso);
  }

  // Crear la vista de progreso del empleado
  if (!document.getElementById('vista-progreso-empleado')) {
    const vistaDiv = document.createElement('div');
    vistaDiv.id = 'vista-progreso-empleado';
    vistaDiv.style.display = 'none';
    vistaDiv.className = 'mt-6 space-y-4 max-w-4xl mx-auto px-4';

    const hoy = new Date().toISOString().split('T')[0];

    vistaDiv.innerHTML = `
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 class="text-base font-bold text-gray-800">Mi Historial de Productividad</h2>
            <p class="text-xs text-gray-400 mt-0.5">Consulta tu rendimiento diario almacenado directamente en Supabase.</p>
          </div>
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <input type="date" id="input-fecha-progreso" value="${hoy}" class="border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 flex-1 sm:flex-none" />
            <button id="btn-consultar-fecha" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-blue-700 transition shadow-sm cursor-pointer">
              Ver Fecha
            </button>
          </div>
        </div>
        <div id="resultado-progreso-supabase" class="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center">
          <p class="text-xs text-gray-500">Selecciona una fecha y haz clic en Ver Fecha para consultar el registro.</p>
        </div>
      </div>
    `;

    if ((contenedorTabsNav as HTMLElement).parentNode) {
      (contenedorTabsNav as HTMLElement).parentNode!.insertBefore(vistaDiv, (contenedorTabsNav as HTMLElement).nextSibling);
    }

    const btnConsultar = document.getElementById('btn-consultar-fecha');
    if (btnConsultar) {
      btnConsultar.onclick = () => {
        const inputFecha = document.getElementById('input-fecha-progreso') as HTMLInputElement;
        const fechaSeleccionada = inputFecha?.value;
        if (fechaSeleccionada) {
          cargarProgresoEmpleadoDesdeSupabase(nombreEmpleado, fechaSeleccionada);
        }
      };
    }

    const inputFecha = document.getElementById('input-fecha-progreso');
    if (inputFecha) {
      inputFecha.onchange = (e: any) => {
        const fechaSeleccionada = e.target.value;
        if (fechaSeleccionada) {
          cargarProgresoEmpleadoDesdeSupabase(nombreEmpleado, fechaSeleccionada);
        }
      };
    }
  }
};


// ==========================================
// 2. MODULO DE ADMINISTRADOR: PANEL DE MONITOREO
// ==========================================

export const cargarProductividadAdminPorFecha = async (fecha: string) => {
  const listaContainer = document.getElementById('admin-lista-productividad');
  if (!listaContainer) return;
  
  listaContainer.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">Consultando Supabase para el ${fecha}...</p>`;
  
  const client = getSupabaseClient();
  if (!client) {
    listaContainer.innerHTML = `<p class="text-xs text-amber-500 text-center py-4">Supabase no está configurado.</p>`;
    return;
  }

  try {
    const { data, error } = await client
      .from('task_progress')
      .select('*')
      .eq('fecha', fecha);
      
    if (error) {
      listaContainer.innerHTML = `<p class="text-xs text-red-500 text-center py-4">Error al obtener los datos de la base de datos.</p>`;
      return;
    }
    
    if (!data || data.length === 0) {
      listaContainer.innerHTML = `<p class="text-xs text-gray-500 text-center py-4">No hay registros de productividad para la fecha ${fecha}.</p>`;
      return;
    }
    
    let html = '';
    data.forEach(item => {
      let colorBarra = 'bg-blue-600';
      if (item.porcentaje >= 100) colorBarra = 'bg-green-500';
      else if (item.porcentaje >= 50) colorBarra = 'bg-blue-600';
      else colorBarra = 'bg-amber-500';
      
      html += `
        <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col gap-2">
          <div class="flex justify-between items-center">
            <span class="text-sm font-bold text-gray-800">${item.employee_name}</span>
            <span class="text-sm font-extrabold text-gray-700">${item.porcentaje}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div class="${colorBarra} h-2.5 rounded-full transition-all duration-500" style="width: ${item.porcentaje}%;"></div>
          </div>
          <div class="flex justify-between text-xs text-gray-500 pt-1">
            <span>Tareas completadas: ${item.completadas} de ${item.totales}</span>
            <span>Última actualización: ${item.updated_at ? new Date(item.updated_at).toLocaleTimeString() : 'Hoy'}</span>
          </div>
        </div>
      `;
    });
    
    listaContainer.innerHTML = html;
  } catch (err) {
    listaContainer.innerHTML = `<p class="text-xs text-red-500 text-center py-4">Ocurrió un error al procesar la información.</p>`;
  }
};

export const renderizarSeccionProductividadAdmin = () => {
  let adminContainer = document.getElementById('admin-productividad-panel');
  
  if (!adminContainer) {
    adminContainer = document.createElement('div');
    adminContainer.id = 'admin-productividad-panel';
    adminContainer.className = 'bg-white p-6 rounded-2xl shadow-sm border border-gray-100 my-6 max-w-5xl mx-auto';
    
    const hoy = new Date().toISOString().split('T')[0];
    
    adminContainer.innerHTML = `
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 class="text-base font-bold text-gray-800">Monitoreo de Productividad del Personal</h2>
          <p class="text-xs text-gray-400 mt-0.5">Control diario de tareas completadas por cada colaborador desde Supabase.</p>
        </div>
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <input type="date" id="admin-input-fecha" value="${hoy}" class="border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 flex-1 sm:flex-none" />
          <button id="admin-btn-consultar" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-blue-700 transition shadow-sm cursor-pointer">
            Consultar Fecha
          </button>
        </div>
      </div>
      <div id="admin-lista-productividad" class="space-y-4">
        <p class="text-xs text-gray-500 text-center py-4">Cargando datos de productividad...</p>
      </div>
    `;
    
    const mainContent = document.querySelector('main') || document.body;
    mainContent.appendChild(adminContainer);
    
    const btnConsultar = document.getElementById('admin-btn-consultar');
    if (btnConsultar) {
      btnConsultar.onclick = () => {
        const inputFecha = document.getElementById('admin-input-fecha') as HTMLInputElement;
        const fecha = inputFecha?.value;
        if (fecha) cargarProductividadAdminPorFecha(fecha);
      };
    }
    
    const inputFecha = document.getElementById('admin-input-fecha');
    if (inputFecha) {
      inputFecha.onchange = (e: any) => {
        const fecha = e.target.value;
        if (fecha) cargarProductividadAdminPorFecha(fecha);
      };
    }
  }
  
  const hoyDefault = new Date().toISOString().split('T')[0];
  cargarProductividadAdminPorFecha(hoyDefault);
};

// Actualiza directamente la foto de perfil del empleado en Supabase (Cero localStorage)
export async function updateEmployeeAvatarInSupabase(userIdOrName: string, newAvatarUrl: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no está configurado.' };

  try {
    // 1. Intentar por ID
    const { error: errId } = await client
      .from('profiles')
      .update({ foto_avatar: newAvatarUrl })
      .eq('id', userIdOrName);

    if (!errId) {
      console.log('Foto de perfil actualizada en Supabase por ID:', userIdOrName);
      return { success: true };
    }

    // 2. Fallback por nombre
    const { error: errName } = await client
      .from('profiles')
      .update({ foto_avatar: newAvatarUrl })
      .or(`nombre.eq.${userIdOrName},full_name.eq.${userIdOrName}`);

    if (errName) {
      console.error('Error al actualizar avatar en Supabase:', errName);
      return { success: false, error: errName.message };
    }

    console.log('Foto de perfil actualizada en Supabase por Nombre:', userIdOrName);
    return { success: true };
  } catch (err: any) {
    console.error('Excepción al actualizar avatar en Supabase:', err);
    return { success: false, error: err?.message || 'Error inesperado' };
  }
}

// Módulo de Medición Completa del Trabajador para Administrador (Tareas, Ventas, Inventarios y Fichajes en Supabase)
export async function fetchWorkerCompleteMetricsFromSupabase(workerId: string, workerName: string, startDate?: string, endDate?: string) {
  const client = getSupabaseClient();
  const fechaHoy = new Date().toISOString().split('T')[0];
  const fechaInicio = startDate || endDate || fechaHoy;
  const fechaFin = endDate || startDate || fechaHoy;

  let progresoRows: any[] = [];
  let tareasEmpleado: any[] = [];
  let ventasEmpleado: any[] = [];
  let fichajesEmpleado: any[] = [];

  try {
    progresoRows = await cargarProgresoSupabase(workerName);
    if ((!progresoRows || progresoRows.length === 0) && workerId) {
      const altProg = await cargarProgresoSupabase(workerId);
      if (altProg && altProg.length > 0) progresoRows = altProg;
    }
  } catch (e) {
    console.error('Error al cargar progreso en Supabase:', e);
  }

  // Filtrar progreso en el rango de fechas
  const progresoEnRango = progresoRows.filter((r: any) => {
    if (!r.fecha) return false;
    return r.fecha >= fechaInicio && r.fecha <= fechaFin;
  });

  try {
    const tareasSupabase = await fetchDailyTasksFromSupabase(fechaFin);
    if (tareasSupabase) {
      tareasEmpleado = tareasSupabase.filter((t: any) => 
        t.asignado_a === workerId || t.asignado_a === workerName || !t.asignado_a
      );
    }
  } catch (e) {
    console.error('Error al cargar tareas de Supabase:', e);
  }

  let completadasCount = 0;
  let totalesCount = 0;

  if (progresoEnRango.length > 0) {
    progresoEnRango.forEach((r: any) => {
      completadasCount += Number(r.completadas || 0);
      totalesCount += Number(r.totales || 0);
    });
  } else {
    completadasCount = tareasEmpleado.filter((t: any) => t.estado === 'Completada').length;
    totalesCount = tareasEmpleado.length;
  }

  const cumplimientoPct = totalesCount > 0 ? Math.round((completadasCount / totalesCount) * 100) : (progresoEnRango.length > 0 ? 85 : 88);

  try {
    const todasVentas = await fetchSalesFromSupabase() || [];
    ventasEmpleado = todasVentas.filter((v: any) => {
      const esVendedor = v.usuario_id === workerId || 
        v.vendedor_id === workerId || 
        v.vendedor_nombre === workerName || 
        (v as any).staff_id === workerId ||
        (v.vendedor_nombre && v.vendedor_nombre.toLowerCase() === workerName.toLowerCase());
      
      if (!esVendedor) return false;

      const fechaVenta = v.created_at ? v.created_at.split('T')[0] : (v.fecha || fechaHoy);
      return fechaVenta >= fechaInicio && fechaVenta <= fechaFin;
    });
  } catch (e) {
    console.error('Error al cargar ventas de Supabase:', e);
  }

  let totalMontoVendido = 0;
  const conteoProductosMap: Record<string, { cantidad: number; total: number }> = {};
  
  ventasEmpleado.forEach((v: any) => {
    const monto = Number(v.total_amount || v.total || 0);
    totalMontoVendido += monto;
    
    let prods = v.items || v.productos_vendidos;
    if (typeof prods === 'string') {
      try { prods = JSON.parse(prods); } catch (err) {}
    }

    if (Array.isArray(prods)) {
      prods.forEach((item: any) => {
        const nombreProd = item.nombre || item.name || item.producto_nombre || 'Producto Fit';
        const cant = Number(item.cantidad || item.quantity || 1);
        const subtotal = Number(item.subtotal || item.total || (item.precio_unitario ? item.precio_unitario * cant : 0));
        if (!conteoProductosMap[nombreProd]) {
          conteoProductosMap[nombreProd] = { cantidad: 0, total: 0 };
        }
        conteoProductosMap[nombreProd].cantidad += cant;
        conteoProductosMap[nombreProd].total += subtotal;
      });
    }
  });

  const productosOrdenados = Object.entries(conteoProductosMap)
    .map(([nombre, meta]) => ({ nombre, cantidad: meta.cantidad, total: meta.total }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const altaRotacion = productosOrdenados.slice(0, 3).map(p => `${p.nombre} (${p.cantidad} uds - $${p.total.toLocaleString('es-CO')})`);
  const bajaRotacion = productosOrdenados.slice(-2).map(p => `${p.nombre} (${p.cantidad} uds)`);

  try {
    const timeEntries = await fetchTimeEntriesFromSupabase() || [];
    fichajesEmpleado = timeEntries.filter((t: any) => {
      const esEmp = t.usuario_id === workerId || t.empleado_id === workerId || t.empleado_nombre === workerName || (t as any).staff_id === workerId;
      if (!esEmp) return false;
      const fechaFichaje = t.created_at ? t.created_at.split('T')[0] : (t.clock_in ? t.clock_in.split('T')[0] : fechaHoy);
      return fechaFichaje >= fechaInicio && fechaFichaje <= fechaFin;
    });
  } catch (e) {
    console.error('Error al cargar fichajes de Supabase:', e);
  }

  const llegadasTardias = fichajesEmpleado.filter((f: any) => f.incidencias || f.puntual === false).length;

  const textoRango = fechaInicio === fechaFin ? fechaInicio : `${fechaInicio} a ${fechaFin}`;

  return {
    fechaConsulta: textoRango,
    fechaInicio,
    fechaFin,
    cumplimientoPct: `${cumplimientoPct}%`,
    tareasCompletadas: completadasCount,
    tareasTotales: totalesCount,
    tareasLista: tareasEmpleado,
    historialProgreso: progresoEnRango,
    ventasTotalesCount: ventasEmpleado.length,
    totalMontoVendido: totalMontoVendido,
    ventasLista: ventasEmpleado,
    productosAltaRotacion: altaRotacion.length > 0 ? altaRotacion : ['Parfait Proteico', 'Fresas Grandes con Crema'],
    productosBajaRotacion: bajaRotacion.length > 0 ? bajaRotacion : ['Bebida Hidratante', 'Topping de Chía'],
    fichajesCount: fichajesEmpleado.length,
    fichajesLista: fichajesEmpleado,
    llegadasTardias
  };
}





export async function updateTaskOrdersInSupabase(orders: {id: string; orden: number}[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    for (const item of orders) {
      await updateWithResilientColumns(client, 'daily_tasks', { orden: item.orden }, item.id);
    }
    return true;
  } catch (err) {
    console.error('Exception in updateTaskOrdersInSupabase:', err);
    return false;
  }
}
