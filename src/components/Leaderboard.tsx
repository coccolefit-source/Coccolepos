/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Usuario, Tarea, RegistroVenta, Fichaje, ProductoPromocion, Venta, RankingWeights, DEFAULT_RANKING_WEIGHTS } from '../types';
import { calculateLeaderboard, EmployeeScore } from '../utils/metrics';
import { Trophy, Medal, Star, Target, CheckCircle2, ShoppingBag, Clock } from 'lucide-react';

interface LeaderboardProps {
  usuarios: Usuario[];
  tareas: Tarea[];
  ventas: RegistroVenta[];
  fichajes: Fichaje[];
  productos: ProductoPromocion[];
  filtro: 'diario' | 'semanal' | 'mensual';
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
  posVentas = [],
  rankingWeights = DEFAULT_RANKING_WEIGHTS,
}: LeaderboardProps) {
  // Calcular leaderboard según el filtro activo y ponderación
  const leaderboardData = calculateLeaderboard(
    usuarios,
    tareas,
    ventas,
    fichajes,
    productos,
    filtro,
    '2026-08-20',
    posVentas,
    rankingWeights
  );


  // Separar Top 3 del resto
  const top3 = leaderboardData.slice(0, 3);
  const restOfList = leaderboardData.slice(3);

  // Re-organizar top 3 para el podio clásico: [2do, 1ro, 3ro]
  const podioOrder = [];
  if (top3[1]) podioOrder.push({ ...top3[1], posicion: 2 });
  if (top3[0]) podioOrder.push({ ...top3[0], posicion: 1 });
  if (top3[2]) podioOrder.push({ ...top3[2], posicion: 3 });

  // Si no hay suficientes, rellenar orden
  const getPodioBg = (pos: number) => {
    if (pos === 1) return 'border-amber-400 bg-amber-50/40 shadow-md ring-2 ring-amber-400/20';
    if (pos === 2) return 'border-slate-300 bg-slate-50/40 shadow-sm';
    return 'border-orange-300 bg-orange-50/30 shadow-xs';
  };

  const getPodioBadge = (pos: number) => {
    if (pos === 1) return <Trophy className="w-5 h-5 text-amber-500 fill-amber-100" />;
    if (pos === 2) return <Medal className="w-4.5 h-4.5 text-slate-400 fill-slate-100" />;
    return <Medal className="w-4.5 h-4.5 text-orange-600 fill-orange-100" />;
  };

  const getPosLabel = (pos: number) => {
    if (pos === 1) return '1º';
    if (pos === 2) return '2º';
    return '3º';
  };

  return (
    <div id="leaderboard-module" className="w-full rounded-xl border bg-white p-5 shadow-sm font-sans">
      <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold text-[#2C3E50] flex items-center gap-1.5">
             <Trophy className="w-4.5 h-4.5 text-amber-500" />
             Tabla de Posiciones y Ranking
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Ranking de productividad gamificado del local.</p>
        </div>
        <span className="text-[9px] bg-[#EBF5FB] text-[#4B9CD3] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
          Filtro: {filtro}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-4">
        
        {/* Lado Izquierdo: Módulo del Top 3 (Camila, Sofía, Diego) */}
        <div className="lg:col-span-4 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Podio de Honor (Top 3)</h3>
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
            <p className="text-[10px] text-center text-slate-400 py-4">No hay suficientes datos de empleados para armar el podio.</p>
          )}

          {/* Reglas de Puntuación según la Ponderación Configurada */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 text-[9px] text-slate-500 space-y-1 mt-2">
            <p className="font-bold text-[#2C3E50] text-[10px]">Criterios de Ponderación Activa</p>
            <ul className="space-y-1 text-[9.5px]">
              <li className="flex justify-between border-b border-slate-100 pb-0.5">
                <span>Ventas $ Facturado:</span>
                <strong className="text-[#4B9CD3]">{rankingWeights?.ventas_monto_pct ?? 30}%</strong>
              </li>
              <li className="flex justify-between border-b border-slate-100 pb-0.5">
                <span>Cantidad Transacciones:</span>
                <strong className="text-[#4B9CD3]">{rankingWeights?.ventas_cantidad_pct ?? 20}%</strong>
              </li>
              <li className="flex justify-between border-b border-slate-100 pb-0.5">
                <span>Tareas Diarias:</span>
                <strong className="text-[#4B9CD3]">{rankingWeights?.tareas_cumplimiento_pct ?? 25}%</strong>
              </li>
              <li className="flex justify-between border-b border-slate-100 pb-0.5">
                <span>Fidelización Clientes:</span>
                <strong className="text-[#4B9CD3]">{rankingWeights?.captura_clientes_pct ?? 15}%</strong>
              </li>
              <li className="flex justify-between">
                <span>Puntualidad Fichaje:</span>
                <strong className="text-[#4B9CD3]">{rankingWeights?.puntualidad_fichaje_pct ?? 10}%</strong>
              </li>
            </ul>
          </div>

        </div>

        {/* Lado Derecho: Tabla extendida de posiciones */}
        <div className="lg:col-span-8 overflow-x-auto bg-white border border-slate-200 rounded-xl p-2.5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                <th className="py-2 px-3 text-center w-12">POS</th>
                <th className="py-2 px-3">Colaborador</th>
                <th className="py-2 px-3 text-center">Eficiencia</th>
                <th className="py-2 px-3 text-center">Ventas Sug.</th>
                <th className="py-2 px-3 text-center">Fichaje</th>
                <th className="py-2 px-3 text-center">Puntos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[11px]">
              {leaderboardData.map((item, index) => {
                const isTop3 = index < 3;
                return (
                  <tr
                    key={item.usuario.id}
                    id={`leaderboard-row-${item.usuario.id}`}
                    className={`hover:bg-[#FFFDF6]/50 transition-all ${
                      isTop3 ? 'bg-[#FFFDF6]/25 font-medium' : ''
                    }`}
                  >
                    {/* Posición con medalla u orden numérico */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex justify-center items-center">
                        {index === 0 && <Trophy className="w-4 h-4 text-amber-500 fill-amber-100" />}
                        {index === 1 && <Medal className="w-4 h-4 text-slate-400 fill-slate-100" />}
                        {index === 2 && <Medal className="w-4 h-4 text-orange-600 fill-orange-100" />}
                        {index >= 3 && <span className="font-bold text-slate-500">{index + 1}</span>}
                      </div>
                    </td>

                    {/* Info del Colaborador */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={item.usuario.foto_avatar}
                          alt={item.usuario.nombre}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="font-bold text-[#2C3E50] text-[11px]">{item.usuario.nombre}</p>
                          <p className="text-[9px] text-slate-400">{item.usuario.insignia_actual || 'Empleado Fit'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Eficiencia de Tareas */}
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-semibold text-[#2C3E50]">{item.porcentajeEficiencia}%</span>
                        <span className="text-[8px] text-slate-400">
                          {item.tareasCompletadas}/{item.tareasTotales} tareas
                        </span>
                      </div>
                    </td>

                    {/* Ventas sugeridas logradas */}
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center gap-1 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full text-[9px] font-bold text-orange-800 mx-auto">
                        <ShoppingBag className="w-2.5 h-2.5 text-orange-600" />
                        {item.ventasSugeridas} u.
                      </div>
                    </td>

                    {/* Puntaje de Fichaje / Asistencia */}
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center gap-1 text-[9px] text-slate-500 justify-center">
                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                        <span>+{item.puntosFichaje} pts</span>
                      </div>
                    </td>

                    {/* Puntuación Total */}
                    <td className="py-2 px-3 text-center">
                      <span className="text-xs font-black text-[#4B9CD3]">
                        {item.puntosTotales}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
