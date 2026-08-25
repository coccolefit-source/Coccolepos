/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tarea, ProductoPromocion, RegistroVenta, Fichaje, Usuario, Venta, RankingWeights, DEFAULT_RANKING_WEIGHTS } from '../types';

export interface EmployeeScore {
  usuario: Usuario;
  tareasCompletadas: number;
  tareasTotales: number;
  ventasSugeridas: number;
  puntosFichaje: number;
  puntosVentas: number;
  puntosTareas: number;
  puntosTotales: number;
  porcentajeEficiencia: number;
  montoVentasTotal?: number;
  cantidadVentasTotal?: number;
  fichajesPuntualesCount?: number;
  fichajesTotalesCount?: number;
  capturaClientesPct?: number;
  puntualidadPct?: number;
  desglosePesos?: {
    scoreMonto: number;
    scoreCant: number;
    scoreTareas: number;
    scoreCaptura: number;
    scorePuntualidad: number;
  };
}

// Auxiliar: parsear hora HH:MM a minutos desde las 00:00
export const parseTimeToMinutes = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Calcular duración real de una tarea en minutos
export const getTaskDurationMinutes = (tarea: Tarea): number => {
  if (!tarea.hora_inicio || !tarea.hora_fin) return 0;
  const start = parseTimeToMinutes(tarea.hora_inicio);
  const end = parseTimeToMinutes(tarea.hora_fin);
  return end - start;
};

/**
 * Calcula las puntuaciones del Leaderboard filtrado por tiempo (diario, semanal, mensual) y ponderaciones configurables
 */
export const calculateLeaderboard = (
  usuarios: Usuario[],
  tareas: Tarea[],
  ventas: RegistroVenta[],
  fichajes: Fichaje[],
  productos: ProductoPromocion[],
  filtro: 'diario' | 'semanal' | 'mensual',
  fechaReferencia: string = '2026-08-20',
  posVentas: Venta[] = [],
  rankingWeights: RankingWeights = DEFAULT_RANKING_WEIGHTS
): EmployeeScore[] => {
  const refDate = new Date(fechaReferencia);

  // Filtrar datos según el periodo
  const isInPeriod = (fechaStr: string): boolean => {
    const itemDate = new Date(fechaStr);
    if (isNaN(itemDate.getTime())) return false;

    if (filtro === 'diario') {
      return fechaStr === fechaReferencia;
    } else if (filtro === 'semanal') {
      const diffTime = Math.abs(refDate.getTime() - itemDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    } else {
      return (
        itemDate.getFullYear() === refDate.getFullYear() &&
        itemDate.getMonth() === refDate.getMonth()
      );
    }
  };

  const empleados = usuarios.filter((u) => u.rol === 'empleado');

  // Pre-calcular métricas absolutas por empleado
  const rawEmployeeMetrics = empleados.map((usr) => {
    // 1. Tareas de este usuario
    const tareasUsuario = tareas.filter((t) => t.asignado_a === usr.id && isInPeriod(t.fecha));
    const completadas = tareasUsuario.filter((t) => t.estado === 'Completada');
    const tareasPct =
      tareasUsuario.length > 0
        ? Math.round((completadas.length / tareasUsuario.length) * 100)
        : 100;

    let puntosTareas = 0;
    completadas.forEach((t) => {
      puntosTareas += 25;
      if (t.hora_inicio && t.hora_fin) {
        const duracion = getTaskDurationMinutes(t);
        if (duracion > 0 && duracion <= t.tiempo_estimado_min) {
          puntosTareas += 10;
        }
      }
    });

    // 2. Ventas sugeridas
    const ventasUsuario = ventas.filter((v) => v.usuario_id === usr.id && isInPeriod(v.fecha));
    let ventasSugeridasCount = 0;
    let puntosVentas = 0;
    ventasUsuario.forEach((v) => {
      ventasSugeridasCount += v.unidades_contadas;
      const prod = productos.find((p) => p.id === v.producto_id);
      const puntosPorUnidad = prod ? prod.puntos_por_unidad : 5;
      puntosVentas += v.unidades_contadas * puntosPorUnidad;
    });

    // 3. Fichajes
    const fichajesUsuario = fichajes.filter((f) => f.usuario_id === usr.id && isInPeriod(f.fecha));
    let puntosFichaje = 0;
    let fichajesPuntuales = 0;
    fichajesUsuario.forEach((f) => {
      if (f.hora_entrada) {
        if (f.puntual) fichajesPuntuales += 1;
        puntosFichaje += f.puntual ? 30 : 10;
      }
    });
    const puntualidadPct =
      fichajesUsuario.length > 0
        ? Math.round((fichajesPuntuales / fichajesUsuario.length) * 100)
        : 100;

    // 4. Ventas POS (Monto $ y Cantidad)
    const posVentasEmp = posVentas.filter(
      (pv) =>
        (pv.vendedor_id === usr.id || pv.usuario_id === usr.id) &&
        isInPeriod(pv.fecha) &&
        pv.estado !== 'Anulada'
    );
    const montoTotal = posVentasEmp.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const cantVentasTotal = posVentasEmp.length;

    // 5. Captura de clientes
    const ventasConCliente = posVentasEmp.filter(
      (pv) => Boolean(pv.cliente_id) || Boolean(pv.cliente_telefono) || Boolean(pv.cliente_nombre)
    ).length;
    const capturaClientesPct =
      cantVentasTotal > 0 ? Math.round((ventasConCliente / cantVentasTotal) * 100) : 100;

    return {
      usr,
      tareasUsuario,
      completadas,
      tareasPct,
      puntosTareas,
      ventasSugeridasCount,
      puntosVentas,
      fichajesUsuario,
      fichajesPuntuales,
      puntosFichaje,
      puntualidadPct,
      montoTotal,
      cantVentasTotal,
      capturaClientesPct,
    };
  });

  // Determinar máximos del periodo para escalado relativo
  const maxMonto = Math.max(...rawEmployeeMetrics.map((m) => m.montoTotal), 0);
  const maxCant = Math.max(...rawEmployeeMetrics.map((m) => m.cantVentasTotal), 0);
  const maxVentasSugeridas = Math.max(...rawEmployeeMetrics.map((m) => m.ventasSugeridasCount), 0);

  return rawEmployeeMetrics
    .map((m) => {
      const scoreMonto = maxMonto > 0 ? Math.round((m.montoTotal / maxMonto) * 100) : 100;
      const scoreCant = maxCant > 0 ? Math.round((m.cantVentasTotal / maxCant) * 100) : 100;
      const scoreTareas = m.tareasPct;
      const scoreCaptura = m.capturaClientesPct;
      const scorePuntualidad = m.puntualidadPct;
      const scoreVentasSugeridas = maxVentasSugeridas > 0 ? Math.round((m.ventasSugeridasCount / maxVentasSugeridas) * 100) : 100;

      const weights = rankingWeights || DEFAULT_RANKING_WEIGHTS;
      const totalWeightSum =
        (weights.ventas_monto_pct || 0) +
        (weights.ventas_cantidad_pct || 0) +
        (weights.tareas_cumplimiento_pct || 0) +
        (weights.captura_clientes_pct || 0) +
        (weights.puntualidad_fichaje_pct || 0) +
        (weights.ventas_sugeridas_pct || 0);

      const normalizedWeightSum = totalWeightSum > 0 ? totalWeightSum : 100;

      const weightedScore = Math.round(
        (scoreMonto * (weights.ventas_monto_pct || 0) +
          scoreCant * (weights.ventas_cantidad_pct || 0) +
          scoreTareas * (weights.tareas_cumplimiento_pct || 0) +
          scoreCaptura * (weights.captura_clientes_pct || 0) +
          scorePuntualidad * (weights.puntualidad_fichaje_pct || 0) +
          scoreVentasSugeridas * (weights.ventas_sugeridas_pct || 0)) /
          normalizedWeightSum
      );

      return {
        usuario: m.usr,
        tareasCompletadas: m.completadas.length,
        tareasTotales: m.tareasUsuario.length,
        ventasSugeridas: m.ventasSugeridasCount,
        puntosFichaje: m.puntosFichaje,
        puntosVentas: m.puntosVentas,
        puntosTareas: m.puntosTareas,
        puntosTotales: weightedScore,
        porcentajeEficiencia: m.tareasPct,
        montoVentasTotal: m.montoTotal,
        cantidadVentasTotal: m.cantVentasTotal,
        fichajesPuntualesCount: m.fichajesPuntuales,
        fichajesTotalesCount: m.fichajesUsuario.length,
        capturaClientesPct: m.capturaClientesPct,
        puntualidadPct: m.puntualidadPct,
        desglosePesos: {
          scoreMonto,
          scoreCant,
          scoreTareas,
          scoreCaptura,
          scorePuntualidad,
          scoreVentasSugeridas,
        },
      };
    })
    .sort((a, b) => b.puntosTotales - a.puntosTotales);
};


/**
 * Obtiene las métricas generales del negocio para un periodo
 */
export const getGlobalMetrics = (
  tareas: Tarea[],
  ventas: RegistroVenta[],
  productos: ProductoPromocion[],
  filtro: 'diario' | 'semanal' | 'mensual',
  fechaReferencia: string = '2026-08-20'
) => {
  const refDate = new Date(fechaReferencia);
  
  const isInPeriod = (fechaStr: string): boolean => {
    const itemDate = new Date(fechaStr);
    if (isNaN(itemDate.getTime())) return false;
    
    if (filtro === 'diario') {
      return fechaStr === fechaReferencia;
    } else if (filtro === 'semanal') {
      const diffTime = Math.abs(refDate.getTime() - itemDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    } else {
      return itemDate.getFullYear() === refDate.getFullYear() && 
             itemDate.getMonth() === refDate.getMonth();
    }
  };

  // Filtrar tareas y calcular estados
  const tareasPeriodo = tareas.filter(t => isInPeriod(t.fecha));
  const completadas = tareasPeriodo.filter(t => t.estado === 'Completada').length;
  const enProgreso = tareasPeriodo.filter(t => t.estado === 'En proceso').length;
  const pendientes = tareasPeriodo.filter(t => t.estado === 'Pendiente').length;

  // Filtrar ventas sugeridas
  const ventasPeriodo = ventas.filter(v => isInPeriod(v.fecha));
  const totalVentasSugeridas = ventasPeriodo.reduce((acc, curr) => acc + curr.unidades_contadas, 0);

  // Calcular meta acumulada de ventas para los productos del día/periodo
  // Si es diario, simplemente sumamos las metas de los productos de hoy.
  // Si es semanal/mensual estimamos o sumamos multiplicadores correspondientes.
  let metaVentasAcumulada = 0;
  if (filtro === 'diario') {
    metaVentasAcumulada = productos
      .filter(p => p.fecha === fechaReferencia)
      .reduce((acc, curr) => acc + curr.meta_diaria_unidades, 0);
  } else if (filtro === 'semanal') {
    // Estimación para 7 días
    const metaBase = productos.reduce((acc, curr) => acc + curr.meta_diaria_unidades, 0);
    metaVentasAcumulada = metaBase * 6; // Asumiendo 6 días de operación
  } else {
    // Estimación para el mes
    const metaBase = productos.reduce((acc, curr) => acc + curr.meta_diaria_unidades, 0);
    metaVentasAcumulada = metaBase * 24; // Asumiendo 24 días de operación
  }

  // Eficiencia de tiempo global
  const tareasConTiempo = tareasPeriodo.filter(t => t.estado === 'Completada' && t.hora_inicio && t.hora_fin);
  const getTiempoEstimadoMinOrFallback = (t: Tarea) => t.tiempo_estimado_min || 30;

  const aTiempoReal = tareasConTiempo.filter(t => {
    const duracion = getTaskDurationMinutes(t);
    return duracion > 0 && duracion <= getTiempoEstimadoMinOrFallback(t);
  }).length;

  const eficienciaTiempoGlobal = tareasConTiempo.length > 0
    ? Math.round((aTiempoReal / tareasConTiempo.length) * 100)
    : 85; // Default representativo si no hay datos

  return {
    tareasTotales: tareasPeriodo.length,
    tareasCompletadas: completadas,
    tareasEnProgreso: enProgreso,
    tareasPendientes: pendientes,
    totalVentasSugeridas,
    metaVentasAcumulada: metaVentasAcumulada || 40,
    eficienciaTiempoGlobal,
    porcentajeTareasCompletadas: tareasPeriodo.length > 0 
      ? Math.round((completadas / tareasPeriodo.length) * 100) 
      : 0
  };
};
