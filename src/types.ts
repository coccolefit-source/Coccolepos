/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AreaType = string;

export type TaskStatus = 'Pendiente' | 'En proceso' | 'Completada';

export interface Tarea {
  id: string;
  titulo: string;
  descripcion: string;
  area: AreaType;
  fecha: string; // YYYY-MM-DD
  estado: TaskStatus;
  asignado_a: string; // User ID
  tiempo_estimado_min: number;
  hora_inicio?: string; // HH:MM
  hora_fin?: string; // HH:MM
  requiere_foto: boolean;
  foto_url?: string;
  nota_evidencia?: string;
  tipo_tarea?: string;
  started_at?: string;
}

export interface ProductoPromocion {
  id: string;
  nombre_producto: string;
  fecha: string; // YYYY-MM-DD
  meta_diaria_unidades: number;
  puntos_por_unidad: number;
}

export interface RegistroVenta {
  id: string;
  producto_id: string;
  usuario_id: string;
  fecha: string; // YYYY-MM-DD
  unidades_contadas: number;
  metodo_pago?: string;
}

export interface Fichaje {
  id: string;
  usuario_id: string;
  fecha: string; // YYYY-MM-DD
  hora_entrada?: string; // HH:MM
  hora_salida?: string; // HH:MM
  puntual: boolean;
  activo: boolean; // Si está en turno actual
}

export interface Incidencia {
  id: string;
  usuario_id: string;
  fecha: string; // YYYY-MM-DD
  titulo: string;
  descripcion: string;
  tipo: 'insumo' | 'equipo';
  estado: 'Pendiente' | 'Resuelta';
}

export interface Usuario {
  id: string;
  nombre: string;
  rol: 'admin' | 'empleado';
  area_preferida?: AreaType;
  meta_tareas_diarias?: number;
  foto_avatar?: string;
  insignia_actual?: string;
  telefono?: string;
  email?: string;
  pin?: string;
  password?: string;
  clave_maestra?: string;
  tareasCumplidasPct?: string;
  llegadasTardesCount?: number;
  ventasTotales?: string;
  picoHorarioVentas?: string;
  productosTop?: string[];
  productosBajos?: string[];
}

export interface InventarioItem {
  id: string;
  nombre: string;
  categoria: string;
  stock_actual: number;
  stock_minimo_alerta: number;
  unidad: string; // Ej. Kg, Litros, Unidades, Bolsas
  ultima_actualizacion_fecha?: string; // YYYY-MM-DD HH:MM
  ultima_actualizacion_por?: string; // Nombre del usuario
}

export type InsumoInventario = InventarioItem;
export type FichajeRecord = Fichaje;

export interface TurnoSemanal {
  id: string;
  usuario_id: string; // ID del empleado
  dia_semana: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  hora_entrada: string; // HH:MM
  hora_salida: string; // HH:MM
  nota?: string;
}

export interface Anuncio {
  id: string;
  titulo: string;
  contenido: string;
  fecha: string; // YYYY-MM-DD
  creador_nombre: string;
  lecturas_confirmadas?: string[]; // IDs de empleados que marcaron como leído
}

export interface Feedback {
  id: string;
  usuario_id: string; // ID del empleado
  fecha: string; // YYYY-MM-DD HH:MM
  titulo: string;
  comentario: string;
  es_llamado_atencion: boolean;
  creado_por_nombre: string;
}

export interface MetricaTemporal {
  tareas_completadas: number;
  tareas_totales: number;
  ventas_sugeridas: number;
  ventas_meta: number;
  eficiencia_tiempo_pct: number; // Porcentaje de tareas terminadas a tiempo
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  precio: number;
  categoria?: string;
}

export interface DetalleVentaItem {
  producto_id: string;
  nombre: string;
  codigo: string;
  precio: number;
  cantidad: number;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  fecha_registro: string; // YYYY-MM-DD
  total_compras_monto: number;
  total_compras_count: number;
  ultima_fecha_compra: string; // YYYY-MM-DD
  visitas_acumuladas?: number;
  total_gastado?: number;
  fecha_ultima_compra?: string;
}

export interface Venta {
  id: string;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:MM
  usuario_id: string; // ID del empleado
  vendedor_id?: string;
  vendedor_nombre: string;
  productos_vendidos: DetalleVentaItem[];
  total: number;
  metodo_pago?: string;
  cliente_id?: string;
  cliente_nombre?: string;
  cliente_telefono?: string;
  estado?: 'Completada' | 'Anulada' | 'Pendiente';
  motivo_anulacion?: string;
}

// Payment method helpers to normalize casing and naming variations
export function isEfectivo(method?: string): boolean {
  if (!method) return true;
  const m = method.toLowerCase().trim();
  return m === 'efectivo' || m.includes('efectivo') || m.includes('cash');
}

export function isTarjeta(method?: string): boolean {
  if (!method) return false;
  const m = method.toLowerCase().trim();
  return m === 'tarjeta' || m.includes('tarjeta') || m.includes('datafono') || m.includes('datáfono') || m.includes('debito') || m.includes('débito') || m.includes('credito') || m.includes('crédito') || m.includes('pos');
}

export function isTransferencia(method?: string): boolean {
  if (!method) return false;
  const m = method.toLowerCase().trim();
  return m === 'transferencia' || m.includes('transf') || m.includes('nequi') || m.includes('daviplata') || m.includes('bancolombia') || m.includes('banco');
}

export function isRappi(method?: string): boolean {
  if (!method) return false;
  const m = method.toLowerCase().trim();
  return m === 'rappi' || m.includes('rappi') || m.includes('pedidos') || m.includes('domicilio');
}

export interface AlertaPanico {
  id: string;
  insumo_id: string;
  insumo_nombre: string;
  usuario_id: string;
  usuario_nombre: string;
  fecha_hora: string; // YYYY-MM-DD HH:MM
  atendida: boolean;
}

export interface CuadreCaja {
  id: string;
  empleado_id?: string;
  empleado_nombre?: string;
  usuario_id?: string;
  usuario_nombre?: string;
  fecha: string;
  hora?: string;
  hora_cierre?: string;
  efectivo_esperado?: number;
  efectivo_contado: number;
  tarjeta_esperado?: number;
  transferencia_esperado?: number;
  rappi_esperado?: number;
  diferencia_total?: number;
  observaciones: string;
  estado?: string;
}

export interface ToastNotification {
  id: string;
  kind: 'sale_ticket' | 'cash_closure' | 'standard';
  type?: 'success' | 'alert' | 'info';
  title?: string;
  text?: string;
  colaborador?: string;
  articulos?: Array<{ nombre: string; cantidad: number }>;
  total?: number;
  metodoPago?: string;
  totalGeneral?: number;
  desglose?: {
    efectivo: number;
    tarjeta: number;
    transferencia: number;
    rappi: number;
  };
  estadoValidacion?: string;
  horaStr?: string;
  clienteNombre?: string;
  clienteTelefono?: string;
}

export interface RankingWeights {
  ventas_monto_pct: number;
  ventas_cantidad_pct: number;
  tareas_cumplimiento_pct: number;
  captura_clientes_pct: number;
  puntualidad_fichaje_pct: number;
  ventas_sugeridas_pct: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  ventas_monto_pct: 25,
  ventas_cantidad_pct: 20,
  tareas_cumplimiento_pct: 20,
  captura_clientes_pct: 15,
  puntualidad_fichaje_pct: 10,
  ventas_sugeridas_pct: 10,
};

export interface UpsellRule {
  id: string;
  producto_base_nombre: string;
  producto_sugerido_nombre: string;
  descuento_promocional_pct?: number;
  activa: boolean;
}

export const DEFAULT_UPSELL_RULES: UpsellRule[] = [
  {
    id: 'upsell-1',
    producto_base_nombre: 'Açaí Bowl',
    producto_sugerido_nombre: 'Adición Whey Protein Isolate',
    activa: true
  },
  {
    id: 'upsell-2',
    producto_base_nombre: 'Strawberry Cream',
    producto_sugerido_nombre: 'Topping Extra de Frutas Silvestres',
    activa: true
  },
  {
    id: 'upsell-3',
    producto_base_nombre: 'Ensalada Fit Detox',
    producto_sugerido_nombre: 'Jugo Prensado en Frío Verde',
    activa: true
  },
  {
    id: 'upsell-4',
    producto_base_nombre: 'Protein Smoothie Banana',
    producto_sugerido_nombre: 'Barra Energética Artesanal',
    activa: true
  }
];



