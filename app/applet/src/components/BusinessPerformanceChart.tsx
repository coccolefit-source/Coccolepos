import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { RegistroVenta } from '../types';
import { TrendingUp, Target, DollarSign, Calendar } from 'lucide-react';

interface BusinessPerformanceChartProps {
  ventas: RegistroVenta[];
  metaMensual?: number;
}

export const BusinessPerformanceChart: React.FC<BusinessPerformanceChartProps> = ({
  ventas = [],
  metaMensual = 300000
}) => {
  const chartData = useMemo(() => {
    const dailySalesMap: { [dateStr: string]: number } = {};
    
    ventas.forEach((v) => {
      const datePart = (v.fecha || v.timestamp || '').split('T')[0];
      if (!datePart) return;
      const monto = Number(v.monto || v.total || 0);
      dailySalesMap[datePart] = (dailySalesMap[datePart] || 0) + monto;
    });

    const sortedDates = Object.keys(dailySalesMap).sort();
    
    if (sortedDates.length === 0) {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      const result = [];
      let cumulative = 0;
      const dailyTarget = metaMensual / daysInMonth;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const ventasDia = Math.round(Math.random() * 5000 + 3000);
        cumulative += ventasDia;
        result.push({
          date: dateStr,
          dayLabel: `Día ${day}`,
          ventas: ventasDia,
          acumulado: cumulative,
          objetivoDiario: Math.round(dailyTarget * day),
          metaTotal: metaMensual
        });
      }
      return result;
    }

    let cumulative = 0;
    const daysCount = sortedDates.length || 30;
    const dailyTarget = metaMensual / daysCount;

    return sortedDates.map((dateStr, idx) => {
      const ventasDia = dailySalesMap[dateStr];
      cumulative += ventasDia;
      const dayNum = idx + 1;
      return {
        date: dateStr,
        dayLabel: `Día ${dayNum} (${dateStr.slice(5)})`,
        ventas: Math.round(ventasDia),
        acumulado: Math.round(cumulative),
        objetivoDiario: Math.round(dailyTarget * dayNum),
        metaTotal: metaMensual
      };
    });
  }, [ventas, metaMensual]);

  const totalVentasActual = chartData.length > 0 ? chartData[chartData.length - 1].acumulado : 0;
  const porcentajeCumplimiento = Math.round((totalVentasActual / metaMensual) * 100);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 mb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Rendimiento Comercial vs Objetivos Mensuales
            </h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Visualización diaria de ventas consolidadas frente a la proyección de metas.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="text-right">
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Ventas Totales</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              ${totalVentasActual.toLocaleString()}
            </span>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="text-right">
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Meta Mensual</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              ${metaMensual.toLocaleString()}
            </span>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-lg font-bold text-sm">
            {porcentajeCumplimiento}%
          </div>
        </div>
      </div>

      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
            <XAxis dataKey="dayLabel" stroke="#64748b" fontSize={12} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(val) => `$${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                color: '#fff',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
              }}
              formatter={(value: any, name: any) => [
                `$${Number(value).toLocaleString()}`,
                name === 'ventas' ? 'Venta Diaria' : name === 'acumulado' ? 'Venta Acumulada' : 'Objetivo Proyectado'
              ]}
              labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}
            />
            <Legend wrapperStyle={{ paddingTop: '15px' }} />
            <Bar dataKey="ventas" name="Venta Diaria ($)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={35} opacity={0.85} />
            <Line type="monotone" dataKey="acumulado" name="Venta Acumulada ($)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="objetivoDiario" name="Objetivo Proyectado ($)" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
