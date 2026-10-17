import React from 'react';
import {
  Usuario,
  Venta,
  isEfectivo,
  isTarjeta,
  isTransferencia,
  isRappi,
  isTarjetaRegalo
} from '../types';
import { formatMoney } from '../utils/metrics';
import { getLocalDateString } from '../lib/supabaseClient';
import { DollarSign } from 'lucide-react';

interface EmployeeTransactionHistoryProps {
  empleado: Usuario;
  ventasRegistradas: Venta[];
  filtroHistorialVentas: 'todas' | 'mias';
  setFiltroHistorialVentas: (val: 'todas' | 'mias') => void;
  cuadreFechaFiltro?: string;
}

export default function EmployeeTransactionHistory({
  empleado,
  ventasRegistradas,
  filtroHistorialVentas,
  setFiltroHistorialVentas,
  cuadreFechaFiltro
}: EmployeeTransactionHistoryProps) {
  const todayStr = getLocalDateString();
  const selectedDate = cuadreFechaFiltro || todayStr;
  const isToday = selectedDate === todayStr;

  const normalizeDate = (v: any) => {
    let saleFecha = v?.fecha;
    if (saleFecha && saleFecha.includes('T')) {
      saleFecha = saleFecha.split('T')[0];
    } else if (saleFecha && saleFecha.includes(' ')) {
      saleFecha = saleFecha.split(' ')[0];
    }
    if (!saleFecha && v?.created_at) {
      try {
        saleFecha = getLocalDateString(v.created_at);
      } catch (e) {
        saleFecha = String(v.created_at).split('T')[0];
      }
    }
    return saleFecha;
  };

  // Ventas de la fecha seleccionada registradas por todos los colaboradores
  const allTodaySales = (ventasRegistradas || []).filter(v => {
    if (!v) return false;
    return normalizeDate(v) === selectedDate;
  });

  // Ventas de la fecha seleccionada del empleado actual
  const myTodaySales = allTodaySales.filter(v => {
    return (
      !v.usuario_id ||
      v.usuario_id === empleado.id ||
      v.vendedor_id === empleado.id ||
      (v as any).cajero_id === empleado.id ||
      v.vendedor_nombre === empleado.nombre
    );
  });

  const activeList = filtroHistorialVentas === 'todas' ? allTodaySales : myTodaySales;
  const validActiveSales = activeList.filter(v => v.estado !== 'Anulada');
  const totalVentasDiaTodos = allTodaySales
    .filter(v => v.estado !== 'Anulada')
    .reduce((sum, v) => sum + (Number(v.total) || 0), 0);
  const totalVentasMias = myTodaySales
    .filter(v => v.estado !== 'Anulada')
    .reduce((sum, v) => sum + (Number(v.total) || 0), 0);
  const totalMostrado = filtroHistorialVentas === 'todas' ? totalVentasDiaTodos : totalVentasMias;

  // Desglose por método de pago sobre las ventas activas de la vista actual
  const ventasEfectivo = validActiveSales.filter(v => isEfectivo(v.metodo_pago));
  const ventasTarjeta = validActiveSales.filter(
    v => isTarjeta(v.metodo_pago) && !isTarjetaRegalo(v.metodo_pago)
  );
  const ventasTransferencia = validActiveSales.filter(v => isTransferencia(v.metodo_pago));
  const ventasRappi = validActiveSales.filter(v => isRappi(v.metodo_pago));
  const ventasRegalo = validActiveSales.filter(v => isTarjetaRegalo(v.metodo_pago));

  const totalEfectivo = ventasEfectivo.reduce((sum, v) => sum + (Number(v.total) || 0), 0);
  const totalTarjeta = ventasTarjeta.reduce((sum, v) => sum + (Number(v.total) || 0), 0);
  const totalTransferencia = ventasTransferencia.reduce((sum, v) => sum + (Number(v.total) || 0), 0);
  const totalRappi = ventasRappi.reduce((sum, v) => sum + (Number(v.total) || 0), 0);
  const totalRegalo = ventasRegalo.reduce((sum, v) => sum + (Number(v.total) || 0), 0);

  const metodosPagoList = [
    {
      key: 'efectivo',
      label: 'Efectivo',
      total: totalEfectivo,
      count: ventasEfectivo.length,
      dotClass: 'bg-emerald-500',
      activeClass: 'bg-emerald-50/90 border-emerald-200 text-emerald-900',
      amountClass: 'text-emerald-700'
    },
    {
      key: 'tarjeta',
      label: 'Tarjeta (Datáfono)',
      total: totalTarjeta,
      count: ventasTarjeta.length,
      dotClass: 'bg-blue-500',
      activeClass: 'bg-blue-50/90 border-blue-200 text-blue-900',
      amountClass: 'text-blue-700'
    },
    {
      key: 'transferencia',
      label: 'Transferencia',
      total: totalTransferencia,
      count: ventasTransferencia.length,
      dotClass: 'bg-purple-500',
      activeClass: 'bg-purple-50/90 border-purple-200 text-purple-900',
      amountClass: 'text-purple-700'
    },
    {
      key: 'rappi',
      label: 'Rappi',
      total: totalRappi,
      count: ventasRappi.length,
      dotClass: 'bg-amber-500',
      activeClass: 'bg-amber-50/90 border-amber-200 text-amber-900',
      amountClass: 'text-amber-700'
    },
    ...(ventasRegalo.length > 0 || totalRegalo > 0
      ? [
          {
            key: 'regalo',
            label: 'Tarjeta Regalo',
            total: totalRegalo,
            count: ventasRegalo.length,
            dotClass: 'bg-pink-500',
            activeClass: 'bg-pink-50/90 border-pink-200 text-pink-900',
            amountClass: 'text-pink-700'
          }
        ]
      : [])
  ];

  const metodosUsados = metodosPagoList.filter(m => m.count > 0 || m.total > 0);

  const sortedSales = [...activeList].sort((a, b) => {
    const timeA = `${a.fecha || ''} ${a.hora || ''}`;
    const timeB = `${b.fecha || ''} ${b.hora || ''}`;
    return timeB.localeCompare(timeA);
  });

  return (
    <div className="mt-8 pt-6 border-t border-dashed border-[#E2E8F0]">
      <div className="w-full rounded-xl border border-[#E2E8F0] bg-white p-5 mb-6 shadow-xs">
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between pb-3 border-b border-[#F1F5F9] gap-3">
            <div>
              <h4 className="text-xs font-black text-[#2C3E50] uppercase tracking-wider">
                Historial Transaccional {isToday ? `del Día (${todayStr})` : `(${selectedDate})`}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Registro de ventas procesadas durante la jornada seleccionada.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
              {/* Filtro: Todas vs Mías */}
              <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setFiltroHistorialVentas('todas')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    filtroHistorialVentas === 'todas'
                      ? 'bg-white text-[#2C3E50] shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isToday ? 'Todas del Día' : 'Todas'} ({allTodaySales.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroHistorialVentas('mias')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    filtroHistorialVentas === 'mias'
                      ? 'bg-white text-[#2C3E50] shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Mis Ventas ({myTodaySales.length})
                </button>
              </div>
            </div>
          </div>

          {/* BLOQUE TOTAL VENTAS DEL DÍA + DESGLOSE POR MÉTODO DE PAGO */}
          <div className="bg-[#EBF5FB]/70 border border-[#AED6F1] p-3.5 rounded-xl shadow-2xs">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              {/* Total General */}
              <div className="flex items-center gap-3 pr-4 md:border-r md:border-[#AED6F1]/80">
                <div className="w-9 h-9 rounded-lg bg-[#4B9CD3] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    {filtroHistorialVentas === 'todas'
                      ? isToday
                        ? 'Total Ventas del Día'
                        : `Total Ventas (${selectedDate})`
                      : 'Total Mis Ventas'}
                  </span>
                  <span className="text-lg font-black text-[#2C3E50] leading-tight block">
                    {formatMoney(totalMostrado)}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">
                    {validActiveSales.length}{' '}
                    {validActiveSales.length === 1 ? 'venta efectiva' : 'ventas efectivas'}
                    {metodosUsados.length > 0
                      ? ` · ${metodosUsados.length} ${
                          metodosUsados.length === 1 ? 'método usado' : 'métodos usados'
                        }`
                      : ''}
                  </span>
                </div>
              </div>

              {/* Desglose por Método de Pago */}
              <div className="flex-1 w-full">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Métodos de pago utilizados y total por método
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {metodosPagoList.map(m => {
                    const isUsed = m.count > 0 || m.total > 0;
                    return (
                      <div
                        key={m.key}
                        className={`px-3 py-2 rounded-lg border transition-all ${
                          isUsed
                            ? `${m.activeClass} shadow-2xs`
                            : 'bg-white/70 border-slate-200/80 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] font-black uppercase tracking-wider truncate flex items-center gap-1">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isUsed ? m.dotClass : 'bg-slate-300'
                              }`}
                            />
                            {m.label}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                              isUsed ? 'bg-white/80 text-slate-700' : 'text-slate-400'
                            }`}
                          >
                            {m.count}
                          </span>
                        </div>
                        <div
                          className={`text-xs font-black mt-1 ${
                            isUsed ? m.amountClass : 'text-slate-400'
                          }`}
                        >
                          {formatMoney(m.total)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {sortedSales.length === 0 ? (
            <div className="py-8 text-center bg-[#F8FAFC] rounded-lg border border-dashed border-[#CBD5E1]">
              <p className="text-xs font-medium text-slate-400 italic">
                No hay ventas registradas en esta vista para la fecha ({selectedDate}).
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="py-2.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Hora
                    </th>
                    <th className="py-2.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Colaborador
                    </th>
                    <th className="py-2.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Cliente
                    </th>
                    <th className="py-2.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Productos Registrados
                    </th>
                    <th className="py-2.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Medio de Pago
                    </th>
                    <th className="py-2.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">
                      Monto Total
                    </th>
                    <th className="py-2.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 text-center">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {sortedSales.map(v => {
                    const isAnulada = v.estado === 'Anulada';

                    let payLabel = 'Efectivo';
                    let payStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    if (isTarjetaRegalo(v.metodo_pago)) {
                      payLabel = 'Tarjeta Regalo';
                      payStyle = 'bg-pink-50 text-pink-700 border-pink-200';
                    } else if (isTarjeta(v.metodo_pago)) {
                      payLabel = 'Tarjeta';
                      payStyle = 'bg-blue-50 text-blue-700 border-blue-200';
                    } else if (isTransferencia(v.metodo_pago)) {
                      payLabel = 'Transferencia';
                      payStyle = 'bg-purple-50 text-purple-700 border-purple-200';
                    } else if (isRappi(v.metodo_pago)) {
                      payLabel = 'Rappi';
                      payStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                    } else if (isEfectivo(v.metodo_pago)) {
                      payLabel = 'Efectivo';
                      payStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    } else if (v.metodo_pago) {
                      payLabel = v.metodo_pago;
                    }

                    const colaboradorNombre =
                      v.vendedor_nombre || (v as any).cajero_nombre || 'Colaborador';

                    return (
                      <tr key={v.id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                        <td className="py-3 px-3 text-xs font-bold text-[#2C3E50] whitespace-nowrap">
                          {v.hora || '12:00'}
                        </td>
                        <td className="py-3 px-3 text-xs whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {colaboradorNombre}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs">
                          <div className="font-bold text-[#2C3E50]">
                            {v.cliente_nombre || 'Cliente General'}
                          </div>
                          {v.cliente_telefono && (
                            <div className="text-[10px] text-slate-400 font-medium">
                              {v.cliente_telefono}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-xs">
                          {v.productos_vendidos && v.productos_vendidos.length > 0 ? (
                            <div className="space-y-0.5 max-w-xs">
                              {v.productos_vendidos.map((prod, pIdx) => (
                                <div key={pIdx} className="text-xs text-[#2C3E50]">
                                  <span className="font-extrabold text-[#4B9CD3]">
                                    {prod.cantidad}x
                                  </span>{' '}
                                  {prod.nombre}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Sin productos</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-xs whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-md border ${payStyle}`}
                          >
                            {payLabel}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs font-black text-[#2C3E50] text-right whitespace-nowrap">
                          {formatMoney(v.total)}
                        </td>
                        <td className="py-3 px-3 text-xs text-center whitespace-nowrap">
                          {isAnulada ? (
                            <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-red-50 text-red-700 border border-red-200">
                              Anulada por Admin
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Registrada
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
