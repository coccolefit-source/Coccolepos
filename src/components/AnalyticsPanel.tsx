/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Tarea, ProductoPromocion, RegistroVenta } from '../types';
import { getGlobalMetrics } from '../utils/metrics';
import { BarChart3, PieChart, TrendingUp, CheckCircle, Clock, AlertCircle, Sparkles } from 'lucide-react';

interface AnalyticsPanelProps {
  tareas: Tarea[];
  ventas: RegistroVenta[];
  productos: ProductoPromocion[];
  filtro: 'diario' | 'semanal' | 'mensual';
  setFiltro: (filtro: 'diario' | 'semanal' | 'mensual') => void;
  renderMode?: 'progress' | 'impulse' | 'all';
}

export default function AnalyticsPanel({
  tareas,
  ventas,
  productos,
  filtro,
  setFiltro,
  renderMode = 'all',
}: AnalyticsPanelProps) {
  const metrics = getGlobalMetrics(tareas, ventas, productos, filtro);
  const [activeChartTab, setActiveChartTab] = useState<'status' | 'sales'>('status');

  // Calcular las proporciones para el gráfico de dona (Task status distribution)
  const totalTasks = metrics.tareasTotales;
  const completedPct = totalTasks > 0 ? (metrics.tareasCompletadas / totalTasks) * 100 : 0;
  const inProgressPct = totalTasks > 0 ? (metrics.tareasEnProgreso / totalTasks) * 100 : 0;
  const pendingPct = totalTasks > 0 ? (metrics.tareasPendientes / totalTasks) * 100 : 0;

  // Parámetros para círculo SVG de dona
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  
  // Calcular offsets para dbiujar secciones continuas en la dona
  const completedOffset = circumference - (completedPct / 100) * circumference;
  const inProgressOffset = circumference - (inProgressPct / 100) * circumference;
  const pendingOffset = circumference - (pendingPct / 100) * circumference;

  // Agrupar ventas por producto para el gráfico de barras
  const salesByProduct = productos.map(prod => {
    const totalSold = ventas
      .filter(v => v.producto_id === prod.id && (
        filtro === 'diario' ? v.fecha === '2026-08-20' : true // Filtrado simplificado para mockup
      ))
      .reduce((sum, v) => sum + v.unidades_contadas, 0);
    return {
      nombre: prod.nombre_producto,
      vendido: totalSold,
      meta: filtro === 'diario' ? prod.meta_diaria_unidades : prod.meta_diaria_unidades * 6,
    };
  });

  const maxVal = Math.max(...salesByProduct.map(s => Math.max(s.vendido, s.meta, 1)));

  return (
    <>
      {/* 1. VISUALIZACIÓN DE PROGRESO (FULL WIDTH BANNER) */}
      {(renderMode === 'all' || renderMode === 'progress') && (
        <div id="analytics-progress-card" className="w-full rounded-xl border bg-white p-5 shadow-sm font-sans">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            
            {/* Izquierda: Título y selectores */}
            <div className="w-full lg:w-1/4 space-y-3">
              <div>
                <h2 className="text-sm font-bold text-[#2C3E50] flex items-center gap-1.5">
                  <PieChart className="w-4.5 h-4.5 text-[#4B9CD3]" />
                  Visualización de Progreso
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5">Control visual del estado de las tareas y la meta de ventas sugeridas.</p>
              </div>

              {/* Selector de Pestañas de Análisis */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
                <button
                  id="chart-tab-status"
                  onClick={() => setActiveChartTab('status')}
                  className={`py-1.5 rounded-md transition-all text-[10px] font-bold ${
                    activeChartTab === 'status' ? 'bg-[#4B9CD3] text-white' : 'text-slate-500 hover:text-[#2C3E50]'
                  }`}
                >
                  Tareas
                </button>
                <button
                  id="chart-tab-sales"
                  onClick={() => setActiveChartTab('sales')}
                  className={`py-1.5 rounded-md transition-all text-[10px] font-bold ${
                    activeChartTab === 'sales' ? 'bg-[#4B9CD3] text-white' : 'text-slate-500 hover:text-[#2C3E50]'
                  }`}
                >
                  Ventas
                </button>
              </div>
            </div>

            {/* Centro: Gráfico de dona (máximo w-28 h-28) */}
            <div className="flex items-center justify-center shrink-0">
              {activeChartTab === 'status' ? (
                <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                  {/* SVG Donut Chart */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    {/* Círculo de Fondo */}
                    <circle cx="60" cy="60" r={radius} fill="transparent" stroke="#E2E8F0" strokeWidth="12" />
                    {/* Completada */}
                    {completedPct > 0 && (
                      <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="transparent"
                        stroke="#4B9CD3"
                        strokeWidth="12"
                        strokeDasharray={circumference}
                        strokeDashoffset={completedOffset}
                        strokeLinecap="round"
                        className="transition-all duration-500 ease-out"
                      />
                    )}
                    {/* En Proceso */}
                    {inProgressPct > 0 && (
                      <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="transparent"
                        stroke="#85C1E9"
                        strokeWidth="12"
                        strokeDasharray={circumference}
                        strokeDashoffset={completedOffset + circumference - inProgressOffset}
                        strokeLinecap="round"
                        className="transition-all duration-500 ease-out"
                      />
                    )}
                  </svg>
                  {/* Texto Central */}
                  <div className="absolute text-center flex flex-col items-center">
                    <span className="text-xl font-black text-[#2C3E50]">
                      {metrics.tareasCompletadas}
                    </span>
                    <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500">
                      Listas de {totalTasks}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                  {/* SVG Donut Chart para Ventas */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r={radius} fill="transparent" stroke="#E2E8F0" strokeWidth="12" />
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="transparent"
                      stroke="orange"
                      strokeWidth="12"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - (Math.min(completedPct || 70, 100) / 100) * circumference}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-sm font-black text-orange-600">{Math.round(completedPct || 70)}%</span>
                    <p className="text-[8px] text-slate-400 font-bold uppercase leading-none">Meta</p>
                  </div>
                </div>
              )}
            </div>

            {/* Derecha: Desglose de porcentaje y leyenda (Listo, En Proceso, Pendiente) */}
            <div className="flex-1 w-full space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                {activeChartTab === 'status' ? 'Desglose Operativo' : 'Desglose de Ventas Sugeridas'}
              </h4>
              
              {activeChartTab === 'status' ? (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#4B9CD3]"></span>
                      <span className="font-extrabold text-[#2C3E50] text-xs">{metrics.tareasCompletadas}</span>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-0.5">Listo ({Math.round(completedPct)}%)</p>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#85C1E9]"></span>
                      <span className="font-extrabold text-[#2C3E50] text-xs">{metrics.tareasEnProgreso}</span>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-0.5">En Proceso ({Math.round(inProgressPct)}%)</p>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                      <span className="font-extrabold text-[#2C3E50] text-xs">{metrics.tareasPendientes}</span>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-0.5">Pendiente ({Math.round(pendingPct)}%)</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {salesByProduct.map((item, idx) => {
                    const soldPct = Math.min((item.vendido / item.meta) * 100, 100);
                    return (
                      <div key={idx} className="p-2.5 bg-white rounded border border-slate-200 space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-[#2C3E50] truncate">{item.nombre}</span>
                          <span className="font-semibold text-slate-500">{item.vendido}/{item.meta} u.</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${soldPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 2. IMPULSO OPERATIVO NUTRIFIT */}
      {(renderMode === 'all' || renderMode === 'impulse') && (
        <div id="analytics-impulse-card" className="w-full rounded-xl border bg-white p-5 shadow-sm font-sans">
          <div className="mb-4 pb-2 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-sm font-bold text-[#2C3E50] flex items-center gap-1.5">
              <Sparkles className="w-4.5 h-4.5 text-[#4B9CD3]" />
              Impulso Operativo Coccole Fit
            </h4>
            <span className="text-[9px] text-slate-400 font-semibold">Modo Demo Activo</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg shadow-2xs">
              <p className="font-bold text-[#2C3E50] text-xs">Venta Cruzada Inteligente</p>
              <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">
                Ofrecer la <strong className="font-semibold">adición proteica</strong> aumenta el ticket promedio en un 18%. Mantén motivado al personal de caja y cocina para incentivar esta adición en bebidas y bowls.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg shadow-2xs">
              <p className="font-bold text-[#2C3E50] text-xs">Eficiencia en Cocina</p>
              <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">
                El tiempo de sanitización y preparación inicial está promediando <strong className="font-semibold">18 min</strong> (estimado era 20 min). ¡Gran trabajo del equipo de barra fría!
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
