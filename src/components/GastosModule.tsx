/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Gasto, Usuario } from '../types';
import { DollarSign, Plus, Trash2, Calendar, Tag, CreditCard, User, FileText, CheckCircle2 } from 'lucide-react';
import { formatMoney } from '../utils/metrics';
import { getLocalDateString } from '../lib/supabaseClient';

interface GastosModuleProps {
  gastos: Gasto[];
  currentUser: Usuario;
  onSaveGasto: (gasto: Omit<Gasto, 'id'> & { id?: string }) => void;
  onDeleteGasto: (id: string) => void;
}

export default function GastosModule({ gastos, currentUser, onSaveGasto, onDeleteGasto }: GastosModuleProps) {
  const [fecha, setFecha] = useState<string>(getLocalDateString());
  const [descripcion, setDescripcion] = useState<string>('');
  const [categoria, setCategoria] = useState<Gasto['categoria']>('Insumos');
  const [monto, setMonto] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<string>('Efectivo');
  const [filtroFecha, setFiltroFecha] = useState<'hoy' | 'todos'>('hoy');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim() || !monto || Number(monto) <= 0) {
      alert('Por favor completa la descripción y un monto válido.');
      return;
    }

    onSaveGasto({
      fecha,
      descripcion: descripcion.trim(),
      categoria,
      monto: Number(monto),
      metodo_pago: metodoPago,
      registrado_por: currentUser.nombre || 'Colaborador',
      usuario_id: currentUser.id
    });

    setDescripcion('');
    setMonto('');
  };

  const hoyStr = getLocalDateString();
  const gastosFiltrados = gastos.filter(g => {
    if (filtroFecha === 'hoy') {
      return g.fecha === hoyStr;
    }
    return true;
  });

  const totalGastosFiltrados = gastosFiltrados.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
  const totalHoy = gastos.filter(g => g.fecha === hoyStr).reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* Header / Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gastos de Hoy</p>
            <p className="text-xl font-black text-slate-900">{formatMoney(totalHoy)}</p>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#EBF5FB] text-[#4B9CD3] flex items-center justify-center font-bold text-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Registros (Vista)</p>
            <p className="text-xl font-black text-slate-900">{gastosFiltrados.length} gastos</p>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Filtrado</p>
            <p className="text-xl font-black text-slate-900">{formatMoney(totalGastosFiltrados)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario Registrar Gasto */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <h3 className="font-extrabold text-sm text-[#2C3E50] mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#4B9CD3]" />
            Registrar Gasto del Día
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-white h-9"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Descripción del Gasto</label>
              <input
                type="text"
                placeholder="Ej. Compra de limones y jengibre, servicio de gas..."
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-white h-9"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Categoría</label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value as any)}
                className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-white h-9"
              >
                <option value="Insumos">Insumos y Materia Prima</option>
                <option value="Servicios">Servicios (Luz, Agua, Internet)</option>
                <option value="Mantenimiento">Mantenimiento y Equipos</option>
                <option value="Personal">Personal y Adelantos</option>
                <option value="Otros">Otros Gastos Operativos</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Monto ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-white h-9 font-bold text-red-600"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Método de Pago</label>
              <select
                value={metodoPago}
                onChange={e => setMetodoPago(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-white h-9"
              >
                <option value="Efectivo">Efectivo (Caja)</option>
                <option value="Tarjeta">Tarjeta / POS</option>
                <option value="Transferencia">Transferencia Bancaria</option>
                <option value="Caja Menor">Caja Menor</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-[#4B9CD3] hover:bg-[#3A82B4] text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-colors shadow-xs h-10 cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <Plus className="w-4 h-4" />
              Guardar Gasto en la Nube
            </button>
          </form>
        </div>

        {/* Listado / Tabla de Gastos */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-100 mb-4 gap-2">
            <div>
              <h3 className="font-extrabold text-sm text-[#2C3E50]">Historial de Gastos Registrados</h3>
              <p className="text-xs text-slate-500">Sincronizados en tiempo real para ambos perfiles.</p>
            </div>

            <div className="flex bg-[#EBF5FB] p-0.5 rounded-lg border border-[#AED6F1]">
              <button
                type="button"
                onClick={() => setFiltroFecha('hoy')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  filtroFecha === 'hoy' ? 'bg-[#4B9CD3] text-white shadow-2xs' : 'text-slate-600 hover:text-[#2C3E50]'
                }`}
              >
                Solo Hoy
              </button>
              <button
                type="button"
                onClick={() => setFiltroFecha('todos')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  filtroFecha === 'todos' ? 'bg-[#4B9CD3] text-white shadow-2xs' : 'text-slate-600 hover:text-[#2C3E50]'
                }`}
              >
                Todos
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            {gastosFiltrados.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">
                <DollarSign className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                No hay gastos registrados para este periodo.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FFFDF6] border-b border-[#E2E8F0] text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                    <th className="p-2.5">Fecha</th>
                    <th className="p-2.5">Descripción</th>
                    <th className="p-2.5">Categoría</th>
                    <th className="p-2.5">Monto</th>
                    <th className="p-2.5">Pago</th>
                    <th className="p-2.5">Registrado Por</th>
                    <th className="p-2.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {gastosFiltrados.map(g => (
                    <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 font-bold text-slate-600">{g.fecha}</td>
                      <td className="p-2.5 font-bold text-slate-900">{g.descripcion}</td>
                      <td className="p-2.5">
                        <span className="bg-[#EBF5FB] text-[#4B9CD3] border border-[#AED6F1]/70 px-2 py-0.5 rounded text-[10px] font-black">
                          {g.categoria}
                        </span>
                      </td>
                      <td className="p-2.5 font-black text-red-600">{formatMoney(g.monto)}</td>
                      <td className="p-2.5 text-slate-600 font-semibold">{g.metodo_pago}</td>
                      <td className="p-2.5 text-slate-500">{g.registrado_por}</td>
                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Eliminar el gasto "${g.descripcion}" por ${formatMoney(g.monto)}?`)) {
                              onDeleteGasto(g.id);
                            }
                          }}
                          className="text-red-500 hover:text-red-700 text-xs font-bold p-1 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Eliminar gasto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
