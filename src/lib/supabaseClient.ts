import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Usuario, Venta, InsumoInventario, Cliente, FichajeRecord, RankingWeights, DEFAULT_RANKING_WEIGHTS, UpsellRule, DEFAULT_UPSELL_RULES, Tarea, TaskStatus } from '../types';

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

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('coccole_supabase_url') || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('coccole_supabase_key') || '' : '';

  return {
    url: localUrl || envUrl,
    key: localKey || envKey
  };
}

export function saveSupabaseCredentials(url: string, key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('coccole_supabase_url', url.trim());
    localStorage.setItem('coccole_supabase_key', key.trim());
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
  onInventoryUpdate?: () => void
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
    const local = localStorage.getItem('coccole_ranking_weights');
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
      localStorage.setItem('coccole_ranking_weights', JSON.stringify(weights));
    }

    return weights;
  } catch (err) {
    console.error('Error fetching ranking weights from Supabase:', err);
    return DEFAULT_RANKING_WEIGHTS;
  }
}

export async function saveRankingWeightsToSupabase(weights: RankingWeights): Promise<boolean> {
  if (typeof window !== 'undefined') {
    localStorage.setItem('coccole_ranking_weights', JSON.stringify(weights));
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
    const local = localStorage.getItem('coccole_upsell_rules');
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
      localStorage.setItem('coccole_upsell_rules', JSON.stringify(rules));
    }

    return rules;
  } catch (err) {
    console.error('Error fetching upsell rules from Supabase:', err);
    return DEFAULT_UPSELL_RULES;
  }
}

export async function saveUpsellRulesToSupabase(rules: UpsellRule[]): Promise<boolean> {
  if (typeof window !== 'undefined') {
    localStorage.setItem('coccole_upsell_rules', JSON.stringify(rules));
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

export async function fetchDailyTasksFromSupabase(fecha?: string): Promise<Tarea[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    let query = client.from('daily_tasks').select('*');
    if (fecha) {
      query = query.or(`date.eq.${fecha},fecha.eq.${fecha}`);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('Supabase fetchDailyTasks error:', error.message);
      return null;
    }
    if (!data) return null;

    return data.map((t: any) => ({
      id: String(t.id),
      titulo: t.title || t.titulo || t.task_name || 'Tarea Sin Título',
      descripcion: t.description || t.descripcion || '',
      tipo_tarea: t.type || t.tipo_tarea || 'Apertura',
      area: t.area || 'Operativa',
      asignado_a: t.assigned_to || t.asignado_a || t.staff_id || '',
      estado: (t.status || t.estado || (t.completed ? 'Completada' : 'Pendiente')) as TaskStatus,
      tiempo_estimado_min: Number(t.tiempo_estimado_min) || 15,
      hora_inicio: t.hora_inicio || '08:00',
      hora_fin: t.hora_fin || '08:30',
      requiere_foto: Boolean(t.requires_photo ?? t.requiere_foto),
      fecha: t.date || t.fecha || '2026-08-20',
      foto_url: t.photo_url || t.foto_url,
      nota_evidencia: t.evidence_note || t.nota_evidencia
    }));
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
    const { error } = await client.from(table).upsert(currentPayload);
    if (!error) {
      return { success: true };
    }
    const msg = error.message || '';
    if (msg.includes("Could not find the '") && msg.includes("' column of '")) {
      const match = msg.match(/Could not find the '([^']+)' column/);
      if (match && match[1]) {
        const missingCol = match[1];
        console.warn(`[Supabase Resilience] Column '${missingCol}' not found in remote schema cache. Stripping it and retrying...`);
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
      status: estado,
      estado: estado,
      completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };

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


