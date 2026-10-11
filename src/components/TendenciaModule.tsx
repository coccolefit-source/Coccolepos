/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Venta, Producto } from '../types';
import { formatMoney } from '../utils/metrics';
import {
  TrendingUp,
  BarChart3,
  Filter,
  Calendar,
  DollarSign,
  Boxes,
  Check,
  Search,
  Download,
  RefreshCw,
  AlertTriangle,
  Layers,
  PieChart
} from 'lucide-react';
import { getLocalDateString } from '../lib/supabaseClient';

interface TendenciaModuleProps {
  ventasRegistradas: Venta[];
  productosCatalogo: Producto[];
}

export default function TendenciaModule({
  ventasRegistradas = [],
  productosCatalogo = []
}: TendenciaModuleProps) {
  // Estado para el filtro de productos (Permite seleccionar múltiples productos o 'todos')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(['todos']);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Estado para tipo de métrica a mostrar en la gráfica
  const [activeMetric, setActiveMetric] = useState<'ventas' | 'utilidad' | 'cantidades'>('ventas');

  // Estado para agrupación temporal
  const [groupingType, setGroupingType] = useState<'semanal' | 'mensual' | 'diario'>('semanal');

  // Estado para rangos de fecha
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return getLocalDateString(d);
  });
  const [endDate, setEndDate] = useState<string>(() => getLocalDateString());

  // Botones rápidos de fechas
  const handleQuickDateFilter = (type: '30d' | '20d' | 'ytd' | 'all') => {
    const now = new Date();
    const endStr = getLocalDateString(now);
    let startD = new Date();

    if (type === '30d') {
      startD.setDate(now.getDate() - 30);
    } else if (type === '20d') {
      startD.setDate(now.getDate() - 20);
    } else if (type === 'ytd') {
      startD = new Date(now.getFullYear(), 0, 1);
    } else if (type === 'all') {
      startD = new Date(2025, 0, 1); // Desde inicio histórico
    }
    setStartDate(getLocalDateString(startD));
    setEndDate(endStr);
  };

  // Filtrado y Agrupación de Datos de Transacciones
  const aggregatedData = useMemo(() => {
    // 1. Filtrar ventas por rango de fecha y estado completado
    const validSales = ventasRegistradas.filter(v => {
      if (v.estado === 'Anulada') return false;
      if (!v.fecha) return false;
      if (startDate && v.fecha < startDate) return false;
      if (endDate && v.fecha > endDate) return false;
      return true;
    });

    // 2. Agrupar por período temporal (Semanal, Mensual, Diario)
    const groupsMap = new Map<string, { label: string; ventas: number; utilidad: number; cantidades: number; sortKey: string }>();

    validSales.forEach(venta => {
      const fechaObj = new Date(venta.fecha + 'T00:00:00');
      if (isNaN(fechaObj.getTime())) return;

      let periodKey = '';
      let periodLabel = '';
      let sortKey = venta.fecha;

      if (groupingType === 'diario') {
        periodKey = venta.fecha;
        const rawWeekday = fechaObj.toLocaleString('es-CO', { weekday: 'long' });
        periodLabel = rawWeekday.charAt(0).toUpperCase() + rawWeekday.slice(1);
        sortKey = venta.fecha;
      } else if (groupingType === 'mensual') {
        const year = fechaObj.getFullYear();
        const month = fechaObj.getMonth();
        periodKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        periodLabel = fechaObj.toLocaleString('es-CO', { month: 'short', year: '2-digit' });
        sortKey = periodKey;
      } else {
        // Semanal: calcular número de semana aproximado del año
        const startOfYear = new Date(fechaObj.getFullYear(), 0, 1);
        const days = Math.floor((fechaObj.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
        periodKey = `${fechaObj.getFullYear()}-W${weekNum}`;
        periodLabel = `Semana ${weekNum}`;
        sortKey = `${fechaObj.getFullYear()}-${String(weekNum).padStart(2, '0')}`;
      }

      // Filtrar ítems de la venta según selección de productos
      let ventaVentas = 0;
      let ventaUtilidad = 0;
      let ventaCantidades = 0;

      (venta.productos_vendidos || []).forEach(item => {
        const matchesProduct =
          selectedProductIds.includes('todos') ||
          selectedProductIds.includes(item.producto_id || '') ||
          selectedProductIds.some(id => {
            const prodObj = productosCatalogo.find(p => p.id === id);
            return prodObj && (prodObj.nombre.toLowerCase() === item.nombre.toLowerCase() || prodObj.codigo === item.codigo);
          });

        if (matchesProduct) {
          const itemTotal = item.precio * item.cantidad;
          ventaVentas += itemTotal;
          ventaCantidades += item.cantidad;

          // Calcular costo unitario
          const catalogMatch = productosCatalogo.find(p => p.id === item.producto_id || p.nombre.toLowerCase() === item.nombre.toLowerCase());
          const costoUnit = catalogMatch?.precio_costo ?? (item.precio * 0.5); // Estimado 50% si no hay costo
          const itemUtilidad = (item.precio - costoUnit) * item.cantidad;
          ventaUtilidad += itemUtilidad;
        }
      });

      // Si no se filtró por productos específicos o la venta completa cumple
      if (selectedProductIds.includes('todos')) {
        ventaVentas = venta.total;
        ventaCantidades = (venta.productos_vendidos || []).reduce((acc, i) => acc + i.cantidad, 0);
        ventaUtilidad = (venta.productos_vendidos || []).reduce((acc, item) => {
          const catalogMatch = productosCatalogo.find(p => p.id === item.producto_id || p.nombre.toLowerCase() === item.nombre.toLowerCase());
          const costoUnit = catalogMatch?.precio_costo ?? (item.precio * 0.5);
          return acc + ((item.precio - costoUnit) * item.cantidad);
        }, 0);
      }

      if (ventaVentas > 0 || ventaCantidades > 0) {
        if (!groupsMap.has(periodKey)) {
          groupsMap.set(periodKey, { label: periodLabel, ventas: 0, utilidad: 0, cantidades: 0, sortKey });
        }
        const current = groupsMap.get(periodKey)!;
        current.ventas += ventaVentas;
        current.utilidad += ventaUtilidad;
        current.cantidades += ventaCantidades;
      }
    });

    const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    return sortedGroups;
  }, [ventasRegistradas, productosCatalogo, selectedProductIds, groupingType, startDate, endDate]);

  // Cálculo de sumatoria y promedio del período
  const summaryMetrics = useMemo(() => {
    if (aggregatedData.length === 0) return { sum: 0, avg: 0 };
    let totalSum = 0;
    aggregatedData.forEach(item => {
      if (activeMetric === 'ventas') totalSum += item.ventas;
      else if (activeMetric === 'utilidad') totalSum += item.utilidad;
      else totalSum += item.cantidades;
    });
    const avg = totalSum / aggregatedData.length;
    return { sum: totalSum, avg };
  }, [aggregatedData, activeMetric]);

  // Selección de productos
  const toggleProductId = (id: string) => {
    if (id === 'todos') {
      setSelectedProductIds(['todos']);
      return;
    }
    setSelectedProductIds(prev => {
      const withoutTodos = prev.filter(i => i !== 'todos');
      if (withoutTodos.includes(id)) {
        const filtered = withoutTodos.filter(i => i !== id);
        return filtered.length === 0 ? ['todos'] : filtered;
      } else {
        return [...withoutTodos, id];
      }
    });
  };

  const filteredCatalogForSearch = useMemo(() => {
    if (!productSearchTerm.trim()) return productosCatalogo;
    const term = productSearchTerm.toLowerCase();
    return productosCatalogo.filter(p => p.nombre.toLowerCase().includes(term) || p.codigo.toLowerCase().includes(term));
  }, [productosCatalogo, productSearchTerm]);

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">
      
      {/* Alerta de Tendencia Superior y Reloj */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-50 rounded-xl text-[#4B9CD3] border border-sky-100">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#2C3E50]">Tendencias de Rendimiento</h2>
            <p className="text-xs text-slate-500 font-medium">Desglose detallado mensual y semanal asistido por gráficos vectoriales.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <div className="text-[11px]">
              <span className="font-bold text-rose-900 block leading-tight">ALERTA DE TENDENCIA</span>
              <span className="text-rose-700 font-medium">Contraccion Mensual de Mercado</span>
            </div>
          </div>
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-600 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </div>

      {/* PANEL PRINCIPAL: REPORTES VISUALES DE NEGOCIO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        
        {/* Cabecera de Reportes Visuales y Controles */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center pb-5 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#EBF5FB] text-[#4B9CD3] rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-[#2C3E50]">Reportes Visuales de Negocio</h3>
                <span className="text-[10px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md uppercase tracking-wider">Preview</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Explora el comportamiento y tendencias de tus ventas, utilidad neta y cantidades.</p>
            </div>
          </div>

          {/* Filtro de Productos y Botones de Agrupación Temporal */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Selector Multiproducto Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProductDropdown(!showProductDropdown)}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Boxes className="w-3.5 h-3.5 text-[#4B9CD3]" />
                <span>
                  {selectedProductIds.includes('todos')
                    ? 'Todos los productos'
                    : `${selectedProductIds.length} producto(s) seleccionado(s)`}
                </span>
                <span className="text-slate-400 text-[10px]">▼</span>
              </button>

              {showProductDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-3 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-700 uppercase">Filtrar Productos</span>
                    <button
                      type="button"
                      onClick={() => setSelectedProductIds(['todos'])}
                      className="text-[10px] text-[#4B9CD3] font-bold hover:underline"
                    >
                      Seleccionar Todos
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar producto..."
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-slate-50">
                    <div
                      onClick={() => toggleProductId('todos')}
                      className={`p-2 rounded-lg text-xs font-bold flex items-center justify-between cursor-pointer ${
                        selectedProductIds.includes('todos') ? 'bg-[#EBF5FB] text-[#4B9CD3]' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>Todos los productos</span>
                      {selectedProductIds.includes('todos') && <Check className="w-3.5 h-3.5" />}
                    </div>

                    {filteredCatalogForSearch.map(p => {
                      const isSelected = selectedProductIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleProductId(p.id)}
                          className={`p-2 rounded-lg text-xs font-medium flex items-center justify-between cursor-pointer ${
                            isSelected ? 'bg-sky-50 text-[#4B9CD3] font-bold' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div>
                            <span className="block">{p.nombre}</span>
                            <span className="text-[10px] text-slate-400 font-mono">${p.precio.toFixed(2)}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Agrupación Temporal (Semanal, Mensual, Día Semana) */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => setGroupingType('semanal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  groupingType === 'semanal' ? 'bg-white text-[#2C3E50] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semanal
              </button>
              <button
                type="button"
                onClick={() => setGroupingType('mensual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  groupingType === 'mensual' ? 'bg-white text-[#2C3E50] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mensual
              </button>
              <button
                type="button"
                onClick={() => setGroupingType('diario')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  groupingType === 'diario' ? 'bg-white text-[#2C3E50] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Día Semana
              </button>
            </div>
          </div>
        </div>

        {/* Fila de Botones Métrica (Ventas, Utilidad, Cantidades) y Filtros de Fecha Rápido */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
          
          {/* Métrica Selector */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveMetric('ventas')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                activeMetric === 'ventas'
                  ? 'bg-[#4B9CD3] text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Ventas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMetric('utilidad')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                activeMetric === 'utilidad'
                  ? 'bg-[#4B9CD3] text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Utilidad</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMetric('cantidades')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                activeMetric === 'cantidades'
                  ? 'bg-[#4B9CD3] text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Cantidades</span>
            </button>
          </div>

          {/* Rango de Fechas & Botones Rápidos */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span>Filtrar Rango:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-medium"
              />
              <span className="text-slate-400">hasta</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400">Rápido:</span>
              <button
                type="button"
                onClick={() => handleQuickDateFilter('30d')}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Últimos 30 días
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateFilter('20d')}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Últimos 20 días
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateFilter('ytd')}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Este Año
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateFilter('all')}
                className="px-3 py-1 bg-[#4B9CD3] hover:bg-[#3A82B4] text-white rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer shadow-2xs"
              >
                Ver Todo
              </button>
            </div>
          </div>
        </div>

        {/* Tarjeta de Sumatoria y Promedio del Período */}
        <div className="bg-[#EBF5FB]/50 border border-[#AED6F1] rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#4B9CD3] animate-pulse"></div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#1B4F72]">
                {activeMetric === 'ventas' ? 'Venta Bruta Histórica' : activeMetric === 'utilidad' ? 'Utilidad Neta Histórica' : 'Cantidad Total Vendida'}
              </span>
              <span className="text-xs text-slate-600 font-medium block">Pasa el cursor sobre los puntos del gráfico para ver detalles exactos.</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs">
            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">Promedio del periodo:</span>
              <span className="text-sm font-black text-[#2C3E50]">
                {activeMetric === 'cantidades' ? `${Math.round(summaryMetrics.avg).toLocaleString()} uds` : formatMoney(summaryMetrics.avg)}
              </span>
            </div>
            <div className="h-6 w-px bg-sky-200"></div>
            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                {activeMetric === 'cantidades' ? 'Sumatoria de productos:' : 'Sumatoria total:'}
              </span>
              <span className="text-sm font-black text-[#4B9CD3]">
                {activeMetric === 'cantidades' ? `${summaryMetrics.sum.toLocaleString()} uds` : formatMoney(summaryMetrics.sum)}
              </span>
            </div>
          </div>
        </div>

        {/* GRÁFICA VECTORIAL (SVG) */}
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
          {aggregatedData.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">Sin datos para mostrar en este rango</h4>
              <p className="text-xs text-slate-400">Prueba seleccionando "Ver Todo" o un rango de fechas diferente.</p>
            </div>
          ) : (
            <div className="relative w-full overflow-x-auto">
              <div className="min-w-[700px] h-[360px] relative flex flex-col justify-between pt-6 pb-8 px-4">
                
                {/* Líneas de cuadrícula horizontales de fondo */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-8 px-4 opacity-40">
                  {[0, 1, 2, 3, 4].map(idx => (
                    <div key={idx} className="w-full border-b border-dashed border-slate-200"></div>
                  ))}
                </div>

                {/* SVG Gráfico Vectorial con Puntos Interactivos */}
                {(() => {
                  const values = aggregatedData.map(d => activeMetric === 'ventas' ? d.ventas : activeMetric === 'utilidad' ? d.utilidad : d.cantidades);
                  const maxVal = Math.max(...values, 10);
                  const minVal = 0;
                  const range = maxVal - minVal || 1;

                  const points = aggregatedData.map((d, index) => {
                    const val = activeMetric === 'ventas' ? d.ventas : activeMetric === 'utilidad' ? d.utilidad : d.cantidades;
                    const xPercent = (index / (aggregatedData.length - 1 || 1)) * 100;
                    const yPercent = 100 - ((val - minVal) / range) * 80 - 10;
                    return { x: xPercent, y: yPercent, val, label: d.label };
                  });

                  const pathString = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}%`, '');

                  return (
                    <div className="relative w-full h-full">
                      {/* Líneas SVG */}
                      <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4B9CD3" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#4B9CD3" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Área bajo la curva */}
                        <path
                          d={`${pathString} L 100% 100% L 0% 100% Z`}
                          fill="url(#chartGradient)"
                        />

                        {/* Línea principal */}
                        <path
                          d={pathString}
                          fill="none"
                          stroke="#4B9CD3"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>

                      {/* Puntos de datos y etiquetas de valores sobre cada punto */}
                      <div className="absolute inset-0 flex justify-between items-center pointer-events-none px-2">
                        {points.map((p, idx) => (
                          <div
                            key={idx}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group pointer-events-auto cursor-pointer"
                            style={{ left: `${p.x}%`, top: `${p.y}%` }}
                          >
                            {/* Etiqueta de valor exacto sobre el punto */}
                            <div className="mb-2 opacity-95 group-hover:opacity-100 transition-all transform group-hover:scale-110">
                              <span className="px-2 py-1 bg-slate-900 text-white text-[10px] font-black rounded-md shadow-md whitespace-nowrap font-mono">
                                {activeMetric === 'cantidades' ? `${p.val.toLocaleString()} uds` : formatMoney(p.val)}
                              </span>
                            </div>

                            {/* Círculo indicador */}
                            <div className="w-4 h-4 rounded-full bg-white border-4 border-[#4B9CD3] shadow-md group-hover:bg-[#4B9CD3] group-hover:scale-125 transition-all"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Eje X: Etiquetas de período en la parte inferior */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-200 text-[11px] font-bold text-slate-500">
                  {aggregatedData.map((d, idx) => (
                    <span key={idx} className="text-center truncate px-1">
                      {d.label}
                    </span>
                  ))}
                </div>

              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
