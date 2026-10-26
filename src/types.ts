/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AreaType = string;

export type DeviceView = 'mobile' | 'tablet' | 'pc';

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
  completed_at?: string;
  orden?: number;
}

export interface ProductoPromocion {
  id: string;
  nombre_producto: string;
  fecha: string; // YYYY-MM-DD
  meta_diaria_unidades: number;
  puntos_por_unidad: number;
  asignado_a?: string;
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
  costo_unitario?: number;
  precio_venta?: number;
  codigo?: string;
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
  fecha?: string; // YYYY-MM-DD
  fecha_creacion?: string; // TIMESTAMPTZ / ISO String
  activo?: boolean; // Default true
  creador_nombre?: string;
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
  valor_bruto?: number;
  descuento?: number;
  subtotal?: number;
  impuesto_cargo?: number;
  total?: number;
  precio_costo?: number;
  margen_ganancia?: number;
  stock?: number;
}

export const DEFAULT_PRODUCTOS_CATALOGO: Producto[] = [
  {
    id: 'cat-1',
    codigo: 'PARF-01',
    nombre: 'Parfait Berry Chía Slim',
    categoria: 'Parfaits',
    valor_bruto: 110.00,
    descuento: 0,
    subtotal: 110.00,
    impuesto_cargo: 0,
    total: 110.00,
    precio: 110.00,
    precio_costo: 65.00,
    margen_ganancia: 45.00
  },
  {
    id: 'cat-2',
    codigo: 'BOWL-01',
    nombre: 'Açaí Bowl Power',
    categoria: 'Bowls',
    valor_bruto: 135.00,
    descuento: 5.00,
    subtotal: 130.00,
    impuesto_cargo: 0,
    total: 130.00,
    precio: 130.00,
    precio_costo: 75.00,
    margen_ganancia: 55.00
  },
  {
    id: 'cat-3',
    codigo: 'JUIC-01',
    nombre: 'Jugo Verde Prensado en Frío',
    categoria: 'Bebidas',
    valor_bruto: 85.00,
    descuento: 0,
    subtotal: 85.00,
    impuesto_cargo: 0,
    total: 85.00,
    precio: 85.00,
    precio_costo: 40.00,
    margen_ganancia: 45.00
  },
  {
    id: 'cat-4',
    codigo: 'SNK-01',
    nombre: 'Barra Energética Artesanal',
    categoria: 'Snacks',
    valor_bruto: 45.00,
    descuento: 0,
    subtotal: 45.00,
    impuesto_cargo: 0,
    total: 45.00,
    precio: 45.00,
    precio_costo: 22.00,
    margen_ganancia: 23.00
  },
  {
    id: 'cat-5',
    codigo: 'POST-01',
    nombre: 'Strawberry Cream Fit',
    categoria: 'Postres',
    valor_bruto: 120.00,
    descuento: 0,
    subtotal: 120.00,
    impuesto_cargo: 0,
    total: 120.00,
    precio: 120.00,
    precio_costo: 70.00,
    margen_ganancia: 50.00
  }
];

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
  stickers_count?: number;
  rewards_redeemed?: number;
  total_gastado?: number;
  fecha_ultima_compra?: string;
}

export interface PagoFraccionado {
  metodo: string;
  monto: number;
  codigo_tarjeta?: string;
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
  cliente_stickers_count?: number;
  cliente_rewards_redeemed?: number;
  cliente_reward_redeemed_now?: boolean;
  estado?: 'Completada' | 'Anulada' | 'Pendiente';
  motivo_anulacion?: string;
  monto_tarjeta_regalo?: number;
  tarjeta_regalo_codigo?: string;
  monto_complementario?: number;
  metodo_pago_complementario?: string | null;
  pagos_divididos?: PagoFraccionado[];
  desglose_pago?: {
    tarjeta_regalo?: number;
    codigo_tarjeta?: string;
    saldo_anterior?: number;
    saldo_restante?: number;
    complementario?: number;
    metodo_complementario?: string | null;
    pagos?: PagoFraccionado[];
  };
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
  if (m.includes('regalo') || m.includes('bono') || m.includes('gift')) return false;
  return m === 'tarjeta' || m.includes('tarjeta') || m.includes('datafono') || m.includes('datáfono') || m.includes('debito') || m.includes('débito') || m.includes('credito') || m.includes('crédito') || m.includes('pos');
}

export function isTarjetaRegalo(method?: string): boolean {
  if (!method) return false;
  const m = method.toLowerCase().trim();
  return m === 'tarjeta_regalo' || m === 'tarjeta regalo' || m.includes('regalo') || m.includes('bono') || m.includes('gift');
}

export interface TarjetaRegalo {
  id: string;
  codigo: string;
  monto_inicial: number;
  saldo_actual: number;
  estado: 'activa' | 'canjeada' | 'inactiva' | string;
  fecha_creacion: string;
  fecha_canje?: string;
  creado_por_nombre?: string;
  cliente_nombre?: string;
  notas?: string;
  created_at?: string;
  updated_at?: string;
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

export type CategoriaMetodoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'rappi' | 'tarjeta_regalo';

export interface PartePagoDesglose {
  categoria: CategoriaMetodoPago;
  label: string;
  monto: number;
  codigo_tarjeta?: string;
}

export interface DesgloseMontosMetodo {
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  rappi: number;
  tarjeta_regalo: number;
  partes: PartePagoDesglose[];
  esMixto: boolean;
}

export function classifySinglePaymentMethod(method?: string): { categoria: CategoriaMetodoPago; label: string } {
  if (!method) return { categoria: 'efectivo', label: 'Efectivo' };
  const m = method.toLowerCase().trim();
  if (m.includes('regalo') || m.includes('bono') || m.includes('gift')) {
    return { categoria: 'tarjeta_regalo', label: 'Tarjeta Regalo' };
  }
  if (
    m === 'tarjeta' ||
    m.includes('tarjeta') ||
    m.includes('datafono') ||
    m.includes('datáfono') ||
    m.includes('debito') ||
    m.includes('débito') ||
    m.includes('credito') ||
    m.includes('crédito') ||
    m.includes('pos')
  ) {
    return { categoria: 'tarjeta', label: 'Tarjeta (Datáfono)' };
  }
  if (
    m === 'transferencia' ||
    m.includes('transf') ||
    m.includes('nequi') ||
    m.includes('daviplata') ||
    m.includes('bancolombia') ||
    m.includes('banco')
  ) {
    return { categoria: 'transferencia', label: 'Transferencia' };
  }
  if (m === 'rappi' || m.includes('rappi') || m.includes('pedidos') || m.includes('domicilio')) {
    return { categoria: 'rappi', label: 'Rappi' };
  }
  return { categoria: 'efectivo', label: 'Efectivo' };
}

/**
 * Extrae el desglose exacto de pagos por medio de pago de una venta (sea pago único,
 * pago con Tarjeta Regalo + excedente en otro medio, o pago dividido en múltiples métodos).
 */
export function getDesglosePagosVenta(v?: Partial<Venta> | null): DesgloseMontosMetodo {
  const result: DesgloseMontosMetodo = {
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0,
    rappi: 0,
    tarjeta_regalo: 0,
    partes: [],
    esMixto: false
  };

  if (!v) return result;

  const totalVenta = Math.max(0, Number(v.total || 0));

  const addPart = (rawMetodo: string, rawMonto: number, codigoTarjeta?: string) => {
    const monto = Number(rawMonto || 0);
    if (monto <= 0) return;
    const { categoria, label } = classifySinglePaymentMethod(rawMetodo);
    result[categoria] += monto;
    result.partes.push({
      categoria,
      label,
      monto,
      ...(codigoTarjeta ? { codigo_tarjeta: codigoTarjeta } : {})
    });
  };

  // 1. Si cuenta con arreglo explícito de pagos divididos (pagos_divididos o desglose_pago.pagos)
  const explicitPagos =
    (Array.isArray(v.pagos_divididos) && v.pagos_divididos.length > 0 ? v.pagos_divididos : null) ||
    (v.desglose_pago && Array.isArray(v.desglose_pago.pagos) && v.desglose_pago.pagos.length > 0
      ? v.desglose_pago.pagos
      : null);

  if (explicitPagos) {
    explicitPagos.forEach(p => {
      addPart(p.metodo, Number(p.monto || 0), p.codigo_tarjeta);
    });
    if (result.partes.length > 0) {
      result.esMixto = result.partes.length > 1;
      return result;
    }
  }

  // 2. Si cuenta con campos estructurados de Tarjeta Regalo + Complementario
  const montoGiftStructured = Number(
    v.monto_tarjeta_regalo ?? v.desglose_pago?.tarjeta_regalo ?? 0
  );
  if (montoGiftStructured > 0) {
    const codigoGift = v.tarjeta_regalo_codigo || v.desglose_pago?.codigo_tarjeta;
    const montoAplicadoGift = Math.min(montoGiftStructured, totalVenta > 0 ? totalVenta : montoGiftStructured);
    addPart('Tarjeta Regalo', montoAplicadoGift, codigoGift);

    const rawCompAmount =
      v.monto_complementario !== undefined
        ? Number(v.monto_complementario)
        : v.desglose_pago?.complementario !== undefined
        ? Number(v.desglose_pago.complementario)
        : Math.max(0, totalVenta - montoAplicadoGift);

    const metodoComp =
      v.metodo_pago_complementario ||
      v.desglose_pago?.metodo_complementario ||
      null;

    if (rawCompAmount > 0) {
      if (metodoComp) {
        addPart(metodoComp, rawCompAmount);
      } else if (v.metodo_pago && v.metodo_pago.includes('+')) {
        const secondSegment = v.metodo_pago.split('+')[1] || 'Efectivo';
        addPart(secondSegment, rawCompAmount);
      } else {
        addPart('Efectivo', rawCompAmount);
      }
    }

    result.esMixto = result.partes.length > 1;
    return result;
  }

  // 3. Si metodo_pago contiene un desglose en texto con "+" (ej: "Tarjeta Regalo ($20,000.00) + Efectivo ($10,000.00)" o "Tarjeta ($15,000.00) + Efectivo ($10,000.00)")
  const rawMethodStr = (v.metodo_pago || '').trim();
  if (rawMethodStr.includes('+')) {
    const cleanedStr = rawMethodStr.replace(/^(Pago\s+Mixto|Mixto|Dividido)\s*:\s*/i, '');
    const segments = cleanedStr.split('+').map(s => s.trim()).filter(Boolean);
    const parsedSegments: Array<{ methodPart: string; amount: number }> = [];

    for (const seg of segments) {
      // Buscar monto entre paréntesis al final ej: "($53,900.00)" o "($$20,000.00)" o después de "$"
      const parenMatch = seg.match(/\(\s*\$+\s*([\d,]+(?:\.\d+)?)\s*\)\s*$/);
      const dollarMatch = !parenMatch ? seg.match(/[:\-]?\s*\$+\s*([\d,]+(?:\.\d+)?)\s*$/) : null;
      const match = parenMatch || dollarMatch;

      if (match) {
        const parsedAmount = parseFloat(match[1].replace(/,/g, '')) || 0;
        const methodName = seg.slice(0, match.index).replace(/[:\-]+$/, '').trim() || seg;
        if (parsedAmount > 0) {
          parsedSegments.push({ methodPart: methodName, amount: parsedAmount });
        }
      }
    }

    if (parsedSegments.length > 0) {
      parsedSegments.forEach(ps => addPart(ps.methodPart, ps.amount));
      const sumParsed = parsedSegments.reduce((acc, item) => acc + item.amount, 0);
      // Si hay una diferencia residual con el total de la venta y hay un segmento sin monto explícito
      if (totalVenta > sumParsed + 0.05 && segments.length > parsedSegments.length) {
        const remaining = totalVenta - sumParsed;
        const unmatchedSeg = segments[segments.length - 1];
        addPart(unmatchedSeg, remaining);
      }
      result.esMixto = result.partes.length > 1;
      return result;
    }
  }

  // 4. Caso estándar: un único medio de pago por el total de la venta
  addPart(rawMethodStr || 'Efectivo', totalVenta);
  result.esMixto = false;
  return result;
}

export function getResumenPagosVentas(ventas: Array<Partial<Venta> | null | undefined>) {
  let efectivo = 0;
  let tarjeta = 0;
  let transferencia = 0;
  let rappi = 0;
  let tarjeta_regalo = 0;

  for (const v of ventas || []) {
    if (!v || v.estado === 'Anulada') continue;
    const d = getDesglosePagosVenta(v);
    efectivo += d.efectivo;
    tarjeta += d.tarjeta;
    transferencia += d.transferencia;
    rappi += d.rappi;
    tarjeta_regalo += d.tarjeta_regalo;
  }

  const total = efectivo + tarjeta + transferencia + rappi + tarjeta_regalo;
  return {
    efectivo,
    tarjeta,
    transferencia,
    rappi,
    tarjeta_regalo,
    total
  };
}

export function ventaMatchesPaymentFilter(v: Partial<Venta> | null | undefined, filterMethod?: string): boolean {
  if (!filterMethod) return true;
  if (!v) return false;
  const d = getDesglosePagosVenta(v);
  const f = filterMethod.toLowerCase().trim();
  if (f === 'efectivo') return d.efectivo > 0;
  if (f === 'tarjeta') return d.tarjeta > 0;
  if (f === 'transferencia') return d.transferencia > 0;
  if (f === 'rappi') return d.rappi > 0;
  if (f === 'tarjeta_regalo' || f === 'tarjeta regalo') return d.tarjeta_regalo > 0;
  if (f === 'mixto' || f === 'pago_mixto') return d.esMixto;
  return (v.metodo_pago || '').toLowerCase() === f;
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
  total_ventas_dia?: number;
  efectivo_esperado?: number;
  efectivo_contado: number;
  tarjeta_esperado?: number;
  transferencia_esperado?: number;
  rappi_esperado?: number;
  tarjeta_regalo_esperado?: number;
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
    tarjeta_regalo?: number;
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

export interface Gasto {
  id: string;
  fecha: string; // YYYY-MM-DD
  descripcion: string;
  categoria: 'Insumos' | 'Servicios' | 'Mantenimiento' | 'Personal' | 'Otros';
  monto: number;
  metodo_pago: string; // Efectivo, Tarjeta, Transferencia, etc.
  registrado_por: string; // Nombre del usuario
  usuario_id?: string;
  created_at?: string;
}

export interface UpsellRule {
  id: string;
  producto_base_nombre: string;
  producto_sugerido_nombre: string;
  activa: boolean;
  descuento_promocional_pct?: number;
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




