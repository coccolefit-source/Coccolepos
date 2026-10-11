/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Venta, Gasto, DEFAULT_PRODUCTOS_CATALOGO } from '../types';
import { formatMoney } from '../utils/metrics';
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Calendar,
  Wallet,
  Receipt,
  Percent,
  FileText,
  CheckCircle2,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Calculator,
  Sparkles,
  AlertCircle,
  Clock
} from 'lucide-react';
import { getLocalDateString } from '../lib/supabaseClient';

interface FinancierosModuleProps {
  ventasRegistradas: Venta[];
  gastos: Gasto[];
  productosCatalogo?: any[];
}

export default function FinancierosModule({
  ventasRegistradas = [],
  gastos = []
}: FinancierosModuleProps) {
  // Estado de métrica para la gráfica ('ventas' | 'gastos' | 'utilidad')
  const [activeMetric, setActiveMetric] = useState<'ventas' | 'gastos' | 'utilidad'>('ventas');

  // Estado de agrupación ('mes-a-mes' | 'semana-a-semana' | 'diario')
  const [groupingMode, setGroupingMode] = useState<'mes-a-mes' | 'semana-a-semana' | 'diario'>('mes-a-mes');

  // Estado de rango de fechas (Por defecto abarca desde hace 5 años para capturar todo el historial)
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 5);
    return getLocalDateString(d);
  });
  const [endDate, setEndDate] = useState<string>(() => getLocalDateString());

  const [isGeneratingDeck, setIsGeneratingDeck] = useState(false);
  const [deckData, setDeckData] = useState<any | null>(null);
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);

  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Hola. Soy tu asistente de Gemini experto en Coccole Fit. Pregúntame cualquier detalle sobre los datos financieros, ventas, productos sin rotación, productos con menos rotación o rendimiento de colaboradores bajo el filtro actual.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatLoading(true);

    try {
      const resp = await fetch('/api/financial-filter-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMsg,
          context: {
            startDate,
            endDate,
            totalVentas: filteredData.totalVentas,
            utilidadNeta: filteredData.utilidadNeta,
            totalOPEX: filteredData.totalOPEX,
            margenNetoPct: filteredData.margenNetoPct,
            transaccionesCount: filteredData.validSales.length
          }
        })
      });
      const data = await resp.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.answer || 'Sin respuesta.' }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error al consultar con Gemini.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleGenerateFinancialDeck = async () => {
    setIsGeneratingDeck(true);
    try {
      const productSalesMap: Record<string, { nombre: string; cantidad: number; totalVendido: number; utilidad: number }> = {};
      DEFAULT_PRODUCTOS_CATALOGO.forEach(p => {
        productSalesMap[p.nombre] = { nombre: p.nombre, cantidad: 0, totalVendido: 0, utilidad: 0 };
      });

      const vendorSalesMap: Record<string, { totalVendido: number; transacciones: number; productos: Record<string, number> }> = {};
      const hourSalesMap: Record<string, number> = {};
      const daySalesMap: Record<string, number> = {};

      filteredData.validSales.forEach(v => {
        const vName = v.vendedor_nombre || 'Cajero General';
        if (!vendorSalesMap[vName]) {
          vendorSalesMap[vName] = { totalVendido: 0, transacciones: 0, productos: {} };
        }
        vendorSalesMap[vName].totalVendido += Number(v.total) || 0;
        vendorSalesMap[vName].transacciones += 1;

        if (v.hora) {
          const hourStr = v.hora.split(':')[0] + ':00';
          hourSalesMap[hourStr] = (hourSalesMap[hourStr] || 0) + (Number(v.total) || 0);
        }

        if (v.fecha) {
          daySalesMap[v.fecha] = (daySalesMap[v.fecha] || 0) + (Number(v.total) || 0);
        }

        if (v.productos_vendidos && Array.isArray(v.productos_vendidos)) {
          v.productos_vendidos.forEach(item => {
            const pName = item.nombre || 'Producto';
            const qty = Number(item.cantidad) || 1;
            const price = Number(item.precio) || 0;
            const subtotal = qty * price;
            const catProd = DEFAULT_PRODUCTOS_CATALOGO.find(p => p.nombre.toLowerCase() === pName.toLowerCase());
            const cost = catProd?.precio_costo ?? (price * 0.45);
            const itemUtility = subtotal - (cost * qty);

            if (!productSalesMap[pName]) {
              productSalesMap[pName] = { nombre: pName, cantidad: 0, totalVendido: 0, utilidad: 0 };
            }
            productSalesMap[pName].cantidad += qty;
            productSalesMap[pName].totalVendido += subtotal;
            productSalesMap[pName].utilidad += itemUtility;

            vendorSalesMap[vName].productos[pName] = (vendorSalesMap[vName].productos[pName] || 0) + qty;
          });
        }
      });

      const allProdVals = Object.values(productSalesMap);
      const productosNoRotaron = allProdVals.filter(p => p.cantidad === 0).map(p => p.nombre);
      const productosMenosRotaron = allProdVals
        .filter(p => p.cantidad > 0)
        .sort((a, b) => a.cantidad - b.cantidad)
        .slice(0, 5)
        .map(p => ({
          producto: p.nombre,
          unidades: `${p.cantidad} un.`,
          totalVendido: formatMoney(p.totalVendido)
        }));

      const topProductsVentasArr = Object.values(productSalesMap)
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5)
        .map(p => ({
          producto: p.nombre,
          unidades: `${p.cantidad} un.`,
          totalVendido: formatMoney(p.totalVendido)
        }));

      const topProductsUtilidadArr = Object.values(productSalesMap)
        .sort((a, b) => b.utilidad - a.utilidad)
        .slice(0, 5)
        .map(p => ({
          producto: p.nombre,
          utilidadGenerada: formatMoney(p.utilidad),
          margen: p.totalVendido > 0 ? `${Math.round((p.utilidad / p.totalVendido) * 100)}%` : '50%'
        }));

      const allWorkersSales = Object.entries(vendorSalesMap)
        .sort((a, b) => b[1].totalVendido - a[1].totalVendido)
        .map(([nombre, data]) => {
          const topProds = Object.entries(data.productos)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([pName, qty]) => `${pName} (${qty} un.)`)
            .join(', ');
          return {
            nombre,
            totalVendido: formatMoney(data.totalVendido),
            transacciones: data.transacciones,
            productosVendidos: topProds || 'Ninguno registrado'
          };
        });

      const topVendor = allWorkersSales[0] ? { nombre: allWorkersSales[0].nombre, totalVendido: allWorkersSales[0].totalVendido, productosTop: allWorkersSales[0].productosVendidos } : { nombre: 'N/A', totalVendido: '$0', productosTop: 'N/A' };
      const worstVendorObj = allWorkersSales.length > 0 ? {
        nombre: allWorkersSales[allWorkersSales.length - 1].nombre,
        totalVendido: allWorkersSales[allWorkersSales.length - 1].totalVendido,
        comentario: `Registró menor participación de ventas (${allWorkersSales[allWorkersSales.length - 1].transacciones} transacciones) en el periodo.`
      } : { nombre: 'N/A', totalVendido: '$0', comentario: 'N/A' };

      const sortedHours = Object.entries(hourSalesMap).sort((a, b) => b[1] - a[1]);
      const peakHourStr = sortedHours[0] ? `${sortedHours[0][0]} (Ventas: ${formatMoney(sortedHours[0][1])})` : '12:00 PM - 2:00 PM';
      const worstHourStr = sortedHours.length > 0 ? `${sortedHours[sortedHours.length - 1][0]} (Baja afluencia)` : '10:00 AM - 11:00 AM';

      const sortedDays = Object.entries(daySalesMap).sort((a, b) => b[1] - a[1]);
      const worstDayStr = sortedDays.length > 0 ? `${sortedDays[sortedDays.length - 1][0]} (${formatMoney(sortedDays[sortedDays.length - 1][1])})` : 'Lunes';
      const peakMomentStr = sortedDays[0] ? `Día pico: ${sortedDays[0][0]} (${formatMoney(sortedDays[0][1])})` : 'Fines de semana al mediodía';

      const response = await fetch('/api/financial-deck-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          totalVentas: filteredData.totalVentas,
          utilidadBruta: filteredData.utilidadBruta,
          margenBrutoPct: filteredData.margenBrutoPct,
          totalOPEX: filteredData.totalOPEX,
          utilidadNeta: filteredData.utilidadNeta,
          margenNetoPct: filteredData.margenNetoPct,
          ventasCount: filteredData.validSales.length,
          gastosCount: filteredData.validGastos.length,
          topProductsVentasArr,
          topProductsUtilidadArr,
          productosNoRotaron,
          productosMenosRotaron,
          topVendor,
          worstVendorObj,
          peakHourStr,
          worstHourStr,
          worstDayStr,
          peakMomentStr,
          allWorkersSales,
          rawSalesSample: filteredData.validSales.slice(0, 50),
          rawGastosSample: filteredData.validGastos.slice(0, 50)
        })
      });

      if (!response.ok) {
        throw new Error('Error al conectar con Gemini para generar el deck');
      }

      const data = await response.json();
      setDeckData(data);
      setIsDeckModalOpen(true);
    } catch (err: any) {
      console.error(err);
      alert('Hubo un error generando el Deck Financiero: ' + err.message);
    } finally {
      setIsGeneratingDeck(false);
    }
  };

  // Botón rápido: Todo el Historial
  const handleQuickTodo = () => {
    setStartDate('2023-01-01');
    setEndDate(getLocalDateString());
  };

  // Botón rápido: Mes tras mes
  const handleQuickMesTrasMes = () => {
    setGroupingMode('mes-a-mes');
    const now = new Date();
    const startD = new Date(now.getFullYear(), 0, 1); // Desde enero de este año
    setStartDate(getLocalDateString(startD));
    setEndDate(getLocalDateString(now));
  };

  // Botón rápido: Semana tras semana
  const handleQuickSemanaTrasSemana = () => {
    setGroupingMode('semana-a-semana');
    const now = new Date();
    const startD = new Date();
    startD.setDate(now.getDate() - 90); // Últimos 90 días
    setStartDate(getLocalDateString(startD));
    setEndDate(getLocalDateString(now));
  };

  // Botón rápido: Diario
  const handleQuickDiario = () => {
    setGroupingMode('diario');
    const now = new Date();
    const startD = new Date();
    startD.setDate(now.getDate() - 30); // Últimos 30 días
    setStartDate(getLocalDateString(startD));
    setEndDate(getLocalDateString(now));
  };

  // Filtrado estricto y cálculos financieros avanzados (COGS, OPEX, Utilidad, Punto de Equilibrio)
  const filteredData = useMemo(() => {
    const validSales = (ventasRegistradas || []).filter(v => {
      if (v.estado === 'Anulada') return false;
      if (!v.fecha) return false;
      if (startDate && v.fecha < startDate) return false;
      if (endDate && v.fecha > endDate) return false;
      // Horario de operación: de 10:00 AM a 9:00 PM (21:00) hora Bogotá. Cerrados a las 00:00 o fuera de rango.
      if (v.hora) {
        const [hStr] = v.hora.split(':');
        const h = parseInt(hStr, 10);
        if (!isNaN(h)) {
          if (h < 10 || h > 21) return false;
        }
      }
      return true;
    });

    const validGastos = (gastos || []).filter(g => {
      if (!g.fecha) return false;
      if (startDate && g.fecha < startDate) return false;
      if (endDate && g.fecha > endDate) return false;
      return true;
    });

    // Ventas Brutas / Totales
    const totalVentas = validSales.reduce((sum, v) => sum + (Number(v.total) || 0), 0);

    // Costo de Ventas (COGS) estimado por catálogo de productos vendidos
    let costoVentasCOGS = 0;
    validSales.forEach(v => {
      if (v.productos_vendidos && Array.isArray(v.productos_vendidos)) {
        v.productos_vendidos.forEach(item => {
          const catProd = DEFAULT_PRODUCTOS_CATALOGO.find(
            p => p.id === item.producto_id || p.nombre.toLowerCase() === item.nombre.toLowerCase()
          );
          const unitCost = catProd?.precio_costo ?? (item.precio ? item.precio * 0.45 : 0);
          costoVentasCOGS += unitCost * (item.cantidad || 1);
        });
      } else {
        costoVentasCOGS += (Number(v.total) || 0) * 0.42;
      }
    });

    // Utilidad Bruta = Ventas Brutas - COGS
    const utilidadBruta = totalVentas - costoVentasCOGS;
    const margenBrutoPct = totalVentas > 0 ? (utilidadBruta / totalVentas) * 100 : 0;

    // Gastos Operativos (OPEX) por categorías
    const gastosPorCategoria: Record<string, number> = {
      Insumos: 0,
      Servicios: 0,
      Mantenimiento: 0,
      Personal: 0,
      Otros: 0
    };

    validGastos.forEach(g => {
      const cat = g.categoria && gastosPorCategoria.hasOwnProperty(g.categoria) ? g.categoria : 'Otros';
      gastosPorCategoria[cat] += Number(g.monto) || 0;
    });

    const totalOPEX = Object.values(gastosPorCategoria).reduce((a, b) => a + b, 0);

    // Ganancia Neta / Utilidad Neta = Utilidad Bruta - OPEX
    const utilidadNeta = utilidadBruta - totalOPEX;
    const margenNetoPct = totalVentas > 0 ? (utilidadNeta / totalVentas) * 100 : 0;

    // Costos Fijos (Personal y Servicios) vs Costos Variables (COGS + Insumos)
    const costosFijos = (gastosPorCategoria.Personal || 0) + (gastosPorCategoria.Servicios || 0);
    const costosVariables = costoVentasCOGS + (gastosPorCategoria.Insumos || 0) + (gastosPorCategoria.Mantenimiento || 0) + (gastosPorCategoria.Otros || 0);

    const margenContribucionPct = totalVentas > 0 ? ((totalVentas - costosVariables) / totalVentas) * 100 : 50;
    
    const ventasEquilibrioRequeridas = margenContribucionPct > 0 ? costosFijos / (margenContribucionPct / 100) : 0;
    const progresoEquilibrio = ventasEquilibrioRequeridas > 0 ? Math.min(100, (totalVentas / ventasEquilibrioRequeridas) * 100) : (totalVentas > 0 ? 100 : 0);

    return {
      validSales,
      validGastos,
      totalVentas,
      costoVentasCOGS,
      utilidadBruta,
      margenBrutoPct,
      gastosPorCategoria,
      totalOPEX,
      utilidadNeta,
      margenNetoPct,
      costosFijos,
      costosVariables,
      ventasEquilibrioRequeridas,
      progresoEquilibrio
    };
  }, [ventasRegistradas, gastos, startDate, endDate]);

  // Agrupación para la Gráfica de Tendencia (Ventas, Gastos, Utilidad $)
  const chartPoints = useMemo(() => {
    const map = new Map<string, { label: string; ventas: number; gastos: number; utilidad: number; sortKey: string }>();

    filteredData.validSales.forEach(v => {
      const d = new Date(v.fecha + 'T00:00:00');
      if (isNaN(d.getTime())) return;

      let key = '';
      let label = '';
      let sortKey = v.fecha;

      if (groupingMode === 'mes-a-mes') {
        const y = d.getFullYear();
        const m = d.getMonth();
        key = `${y}-${String(m + 1).padStart(2, '0')}`;
        label = d.toLocaleString('es-CO', { month: 'short', year: '2-digit' });
        sortKey = key;
      } else if (groupingMode === 'semana-a-semana') {
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const days = Math.floor((d.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
        key = `${d.getFullYear()}-W${weekNum}`;
        label = `Sem ${weekNum} (${d.getFullYear()})`;
        sortKey = `${d.getFullYear()}-${String(weekNum).padStart(2, '0')}`;
      } else {
        key = v.fecha;
        const rawWeekday = d.toLocaleString('es-CO', { weekday: 'long' });
        label = rawWeekday.charAt(0).toUpperCase() + rawWeekday.slice(1);
        sortKey = v.fecha;
      }

      if (!map.has(key)) {
        map.set(key, { label, ventas: 0, gastos: 0, utilidad: 0, sortKey });
      }
      const curr = map.get(key)!;
      curr.ventas += Number(v.total) || 0;
    });

    filteredData.validGastos.forEach(g => {
      const d = new Date(g.fecha + 'T00:00:00');
      if (isNaN(d.getTime())) return;

      let key = '';
      let label = '';
      let sortKey = g.fecha;

      if (groupingMode === 'mes-a-mes') {
        const y = d.getFullYear();
        const m = d.getMonth();
        key = `${y}-${String(m + 1).padStart(2, '0')}`;
        label = d.toLocaleString('es-CO', { month: 'short', year: '2-digit' });
        sortKey = key;
      } else if (groupingMode === 'semana-a-semana') {
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const days = Math.floor((d.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
        key = `${d.getFullYear()}-W${weekNum}`;
        label = `Sem ${weekNum} (${d.getFullYear()})`;
        sortKey = `${d.getFullYear()}-${String(weekNum).padStart(2, '0')}`;
      } else {
        key = g.fecha;
        const rawWeekday = d.toLocaleString('es-CO', { weekday: 'long' });
        label = rawWeekday.charAt(0).toUpperCase() + rawWeekday.slice(1);
        sortKey = g.fecha;
      }

      if (!map.has(key)) {
        map.set(key, { label, ventas: 0, gastos: 0, utilidad: 0, sortKey });
      }
      const curr = map.get(key)!;
      curr.gastos += Number(g.monto) || 0;
    });

    map.forEach(item => {
      item.utilidad = item.ventas - item.gastos;
    });

    return Array.from(map.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredData, groupingMode]);

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">
      
      {/* Cabecera del Módulo Financiero */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-xs gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#2C3E50]">Estado Financiero Consolidado (Estado de Resultados)</h2>
            <p className="text-xs text-slate-500 font-medium">Filtra todo el contenido: KPIs, Flujo de Valor, Equilibrio, Diagnóstico, Tabla y Gráfica.</p>
          </div>
        </div>

        {/* Filtros de Rango y Botones Rápidos */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-[#4B9CD3]" />
            <span>Desde:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium cursor-pointer"
            />
            <span>Hasta:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium cursor-pointer"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleQuickTodo}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer bg-slate-900 text-white hover:bg-slate-800 shadow-xs flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5" /> Todo el Historial
            </button>
            <button
              type="button"
              onClick={handleQuickDiario}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                groupingMode === 'diario'
                  ? 'bg-[#4B9CD3] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Diario
            </button>
            <button
              type="button"
              onClick={handleQuickSemanaTrasSemana}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                groupingMode === 'semana-a-semana'
                  ? 'bg-[#4B9CD3] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Semana tras semana
            </button>
            <button
              type="button"
              onClick={handleQuickMesTrasMes}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                groupingMode === 'mes-a-mes'
                  ? 'bg-[#4B9CD3] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Mes tras mes
            </button>
            <button
              type="button"
              onClick={handleGenerateFinancialDeck}
              disabled={isGeneratingDeck}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              {isGeneratingDeck ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generando Deck...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Generar Deck Financiero (Gemini)
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsChatModalOpen(true)}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer bg-gradient-to-r from-sky-600 to-indigo-600 text-white hover:from-sky-700 hover:to-indigo-700 shadow-md flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" /> Preguntar al Chat de Gemini (Filtro Actual)
            </button>
          </div>
        </div>
      </div>

      {/* TARJETAS KPI FINANCIERAS (4 tarjetas principales) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Ventas Totales */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Ventas Totales</span>
            <div className="p-2 bg-sky-50 text-[#4B9CD3] rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-black text-[#2C3E50]">{formatMoney(filteredData.totalVentas)}</h3>
          <p className="text-[11px] text-slate-500 font-medium">
            {filteredData.validSales.length} transacciones en el rango.
          </p>
        </div>

        {/* Gastos Totales */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Gastos Registrados</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-black text-rose-600">{formatMoney(filteredData.totalOPEX)}</h3>
          <p className="text-[11px] text-slate-500 font-medium">
            {filteredData.validGastos.length} registros en el rango.
          </p>
        </div>

        {/* Utilidad Neta */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Utilidad Neta</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className={`text-xl font-black ${filteredData.utilidadNeta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatMoney(filteredData.utilidadNeta)}
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Ventas Brutas menos Costos y Gastos.
          </p>
        </div>

        {/* Margen de Contribución */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Margen Neto</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-black text-purple-600">
            {filteredData.margenNetoPct.toFixed(1)}%
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            (Utilidad Neta / Ventas Totales) × 100.
          </p>
        </div>

      </div>

      {/* SECCIÓN 1: FLUJO DE VALOR (Cascada de Retención del Dinero) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="p-2.5 bg-sky-50 text-[#4B9CD3] rounded-xl border border-sky-100">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#2C3E50]">Flujo de Valor</h3>
            <p className="text-xs text-slate-500">Representación en cascada de la retención del dinero en el rango seleccionado.</p>
          </div>
        </div>

        <div className="space-y-4 pt-1">
          {/* 1. Ventas Brutas */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
              <span className="text-slate-800">1. Ventas Brutas</span>
              <span className="font-black text-[#2C3E50]">{formatMoney(filteredData.totalVentas)}</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div className="bg-[#4B9CD3] h-full rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>

          {/* Costo de Ventas (COGS) */}
          <div className="space-y-1.5 pl-4 sm:pl-8">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5 text-rose-600">
                <ArrowDownRight className="w-4 h-4" /> Costo de Ventas (COGS)
              </span>
              <span className="font-bold text-rose-600">
                - {formatMoney(filteredData.costoVentasCOGS)}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full"
                style={{
                  width: `${filteredData.totalVentas > 0 ? Math.min(100, (filteredData.costoVentasCOGS / filteredData.totalVentas) * 100) : 0}%`
                }}
              ></div>
            </div>
            <div className="text-[10px] text-slate-400 text-right">
              {filteredData.totalVentas > 0 ? ((filteredData.costoVentasCOGS / filteredData.totalVentas) * 100).toFixed(0) : 0}% sobre ventas
            </div>
          </div>

          {/* 2. Utilidad Bruta */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
              <span className="text-emerald-700 font-extrabold">2. Utilidad Bruta</span>
              <span className="font-black text-emerald-700">{formatMoney(filteredData.utilidadBruta)}</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, filteredData.margenBrutoPct))}%` }}
              ></div>
            </div>
            <div className="text-[10px] text-emerald-600 font-bold text-right">
              {filteredData.margenBrutoPct.toFixed(0)}% margen bruto
            </div>
          </div>

          {/* Gastos Operativos (OPEX) */}
          <div className="space-y-1.5 pl-4 sm:pl-8">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5 text-rose-600">
                <ArrowDownRight className="w-4 h-4" /> Gastos Operativos (OPEX)
              </span>
              <span className="font-bold text-rose-600">
                - {formatMoney(filteredData.totalOPEX)}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full"
                style={{
                  width: `${filteredData.totalVentas > 0 ? Math.min(100, (filteredData.totalOPEX / filteredData.totalVentas) * 100) : 0}%`
                }}
              ></div>
            </div>
            <div className="text-[10px] text-slate-400 text-right">
              {filteredData.totalVentas > 0 ? ((filteredData.totalOPEX / filteredData.totalVentas) * 100).toFixed(0) : 0}% sobre ventas
            </div>
          </div>

          {/* 3. GANANCIA NETA */}
          <div className="space-y-1.5 pt-3 border-t-2 border-slate-200">
            <div className="flex justify-between items-center text-sm font-black text-slate-800">
              <span className="text-emerald-800">3. GANANCIA NETA</span>
              <span className={`text-base font-black ${filteredData.utilidadNeta >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {formatMoney(filteredData.utilidadNeta)}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all"
                style={{ width: `${Math.max(0, Math.min(100, filteredData.margenNetoPct))}%` }}
              ></div>
            </div>
            <div className="text-[11px] text-emerald-700 font-extrabold text-right">
              {filteredData.margenNetoPct.toFixed(0)}% retención neta final
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: PUNTO DE EQUILIBRIO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-100">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#2C3E50]">Punto de Equilibrio</h3>
            <p className="text-xs text-slate-500">Ventas mínimas indispensables en este rango para no incurrir en pérdidas.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase">Costos Fijos</span>
            <h4 className="text-lg font-black text-[#2C3E50]">{formatMoney(filteredData.costosFijos)}</h4>
            <p className="text-[10px] text-slate-500">Arriendo, servicios y nómina fija registrada.</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase">Costos Variables</span>
            <h4 className="text-lg font-black text-rose-600">{formatMoney(filteredData.costosVariables)}</h4>
            <p className="text-[10px] text-slate-500">COGS + insumos y mantenimiento operativo.</p>
          </div>
        </div>

        <div className="bg-purple-50/60 border border-purple-200/70 rounded-2xl p-5 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <span className="text-xs font-black text-purple-900 uppercase tracking-wider">Ventas de Equilibrio Requeridas</span>
              <p className="text-xs text-purple-700 font-medium">Meta mínima de facturación para cubrir el 100% de costos.</p>
            </div>
            <h3 className="text-xl font-black text-purple-800">
              {formatMoney(filteredData.ventasEquilibrioRequeridas)}
            </h3>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs font-bold text-purple-900">
              <span>Progreso actual de cobertura:</span>
              <span>{filteredData.progresoEquilibrio.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-purple-200/70 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full transition-all"
                style={{ width: `${filteredData.progresoEquilibrio}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600">
          <AlertCircle className="w-5 h-5 text-[#4B9CD3] shrink-0 mt-0.5" />
          <p>
            Para soportar los costos fijos en este período, el establecimiento comercial debe vender un mínimo de <strong className="text-[#2C3E50]">{formatMoney(filteredData.ventasEquilibrioRequeridas)}</strong> en productos del inventario.
          </p>
        </div>
      </div>

      {/* SECCIÓN 3: DIAGNÓSTICO FINANCIERO DEL PERÍODO (RECOMENDACIONES) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#2C3E50]">Diagnóstico Financiero del Periodo</h3>
            <p className="text-xs text-slate-500">Recomendaciones automatizadas según el comportamiento de tus números en el rango.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Tarjeta Diagnóstico 1 */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-xs">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-emerald-900">
                  {filteredData.margenBrutoPct >= 50 ? 'Excelente Margen Bruto' : 'Margen Bruto en Observación'}
                </h4>
                <p className="text-xs text-emerald-700 font-medium">
                  Tu margen bruto es del {filteredData.margenBrutoPct.toFixed(1)}%.
                </p>
              </div>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              {filteredData.margenBrutoPct >= 50
                ? 'Esto indica una alta rentabilidad por producto antes de costos administrativos. Tus costos de producción o adquisición están bien optimizados.'
                : 'Considera revisar el costo de adquisición de tus insumos o ajustar ligeramente el precio de venta de los productos de mayor rotación.'}
            </p>
          </div>

          {/* Tarjeta Diagnóstico 2 */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-emerald-900">
                  {filteredData.margenNetoPct >= 30 ? 'Alta Rentabilidad Neta' : 'Optimización de Gastos Operativos'}
                </h4>
                <p className="text-xs text-emerald-700 font-medium">
                  Estás reteniendo el {filteredData.margenNetoPct.toFixed(1)}% de tus ventas como utilidad libre.
                </p>
              </div>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              {filteredData.margenNetoPct >= 30
                ? 'Un excelente indicador de eficiencia operativa. Continúa monitoreando los gastos diarios para mantener esta sólida retención.'
                : 'Tus gastos operativos están reduciendo la ganancia neta. Procura negociar mejores tarifas con proveedores y controlar los gastos menores.'}
            </p>
          </div>

        </div>
      </div>

      {/* SECCIÓN 4: ESTADO FINANCIERO OFICIAL (ESTADO DE RESULTADOS) - TABLA DETALLADA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#2C3E50]">Estado de Resultados Integral (Estado Financiero)</h3>
              <p className="text-xs text-slate-500">Período analizado: {startDate} al {endDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Cifras Auditadas y Consolidadas</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-wider">
                <th className="py-3 px-4">Concepto Financiero</th>
                <th className="py-3 px-4 text-right">Valor Consolidado ($)</th>
                <th className="py-3 px-4 text-right">% s/ Ventas</th>
                <th className="py-3 px-4 text-center">Estado / Origen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              
              {/* INGRESOS OPERACIONALES */}
              <tr className="bg-sky-50/40 font-bold">
                <td className="py-3.5 px-4 flex items-center gap-2 text-[#2C3E50]">
                  <ArrowUpRight className="w-4 h-4 text-[#4B9CD3]" />
                  <span>1. INGRESOS OPERACIONALES (Ventas Netas Totales)</span>
                </td>
                <td className="py-3.5 px-4 text-right font-black text-[#2C3E50] text-sm">
                  {formatMoney(filteredData.totalVentas)}
                </td>
                <td className="py-3.5 px-4 text-right font-bold text-[#4B9CD3]">
                  100.0%
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="px-2 py-0.5 bg-sky-100 text-[#4B9CD3] rounded-md text-[10px] font-bold">
                    Historial de Ventas
                  </span>
                </td>
              </tr>

              {/* COSTO DE VENTAS (COGS) */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 pl-8 text-slate-600">
                  (-) Costo de Ventas (COGS - Productos Vendidos)
                </td>
                <td className="py-2.5 px-4 text-right font-semibold text-rose-600">
                  ({formatMoney(filteredData.costoVentasCOGS)})
                </td>
                <td className="py-2.5 px-4 text-right text-slate-500">
                  {filteredData.totalVentas > 0 ? ((filteredData.costoVentasCOGS / filteredData.totalVentas) * 100).toFixed(1) : 0}%
                </td>
                <td className="py-2.5 px-4 text-center">
                  <span className="text-[10px] text-slate-400 font-medium">Inventario / Catálogo</span>
                </td>
              </tr>

              {/* UTILIDAD BRUTA */}
              <tr className="bg-emerald-50/30 font-bold">
                <td className="py-3 px-4 text-emerald-800">
                  = UTILIDAD BRUTA
                </td>
                <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                  {formatMoney(filteredData.utilidadBruta)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-emerald-700">
                  {filteredData.margenBrutoPct.toFixed(1)}%
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold">
                    Margen Bruto
                  </span>
                </td>
              </tr>

              {/* COSTOS Y GASTOS OPERATIVOS */}
              <tr className="bg-slate-50/70 font-bold text-slate-800">
                <td className="py-3 px-4 pl-8" colSpan={4}>
                  (-) GASTOS OPERATIVOS (OPEX - Pestaña Gastos)
                </td>
              </tr>

              {Object.entries(filteredData.gastosPorCategoria).map(([cat, monto]) => {
                const montoNum = Number(monto) || 0;
                const pct = filteredData.totalVentas > 0 ? (montoNum / filteredData.totalVentas) * 100 : 0;
                return (
                  <tr key={cat} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-4 pl-12 text-slate-600">
                      • Gasto en {cat}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-rose-600">
                      ({formatMoney(montoNum)})
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-500">
                      {pct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="text-[10px] text-slate-400 font-medium">Pestaña Gastos</span>
                    </td>
                  </tr>
                );
              })}

              <tr className="bg-rose-50/30 font-bold">
                <td className="py-3 px-4 pl-8 text-rose-700">
                  Total Gastos Operativos (OPEX)
                </td>
                <td className="py-3 px-4 text-right font-black text-rose-600 text-sm">
                  ({formatMoney(filteredData.totalOPEX)})
                </td>
                <td className="py-3 px-4 text-right font-bold text-rose-600">
                  {filteredData.totalVentas > 0 ? ((filteredData.totalOPEX / filteredData.totalVentas) * 100).toFixed(1) : 0}%
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md text-[10px] font-bold">
                    Consolidado OPEX
                  </span>
                </td>
              </tr>

              {/* UTILIDAD NETA */}
              <tr className="bg-emerald-50/60 font-black text-sm">
                <td className="py-4 px-4 text-[#2C3E50] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <span>= GANANCIA NETA DEL PERÍODO</span>
                </td>
                <td className={`py-4 px-4 text-right text-base ${filteredData.utilidadNeta >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {formatMoney(filteredData.utilidadNeta)}
                </td>
                <td className="py-4 px-4 text-right text-emerald-700">
                  {filteredData.margenNetoPct.toFixed(1)}%
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="px-2.5 py-1 bg-emerald-200 text-emerald-800 rounded-lg text-xs font-black">
                    Resultado Final
                  </span>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓN 5: GRÁFICA DE TENDENCIA FINANCIERA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        
        {/* Cabecera de la Gráfica y Botones de Métrica (Ventas, Gastos, Utilidad $) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#EBF5FB] text-[#4B9CD3] rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#2C3E50]">Tendencia Financiera del Período</h3>
              <p className="text-xs text-slate-500">Visualiza el comportamiento histórico de tus finanzas seleccionando la métrica deseada.</p>
            </div>
          </div>

          {/* Botones para escoger entre Ventas, Gastos, Utilidad $ */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveMetric('ventas')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeMetric === 'ventas' ? 'bg-[#4B9CD3] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ventas
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('gastos')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeMetric === 'gastos' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gastos
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('utilidad')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeMetric === 'utilidad' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Utilidad $
            </button>
          </div>
        </div>

        {/* Gráfica SVG Vectorial */}
        <div className="w-full bg-slate-50/50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
          {chartPoints.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">Sin datos financieros para mostrar en este rango</h4>
              <p className="text-xs text-slate-400">Intenta ampliar el rango de fechas superior.</p>
            </div>
          ) : (
            <div className="relative w-full overflow-x-auto">
              <div className="min-w-[700px] h-[340px] relative flex flex-col justify-between pt-6 pb-8 px-4">
                
                {/* Cuadrícula de fondo */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-8 px-4 opacity-40">
                  {[0, 1, 2, 3, 4].map(idx => (
                    <div key={idx} className="w-full border-b border-dashed border-slate-200"></div>
                  ))}
                </div>

                {/* SVG Gráfico Vectorial */}
                {(() => {
                  const values = chartPoints.map(d => {
                    if (activeMetric === 'ventas') return d.ventas;
                    if (activeMetric === 'gastos') return d.gastos;
                    return d.utilidad;
                  });
                  const maxVal = Math.max(...values, 10);
                  const minVal = Math.min(0, ...values);
                  const range = maxVal - minVal || 1;

                  const points = chartPoints.map((d, index) => {
                    const val = activeMetric === 'ventas' ? d.ventas : activeMetric === 'gastos' ? d.gastos : d.utilidad;
                    const xPercent = (index / (chartPoints.length - 1 || 1)) * 100;
                    const yPercent = 100 - ((val - minVal) / range) * 75 - 12;
                    return { x: xPercent, y: yPercent, val, label: d.label };
                  });

                  const pathString = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}%`, '');
                  const strokeColor = activeMetric === 'ventas' ? '#4B9CD3' : activeMetric === 'gastos' ? '#E11D48' : '#059669';

                  return (
                    <div className="relative w-full h-full">
                      <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="finGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
                            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path
                          d={`${pathString} L 100% 100% L 0% 100% Z`}
                          fill="url(#finGradient)"
                        />
                        <path
                          d={pathString}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>

                      {/* Puntos y valores */}
                      <div className="absolute inset-0 flex justify-between items-center pointer-events-none px-2">
                        {points.Manager ? null : points.map((p, idx) => (
                          <div
                            key={idx}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group pointer-events-auto cursor-pointer"
                            style={{ left: `${p.x}%`, top: `${p.y}%` }}
                          >
                            <div className="mb-2 opacity-95 group-hover:opacity-100 transition-all transform group-hover:scale-110">
                              <span className="px-2 py-1 bg-slate-900 text-white text-[10px] font-black rounded-md shadow-md whitespace-nowrap font-mono">
                                {formatMoney(p.val)}
                              </span>
                            </div>
                            <div
                              className="w-4 h-4 rounded-full bg-white border-4 shadow-md group-hover:scale-125 transition-all"
                              style={{ borderColor: strokeColor }}
                            ></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Etiquetas Eje X */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-200 text-[11px] font-bold text-slate-500">
                  {chartPoints.map((d, idx) => (
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

      {/* Modal de Deck Financiero Gemini */}
      {isDeckModalOpen && deckData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl text-indigo-300">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-wide">{deckData.tituloDeck || 'Deck Ejecutivo Financiero'}</h3>
                  <p className="text-[11px] text-slate-300">Generado por Gemini con base en el periodo filtrado</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeckModalOpen(false)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xs font-bold"
              >
                Cerrar ✕
              </button>
            </div>

            {/* Contenido del Deck (Desplazable) */}
            <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/50 flex-1">
              
              {/* 1. Resumen Ejecutivo */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" /> 1. Resumen Ejecutivo Financiero y Tabla Consolidada
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {deckData.resumenEjecutivo}
                </p>
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[10px] font-black uppercase">
                        <th className="py-2.5 px-3">Concepto</th>
                        <th className="py-2.5 px-3 text-right">Monto ($)</th>
                        <th className="py-2.5 px-3 text-right">Participación / Margen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr>
                        <td className="py-2 px-3 font-bold text-slate-800">Ventas Totales</td>
                        <td className="py-2 px-3 text-right font-black text-[#4B9CD3]">{formatMoney(filteredData.totalVentas)}</td>
                        <td className="py-2 px-3 text-right text-slate-500">100%</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-600">Costo de Ventas (COGS)</td>
                        <td className="py-2 px-3 text-right text-rose-600 font-semibold">({formatMoney(filteredData.costoVentasCOGS)})</td>
                        <td className="py-2 px-3 text-right text-slate-500">{filteredData.totalVentas > 0 ? ((filteredData.costoVentasCOGS / filteredData.totalVentas) * 100).toFixed(1) : 0}%</td>
                      </tr>
                      <tr className="bg-emerald-50/40 font-bold">
                        <td className="py-2 px-3 text-emerald-800">Utilidad Bruta</td>
                        <td className="py-2 px-3 text-right text-emerald-700 font-black">{formatMoney(filteredData.utilidadBruta)}</td>
                        <td className="py-2 px-3 text-right text-emerald-700">{filteredData.margenBrutoPct.toFixed(1)}%</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-600">Gastos Operativos (OPEX)</td>
                        <td className="py-2 px-3 text-right text-rose-600 font-semibold">({formatMoney(filteredData.totalOPEX)})</td>
                        <td className="py-2 px-3 text-right text-slate-500">{filteredData.totalVentas > 0 ? ((filteredData.totalOPEX / filteredData.totalVentas) * 100).toFixed(1) : 0}%</td>
                      </tr>
                      <tr className="bg-emerald-100/60 font-black">
                        <td className="py-2.5 px-3 text-emerald-900">Utilidad Neta Final</td>
                        <td className={`py-2.5 px-3 text-right ${filteredData.utilidadNeta >= 0 ? 'text-emerald-800' : 'text-rose-600'}`}>{formatMoney(filteredData.utilidadNeta)}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-900">{filteredData.margenNetoPct.toFixed(1)}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2 & 3. Productos: Top Ventas y Top Utilidad */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" /> 2. Top 5 Productos más Vendidos
                  </h4>
                  <div className="space-y-2">
                    {Array.isArray(deckData.topProductosVentas) && deckData.topProductosVentas.map((p: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                        <span className="font-bold text-slate-800">{idx + 1}. {p.producto}</span>
                        <div className="text-right">
                          <span className="text-emerald-600 font-black block">{p.totalVendido}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{p.unidades}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" /> 3. Productos con Mayor Utilidad
                  </h4>
                  <div className="space-y-2">
                    {Array.isArray(deckData.topProductosUtilidad) && deckData.topProductosUtilidad.map((p: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                        <span className="font-bold text-slate-800">{idx + 1}. {p.producto}</span>
                        <div className="text-right">
                          <span className="text-blue-600 font-black block">{p.utilidadGenerada}</span>
                          <span className="text-[10px] text-slate-500 font-medium">Margen: {p.margen}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Productos que No Rotaron y que Menos Rotaron */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Productos que No Rotaron (0 Ventas)
                  </h4>
                  <div className="space-y-2">
                    {Array.isArray(deckData.productosNoRotaron) && deckData.productosNoRotaron.length > 0 ? (
                      deckData.productosNoRotaron.map((prod: string, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-rose-50/50 rounded-xl border border-rose-100 text-xs">
                          <span className="font-bold text-slate-800">{idx + 1}. {prod}</span>
                          <span className="text-rose-600 font-black">0 unidades</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic">Todos los productos del catálogo tuvieron rotación en el período.</p>
                    )}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" /> Productos que Menos Rotaron
                  </h4>
                  <div className="space-y-2">
                    {Array.isArray(deckData.productosMenosRotaron) && deckData.productosMenosRotaron.map((p: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-amber-50/50 rounded-xl border border-amber-100 text-xs">
                        <span className="font-bold text-slate-800">{idx + 1}. {p.producto}</span>
                        <div className="text-right">
                          <span className="text-amber-700 font-black block">{p.totalVendido}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{p.unidades}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4 & 6. Vendedora Estrella & Trabajador con Menos Ventas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> 4. Vendedora Estrella
                  </h4>
                  <div className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-100 space-y-2 text-xs">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{deckData.vendedoraEstrella?.nombre}</span>
                      <span className="text-purple-700 font-black">{deckData.vendedoraEstrella?.totalVendido}</span>
                    </div>
                    <p className="text-slate-600 font-medium"><strong className="text-slate-700">Productos Destacados:</strong> {deckData.vendedoraEstrella?.productosTop}</p>
                    <p className="text-slate-600 font-medium italic">{deckData.vendedoraEstrella?.comentario}</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> 6. Trabajador con Menor Venta
                  </h4>
                  <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100 space-y-2 text-xs">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{deckData.trabajadorMenosVentas?.nombre}</span>
                      <span className="text-rose-700 font-black">{deckData.trabajadorMenosVentas?.totalVendido}</span>
                    </div>
                    <p className="text-slate-600 font-medium italic">{deckData.trabajadorMenosVentas?.comentario}</p>
                  </div>
                </div>
              </div>

              {/* Desglose Detallado de Rendimiento por Trabajador (Historial de Ventas filtrado por fechas) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Rendimiento Consolidado por Trabajador (Historial de Ventas del Periodo)
                </h4>
                <p className="text-xs text-slate-500">Información calculada estrictamente a partir de las ventas registradas por cada colaborador en el rango de fechas seleccionado.</p>
                <div className="overflow-x-auto pt-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[10px] font-black uppercase">
                        <th className="py-2.5 px-3">Colaborador / Vendedora</th>
                        <th className="py-2.5 px-3 text-center">Transacciones</th>
                        <th className="py-2.5 px-3 text-right">Total Vendido ($)</th>
                        <th className="py-2.5 px-3">Productos Más Vendidos en el Rango</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {Array.isArray(deckData.allWorkersSales) && deckData.allWorkersSales.length > 0 ? (
                        deckData.allWorkersSales.map((w: any, idx: number) => (
                          <tr key={idx} className={idx === 0 ? 'bg-purple-50/50 font-bold' : ''}>
                            <td className="py-2.5 px-3 text-slate-900 flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'}`}>{idx + 1}</span>
                              <span>{w.nombre}</span>
                              {idx === 0 && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[9px]">Top Ventas</span>}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-600">{w.transacciones}</td>
                            <td className="py-2.5 px-3 text-right font-black text-purple-700">{w.totalVendido}</td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px]">{w.productosVendidos}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-3 px-3 text-center text-slate-400">No hay registros de ventas para el período seleccionado.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5, 7, 8. Horas, Momentos y Días */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> 5, 7 y 8. Patrones Horarios y Días de Venta
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 space-y-1">
                    <span className="font-bold text-slate-700 block">Horas de Mayor Venta</span>
                    <span className="text-slate-800 font-medium">{deckData.horasMasVentas}</span>
                  </div>
                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1">
                    <span className="font-bold text-slate-700 block">Momentos Clave</span>
                    <span className="text-slate-800 font-medium">{deckData.momentosMasVentas}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-700 block">Horas con Menor Venta</span>
                    <span className="text-slate-800 font-medium">{deckData.horasMenosVentas}</span>
                  </div>
                  <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 space-y-1">
                    <span className="font-bold text-slate-700 block">Días con Menor Venta</span>
                    <span className="text-slate-800 font-medium">{deckData.diasMenosVentas}</span>
                  </div>
                </div>
              </div>

              {/* 9. Recomendaciones Estratégicas */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> 9. Recomendaciones Estratégicas según los Números
                </h4>
                <ul className="space-y-2 text-xs">
                  {Array.isArray(deckData.recomendacionesEstrategicas) && deckData.recomendacionesEstrategicas.map((rec: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2.5 p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 text-slate-700 font-medium">
                      <span className="font-black text-emerald-600">{idx + 1}.</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDeckModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cerrar Deck
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Chat Gemini sobre el Filtro */}
      {isChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-sky-900 to-indigo-900 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl text-sky-300">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-wide">Chat Inteligente Gemini (Filtro Activo)</h3>
                  <p className="text-[11px] text-slate-300">Consulta sobre ventas, productos (rotación, cero rotación), gastos y horarios (10am-9pm)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChatModalOpen(false)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xs font-bold"
              >
                Cerrar ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-slate-50/50 max-h-[50vh]">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs font-medium leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#4B9CD3] text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200 shadow-xs rounded-bl-xs'
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-slate-600 border border-slate-200 p-3 rounded-2xl text-xs flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-[#4B9CD3] border-t-transparent rounded-full animate-spin" />
                    Gemini está analizando los datos del filtro...
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSendChat} className="p-4 bg-white border-t border-slate-200 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ej. ¿Qué productos no rotaron en este periodo y cuáles fueron las ventas de 10am a 9pm?"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#4B9CD3]"
              />
              <button
                type="submit"
                disabled={isChatLoading || !chatInput.trim()}
                className="px-5 py-2.5 bg-[#4B9CD3] text-white rounded-xl text-xs font-bold hover:bg-[#3a85b8] transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
