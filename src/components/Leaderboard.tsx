import { getLocalDateString } from '../lib/supabaseClient';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Usuario, Tarea, RegistroVenta, Fichaje, ProductoPromocion, Venta, RankingWeights, DEFAULT_RANKING_WEIGHTS } from '../types';
import { calculateLeaderboard } from '../utils/metrics';
import { Trophy, Medal, ShoppingBag, Clock, HelpCircle, ChevronDown, ChevronUp, Sliders, CheckCircle2, DollarSign, Users, Award } from 'lucide-react';

interface LeaderboardProps {
  usuarios: Usuario[];
  tareas: Tarea[];
  ventas: RegistroVenta[];
  fichajes: Fichaje[];
  productos: ProductoPromocion[];
  filtro: 'diario' | 'semanal' | 'mensual';
  onFiltroChange?: (filtro: 'diario' | 'semanal' | 'mensual') => void;
  posVentas?: Venta[];
  rankingWeights?: RankingWeights;
}

export default function Leaderboard({
  usuarios,
  tareas,
  ventas,
  fichajes,
  productos,
  filtro,
  onFiltroChange,
  posVentas = [],
  rankingWeights = DEFAULT_RANKING_WEIGHTS,
}: LeaderboardProps) {
  const [localFiltro, setLocalFiltro] = useState<'diario' | 'semanal' | 'mensual'>(filtro);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(getLocalDateString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [endDate, setEndDate] = useState<string>(getLocalDateString());
  const [useCustomRange, setUseCustomRange] = useState<boolean>(false);

  const activeFiltro = onFiltroChange ? filtro : localFiltro;

  const handleFiltroSelect = (f: 'diario' | 'semanal' | 'mensual') => {
    setLocalFiltro(f);
    setUseCustomRange(false);
    if (onFiltroChange) {
      onFiltroChange(f);
    }
  };

  // Calcular leaderboard según el filtro activo y ponderación
  const leaderboardData = calculateLeaderboard(
    usuarios,
    tareas,
    ventas,
    fichajes,
    productos,
    activeFiltro,
    getLocalDateString(),
    posVentas,
    rankingWeights,
    useCustomRange ? startDate : undefined,
    useCustomRange ? endDate : undefined
  );

  const top3 = leaderboardData.slice(0, 3);

  const weights = rankingWeights || DEFAULT_RANKING_WEIGHTS;

  return (
    <div id="leaderboard-module" className="w-full rounded-xl border bg-white p-5 shadow-sm font-sans space-y-5">
      {/* Header & Filtro de Rango / Periodo */}
      <div className="border-b border-slate-200 pb-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#2C3E50] flex items-center gap-1.5">
             <Trophy className="w-4.5 h-4.5 text-amber-500" />
             Tabla de Posiciones y Ranking de Productividad Gamificado
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Puntuación calculada automáticamente según la Configuración Global de Rendimiento.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Selector de Rango / Periodo */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl text-[10px] font-bold">
            <button
              type="button"
              onClick={() => handleFiltroSelect('diario')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeFiltro === 'diario' ? 'bg-white text-[#4B9CD3] shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Diario
            </button>
            <button
              type="button"
              onClick={() => handleFiltroSelect('semanal')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeFiltro === 'semanal' ? 'bg-white text-[#4B9CD3] shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semanal
            </button>
            <button
              type="button"
              onClick={() => handleFiltroSelect('mensual')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeFiltro === 'mensual' ? 'bg-white text-[#4B9CD3] shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mensual
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowConfigModal(!showConfigModal)}
            className="flex items-center gap-1 bg-[#EBF5FB] hover:bg-[#D4E6F1] text-[#4B9CD3] px-3 py-1.5 rounded-xl text-[10px] font-bold transition-colors shrink-0 cursor-pointer"
            title="Ver cómo se ganan los puntos según Configuración Global"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>¿Cómo se ganan los puntos?</span>
          </button>
        </div>
      </div>

      {/* Filtro de Rango de Fechas Específico */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="useCustomRangeCheck"
            checked={useCustomRange}
            onChange={(e) => setUseCustomRange(e.target.checked)}
            className="w-3.5 h-3.5 text-[#4B9CD3] rounded border-slate-300 focus:ring-[#4B9CD3]"
          />
          <label htmlFor="useCustomRangeCheck" className="font-bold text-slate-700 cursor-pointer">
            Filtro de Rango de Fechas Personalizado:
          </label>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Desde:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setUseCustomRange(true);
              }}
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Hasta:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setUseCustomRange(true);
              }}
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            />
          </div>
          {useCustomRange && (
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
              Rango activo: {startDate} al {endDate}
            </span>
          )}
        </div>
      </div>

      {/* Panel Explicativo de Ponderación Global (Toggle) */}
      {showConfigModal && (
        <div className="bg-[#FFFDF6] border border-amber-200 rounded-2xl p-4 shadow-xs space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-amber-100 pb-2">
            <h3 className="text-xs font-black text-[#2C3E50] flex items-center gap-1.5 uppercase tracking-wider">
              <Award className="w-4 h-4 text-amber-500" />
              Criterios de Puntuación (Configuración Global de Rendimiento)
            </h3>
            <button
              type="button"
              onClick={() => setShowConfigModal(false)}
              className="text-[10px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              ✕ Cerrar
            </button>
          </div>
          <p className="text-[11px] text-slate-600">
            Los puntos totales y la posición en el ranking de cada colaborador para el rango <span className="font-bold text-[#4B9CD3] uppercase">[{activeFiltro}]</span> se calculan ponderando las siguientes métricas del local:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            <div className="bg-white p-2.5 rounded-xl border border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign className="w-3.5 h-3.5" /></div>
                <span className="text-[11px] font-bold text-slate-700">Ventas Totales ($)</span>
              </div>
              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{weights.ventas_monto_pct}%</span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><ShoppingBag className="w-3.5 h-3.5" /></div>
                <span className="text-[11px] font-bold text-slate-700">Cantidad Transacciones</span>
              </div>
              <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{weights.ventas_cantidad_pct}%</span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg"><CheckCircle2 className="w-3.5 h-3.5" /></div>
                <span className="text-[11px] font-bold text-slate-700">Cumplimiento Tareas</span>
              </div>
              <span className="text-xs font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">{weights.tareas_cumplimiento_pct}%</span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Users className="w-3.5 h-3.5" /></div>
                <span className="text-[11px] font-bold text-slate-700">Captura de Clientes</span>
              </div>
              <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">{weights.captura_clientes_pct}%</span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg"><ShoppingBag className="w-3.5 h-3.5" /></div>
                <span className="text-[11px] font-bold text-slate-700">Ventas Sugeridas (Upsell)</span>
              </div>
              <span className="text-xs font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">{weights.ventas_sugeridas_pct}%</span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-cyan-50 text-cyan-600 rounded-lg"><Clock className="w-3.5 h-3.5" /></div>
                <span className="text-[11px] font-bold text-slate-700">Puntualidad / Fichaje</span>
              </div>
              <span className="text-xs font-black text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md">{weights.puntualidad_fichaje_pct}%</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-2">
        {/* Lado Izquierdo: Podio de Honor (Top 3) */}
        <div className="lg:col-span-4 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Podio de Honor (Top 3 - {activeFiltro})</h3>
          {top3.length > 0 ? (
            <div className="flex flex-col gap-3">
              {top3.map((item, idx) => {
                const pos = idx + 1;
                return (
                  <div key={item.usuario.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-3xs">
                    <div className="relative shrink-0 flex items-center">
                      <img
                        src={item.usuario.foto_avatar}
                        alt={item.usuario.nombre}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                      <span className={`absolute -bottom-1 -right-1 text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white shadow-3xs ${
                        pos === 1 ? 'bg-amber-400 text-amber-950' : pos === 2 ? 'bg-slate-300 text-slate-800' : 'bg-orange-400 text-white'
                      }`}>
                        {pos}
                      </span>
                    </div>
                    <div className="min-w-0 leading-tight flex-1">
                      <p className="font-extrabold text-[#2C3E50] truncate text-xs">{item.usuario.nombre}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{item.usuario.insignia_actual || 'Colaborador Fit'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#4B9CD3] font-black text-xs">{item.puntosTotales} pts</p>
                      <p className="text-[9px] text-slate-500 font-bold">{item.porcentajeEficiencia}% Efic.</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-center text-slate-400 py-4">No hay suficientes datos para armar el podio en este rango.</p>
          )}
        </div>

        {/* Lado Derecho: Tabla extendida de posiciones y desglose */}
        <div className="lg:col-span-8 overflow-x-auto bg-white border border-slate-200 rounded-xl p-2.5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                <th className="py-2 px-3 text-center w-12">POS</th>
                <th className="py-2 px-3">Colaborador</th>
                <th className="py-2 px-3 text-center">Pts. Tareas</th>
                <th className="py-2 px-3 text-center">Pts. Ventas Sug.</th>
                <th className="py-2 px-3 text-center">Pts. Fichaje</th>
                <th className="py-2 px-3 text-center">Sumatoria Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[11px]">
              {leaderboardData.map((item, index) => {
                const isTop3 = index < 3;
                const isExpanded = expandedEmployeeId === item.usuario.id;

                return (
                  <React.Fragment key={item.usuario.id}>
                    <tr
                      id={`leaderboard-row-${item.usuario.id}`}
                      onClick={() => setExpandedEmployeeId(isExpanded ? null : item.usuario.id)}
                      className={`hover:bg-[#FFFDF6]/80 transition-all cursor-pointer ${
                        isTop3 ? 'bg-[#FFFDF6]/40 font-medium' : ''
                      }`}
                      title="Clic para ver detalles de POS y negocio"
                    >
                      {/* Posición */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex justify-center items-center">
                          {index === 0 && <Trophy className="w-4 h-4 text-amber-500 fill-amber-100" />}
                          {index === 1 && <Medal className="w-4 h-4 text-slate-400 fill-slate-100" />}
                          {index === 2 && <Medal className="w-4 h-4 text-orange-600 fill-orange-100" />}
                          {index >= 3 && <span className="font-bold text-slate-500">{index + 1}</span>}
                        </div>
                      </td>

                      {/* Colaborador */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={item.usuario.foto_avatar}
                            alt={item.usuario.nombre}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="font-bold text-[#2C3E50] text-[11px] flex items-center gap-1">
                              {item.usuario.nombre}
                              {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                            </p>
                            <p className="text-[9px] text-slate-400">{item.usuario.insignia_actual || 'Empleado Fit'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Puntos Tareas */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-blue-700">+{item.puntosTareas} pts</span>
                          <span className="text-[8px] text-slate-400">
                            {item.tareasCompletadas}/{item.tareasTotales} tareas ({item.porcentajeEficiencia}%)
                          </span>
                        </div>
                      </td>

                      {/* Puntos Ventas Sugeridas */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-orange-700">+{item.puntosVentas} pts</span>
                          <span className="text-[8px] text-orange-600 font-semibold bg-orange-50 px-1.5 py-0.2 rounded">
                            {item.ventasSugeridas} un. sugeridas
                          </span>
                        </div>
                      </td>

                      {/* Puntos Fichaje */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-emerald-700">+{item.puntosFichaje} pts</span>
                          <span className="text-[8px] text-slate-400">
                            {item.fichajesPuntualesCount || 0} puntuales
                          </span>
                        </div>
                      </td>

                      {/* Puntos Totales */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-xs font-black text-[#4B9CD3] bg-[#EBF5FB] px-2.5 py-1 rounded-lg border border-blue-100 shadow-xs">
                          {item.puntosTotales} pts
                        </span>
                      </td>
                    </tr>

                    {/* Desglose Expandible de Puntos por Colaborador */}
                    {isExpanded && (
                      <tr className="bg-[#FFFDF6] border-b border-slate-200">
                        <td colSpan={6} className="p-3 text-[10px] text-slate-600">
                          <div className="bg-white border border-amber-200 rounded-xl p-3 space-y-3">
                            <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                              <p className="font-extrabold text-[#2C3E50] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                <span>📊</span> Desglose de Sumatoria de Puntos para {item.usuario.nombre} ({activeFiltro}):
                              </p>
                              <span className="text-xs font-black text-[#4B9CD3] bg-[#EBF5FB] px-2.5 py-1 rounded-lg">
                                Total: {item.puntosTotales} pts
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {/* Ventas Monto */}
                              <div className="bg-purple-50/50 p-2.5 rounded-lg border border-purple-100 flex flex-col justify-between">
                                <div>
                                  <span className="text-purple-800 font-bold block text-[10px]">💵 Ventas Totales ($)</span>
                                  <span className="text-slate-500 text-[9px]">
                                    Facturado: ${(item.montoVentasTotal || 0).toLocaleString()}
                                  </span>
                                </div>
                                <div className="mt-2 text-right">
                                  <span className="text-xs font-extrabold text-purple-700">+{item.puntosMonto || 0} pts</span>
                                </div>
                              </div>

                              {/* Cantidad Transacciones */}
                              <div className="bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100 flex flex-col justify-between">
                                <div>
                                  <span className="text-indigo-800 font-bold block text-[10px]">🧾 Transacciones</span>
                                  <span className="text-slate-500 text-[9px]">
                                    {item.cantidadVentasTotal || 0} tickets emitidos
                                  </span>
                                </div>
                                <div className="mt-2 text-right">
                                  <span className="text-xs font-extrabold text-indigo-700">+{item.puntosCantidad || 0} pts</span>
                                </div>
                              </div>

                              {/* Puntos Tareas */}
                              <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 flex flex-col justify-between">
                                <div>
                                  <span className="text-blue-800 font-bold block text-[10px]">📋 Tareas y Checklist</span>
                                  <span className="text-slate-500 text-[9px]">
                                    {item.tareasCompletadas} de {item.tareasTotales} tareas ({item.porcentajeEficiencia}%)
                                  </span>
                                </div>
                                <div className="mt-2 text-right">
                                  <span className="text-xs font-extrabold text-blue-700">+{item.puntosTareas} pts</span>
                                </div>
                              </div>

                              {/* Captura de Clientes */}
                              <div className="bg-teal-50/50 p-2.5 rounded-lg border border-teal-100 flex flex-col justify-between">
                                <div>
                                  <span className="text-teal-800 font-bold block text-[10px]">👥 Captura Clientes</span>
                                  <span className="text-slate-500 text-[9px]">
                                    Fidelización: {item.capturaClientesPct || 100}%
                                  </span>
                                </div>
                                <div className="mt-2 text-right">
                                  <span className="text-xs font-extrabold text-teal-700">+{item.puntosCaptura || 0} pts</span>
                                </div>
                              </div>

                              {/* Ventas Sugeridas */}
                              <div className="bg-orange-50/50 p-2.5 rounded-lg border border-orange-100 flex flex-col justify-between">
                                <div>
                                  <span className="text-orange-800 font-bold block text-[10px]">🛍️ Ventas Sugeridas</span>
                                  <span className="text-slate-500 text-[9px]">
                                    {item.ventasSugeridas} unidades en reporte
                                  </span>
                                </div>
                                <div className="mt-2 text-right">
                                  <span className="text-xs font-extrabold text-orange-700">+{item.puntosVentas} pts</span>
                                </div>
                              </div>

                              {/* Puntos Fichaje */}
                              <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 flex flex-col justify-between">
                                <div>
                                  <span className="text-emerald-800 font-bold block text-[10px]">⏰ Puntualidad / Fichaje</span>
                                  <span className="text-slate-500 text-[9px]">
                                    {item.fichajesPuntualesCount || 0} puntuales ({item.puntualidadPct || 100}%)
                                  </span>
                                </div>
                                <div className="mt-2 text-right">
                                  <span className="text-xs font-extrabold text-emerald-700">+{item.puntosFichaje} pts</span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-amber-50/70 p-2 rounded-lg border border-amber-200 text-[9px] text-amber-900 font-medium">
                              🧮 <strong>Fórmula de Sumatoria Global:</strong> {item.puntosMonto || 0} (Monto) + {item.puntosCantidad || 0} (Tickets) + {item.puntosTareas} (Tareas) + {item.puntosCaptura || 0} (Clientes) + {item.puntosVentas} (Sugeridas) + {item.puntosFichaje} (Fichaje) = <strong>{item.puntosTotales} pts totales</strong>.
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
