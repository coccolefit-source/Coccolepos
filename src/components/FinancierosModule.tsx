/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Venta, Gasto } from '../types';
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
  Clock,
  Award,
  Flame,
  Activity,
  PieChart,
  Filter
} from 'lucide-react';
import { getLocalDateString, getBogotaDateDaysAgo } from '../lib/supabaseClient';

interface FinancierosModuleProps {
  ventasRegistradas: Venta[];
  gastos: Gasto[];
  productosCatalogo?: any[];
}

export default function FinancierosModule({
  ventasRegistradas = [],
  gastos = [],
  productosCatalogo = []
}: FinancierosModuleProps) {
  // Catálogo activo de productos (prioridad: catálogo sincronizado desde la nube / Supabase)
  const activeCatalog = useMemo(() => {
    if (productosCatalogo && productosCatalogo.length > 0) {
      return productosCatalogo;
    }
    try {
      const local = localStorage.getItem('coccole_productos_catalogo');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return [];
  }, [productosCatalogo]);

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
  const [deckStarTab, setDeckStarTab] = useState<'todas' | 'fresas' | 'proteina' | 'sandwiches' | 'ensaladas'>('todas');
  const [deckDayTab, setDeckDayTab] = useState<'ultimos7' | '4semanas'>('ultimos7');
  const [deckTrendMetric, setDeckTrendMetric] = useState<'ventas' | 'unidades'>('ventas');
  const [selectedDeckWeek, setSelectedDeckWeek] = useState<'todas' | 'semana1' | 'semana2' | 'semana3' | 'semana4'>('todas');

  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Hola. Soy tu asistente de Gemini experto en Coccole Fit. Pregúntame cualquier detalle sobre los datos financieros, ventas, productos sin rotación, productos con menos rotación o rendimiento de colaboradores bajo el filtro actual.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleSendChat = async (e?: React.FormEvent, customQuestion?: string) => {
    if (e) e.preventDefault();
    const userMsg = (customQuestion || chatInput).trim();
    if (!userMsg || isChatLoading) return;
    if (!customQuestion) setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatLoading(true);

    try {
      // Calcular productos sin rotación y métricas completas para el contexto
      const productSalesMap: Record<string, { nombre: string; cantidad: number; totalVendido: number }> = {};
      activeCatalog.forEach((p: any) => {
        const pNombre = p.nombre ? String(p.nombre).trim() : '';
        if (pNombre) {
          productSalesMap[pNombre] = { nombre: pNombre, cantidad: 0, totalVendido: 0 };
        }
      });

      const vendorMap: Record<string, number> = {};

      filteredData.validSales.forEach(v => {
        const vName = v.vendedor_nombre || 'Cajero General';
        vendorMap[vName] = (vendorMap[vName] || 0) + (Number(v.total) || 0);

        if (Array.isArray(v.productos_vendidos)) {
          v.productos_vendidos.forEach((p: any) => {
            const pNombre = p.nombre ? String(p.nombre).trim() : '';
            if (pNombre) {
              if (!productSalesMap[pNombre]) {
                productSalesMap[pNombre] = { nombre: pNombre, cantidad: 0, totalVendido: 0 };
              }
              productSalesMap[pNombre].cantidad += Number(p.cantidad) || 1;
              productSalesMap[pNombre].totalVendido += (Number(p.cantidad) || 1) * (Number(p.precio) || 0);
            }
          });
        }
      });

      const allProds = Object.values(productSalesMap);
      const productosNoRotaron = allProds.filter(p => p.cantidad === 0).map(p => p.nombre);
      const prodsConVentas = allProds.filter(p => p.cantidad > 0);
      const productosMenosRotaron = [...prodsConVentas].sort((a, b) => a.cantidad - b.cantidad).slice(0, 5);
      const topProductosVentas = [...prodsConVentas].sort((a, b) => b.totalVendido - a.totalVendido).slice(0, 5).map(p => ({
        producto: p.nombre,
        unidades: `${p.cantidad} un.`,
        totalVendido: formatMoney(p.totalVendido)
      }));

      let topVendorName = 'Personal General';
      let topVendorAmount = 0;
      Object.entries(vendorMap).forEach(([name, amount]) => {
        if (amount > topVendorAmount) {
          topVendorAmount = amount;
          topVendorName = name;
        }
      });

      const resp = await fetch('/api/financial-filter-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMsg,
          context: {
            startDate,
            endDate,
            totalVentas: filteredData.totalVentas,
            costoVentasCOGS: filteredData.costoVentasCOGS,
            utilidadBruta: filteredData.utilidadBruta,
            totalOPEX: filteredData.totalOPEX,
            utilidadNeta: filteredData.utilidadNeta,
            margenNetoPct: filteredData.margenNetoPct,
            transaccionesCount: filteredData.validSales.length,
            productosNoRotaron,
            productosMenosRotaron: productosMenosRotaron.map(p => ({
              producto: p.nombre,
              unidades: `${p.cantidad} un.`,
              totalVendido: formatMoney(p.totalVendido)
            })),
            topProductosVentas,
            vendedoraEstrella: {
              nombre: topVendorName,
              totalVendido: formatMoney(topVendorAmount)
            }
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
      // Inicializar el mapa de ventas estrictamente con los productos registrados en la nube
      activeCatalog.forEach((p: any) => {
        const pNombre = p.nombre ? String(p.nombre).trim() : '';
        if (pNombre) {
          productSalesMap[pNombre] = { nombre: pNombre, cantidad: 0, totalVendido: 0, utilidad: 0 };
        }
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
            const catProd = activeCatalog.find(
              (p: any) =>
                (item.producto_id && p.id === item.producto_id) ||
                (p.nombre && p.nombre.toLowerCase().trim() === pName.toLowerCase().trim())
            );
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
          rawGastosSample: filteredData.validGastos.slice(0, 50),
          starProductsSummary: {
            fresas: { totalVendido: starProductsAnalytics.fresas.totalVendido, unidades: starProductsAnalytics.fresas.unidades },
            proteina: { totalVendido: starProductsAnalytics.proteina.totalVendido, unidades: starProductsAnalytics.proteina.unidades },
            sandwiches: { totalVendido: starProductsAnalytics.sandwiches.totalVendido, unidades: starProductsAnalytics.sandwiches.unidades },
            ensaladas: { totalVendido: starProductsAnalytics.ensaladas.totalVendido, unidades: starProductsAnalytics.ensaladas.unidades }
          },
          diasSemanaSummary: diasSemanaAnalytics.ultimos7Dias.map(d => `${d.diaSemana}: $${d.total.toLocaleString('es-CO')}`)
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

  // Botón rápido: Información de Hoy
  const handleQuickHoy = () => {
    setGroupingMode('diario');
    const today = getLocalDateString();
    setStartDate(today);
    setEndDate(today);
  };

  // Botón rápido: Últimos 7 días
  const handleQuickUltimos7Dias = () => {
    setGroupingMode('diario');
    const today = getLocalDateString();
    const sevenDaysAgo = getBogotaDateDaysAgo(7);
    setStartDate(sevenDaysAgo);
    setEndDate(today);
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
          const catProd = activeCatalog.find(
            (p: any) =>
              (item.producto_id && p.id === item.producto_id) ||
              (p.nombre && p.nombre.toLowerCase().trim() === (item.nombre || '').toLowerCase().trim())
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

  // Días de la semana estándar
  const DIAS_SEMANA_ORDEN = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const getDiaSemanaNombre = (fechaStr: string): string => {
    if (!fechaStr) return 'Lunes';
    const d = new Date(fechaStr + 'T12:00:00');
    if (isNaN(d.getTime())) return 'Lunes';
    const day = d.getDay();
    const idx = day === 0 ? 6 : day - 1;
    return DIAS_SEMANA_ORDEN[idx] || 'Lunes';
  };

  const categorizarEstrella = (nombre: string): 'fresas' | 'proteina' | 'sandwiches' | 'ensaladas' | 'otros' => {
    const raw = (nombre || '').toLowerCase().trim();
    const n = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // EXCLUSIONES ESPECÍFICAS PARA EL DECK (Toppings y cremas para untar que no son postres principales):
    const esExclusionFresas = 
      (n.includes('toppin') && n.includes('fresa')) ||
      n.includes('crema de almendra') ||
      (n.includes('chocolate') && n.includes('why not')) ||
      (n.includes('pistacho') && n.includes('why not')) ||
      n.includes('crema de mani');

    const esExclusionProteina = 
      n.includes('proteina') && n.includes('topping');

    // 1. FRESAS CON CREMA (Incluye Parfaits según solicitud, excluye toppings y cremas de tarro)
    if (!esExclusionFresas) {
      if (n.includes('parfait')) return 'fresas';
      if (n.includes('fresa')) return 'fresas';
      if (n.includes('crema') && !n.includes('almendra') && !n.includes('mani') && !n.includes('pistacho') && !n.includes('why not')) {
        return 'fresas';
      }
    }

    // 2. PROTEÍNA (Batidos, shakes, smoothies de proteína - excluyendo toppings)
    if (!esExclusionProteina) {
      if (n.includes('proteina') || n.includes('batido') || n.includes('shake') || n.includes('whey') || n.includes('scoop') || n.includes('smoothie')) {
        return 'proteina';
      }
    }

    // 3. SÁNDWICHES GOURMET
    if (n.includes('sandwich') || n.includes('sanduche') || n.includes('sandwiches') || n.includes('panino') || n.includes('tostado') || n.includes('pavo')) {
      return 'sandwiches';
    }

    // 4. ENSALADAS DE FRUTAS
    if (n.includes('ensalada') || n.includes('fruta') || n.includes('frutas') || n.includes('bowl') || n.includes('salpicon')) {
      return 'ensaladas';
    }

    return 'otros';
  };

  // 1. Análisis y Tendencia de los 4 Productos Estrella (Fresas con crema, Proteína, Sándwiches, Ensaladas)
  const starProductsAnalytics = useMemo(() => {
    const categories = {
      fresas: {
        id: 'fresas' as const,
        nombre: 'Fresas con Crema',
        icono: '🍓',
        color: '#EC4899',
        bgColor: 'bg-pink-50',
        borderColor: 'border-pink-200',
        textColor: 'text-pink-700',
        stroke: '#DB2777',
        fill: '#FDF2F8',
        totalVendido: 0,
        unidades: 0,
        utilidad: 0,
        productos: [] as Array<{ nombre: string; cantidad: number; total: number }>,
        tendencia: [] as Array<{ diaSemana: string; label: string; total: number; unidades: number }>
      },
      proteina: {
        id: 'proteina' as const,
        nombre: 'Batidos de Proteína',
        icono: '🥤',
        color: '#D97706',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-800',
        stroke: '#B45309',
        fill: '#FEF3C7',
        totalVendido: 0,
        unidades: 0,
        utilidad: 0,
        productos: [] as Array<{ nombre: string; cantidad: number; total: number }>,
        tendencia: [] as Array<{ diaSemana: string; label: string; total: number; unidades: number }>
      },
      sandwiches: {
        id: 'sandwiches' as const,
        nombre: 'Sándwiches Gourmet',
        icono: '🥪',
        color: '#EA580C',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-800',
        stroke: '#C2410C',
        fill: '#FFF7ED',
        totalVendido: 0,
        unidades: 0,
        utilidad: 0,
        productos: [] as Array<{ nombre: string; cantidad: number; total: number }>,
        tendencia: [] as Array<{ diaSemana: string; label: string; total: number; unidades: number }>
      },
      ensaladas: {
        id: 'ensaladas' as const,
        nombre: 'Ensaladas de Frutas',
        icono: '🥗',
        color: '#10B981',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        textColor: 'text-emerald-700',
        stroke: '#059669',
        fill: '#ECFDF5',
        totalVendido: 0,
        unidades: 0,
        utilidad: 0,
        productos: [] as Array<{ nombre: string; cantidad: number; total: number }>,
        tendencia: [] as Array<{ diaSemana: string; label: string; total: number; unidades: number }>
      }
    };

    const tempProds = {
      fresas: new Map<string, { cantidad: number; total: number }>(),
      proteina: new Map<string, { cantidad: number; total: number }>(),
      sandwiches: new Map<string, { cantidad: number; total: number }>(),
      ensaladas: new Map<string, { cantidad: number; total: number }>()
    };

    const tempTrend = {
      fresas: new Map<string, { diaSemana: string; total: number; unidades: number }>(),
      proteina: new Map<string, { diaSemana: string; total: number; unidades: number }>(),
      sandwiches: new Map<string, { diaSemana: string; total: number; unidades: number }>(),
      ensaladas: new Map<string, { diaSemana: string; total: number; unidades: number }>()
    };

    filteredData.validSales.forEach(v => {
      const diaSemana = getDiaSemanaNombre(v.fecha);
      const trendKey = v.fecha || diaSemana;

      if (v.productos_vendidos && Array.isArray(v.productos_vendidos)) {
        v.productos_vendidos.forEach(item => {
          const pName = item.nombre || 'Producto';
          const qty = Number(item.cantidad) || 1;
          const price = Number(item.precio) || 0;
          const subtotal = qty * price;
          const catProd = activeCatalog.find(
            (p: any) =>
              (item.producto_id && p.id === item.producto_id) ||
              (p.nombre && (p.nombre || '').toLowerCase().trim() === pName.toLowerCase().trim())
          );
          const unitCost = catProd?.precio_costo ?? (price * 0.45);
          const itemUtility = subtotal - (unitCost * qty);

          const catId = categorizarEstrella(pName);
          if (catId === 'fresas' || catId === 'proteina' || catId === 'sandwiches' || catId === 'ensaladas') {
            const target = categories[catId];
            target.totalVendido += subtotal;
            target.unidades += qty;
            target.utilidad += itemUtility;

            const mapP = tempProds[catId];
            if (!mapP.has(pName)) {
              mapP.set(pName, { cantidad: 0, total: 0 });
            }
            const pRow = mapP.get(pName)!;
            pRow.cantidad += qty;
            pRow.total += subtotal;

            const mapT = tempTrend[catId];
            if (!mapT.has(trendKey)) {
              mapT.set(trendKey, { diaSemana, total: 0, unidades: 0 });
            }
            const tRow = mapT.get(trendKey)!;
            tRow.total += subtotal;
            tRow.unidades += qty;
          }
        });
      }
    });

    (['fresas', 'proteina', 'sandwiches', 'ensaladas'] as const).forEach(catId => {
      categories[catId].productos = Array.from(tempProds[catId].entries())
        .map(([nombre, d]) => ({ nombre, cantidad: d.cantidad, total: d.total }))
        .sort((a, b) => b.cantidad - a.cantidad);

      categories[catId].tendencia = Array.from(tempTrend[catId].entries())
        .map(([key, d]) => ({ diaSemana: d.diaSemana, label: d.diaSemana, total: d.total, unidades: d.unidades }))
        .sort((a, b) => a.diaSemana.localeCompare(b.diaSemana));
    });

    return categories;
  }, [filteredData, activeCatalog]);

  // 2. Análisis y Comparativa de Días de la Semana (Últimas 4 Semanas y Últimos 7 Días - SIN FECHAS)
  const diasSemanaAnalytics = useMemo(() => {
    const validSales = (ventasRegistradas || []).filter(v => {
      if (v.estado === 'Anulada') return false;
      if (!v.fecha) return false;
      if (v.hora) {
        const [hStr] = v.hora.split(':');
        const h = parseInt(hStr, 10);
        if (!isNaN(h) && (h < 10 || h > 21)) return false;
      }
      return true;
    });

    const hoyStr = getLocalDateString();
    const hoyDate = new Date(hoyStr + 'T12:00:00');

    // Helper para extraer valor según la categoría y métrica seleccionada
    const getSaleMetricValue = (sale: Venta): number => {
      const isVentas = deckTrendMetric === 'ventas';
      const items = sale.productos_vendidos && Array.isArray(sale.productos_vendidos) ? sale.productos_vendidos : [];

      if (deckStarTab === 'todas') {
        if (isVentas) {
          return Number(sale.total) || 0;
        } else {
          if (items.length > 0) {
            return items.reduce((sum, item) => sum + (Number(item.cantidad) || 1), 0);
          }
          return 1;
        }
      }

      // Si se seleccionó una categoría específica ('fresas' | 'proteina' | 'sandwiches' | 'ensaladas')
      let catValue = 0;
      items.forEach(item => {
        if (categorizarEstrella(item.nombre || '') === deckStarTab) {
          const qty = Number(item.cantidad) || 1;
          const price = Number(item.precio) || 0;
          if (isVentas) {
            catValue += qty * price;
          } else {
            catValue += qty;
          }
        }
      });
      return catValue;
    };

    // A) ÚLTIMOS 7 DÍAS (Estrictamente con los días de la semana: Lunes a Domingo, SIN fechas)
    const ultimos7DiasList: Array<{
      diaSemana: string;
      total: number;
      unidades: number;
      metricValue: number;
      transacciones: number;
      fresas: number;
      proteina: number;
      sandwiches: number;
      ensaladas: number;
    }> = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoyDate);
      d.setDate(d.getDate() - i);
      const fStr = getLocalDateString(d);
      const diaSemana = getDiaSemanaNombre(fStr);

      const salesOnDate = validSales.filter(v => v.fecha === fStr);
      let dayTotal = 0;
      let dayUnits = 0;
      let dayMetric = 0;
      let transCount = 0;
      let fresas = 0;
      let proteina = 0;
      let sandwiches = 0;
      let ensaladas = 0;

      salesOnDate.forEach(v => {
        const mVal = getSaleMetricValue(v);
        if (mVal > 0) transCount++;
        dayMetric += mVal;
        dayTotal += Number(v.total) || 0;

        if (v.productos_vendidos && Array.isArray(v.productos_vendidos)) {
          v.productos_vendidos.forEach(item => {
            const qty = Number(item.cantidad) || 1;
            const subtotal = qty * (Number(item.precio) || 0);
            dayUnits += qty;
            const cat = categorizarEstrella(item.nombre || '');
            const valToAdd = deckTrendMetric === 'ventas' ? subtotal : qty;
            if (cat === 'fresas') fresas += valToAdd;
            if (cat === 'proteina') proteina += valToAdd;
            if (cat === 'sandwiches') sandwiches += valToAdd;
            if (cat === 'ensaladas') ensaladas += valToAdd;
          });
        }
      });

      ultimos7DiasList.push({
        diaSemana,
        total: dayTotal,
        unidades: dayUnits,
        metricValue: dayMetric,
        transacciones: transCount,
        fresas,
        proteina,
        sandwiches,
        ensaladas
      });
    }

    // B) ÚLTIMAS 4 SEMANAS CALENDARIO (Lunes a Domingo)
    // Determinamos el inicio de la semana actual (Lunes)
    const dayOfWeek = hoyDate.getDay(); // 0: Domingo, 1: Lunes, ..., 6: Sábado
    const daysSinceMonday = (dayOfWeek + 6) % 7; // Lunes = 0, Martes = 1, ..., Domingo = 6

    const lunesActual = new Date(hoyDate);
    lunesActual.setDate(lunesActual.getDate() - daysSinceMonday);

    const lunesSem3 = new Date(lunesActual); // Hace 1 semana (Semana anterior completa)
    lunesSem3.setDate(lunesSem3.getDate() - 7);

    const lunesSem2 = new Date(lunesActual); // Hace 2 semanas completa
    lunesSem2.setDate(lunesSem2.getDate() - 14);

    const lunesSem1 = new Date(lunesActual); // Hace 3 semanas completa
    lunesSem1.setDate(lunesSem1.getDate() - 21);

    const comparativaSemanas = DIAS_SEMANA_ORDEN.map((diaSemana, dayIdx) => {
      const d1 = new Date(lunesSem1);
      d1.setDate(d1.getDate() + dayIdx);
      const f1Str = getLocalDateString(d1);

      const d2 = new Date(lunesSem2);
      d2.setDate(d2.getDate() + dayIdx);
      const f2Str = getLocalDateString(d2);

      const d3 = new Date(lunesSem3);
      d3.setDate(d3.getDate() + dayIdx);
      const f3Str = getLocalDateString(d3);

      const d4 = new Date(lunesActual);
      d4.setDate(d4.getDate() + dayIdx);
      const f4Str = getLocalDateString(d4);

      // Si d4 es posterior a hoy (días que aún no han transcurrido en la semana en curso)
      const esFuturoEnSemanaActual = f4Str > hoyStr;

      const sales1 = validSales.filter(v => v.fecha === f1Str);
      const sales2 = validSales.filter(v => v.fecha === f2Str);
      const sales3 = validSales.filter(v => v.fecha === f3Str);
      const sales4 = esFuturoEnSemanaActual ? [] : validSales.filter(v => v.fecha === f4Str);

      const val1 = sales1.reduce((sum, v) => sum + getSaleMetricValue(v), 0);
      const val2 = sales2.reduce((sum, v) => sum + getSaleMetricValue(v), 0);
      const val3 = sales3.reduce((sum, v) => sum + getSaleMetricValue(v), 0);
      const val4 = sales4.reduce((sum, v) => sum + getSaleMetricValue(v), 0);

      const totalDia = val1 + val2 + val3 + val4;
      const countWeeksWithDay = esFuturoEnSemanaActual ? 3 : 4;
      const promedio = countWeeksWithDay > 0 ? Math.round((totalDia / countWeeksWithDay) * 10) / 10 : 0;

      return {
        diaSemana,
        semana1: val1,
        semana2: val2,
        semana3: val3,
        semana4: val4,
        promedio
      };
    });

    const d1End = new Date(lunesSem1); d1End.setDate(d1End.getDate() + 6);
    const d2End = new Date(lunesSem2); d2End.setDate(d2End.getDate() + 6);
    const d3End = new Date(lunesSem3); d3End.setDate(d3End.getDate() + 6);

    const f1Start = getLocalDateString(lunesSem1);
    const f1End = getLocalDateString(d1End);
    const f2Start = getLocalDateString(lunesSem2);
    const f2End = getLocalDateString(d2End);
    const f3Start = getLocalDateString(lunesSem3);
    const f3End = getLocalDateString(d3End);
    const f4Start = getLocalDateString(lunesActual);
    const f4End = hoyStr;

    const productosEn4SemanasMap: Record<string, {
      nombre: string;
      categoriaEstrella: string;
      unidades: number;
      totalVendido: number;
      porSemana: {
        semana1: { unidades: number; totalVendido: number };
        semana2: { unidades: number; totalVendido: number };
        semana3: { unidades: number; totalVendido: number };
        semana4: { unidades: number; totalVendido: number };
      };
    }> = {};

    // Recopilar productos vendidos en el rango de las 4 semanas calendario (desde el Lunes de Semana 1 hasta hoy)
    const minFecha4Semanas = f1Start;
    const salesIn4Weeks = validSales.filter(v => v.fecha >= minFecha4Semanas && v.fecha <= hoyStr);

    salesIn4Weeks.forEach(sale => {
      let saleWeek: 'semana1' | 'semana2' | 'semana3' | 'semana4' | null = null;
      if (sale.fecha >= f1Start && sale.fecha <= f1End) saleWeek = 'semana1';
      else if (sale.fecha >= f2Start && sale.fecha <= f2End) saleWeek = 'semana2';
      else if (sale.fecha >= f3Start && sale.fecha <= f3End) saleWeek = 'semana3';
      else if (sale.fecha >= f4Start && sale.fecha <= f4End) saleWeek = 'semana4';

      const items = sale.productos_vendidos && Array.isArray(sale.productos_vendidos) ? sale.productos_vendidos : [];
      if (items.length > 0) {
        items.forEach(item => {
          const cat = categorizarEstrella(item.nombre || '');
          if (deckStarTab === 'todas' || cat === deckStarTab) {
            const pName = (item.nombre || 'Producto sin nombre').trim();
            const qty = Number(item.cantidad) || 1;
            const subtotal = qty * (Number(item.precio) || 0);

            if (!productosEn4SemanasMap[pName]) {
              productosEn4SemanasMap[pName] = {
                nombre: pName,
                categoriaEstrella: cat || 'general',
                unidades: 0,
                totalVendido: 0,
                porSemana: {
                  semana1: { unidades: 0, totalVendido: 0 },
                  semana2: { unidades: 0, totalVendido: 0 },
                  semana3: { unidades: 0, totalVendido: 0 },
                  semana4: { unidades: 0, totalVendido: 0 }
                }
              };
            }
            productosEn4SemanasMap[pName].unidades += qty;
            productosEn4SemanasMap[pName].totalVendido += subtotal;
            if (saleWeek) {
              productosEn4SemanasMap[pName].porSemana[saleWeek].unidades += qty;
              productosEn4SemanasMap[pName].porSemana[saleWeek].totalVendido += subtotal;
            }
          }
        });
      } else if (deckStarTab === 'todas') {
        const pName = 'Venta Mostrador General';
        if (!productosEn4SemanasMap[pName]) {
          productosEn4SemanasMap[pName] = {
            nombre: pName,
            categoriaEstrella: 'general',
            unidades: 0,
            totalVendido: 0,
            porSemana: {
              semana1: { unidades: 0, totalVendido: 0 },
              semana2: { unidades: 0, totalVendido: 0 },
              semana3: { unidades: 0, totalVendido: 0 },
              semana4: { unidades: 0, totalVendido: 0 }
            }
          };
        }
        productosEn4SemanasMap[pName].unidades += 1;
        productosEn4SemanasMap[pName].totalVendido += Number(sale.total) || 0;
        if (saleWeek) {
          productosEn4SemanasMap[pName].porSemana[saleWeek].unidades += 1;
          productosEn4SemanasMap[pName].porSemana[saleWeek].totalVendido += Number(sale.total) || 0;
        }
      }
    });

    const productosEn4Semanas = Object.values(productosEn4SemanasMap).sort((a, b) => {
      return deckTrendMetric === 'ventas'
        ? b.totalVendido - a.totalVendido
        : b.unidades - a.unidades;
    });

    const s1Total = comparativaSemanas.reduce((sum, r) => sum + r.semana1, 0);
    const s2Total = comparativaSemanas.reduce((sum, r) => sum + r.semana2, 0);
    const s3Total = comparativaSemanas.reduce((sum, r) => sum + r.semana3, 0);
    const s4Total = comparativaSemanas.reduce((sum, r) => sum + r.semana4, 0);
    const granTotal4Semanas = s1Total + s2Total + s3Total + s4Total;

    const detalleSemana4 = daysSinceMonday === 0 
      ? 'Semana en curso (Solo hoy Lunes)' 
      : `Semana en curso (Lun a ${DIAS_SEMANA_ORDEN[daysSinceMonday]})`;

    const semanasConsolidadas = [
      {
        id: 'semana1',
        nombre: 'Semana 1',
        detalle: 'Hace 3 semanas (Lun - Dom)',
        total: s1Total,
        crecimiento: 0,
        barColor: '#94A3B8'
      },
      {
        id: 'semana2',
        nombre: 'Semana 2',
        detalle: 'Hace 2 semanas (Lun - Dom)',
        total: s2Total,
        crecimiento: s1Total > 0 ? ((s2Total - s1Total) / s1Total) * 100 : 0,
        barColor: '#7DD3FC'
      },
      {
        id: 'semana3',
        nombre: 'Semana 3',
        detalle: 'Hace 1 semana (Lun - Dom)',
        total: s3Total,
        crecimiento: s2Total > 0 ? ((s3Total - s2Total) / s2Total) * 100 : 0,
        barColor: '#60A5FA'
      },
      {
        id: 'semana4',
        nombre: 'Semana 4 (Actual)',
        detalle: detalleSemana4,
        total: s4Total,
        crecimiento: s3Total > 0 ? ((s4Total - s3Total) / s3Total) * 100 : 0,
        barColor: '#4B9CD3'
      }
    ];

    return {
      ultimos7Dias: ultimos7DiasList,
      ultimas4Semanas: comparativaSemanas,
      semanasConsolidadas,
      granTotal4Semanas,
      productosEn4Semanas
    };
  }, [ventasRegistradas, deckStarTab, deckTrendMetric]);

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
              onClick={handleQuickHoy}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                startDate === getLocalDateString() && endDate === getLocalDateString()
                  ? 'bg-[#4B9CD3] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Filtrar ventas y estado financiero de la jornada de hoy"
            >
              <Calendar className="w-3.5 h-3.5" /> Hoy
            </button>
            <button
              type="button"
              onClick={handleQuickUltimos7Dias}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                startDate === getBogotaDateDaysAgo(7) && endDate === getLocalDateString()
                  ? 'bg-[#4B9CD3] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Filtrar ventas y métricas de los últimos 7 días"
            >
              <Clock className="w-3.5 h-3.5" /> Últimos 7 días
            </button>
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
              id="btn-chat-gemini-financiero"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsChatModalOpen(true);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer bg-gradient-to-r from-sky-600 to-indigo-600 text-white hover:from-sky-700 hover:to-indigo-700 shadow-md flex items-center gap-1.5 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Preguntar al Chat de Gemini (Filtro Actual)</span>
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

              {/* SECCIÓN ESTRELLA: PRODUCTOS INSIGNIA DE COCCOLE (FRESAS, PROTEÍNA, SÁNDWICHES, ENSALADAS) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-gradient-to-br from-pink-500 to-amber-500 text-white rounded-xl shadow-xs">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                          Productos Estrella del Menú (Agrupación Especial del Deck)
                        </h4>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 border border-pink-200">
                          Exclusivo Deck
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Rendimiento y tendencia para tus 4 pilares: Fresas con crema, Batidos de proteína, Sándwiches y Ensaladas de frutas.
                      </p>
                    </div>
                  </div>

                  {/* Selector rápido de categoría estrella */}
                  <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setDeckStarTab('todas')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        deckStarTab === 'todas'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeckStarTab('fresas')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        deckStarTab === 'fresas'
                          ? 'bg-pink-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-pink-600'
                      }`}
                    >
                      🍓 Fresas
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeckStarTab('proteina')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        deckStarTab === 'proteina'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-amber-600'
                      }`}
                    >
                      🥤 Proteína
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeckStarTab('sandwiches')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        deckStarTab === 'sandwiches'
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-orange-600'
                      }`}
                    >
                      🥪 Sándwiches
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeckStarTab('ensaladas')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        deckStarTab === 'ensaladas'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-emerald-600'
                      }`}
                    >
                      🥗 Ensaladas
                    </button>
                  </div>
                </div>

                {/* 4 Tarjetas Resumen de Categorías Estrella */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {(['fresas', 'proteina', 'sandwiches', 'ensaladas'] as const).map(catKey => {
                    const cat = starProductsAnalytics[catKey];
                    const sharePct = filteredData.totalVentas > 0 ? ((cat.totalVendido / filteredData.totalVentas) * 100).toFixed(1) : '0';
                    const isSelected = deckStarTab === 'todas' || deckStarTab === catKey;

                    return (
                      <div
                        key={catKey}
                        onClick={() => setDeckStarTab(catKey)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                          isSelected
                            ? `${cat.bgColor} ${cat.borderColor} shadow-xs ring-1 ring-slate-300/40`
                            : 'bg-white border-slate-200 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{cat.icono}</span>
                            <span className={`text-xs font-black uppercase tracking-wider ${cat.textColor}`}>
                              {cat.nombre}
                            </span>
                          </div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 shadow-2xs">
                            {sharePct}%
                          </span>
                        </div>

                        <div>
                          <p className="text-lg font-black text-slate-900">{formatMoney(cat.totalVendido)}</p>
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mt-0.5">
                            <span>{cat.unidades} un. vendidas</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">Utilidad: {formatMoney(cat.utilidad)}</span>
                          </div>
                        </div>

                        {/* Top variantes en esta categoría */}
                        <div className="pt-2 border-t border-slate-200/60 space-y-1">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Variantes destacadas:</p>
                          {cat.productos.length > 0 ? (
                            cat.productos.slice(0, 2).map((p, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[10px]">
                                <span className="text-slate-700 font-medium truncate max-w-[120px]">{p.nombre}</span>
                                <span className="font-bold text-slate-900">{p.cantidad} un. ({formatMoney(p.total)})</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">Sin ventas registradas en el período</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* GRÁFICAS DE TENDENCIA INDIVIDUAL PARA CADA CATEGORÍA ESTRELLA */}
                <div className="space-y-4 pt-1">
                  {/* BARRA DE CONTROL CON BOTÓN DE FILTRAR CATEGORÍAS Y BOTÓN DE FILTRAR MÉTRICA (PRECIO DE VENTAS / UNIDADES) */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-pink-100 text-pink-700 rounded-xl">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          Tendencia por Categoría Estrella
                        </h5>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {deckTrendMetric === 'ventas'
                            ? 'Métrica activa: Precio de Ventas Total Facturado ($)'
                            : 'Métrica activa: Unidades Vendidas Totales (Cantidades)'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                      {/* BOTÓN 1: FILTRO DE CATEGORÍAS */}
                      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-[10px] font-black uppercase text-slate-400 px-1.5 flex items-center gap-1">
                          <Filter className="w-3 h-3 text-slate-500" />
                          Categoría:
                        </span>
                        {(['todas', 'fresas', 'proteina', 'sandwiches', 'ensaladas'] as const).map(catKey => {
                          const labels: Record<string, string> = {
                            todas: 'Todas',
                            fresas: '🍓 Fresas',
                            proteina: '🥤 Proteína',
                            sandwiches: '🥪 Sándwiches',
                            ensaladas: '🥗 Ensaladas'
                          };
                          const isAct = deckStarTab === catKey;
                          return (
                            <button
                              key={catKey}
                              type="button"
                              onClick={() => setDeckStarTab(catKey)}
                              className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                                isAct
                                  ? 'bg-slate-900 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                              }`}
                            >
                              {labels[catKey]}
                            </button>
                          );
                        })}
                      </div>

                      {/* BOTÓN 2: FILTRO POR PRECIO DE VENTAS ($) Y UNIDADES VENDIDAS TOTALES */}
                      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setDeckTrendMetric('ventas')}
                          className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                            deckTrendMetric === 'ventas'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <DollarSign className="w-3 h-3" />
                          <span>Precio de Ventas ($)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeckTrendMetric('unidades')}
                          className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                            deckTrendMetric === 'unidades'
                              ? 'bg-[#4B9CD3] text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <Layers className="w-3 h-3" />
                          <span>Unidades Vendidas</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={`grid gap-4 ${
                    deckStarTab === 'todas'
                      ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
                      : 'grid-cols-1 max-w-2xl mx-auto'
                  }`}>
                    {(['fresas', 'proteina', 'sandwiches', 'ensaladas'] as const)
                      .filter(catKey => deckStarTab === 'todas' || deckStarTab === catKey)
                      .map(catKey => {
                        const cat = starProductsAnalytics[catKey];
                        const trendData = cat.tendencia;
                        const isVentas = deckTrendMetric === 'ventas';
                        const maxVal = Math.max(
                          ...trendData.map(t => isVentas ? t.total : t.unidades),
                          isVentas ? 1000 : 5
                        );

                        return (
                          <div key={catKey} className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                            <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                                <span>{cat.icono}</span>
                                <span>{cat.nombre}</span>
                              </span>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono">
                                {isVentas ? formatMoney(cat.totalVendido) : `${cat.unidades} un.`}
                              </span>
                            </div>

                            {/* Gráfica de Barras de Tendencia */}
                            {trendData.length === 0 ? (
                              <div className="h-32 flex items-center justify-center text-center p-4">
                                <p className="text-xs text-slate-400 italic">Sin datos de tendencia en el rango seleccionado</p>
                              </div>
                            ) : (
                              <div className="h-32 flex items-end gap-1.5 pt-4 pb-1 px-1">
                                {trendData.map((d, idx) => {
                                  const metricVal = isVentas ? d.total : d.unidades;
                                  const heightPct = Math.max(8, Math.round((metricVal / maxVal) * 100));
                                  return (
                                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                                      {/* Tooltip flotante */}
                                      <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap z-10">
                                        {d.diaSemana}: {formatMoney(d.total)} • {d.unidades} un.
                                      </div>
                                      <div
                                        style={{ height: `${heightPct}%`, backgroundColor: cat.color }}
                                        className="w-full rounded-t-md transition-all group-hover:brightness-110"
                                      ></div>
                                      <span className="text-[9px] font-bold text-slate-500 mt-1 truncate w-full text-center">
                                        {d.diaSemana.slice(0, 3)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="text-[10px] text-slate-500 flex justify-between border-t border-slate-200/60 pt-2 font-medium">
                              <span>
                                {isVentas ? 'Unidades: ' : 'Facturado: '}
                                <strong className="text-slate-800 font-bold">
                                  {isVentas ? `${cat.unidades} un.` : formatMoney(cat.totalVendido)}
                                </strong>
                              </span>
                              <span>Utilidad: <strong className="text-emerald-700 font-bold">{formatMoney(cat.utilidad)}</strong></span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Insight cualitativo de Gemini para productos estrella */}
                {deckData.analisisProductosEstrella && (
                  <div className="bg-pink-50/40 border border-pink-100 rounded-xl p-3.5 text-xs text-slate-700 space-y-1.5">
                    <span className="font-black text-pink-800 uppercase text-[10px] tracking-wide block">
                      Diagnóstico Gemini sobre Productos Estrella:
                    </span>
                    <p className="leading-relaxed font-medium">
                      {deckData.analisisProductosEstrella.conclusionEstrellas ||
                       'Fresas con crema, batidos de proteína, sándwiches gourmet y ensaladas de frutas representan la máxima preferencia del cliente y garantizan el flujo de caja diario.'}
                    </p>
                  </div>
                )}
              </div>

              {/* SECCIÓN COMPARATIVA: ÚLTIMAS 4 SEMANAS Y ÚLTIMOS 7 DÍAS (POR DÍAS DE LA SEMANA - SIN FECHAS) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-sky-500 text-white rounded-xl shadow-xs">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                          Comportamiento por Días de la Semana
                        </h4>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                          Lunes a Domingo • Sin Fechas
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Patrones de venta en los días de la semana evaluando los últimos 7 días y la comparativa de las últimas 4 semanas.
                      </p>
                    </div>
                  </div>

                  {/* Selector entre Últimos 7 Días y Últimas 4 Semanas */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setDeckDayTab('ultimos7')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        deckDayTab === 'ultimos7'
                          ? 'bg-[#4B9CD3] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Últimos 7 Días
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeckDayTab('4semanas')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        deckDayTab === '4semanas'
                          ? 'bg-[#4B9CD3] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Últimas 4 Semanas
                    </button>
                  </div>
                </div>

                {/* BOTONES DE FILTRO SOLICITADOS: FILTRO DE CATEGORÍAS Y FILTRO DE MÉTRICA ($ / UNIDADES) */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-2xs">
                  {/* BOTÓN 1: FILTRO DE CATEGORÍAS */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-500 px-1 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5 text-slate-500" />
                      Categoría:
                    </span>
                    <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                      {(['todas', 'fresas', 'proteina', 'sandwiches', 'ensaladas'] as const).map(catKey => {
                        const labels: Record<string, string> = {
                          todas: 'Todas',
                          fresas: '🍓 Fresas',
                          proteina: '🥤 Proteína',
                          sandwiches: '🥪 Sándwiches',
                          ensaladas: '🥗 Ensaladas'
                        };
                        const isAct = deckStarTab === catKey;
                        return (
                          <button
                            key={catKey}
                            type="button"
                            onClick={() => setDeckStarTab(catKey)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                              isAct
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            {labels[catKey]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* BOTÓN 2: FILTRO POR PRECIO DE VENTAS ($) Y UNIDADES VENDIDAS TOTALES */}
                  <div className="flex items-center gap-1.5 w-full lg:w-auto justify-end">
                    <span className="text-[10px] font-black uppercase text-slate-500 px-1">
                      Métrica:
                    </span>
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setDeckTrendMetric('ventas')}
                        className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          deckTrendMetric === 'ventas'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Precio de Ventas ($)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeckTrendMetric('unidades')}
                        className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          deckTrendMetric === 'unidades'
                            ? 'bg-[#4B9CD3] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Unidades Vendidas</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subtítulo indicador del filtro activo */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-medium px-1 -mt-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>
                      Filtrado por:{' '}
                      <strong className="text-slate-800 font-bold">
                        {deckStarTab === 'todas'
                          ? 'Todas las categorías'
                          : starProductsAnalytics[deckStarTab]?.nombre || deckStarTab}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Métrica:{' '}
                      <strong className="text-slate-800 font-bold">
                        {deckTrendMetric === 'ventas' ? 'Precio de Ventas ($ Facturado)' : 'Unidades Vendidas Totales'}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* VISTA A: ÚLTIMOS 7 DÍAS (Por día de la semana) */}
                {deckDayTab === 'ultimos7' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        {deckTrendMetric === 'ventas'
                          ? 'Ventas diarias de los últimos 7 días (rotación de Lunes a Domingo)'
                          : 'Unidades vendidas de los últimos 7 días (rotación de Lunes a Domingo)'}
                      </span>
                      {(() => {
                        const isVentas = deckTrendMetric === 'ventas';
                        const maxDay = [...diasSemanaAnalytics.ultimos7Dias].sort((a, b) => b.metricValue - a.metricValue)[0];
                        return maxDay && maxDay.metricValue > 0 ? (
                          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            🏆 Mayor {isVentas ? 'Venta' : 'Rotación'}: {maxDay.diaSemana} (
                            {isVentas ? formatMoney(maxDay.metricValue) : `${Math.round(maxDay.metricValue)} un.`}
                            )
                          </span>
                        ) : null;
                      })()}
                    </div>

                    {/* Gráfica de Barras de los Últimos 7 Días */}
                    {(() => {
                      const isVentas = deckTrendMetric === 'ventas';
                      const maxVal = Math.max(...diasSemanaAnalytics.ultimos7Dias.map(d => d.metricValue), isVentas ? 1000 : 5);
                      const bestDayName = [...diasSemanaAnalytics.ultimos7Dias].sort((a, b) => b.metricValue - a.metricValue)[0]?.diaSemana;

                      return (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                          <div className="h-44 flex items-end gap-3 pt-6 pb-2 px-2">
                            {diasSemanaAnalytics.ultimos7Dias.map((d, idx) => {
                              const heightPct = Math.max(6, Math.round((d.metricValue / maxVal) * 100));
                              const isBest = d.metricValue > 0 && d.diaSemana === bestDayName;

                              return (
                                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                                  {/* Monto / Unidades sobre la barra */}
                                  <span className={`text-[10px] font-black mb-1 whitespace-nowrap font-mono ${isBest ? 'text-emerald-700' : 'text-slate-700'}`}>
                                    {isVentas ? formatMoney(d.metricValue) : `${Math.round(d.metricValue)} un.`}
                                  </span>

                                  {/* Barra */}
                                  <div
                                    style={{ height: `${heightPct}%` }}
                                    className={`w-full rounded-t-xl transition-all duration-300 group-hover:scale-y-105 ${
                                      isBest
                                        ? 'bg-gradient-to-t from-emerald-600 to-teal-400 shadow-md shadow-emerald-200'
                                        : 'bg-gradient-to-t from-[#4B9CD3] to-sky-300'
                                    }`}
                                  ></div>

                                  {/* Etiqueta del Eje X: SOLO DÍA DE LA SEMANA */}
                                  <div className="mt-2 text-center">
                                    <span className={`text-xs font-black block ${isBest ? 'text-emerald-800' : 'text-slate-800'}`}>
                                      {d.diaSemana}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-medium block">
                                      {d.transacciones} {d.transacciones === 1 ? 'venta' : 'ventas'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Mini desglose por día de productos estrella */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-3 border-t border-slate-200/80">
                            {diasSemanaAnalytics.ultimos7Dias.map((d, idx) => (
                              <div key={idx} className="bg-white p-2 rounded-xl border border-slate-200/80 text-[10px] space-y-1 text-center">
                                <span className="font-extrabold text-slate-800 block border-b border-slate-100 pb-0.5">{d.diaSemana}</span>
                                <div className="space-y-0.5 text-left text-[9px] text-slate-600">
                                  <div className="flex justify-between">
                                    <span>🍓 Fresas:</span>
                                    <strong className="text-pink-700 font-bold">
                                      {isVentas ? formatMoney(d.fresas) : `${Math.round(d.fresas)} un.`}
                                    </strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>🥤 Prot.:</span>
                                    <strong className="text-amber-700 font-bold">
                                      {isVentas ? formatMoney(d.proteina) : `${Math.round(d.proteina)} un.`}
                                    </strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>🥪 Sánd.:</span>
                                    <strong className="text-orange-700 font-bold">
                                      {isVentas ? formatMoney(d.sandwiches) : `${Math.round(d.sandwiches)} un.`}
                                    </strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>🥗 Ensal.:</span>
                                    <strong className="text-emerald-700 font-bold">
                                      {isVentas ? formatMoney(d.ensaladas) : `${Math.round(d.ensaladas)} un.`}
                                    </strong>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* VISTA B: ÚLTIMAS 4 SEMANAS (Comparativa Lunes a Domingo) */}
                {deckDayTab === '4semanas' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">
                        {deckTrendMetric === 'ventas'
                          ? 'Comparativa de facturación ($) de cada día de la semana a través de las últimas 4 semanas'
                          : 'Comparativa de volumen (unidades) de cada día de la semana a través de las últimas 4 semanas'}
                      </span>
                      {/* Leyenda de semanas */}
                      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-600">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-sm bg-slate-300"></span> Semana 1
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-sm bg-sky-300"></span> Semana 2
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-sm bg-blue-400"></span> Semana 3
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-sm bg-[#4B9CD3]"></span> Semana 4 (Actual)
                        </span>
                      </div>
                    </div>

                    {/* Gráfica de Barras Agrupadas por Día de la Semana */}
                    {(() => {
                      const isVentas = deckTrendMetric === 'ventas';
                      const allVals = diasSemanaAnalytics.ultimas4Semanas.flatMap(r => [r.semana1, r.semana2, r.semana3, r.semana4]);
                      const maxVal = Math.max(...allVals, isVentas ? 1000 : 5);

                      const formatBarVal = (val: number, isV: boolean) => {
                        if (!isV) return `${Math.round(val)}`;
                        if (val === 0) return '$0';
                        if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
                        if (val >= 1000) return `$${Math.round(val / 1000)}k`;
                        return `$${Math.round(val)}`;
                      };

                      return (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                          <div className="h-52 flex items-end gap-2 sm:gap-4 pt-6 pb-2 px-1">
                            {diasSemanaAnalytics.ultimas4Semanas.map((r, idx) => {
                              const h1 = Math.max(4, Math.round((r.semana1 / maxVal) * 100));
                              const h2 = Math.max(4, Math.round((r.semana2 / maxVal) * 100));
                              const h3 = Math.max(4, Math.round((r.semana3 / maxVal) * 100));
                              const h4 = Math.max(4, Math.round((r.semana4 / maxVal) * 100));
                              const totalDia = r.semana1 + r.semana2 + r.semana3 + r.semana4;

                              return (
                                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                                  {/* Total vendido en las 4 semanas para este día (SIN promedio) */}
                                  <span className="text-[9px] font-black text-slate-700 mb-1.5 whitespace-nowrap font-mono bg-white px-1.5 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
                                    Total: {isVentas ? formatMoney(totalDia) : `${Math.round(totalDia)} un.`}
                                  </span>

                                  {/* Grupo de 4 barras con su número total exacto encima de cada barra */}
                                  <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-36">
                                    {/* Barra Semana 1 */}
                                    <div className="flex-1 max-w-[14px] sm:max-w-[20px] flex flex-col items-center h-full justify-end group/b1 relative">
                                      <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 mb-0.5 whitespace-nowrap font-mono group-hover/b1:text-slate-900 group-hover/b1:font-black">
                                        {formatBarVal(r.semana1, isVentas)}
                                      </span>
                                      <div
                                        style={{ height: `${h1}%` }}
                                        title={`Semana 1: ${isVentas ? formatMoney(r.semana1) : `${Math.round(r.semana1)} un.`}`}
                                        className="w-full bg-slate-300 rounded-t-sm hover:brightness-110 transition-all"
                                      ></div>
                                    </div>

                                    {/* Barra Semana 2 */}
                                    <div className="flex-1 max-w-[14px] sm:max-w-[20px] flex flex-col items-center h-full justify-end group/b2 relative">
                                      <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 mb-0.5 whitespace-nowrap font-mono group-hover/b2:text-slate-900 group-hover/b2:font-black">
                                        {formatBarVal(r.semana2, isVentas)}
                                      </span>
                                      <div
                                        style={{ height: `${h2}%` }}
                                        title={`Semana 2: ${isVentas ? formatMoney(r.semana2) : `${Math.round(r.semana2)} un.`}`}
                                        className="w-full bg-sky-300 rounded-t-sm hover:brightness-110 transition-all"
                                      ></div>
                                    </div>

                                    {/* Barra Semana 3 */}
                                    <div className="flex-1 max-w-[14px] sm:max-w-[20px] flex flex-col items-center h-full justify-end group/b3 relative">
                                      <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 mb-0.5 whitespace-nowrap font-mono group-hover/b3:text-slate-900 group-hover/b3:font-black">
                                        {formatBarVal(r.semana3, isVentas)}
                                      </span>
                                      <div
                                        style={{ height: `${h3}%` }}
                                        title={`Semana 3: ${isVentas ? formatMoney(r.semana3) : `${Math.round(r.semana3)} un.`}`}
                                        className="w-full bg-blue-400 rounded-t-sm hover:brightness-110 transition-all"
                                      ></div>
                                    </div>

                                    {/* Barra Semana 4 (Actual) */}
                                    <div className="flex-1 max-w-[14px] sm:max-w-[20px] flex flex-col items-center h-full justify-end group/b4 relative">
                                      <span className="text-[8px] sm:text-[9px] font-black text-[#1e6191] mb-0.5 whitespace-nowrap font-mono group-hover/b4:scale-110 transition-transform">
                                        {formatBarVal(r.semana4, isVentas)}
                                      </span>
                                      <div
                                        style={{ height: `${h4}%` }}
                                        title={`Semana 4 (Actual): ${isVentas ? formatMoney(r.semana4) : `${Math.round(r.semana4)} un.`}`}
                                        className="w-full bg-[#4B9CD3] rounded-t-sm hover:brightness-110 shadow-2xs transition-all"
                                      ></div>
                                    </div>
                                  </div>

                                  {/* Eje X: Día de la semana */}
                                  <span className="text-xs font-black text-slate-800 mt-2 block">
                                    {r.diaSemana}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Tabla resumen de totales por día */}
                          <div className="overflow-x-auto pt-2 border-t border-slate-200">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-white border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase">
                                  <th className="py-2 px-2.5">Día de la Semana</th>
                                  <th className="py-2 px-2.5 text-right">Semana 1 {isVentas ? '($)' : '(un.)'}</th>
                                  <th className="py-2 px-2.5 text-right">Semana 2 {isVentas ? '($)' : '(un.)'}</th>
                                  <th className="py-2 px-2.5 text-right">Semana 3 {isVentas ? '($)' : '(un.)'}</th>
                                  <th className="py-2 px-2.5 text-right">Semana 4 (Actual) {isVentas ? '($)' : '(un.)'}</th>
                                  <th className="py-2 px-2.5 text-right font-black text-[#4B9CD3]">
                                    Total 4 Semanas {isVentas ? '($)' : '(un.)'}
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium">
                                {diasSemanaAnalytics.ultimas4Semanas.map((r, idx) => {
                                  const totalDia = r.semana1 + r.semana2 + r.semana3 + r.semana4;
                                  return (
                                    <tr key={idx} className="hover:bg-white/80 transition-colors">
                                      <td className="py-1.5 px-2.5 font-bold text-slate-800">{r.diaSemana}</td>
                                      <td className="py-1.5 px-2.5 text-right text-slate-600">
                                        {isVentas ? formatMoney(r.semana1) : `${Math.round(r.semana1)} un.`}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-right text-slate-600">
                                        {isVentas ? formatMoney(r.semana2) : `${Math.round(r.semana2)} un.`}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-right text-slate-600">
                                        {isVentas ? formatMoney(r.semana3) : `${Math.round(r.semana3)} un.`}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-right font-semibold text-slate-900">
                                        {isVentas ? formatMoney(r.semana4) : `${Math.round(r.semana4)} un.`}
                                      </td>
                                      <td className="py-1.5 px-2.5 text-right font-black text-[#4B9CD3]">
                                        {isVentas ? formatMoney(totalDia) : `${Math.round(totalDia)} un.`}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Insight cualitativo de Gemini para días de la semana */}
                {deckData.analisisDiasSemana && (
                  <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3.5 text-xs text-slate-700 space-y-1">
                    <span className="font-black text-indigo-800 uppercase text-[10px] tracking-wide block">
                      Diagnóstico Semanal de Gemini:
                    </span>
                    <p className="leading-relaxed font-medium">
                      {deckData.analisisDiasSemana}
                    </p>
                  </div>
                )}
              </div>

              {/* NUEVA SECCIÓN: TOTAL CONSOLIDADO DE LAS ÚLTIMAS 4 SEMANAS (GLOBAL - SIN DÍAS DE LA SEMANA) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl shadow-xs">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                          Total Consolidado de las Últimas 4 Semanas
                        </h4>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                          Total Global • Sin Días
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Evolución total semana a semana de las últimas 4 semanas completas para el producto o categoría seleccionada.
                      </p>
                    </div>
                  </div>

                  {/* Badge de Gran Total 4 Semanas */}
                  <div className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-right">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Acumulado 4 Semanas</span>
                    <span className="text-sm font-black text-slate-900 font-mono">
                      {deckTrendMetric === 'ventas'
                        ? formatMoney(diasSemanaAnalytics.granTotal4Semanas)
                        : `${Math.round(diasSemanaAnalytics.granTotal4Semanas)} un.`}
                    </span>
                  </div>
                </div>

                {/* BOTONES DE FILTRADO (CATEGORÍA Y MÉTRICA) */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-2xs">
                  {/* BOTÓN 1: FILTRO DE CATEGORÍAS */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-500 px-1 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5 text-slate-500" />
                      Categoría:
                    </span>
                    <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                      {(['todas', 'fresas', 'proteina', 'sandwiches', 'ensaladas'] as const).map(catKey => {
                        const labels: Record<string, string> = {
                          todas: 'Todas',
                          fresas: '🍓 Fresas',
                          proteina: '🥤 Proteína',
                          sandwiches: '🥪 Sándwiches',
                          ensaladas: '🥗 Ensaladas'
                        };
                        const isAct = deckStarTab === catKey;
                        return (
                          <button
                            key={catKey}
                            type="button"
                            onClick={() => setDeckStarTab(catKey)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                              isAct
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            {labels[catKey]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* BOTÓN 2: FILTRO POR PRECIO DE VENTAS ($) Y UNIDADES VENDIDAS TOTALES */}
                  <div className="flex items-center gap-1.5 w-full lg:w-auto justify-end">
                    <span className="text-[10px] font-black uppercase text-slate-500 px-1">
                      Métrica:
                    </span>
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setDeckTrendMetric('ventas')}
                        className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          deckTrendMetric === 'ventas'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Precio de Ventas ($)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeckTrendMetric('unidades')}
                        className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          deckTrendMetric === 'unidades'
                            ? 'bg-[#4B9CD3] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Unidades Vendidas</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subtítulo indicador del filtro activo */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-medium px-1 -mt-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>
                      Mostrando total de:{' '}
                      <strong className="text-slate-800 font-bold">
                        {deckStarTab === 'todas'
                          ? 'Todas las categorías'
                          : starProductsAnalytics[deckStarTab]?.nombre || deckStarTab}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Métrica:{' '}
                      <strong className="text-slate-800 font-bold">
                        {deckTrendMetric === 'ventas' ? 'Precio de Ventas ($ Facturado)' : 'Unidades Vendidas Totales'}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* 4 Tarjetas de resumen semana por semana - Clickeables para filtrar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {diasSemanaAnalytics.semanasConsolidadas.map((sem, idx) => {
                    const isVentas = deckTrendMetric === 'ventas';
                    const isSelected = selectedDeckWeek === sem.id;
                    const sharePct = diasSemanaAnalytics.granTotal4Semanas > 0
                      ? ((sem.total / diasSemanaAnalytics.granTotal4Semanas) * 100).toFixed(1)
                      : '0';

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDeckWeek(isSelected ? 'todas' : sem.id as any)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'bg-blue-100/90 border-blue-600 ring-2 ring-blue-600 shadow-md scale-[1.02]'
                            : idx === 3
                            ? 'bg-blue-50/70 border-blue-200 ring-1 ring-blue-300/40 shadow-xs hover:border-blue-400 hover:bg-blue-50'
                            : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                        title="Haz clic para ver el desglose de productos de esta semana"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-[11px] font-black uppercase flex items-center gap-1 ${
                            isSelected ? 'text-blue-900' : idx === 3 ? 'text-blue-800' : 'text-slate-700'
                          }`}>
                            {sem.nombre}
                            {isSelected && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-blue-600 text-white rounded">
                                Activa
                              </span>
                            )}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400">
                            {sem.detalle}
                          </span>
                        </div>
                        <p className={`text-base sm:text-lg font-black font-mono ${
                          isSelected ? 'text-blue-900 font-extrabold' : idx === 3 ? 'text-blue-900' : 'text-slate-900'
                        }`}>
                          {isVentas ? formatMoney(sem.total) : `${Math.round(sem.total)} un.`}
                        </p>
                        <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-slate-100 text-[10px]">
                          <span className="text-slate-500 font-semibold">{sharePct}% del total</span>
                          {idx > 0 && (
                            <span className={`font-black flex items-center gap-0.5 ${
                              sem.crecimiento >= 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}>
                              {sem.crecimiento >= 0 ? '▲ +' : '▼ '}
                              {sem.crecimiento.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* GRÁFICA DE BARRAS DE LAS 4 SEMANAS TOTALES (SIN DÍAS) */}
                {(() => {
                  const isVentas = deckTrendMetric === 'ventas';
                  const maxSemVal = Math.max(...diasSemanaAnalytics.semanasConsolidadas.map(s => s.total), isVentas ? 1000 : 5);
                  const activeSemana = diasSemanaAnalytics.semanasConsolidadas.find(s => s.id === selectedDeckWeek);
                  const isFilteredByWeek = selectedDeckWeek !== 'todas';

                  // Calcular productos correspondientes a la selección (semana individual o acumulado de las 4 semanas)
                  const productosFiltrados = diasSemanaAnalytics.productosEn4Semanas
                    .map(prod => {
                      if (!isFilteredByWeek) {
                        return {
                          nombre: prod.nombre,
                          categoriaEstrella: prod.categoriaEstrella,
                          unidades: prod.unidades,
                          totalVendido: prod.totalVendido,
                          unidadesTotales4Sem: prod.unidades,
                          totalVendido4Sem: prod.totalVendido
                        };
                      }
                      const semData = prod.porSemana[selectedDeckWeek as 'semana1' | 'semana2' | 'semana3' | 'semana4'] || { unidades: 0, totalVendido: 0 };
                      return {
                        nombre: prod.nombre,
                        categoriaEstrella: prod.categoriaEstrella,
                        unidades: semData.unidades,
                        totalVendido: semData.totalVendido,
                        unidadesTotales4Sem: prod.unidades,
                        totalVendido4Sem: prod.totalVendido
                      };
                    })
                    .filter(p => isVentas ? p.totalVendido > 0 : p.unidades > 0)
                    .sort((a, b) => isVentas ? b.totalVendido - a.totalVendido : b.unidades - a.unidades);

                  const totalSemanaBase = isFilteredByWeek
                    ? (activeSemana?.total || 0)
                    : diasSemanaAnalytics.granTotal4Semanas;

                  return (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                      {/* Hint interactivo sobre las barras */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                          <span>Toca cualquier barra para ver el desglose exacto de productos de esa semana</span>
                        </span>
                        {isFilteredByWeek && (
                          <button
                            type="button"
                            onClick={() => setSelectedDeckWeek('todas')}
                            className="text-[10px] font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                          >
                            Mostrar todas las 4 semanas
                          </button>
                        )}
                      </div>

                      <div className="h-56 flex items-end justify-around gap-4 sm:gap-8 pt-8 pb-2 px-4">
                        {diasSemanaAnalytics.semanasConsolidadas.map((sem, idx) => {
                          const heightPct = Math.max(10, Math.round((sem.total / maxSemVal) * 100));
                          const isCurrent = idx === 3;
                          const isSelected = selectedDeckWeek === sem.id;
                          const hasSelection = isFilteredByWeek;

                          return (
                            <div
                              key={idx}
                              onClick={() => setSelectedDeckWeek(isSelected ? 'todas' : sem.id as any)}
                              className={`flex-1 max-w-[120px] flex flex-col items-center h-full justify-end group relative cursor-pointer select-none transition-all duration-200 ${
                                hasSelection && !isSelected ? 'opacity-45 hover:opacity-85' : 'opacity-100 scale-100'
                              } ${isSelected ? 'scale-105' : ''}`}
                            >
                              {/* Badge cuando la barra está seleccionada */}
                              {isSelected && (
                                <span className="mb-1 text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-xs whitespace-nowrap animate-bounce">
                                  ✓ Seleccionada
                                </span>
                              )}

                              {/* Valor total encima de la barra */}
                              <span className={`text-xs sm:text-sm font-black mb-2 whitespace-nowrap font-mono transition-transform group-hover:scale-110 ${
                                isSelected ? 'text-blue-900 font-extrabold' : isCurrent ? 'text-[#1e6191]' : 'text-slate-800'
                              }`}>
                                {isVentas ? formatMoney(sem.total) : `${Math.round(sem.total)} un.`}
                              </span>

                              {/* Barra */}
                              <div
                                style={{ height: `${heightPct}%`, backgroundColor: sem.barColor }}
                                className={`w-full rounded-t-xl transition-all duration-300 group-hover:brightness-110 shadow-sm ${
                                  isSelected
                                    ? 'ring-4 ring-offset-2 ring-blue-600 shadow-xl'
                                    : isCurrent
                                    ? 'ring-2 ring-[#4B9CD3]/50 shadow-md shadow-blue-200'
                                    : ''
                                }`}
                              ></div>

                              {/* Etiquetas debajo de la barra */}
                              <div className="mt-2.5 text-center">
                                <span className={`text-xs font-black block transition-colors ${
                                  isSelected ? 'text-blue-700 underline font-black' : isCurrent ? 'text-[#1e6191]' : 'text-slate-800'
                                }`}>
                                  {sem.nombre}
                                </span>
                                <span className="text-[10px] text-slate-500 font-semibold block">
                                  {sem.detalle}
                                </span>
                                {idx > 0 && (
                                  <span className={`text-[9px] font-black inline-block mt-0.5 px-1.5 py-0.5 rounded ${
                                    sem.crecimiento >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {sem.crecimiento >= 0 ? '▲ +' : '▼ '}
                                    {sem.crecimiento.toFixed(1)}% vs anterior
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Resumen al pie */}
                      <div className="flex flex-col sm:flex-row justify-between items-center pt-3 border-t border-slate-200 text-xs text-slate-600 gap-2">
                        <span className="font-medium">
                          Visualizando total acumulado por semana completa (sin división por día de la semana).
                        </span>
                        <span className="font-extrabold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-mono shadow-2xs">
                          Gran Total (4 Sem): {isVentas ? formatMoney(diasSemanaAnalytics.granTotal4Semanas) : `${Math.round(diasSemanaAnalytics.granTotal4Semanas)} un.`}
                        </span>
                      </div>

                      {/* Desglose de Productos que conforman esta sumatoria - Dinámico según barra seleccionada */}
                      <div className="pt-4 border-t border-slate-200 space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg shrink-0">
                              <Layers className="w-4 h-4" />
                            </span>
                            <div>
                              <h6 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                                Productos que suman a este total
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white shadow-2xs">
                                  {isFilteredByWeek ? activeSemana?.nombre : 'Todas las 4 Semanas'} ({productosFiltrados.length})
                                </span>
                              </h6>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {isFilteredByWeek
                                  ? `Mostrando únicamente lo vendido en ${activeSemana?.nombre} (${activeSemana?.detalle})`
                                  : deckStarTab === 'todas'
                                  ? 'Todos los productos con ventas en el acumulado de las últimas 4 semanas'
                                  : `Productos pertenecientes al filtro de ${starProductsAnalytics[deckStarTab]?.nombre || deckStarTab}`}
                              </p>
                            </div>
                          </div>

                          {/* Botones directos para alternar entre semanas o ver el consolidado */}
                          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                              type="button"
                              onClick={() => setSelectedDeckWeek('todas')}
                              className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                                selectedDeckWeek === 'todas'
                                  ? 'bg-slate-900 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                              }`}
                            >
                              Todas (4 Sem)
                            </button>
                            {diasSemanaAnalytics.semanasConsolidadas.map(sem => {
                              const isSel = selectedDeckWeek === sem.id;
                              return (
                                <button
                                  key={sem.id}
                                  type="button"
                                  onClick={() => setSelectedDeckWeek(sem.id as any)}
                                  className={`px-2 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                                    isSel
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                  }`}
                                >
                                  {sem.nombre}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Indicador de Subtotal de la barra/semana elegida */}
                        <div className="flex items-center justify-between px-1 text-[11px] text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            <span>
                              {isFilteredByWeek ? (
                                <>
                                  Mostrando datos de <strong className="text-blue-800 font-bold">{activeSemana?.nombre}</strong> ({activeSemana?.detalle})
                                </>
                              ) : (
                                <>Consolidado general de las 4 semanas completas</>
                              )}
                            </span>
                          </span>
                          <span className="font-extrabold text-slate-800 font-mono">
                            Subtotal {isFilteredByWeek ? activeSemana?.nombre : '4 Semanas'}:{' '}
                            <span className="text-blue-700 font-black">
                              {isVentas ? formatMoney(totalSemanaBase) : `${Math.round(totalSemanaBase)} un.`}
                            </span>
                          </span>
                        </div>

                        {productosFiltrados.length === 0 ? (
                          <div className="p-6 bg-white rounded-xl border border-slate-200 text-center space-y-1">
                            <p className="text-xs font-bold text-slate-600">
                              No se encontraron ventas para esta categoría en {isFilteredByWeek ? activeSemana?.nombre : 'las 4 semanas'}.
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Haz clic en otra semana o en "Todas (4 Sem)" para consultar otros períodos.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
                            {productosFiltrados.map((prod, pIdx) => {
                              const catIcons: Record<string, string> = {
                                fresas: '🍓',
                                proteina: '🥤',
                                sandwiches: '🥪',
                                ensaladas: '🥗',
                                general: '📦'
                              };
                              const icon = catIcons[prod.categoriaEstrella] || '✨';
                              const sharePct = totalSemanaBase > 0
                                ? (((isVentas ? prod.totalVendido : prod.unidades) / totalSemanaBase) * 100).toFixed(1)
                                : '0';

                              return (
                                <div
                                  key={pIdx}
                                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                                    isFilteredByWeek
                                      ? 'bg-white border-blue-200 hover:border-blue-400 shadow-2xs'
                                      : 'bg-white border-slate-200/90 hover:border-blue-300 shadow-2xs'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 pr-2">
                                    <span className="text-base shrink-0">{icon}</span>
                                    <div className="truncate">
                                      <span className="text-xs font-bold text-slate-800 block truncate" title={prod.nombre}>
                                        {prod.nombre}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-medium block">
                                        {isVentas ? `${prod.unidades} un. vendidas` : formatMoney(prod.totalVendido)}
                                        {isFilteredByWeek && (
                                          <span className="text-slate-400 text-[9px] block">
                                            (Total 4 sem: {isVentas ? `${prod.unidadesTotales4Sem} un.` : formatMoney(prod.totalVendido4Sem)})
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className="text-xs font-black text-slate-900 block font-mono">
                                      {isVentas ? formatMoney(prod.totalVendido) : `${Math.round(prod.unidades)} un.`}
                                    </span>
                                    <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                      {sharePct}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl text-sky-300">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-wide">Chat Inteligente Gemini (Filtro Activo)</h3>
                  <p className="text-[11px] text-slate-300">Consulta sobre ventas, productos (rotación, cero rotación), gastos y horarios ({startDate} a {endDate})</p>
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

            {/* Chips de Preguntas Rápidas */}
            <div className="px-4 py-2 bg-sky-50/70 border-b border-sky-100 flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-thin">
              <span className="text-[10px] font-black uppercase text-sky-800 shrink-0">Sugerencias:</span>
              <button
                type="button"
                onClick={() => handleSendChat(undefined, "¿Qué productos no rotaron en este período?")}
                className="px-2.5 py-1 bg-white hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-lg shrink-0 font-bold cursor-pointer transition-colors text-[10px]"
              >
                ¿Productos sin rotación?
              </button>
              <button
                type="button"
                onClick={() => handleSendChat(undefined, "¿Cuáles fueron los productos más vendidos?")}
                className="px-2.5 py-1 bg-white hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-lg shrink-0 font-bold cursor-pointer transition-colors text-[10px]"
              >
                Top más vendidos
              </button>
              <button
                type="button"
                onClick={() => handleSendChat(undefined, "¿Quién fue la colaboradora que más vendió?")}
                className="px-2.5 py-1 bg-white hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-lg shrink-0 font-bold cursor-pointer transition-colors text-[10px]"
              >
                Vendedora estrella
              </button>
              <button
                type="button"
                onClick={() => handleSendChat(undefined, "Dame un resumen del margen neto y utilidad libre")}
                className="px-2.5 py-1 bg-white hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-lg shrink-0 font-bold cursor-pointer transition-colors text-[10px]"
              >
                Margen y utilidad
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
