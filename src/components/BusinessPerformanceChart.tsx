import React, { useMemo } from "react";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { Venta, RegistroVenta } from "../types";
import { TrendingUp, Target, DollarSign, Calendar } from "lucide-react";

export interface BusinessPerformanceChartProps {
  ventas?: (Venta | RegistroVenta | any)[];
  metaMensual?: number;
}

export const BusinessPerformanceChart = (props: BusinessPerformanceChartProps) => {
  const ventas = props.ventas || [];
  const metaMensual = props.metaMensual || 300000;

  const chartData = useMemo(() => {
    const dailySalesMap: Record<string, number> = {};
    ventas.forEach((v: any) => {
      const datePart = (v.fecha || "").split("T")[0];
      if (!datePart) return;
      const amount = Number(v.total ?? v.unidades_contadas ?? 0);
      dailySalesMap[datePart] = (dailySalesMap[datePart] || 0) + amount;
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let accumulated = 0;
    const daysData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
      const daySales = dailySalesMap[dayStr] || 0;
      accumulated += daySales;

      const targetSoFar = Math.round((metaMensual / daysInMonth) * day);

      daysData.push({
        day: String(day),
        fecha: dayStr,
        ventasDiarias: daySales,
        ventasAcumuladas: accumulated,
        objetivoProyectado: targetSoFar
      });
    }

    return daysData;
  }, [ventas, metaMensual]);

  const totalVentasMes = chartData[chartData.length - 1]?.ventasAcumuladas || 0;
  const porcentajeCumplimiento = metaMensual > 0 ? Math.round((totalVentasMes / metaMensual) * 100) : 0;
  const diasTranscurridos = new Date().getDate();
  const promedioDiario = diasTranscurridos > 0 ? Math.round(totalVentasMes / diasTranscurridos) : 0;
  const proyeccionCierre = promedioDiario * new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Rendimiento de Negocio vs. Objetivos</h3>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Seguimiento diario de ventas, acumulación mensual y proyección de cierre.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
            <span className="text-xs text-slate-500 block">Ventas del Mes</span>
            <span className="text-base font-bold text-slate-900">${"$"}{totalVentasMes.toLocaleString()}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
            <span className="text-xs text-slate-500 block">Meta Mensual</span>
            <span className="text-base font-bold text-indigo-600">${"$"}{metaMensual.toLocaleString()}</span>
          </div>
          <div className={"border rounded-xl px-4 py-2 " + (porcentajeCumplimiento >= 100 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700")}>
            <span className="text-xs opacity-80 block">Cumplimiento</span>
            <span className="text-base font-bold">{porcentajeCumplimiento}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Promedio Diario</p>
            <p className="text-lg font-bold text-slate-900">${"$"}{promedioDiario.toLocaleString()}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Proyección Estimada</p>
            <p className="text-lg font-bold text-slate-900">${"$"}{proyeccionCierre.toLocaleString()}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Restante para Meta</p>
            <p className="text-lg font-bold text-slate-900">${"$"}{Math.max(0, metaMensual - totalVentasMes).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="h-80 w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} tickFormatter={(val) => "$" + (val >= 1000 ? (val / 1000) + "k" : val)} />
            <Tooltip
              contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
              formatter={(value, name) => ["$" + Number(value).toLocaleString(), name === "ventasDiarias" ? "Ventas Diarias" : name === "ventasAcumuladas" ? "Ventas Acumuladas" : "Objetivo Lineal"]}
              labelFormatter={(label) => "Día " + label + " del Mes"}
            />
            <Legend wrapperStyle={{ paddingTop: "10px" }} />
            <Bar dataKey="ventasDiarias" name="Ventas Diarias" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={20} />
            <Line type="monotone" dataKey="ventasAcumuladas" name="Ventas Acumuladas" stroke="#4f46e5" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="objetivoProyectado" name="Objetivo Lineal" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
);
};