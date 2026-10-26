/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Gasto, Usuario, Venta, getResumenPagosVentas } from '../types';
import { DollarSign, Plus, Trash2, Calendar, Filter, X, ShoppingCart, Wallet } from 'lucide-react';
import { formatMoney } from '../utils/metrics';
import { getLocalDateString } from '../lib/supabaseClient';

interface GastosModuleProps {
  gastos: Gasto[];
  ventasRegistradas?: Venta[];
  currentUser: Usuario;
  onSaveGasto: (gasto: Omit<Gasto, 'id'> & { id?: string }) => void;
  onDeleteGasto: (id: string) => void;
}

export type TipoFiltroGastos = 'hoy' | 'ayer' | 'semana' | 'quincena' | 'mes' | 'rango' | 'todos';

export default function GastosModule({ gastos, ventasRegistradas = [], currentUser, onSaveGasto, onDeleteGasto }: GastosModuleProps) {
  const [fecha, setFecha] = useState<string>(getLocalDateString());
  const [descripcion, setDescripcion] = useState<string>('');
  const [categoria, setCategoria] = useState<Gasto['categoria']>('Insumos');
  const [monto, setMonto] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<string>('Efectivo');
  const [formError, setFormError] = useState<string | null>(null);

  // Filtros rápidos y selector de fechas
  const hoyStr = getLocalDateString();
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltroGastos>('hoy');
  const [mostrarFiltroFechas, setMostrarFiltroFechas] = useState<boolean>(false);
  const [fechaInicio, setFechaInicio] = useState<string>(hoyStr);
  const [fechaFin, setFechaFin] = useState<string>(hoyStr);

  // Cálculo de fechas de referencia
  const dYesterday = new Date();
  dYesterday.setDate(dYesterday.getDate() - 1);
  const ayerStr = getLocalDateString(dYesterday);

  const dSemana = new Date();
  dSemana.setDate(dSemana.getDate() - 6);
  const semanaInicioStr = getLocalDateString(dSemana);

  const dQuincena = new Date();
  dQuincena.setDate(dQuincena.getDate() - 14);
  const quincenaInicioStr = getLocalDateString(dQuincena);

  const dMes = new Date();
  dMes.setDate(1);
  const mesInicioStr = getLocalDateString(dMes);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim() || !monto || Number(monto) <= 0) {
      setFormError('Por favor completa la descripción y un monto válido mayor a 0.');
      return;
    }

    setFormError(null);
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

  const gastosFiltrados = gastos.filter(g => {
    if (!g.fecha) return true;
    if (tipoFiltro === 'hoy') {
      return g.fecha === hoyStr;
    }
    if (tipoFiltro === 'ayer') {
      return g.fecha === ayerStr;
    }
    if (tipoFiltro === 'semana') {
      return g.fecha >= semanaInicioStr && g.fecha <= hoyStr;
    }
    if (tipoFiltro === 'quincena') {
      return g.fecha >= quincenaInicioStr && g.fecha <= hoyStr;
    }
    if (tipoFiltro === 'mes') {
      return g.fecha >= mesInicioStr && g.fecha <= hoyStr;
    }
    if (tipoFiltro === 'rango') {
      if (fechaInicio && g.fecha < fechaInicio) return false;
      if (fechaFin && g.fecha > fechaFin) return false;
      return true;
    }
    return true; // 'todos'
  });

  const getTituloFiltro = () => {
    switch (tipoFiltro) {
      case 'hoy': return 'Hoy';
      case 'ayer': return `Ayer (${ayerStr})`;
      case 'semana': return `Esta Semana (${semanaInicioStr} al ${hoyStr})`;
      case 'quincena': return `Quincena (${quincenaInicioStr} al ${hoyStr})`;
      case 'mes': return `Este Mes (${mesInicioStr} al ${hoyStr})`;
      case 'rango': return `Rango (${fechaInicio} al ${fechaFin})`;
      case 'todos': return 'Historial Completo';
      default: return 'Hoy';
    }
  };

  // Cálculos de Ventas del Día y Balance
  const ventasActivas = (ventasRegistradas || []).filter(v => v.estado !== 'Anulada');
  const ventasHoy = ventasActivas.filter(v => !v.fecha || v.fecha === hoyStr);
  const totalVentasHoy = ventasHoy.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

  // Desglose exacto por método de pago de las ventas del día (incluyendo pagos divididos y tarjetas regalo)
  const resumenHoy = getResumenPagosVentas(ventasHoy);
  const ventasHoyEfectivo = resumenHoy.efectivo;
  const ventasHoyTarjeta = resumenHoy.tarjeta;
  const ventasHoyTransf = resumenHoy.transferencia;
  const ventasHoyRappi = resumenHoy.rappi;
  const ventasHoyRegalo = resumenHoy.tarjeta_regalo;

  const metodosVentasHoy = [
    { label: 'Efectivo', total: ventasHoyEfectivo, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: 'Tarjeta', total: ventasHoyTarjeta, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Transferencia', total: ventasHoyTransf, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { label: 'Rappi', total: ventasHoyRappi, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    ...(ventasHoyRegalo > 0 ? [{ label: 'T. Regalo', total: ventasHoyRegalo, color: 'bg-pink-50 text-pink-700 border-pink-200' }] : [])
  ];

  const ventasFiltradas = ventasActivas.filter(v => {
    if (!v.fecha) return true;
    if (tipoFiltro === 'hoy') return v.fecha === hoyStr;
    if (tipoFiltro === 'ayer') return v.fecha === ayerStr;
    if (tipoFiltro === 'semana') return v.fecha >= semanaInicioStr && v.fecha <= hoyStr;
    if (tipoFiltro === 'quincena') return v.fecha >= quincenaInicioStr && v.fecha <= hoyStr;
    if (tipoFiltro === 'mes') return v.fecha >= mesInicioStr && v.fecha <= hoyStr;
    if (tipoFiltro === 'rango') {
      if (fechaInicio && v.fecha < fechaInicio) return false;
      if (fechaFin && v.fecha > fechaFin) return false;
      return true;
    }
    return true;
  });
  const totalVentasFiltradas = ventasFiltradas.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

  const totalGastosFiltrados = gastosFiltrados.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
  const totalHoy = gastos.filter(g => g.fecha === hoyStr).reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
  const balanceHoy = totalVentasHoy - totalHoy;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* Header / Resumen Financiero: Total Ventas del Día, Gastos del Día, Balance y Filtro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: TOTAL DE VENTAS DEL DÍA */}
        <div id="kpi-ventas-del-dia" className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#EBF5FB] text-[#4B9CD3] flex items-center justify-center font-bold text-lg shrink-0">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Ventas del Día</p>
              <p className="text-xl font-black text-[#2C3E50]">{formatMoney(totalVentasHoy)}</p>
              <p className="text-[11px] text-[#4B9CD3] font-semibold truncate">{ventasHoy.length} ventas hoy</p>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5">
            {metodosVentasHoy.map(m => (
              <div
                key={m.label}
                className={`px-2 py-1 rounded-md border text-[10px] flex items-center justify-between gap-1 ${
                  m.total > 0 ? m.color : 'bg-slate-50 text-slate-400 border-slate-100'
                }`}
              >
                <span className="font-bold truncate">{m.label}:</span>
                <span className="font-black whitespace-nowrap">{formatMoney(m.total)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* KPI 2: TOTAL DE GASTOS DEL DÍA */}
        <div id="kpi-gastos-del-dia" className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Gastos del Día</p>
            <p className="text-xl font-black text-red-600">{formatMoney(totalHoy)}</p>
            <p className="text-[11px] text-red-500 font-semibold truncate">{gastos.filter(g => g.fecha === hoyStr).length} gastos hoy</p>
          </div>
        </div>

        {/* KPI 3: BALANCE NETO DEL DÍA */}
        <div id="kpi-balance-del-dia" className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-xs flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${
            balanceHoy >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          }`}>
            <Wallet className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Balance Neto del Día</p>
            <p className={`text-xl font-black ${balanceHoy >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatMoney(balanceHoy)}
            </p>
            <p className="text-[11px] text-slate-500 font-semibold truncate">Ventas - Gastos de hoy</p>
          </div>
        </div>

        {/* KPI 4: TOTAL GASTOS FILTRADOS */}
        <div id="kpi-gastos-filtrados" className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Gastos Filtrados</p>
            <p className="text-xl font-black text-slate-900">{formatMoney(totalGastosFiltrados)}</p>
            <p className="text-[11px] text-amber-700 font-semibold truncate" title={getTituloFiltro()}>
              {getTituloFiltro()} ({gastosFiltrados.length})
            </p>
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
          {formError && (
            <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-700">
              {formError}
            </div>
          )}
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
          <div className="flex flex-col gap-3 pb-3 border-b border-slate-100 mb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="font-extrabold text-sm text-[#2C3E50]">Historial de Gastos Registrados</h3>
                <p className="text-xs text-slate-500">
                  Mostrando: <strong className="text-[#4B9CD3] font-bold">{getTituloFiltro()}</strong>
                </p>
              </div>

              {/* Botón Filtro Fechas y Botones Rápidos */}
              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  id="btn-filtro-fechas"
                  onClick={() => setMostrarFiltroFechas(prev => !prev)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                    mostrarFiltroFechas || tipoFiltro === 'rango'
                      ? 'bg-[#4B9CD3] text-white border-[#4B9CD3] shadow-xs'
                      : 'bg-white text-slate-700 border-[#E2E8F0] hover:bg-[#EBF5FB] hover:text-[#4B9CD3]'
                  }`}
                  title="Seleccionar rango de fechas personalizado"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Fechas</span>
                </button>

                <div className="flex bg-[#EBF5FB] p-0.5 rounded-lg border border-[#AED6F1] flex-wrap gap-0.5">
                  <button
                    type="button"
                    onClick={() => { setTipoFiltro('hoy'); setMostrarFiltroFechas(false); }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      tipoFiltro === 'hoy' ? 'bg-[#4B9CD3] text-white shadow-2xs' : 'text-slate-600 hover:text-[#2C3E50]'
                    }`}
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    id="btn-filtro-ayer"
                    onClick={() => { setTipoFiltro('ayer'); setMostrarFiltroFechas(false); }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      tipoFiltro === 'ayer' ? 'bg-[#4B9CD3] text-white shadow-2xs' : 'text-slate-600 hover:text-[#2C3E50]'
                    }`}
                  >
                    Ayer
                  </button>
                  <button
                    type="button"
                    id="btn-filtro-semana"
                    onClick={() => { setTipoFiltro('semana'); setMostrarFiltroFechas(false); }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      tipoFiltro === 'semana' ? 'bg-[#4B9CD3] text-white shadow-2xs' : 'text-slate-600 hover:text-[#2C3E50]'
                    }`}
                  >
                    Semana
                  </button>
                  <button
                    type="button"
                    id="btn-filtro-quincena"
                    onClick={() => { setTipoFiltro('quincena'); setMostrarFiltroFechas(false); }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      tipoFiltro === 'quincena' ? 'bg-[#4B9CD3] text-white shadow-2xs' : 'text-slate-600 hover:text-[#2C3E50]'
                    }`}
                  >
                    Quincena
                  </button>
                  <button
                    type="button"
                    id="btn-filtro-mes"
                    onClick={() => { setTipoFiltro('mes'); setMostrarFiltroFechas(false); }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      tipoFiltro === 'mes' ? 'bg-[#4B9CD3] text-white shadow-2xs' : 'text-slate-600 hover:text-[#2C3E50]'
                    }`}
                  >
                    Mes
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTipoFiltro('todos'); setMostrarFiltroFechas(false); }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      tipoFiltro === 'todos' ? 'bg-[#4B9CD3] text-white shadow-2xs' : 'text-slate-600 hover:text-[#2C3E50]'
                    }`}
                  >
                    Todos
                  </button>
                </div>
              </div>
            </div>

            {/* Panel Selector de Rango de Fechas Personalizado (Desde / Hasta) */}
            {mostrarFiltroFechas && (
              <div className="bg-[#FFFDF6] border border-[#AED6F1] p-3 rounded-xl flex flex-wrap items-center gap-3 animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                  <Filter className="w-3.5 h-3.5 text-[#4B9CD3]" />
                  <span className="font-extrabold text-[11px] uppercase text-slate-500">Rango personalizado:</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-600">Desde:</label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={e => {
                      setFechaInicio(e.target.value);
                      setTipoFiltro('rango');
                    }}
                    className="text-xs px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg bg-white font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] shadow-3xs cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-600">Hasta:</label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={e => {
                      setFechaFin(e.target.value);
                      setTipoFiltro('rango');
                    }}
                    className="text-xs px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg bg-white font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] shadow-3xs cursor-pointer"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFechaInicio(hoyStr);
                    setFechaFin(hoyStr);
                    setTipoFiltro('hoy');
                    setMostrarFiltroFechas(false);
                  }}
                  className="text-xs text-slate-500 hover:text-red-600 underline font-semibold ml-auto flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  Cerrar y reiniciar a Hoy
                </button>
              </div>
            )}
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
                          onClick={() => onDeleteGasto(g.id)}
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
