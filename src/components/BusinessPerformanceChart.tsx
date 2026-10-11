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
  metaMensual = 15000000
}) => {
  // Agrupar ventas diarias de los últimos 30 días o periodo disponible
  const chartData = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    const now = new Date();
    
    // Generar últimos 30 días con 0 por defecto
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap[dateStr] = 0;
    }

    (ventas || []).forEach(v => {
      if (v.estado === 'Anulada' || !v.fecha) return;
      const dateStr = v.fecha.split('T')[0];
      if (dailyMap[dateStr] !== undefined) {
        dailyMap[dateStr] += Number(v.total) || 0;
      }
    });

    const dailyTarget = Math.round(metaMensual / 30);

    return Object.entries(dailyMap).map(([fecha, totalVentas]) => {
      // Formato fecha corto (DD/MM)
      const parts = fecha.split('-');
      const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : fecha;
      return {
        fecha,
        label,
        ventas: totalVentas,
        metaDiaria: dailyTarget,
        cumplimientoPct: dailyTarget > 0 ? Math.round((totalVentas / dailyTarget) * 100) : 0
      };
    });
  }, [ventas, metaMensual]);

  const totalVentasPeriodo = chartData.reduce((acc, curr) => acc + curr.ventas, 0);
  const promedioDiario = Math.round(totalVentasPeriodo / (chartData.length || 1));
  const metaDiariaRef = Math.round(metaMensual / 30);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
              Rendimiento Comercial: Ventas Diarias vs. Objetivo Mensual
            </h3>
            <span className="px-2 py-0.5 bg-blue-50 text-[#4B9CD3] border border-blue-100 rounded-md text-[10px] font-bold">
              Recharts Analytics
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Comparativa de la facturación diaria frente a la meta diaria estimada ({metaDiariaRef.toLocaleString('es-CO')} COP/día).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Periodo</span>
            <span className="text-xs font-black text-slate-900">${totalVentasPeriodo.toLocaleString('es-CO')}</span>
          </div>
          <div className="px-3 py-2 bg-purple-50 border border-purple-100 rounded-xl text-right">
            <span className="text-[10px] text-purple-600 font-bold uppercase block">Meta Mensual</span>
            <span className="text-xs font-black text-purple-700">${metaMensual.toLocaleString('es-CO')}</span>
          </div>
        </div>
      </div>

      <div className="w-full h-72 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#64748b' }}
              stroke="#cbd5e1"
              angle={-25}
              textAnchor="end"
              height={35}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#64748b' }}
              stroke="#cbd5e1"
              tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: any, name: any) => {
                const num = Number(value) || 0;
                const formatted = `$${num.toLocaleString('es-CO')}`;
                if (name === 'ventas') return [formatted, 'Ventas Reales'];
                if (name === 'metaDiaria') return [formatted, 'Meta Diaria'];
                return [value, name];
              }}
              contentStyle={{
                backgroundColor: '#1e293b',
                borderRadius: '12px',
                border: 'none',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 'bold',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
            />
            <Bar
              dataKey="ventas"
              name="Ventas Reales ($)"
              fill="#4B9CD3"
              radius={[6, 6, 0, 0]}
              barSize={16}
            />
            <Line
              type="monotone"
              dataKey="metaDiaria"
              name="Meta Diaria ($)"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-[#4B9CD3] rounded-lg">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold block">Promedio Diario</span>
            <span className="font-black text-slate-800">${promedioDiario.toLocaleString('es-CO')}</span>
          </div>
        </div>
        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-emerald-600 font-bold block">Cumplimiento Promedio</span>
            <span className="font-black text-emerald-800">
              {metaDiariaRef > 0 ? Math.round((promedioDiario / metaDiariaRef) * 100) : 100}% de la meta
            </span>
          </div>
        </div>
        <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center gap-3">
          <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-purple-600 font-bold block">Meta Diaria Referencia</span>
            <span className="font-black text-purple-900">${metaDiariaRef.toLocaleString('es-CO')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
