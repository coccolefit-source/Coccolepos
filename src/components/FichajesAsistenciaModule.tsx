/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Usuario, Fichaje, Tarea } from '../types';
import { UserCheck, CheckCircle, FileText } from 'lucide-react';
import { calcularHorasTurno, getLocalDateString } from '../lib/supabaseClient';

interface FichajesAsistenciaModuleProps {
  empleados: Usuario[];
  fichajes: Fichaje[];
  usuarios: Usuario[];
  tareas: Tarea[];
  onDeleteFichaje?: (id: string) => void;
  onPreviewPhoto?: (url: string | null) => void;
}

export default function FichajesAsistenciaModule({
  empleados,
  fichajes,
  usuarios,
  tareas,
  onDeleteFichaje,
  onPreviewPhoto
}: FichajesAsistenciaModuleProps) {
  const getEmpleadoNombre = (id: string) => {
    const u = usuarios.find(usr => usr.id === id);
    return u?.nombre || id;
  };

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-150">
      {/* 1. Asistencia y Fichaje del Turno (Hoy) */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-[#2C3E50] flex items-center gap-1.5">
              <UserCheck className="w-4.5 h-4.5 text-[#4B9CD3]" />
              Asistencia y Fichaje del Turno (Hoy)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Estado de ingreso en tiempo real del personal de turno para el día de hoy.
            </p>
          </div>
          <span className="text-xs bg-[#EBF5FB] text-[#4B9CD3] px-2.5 py-1 rounded-md font-bold self-start sm:self-auto">
            Fecha: {getLocalDateString()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {empleados.map(emp => {
            const fichaje = fichajes.find(f => {
              const fId = f.usuario_id || (f as any).empleado_id;
              const fNom = ((f as any).empleado_nombre || (f as any).usuario_nombre || '').toLowerCase().trim();
              const empNom = emp.nombre.toLowerCase().trim();
              return ((fId && fId === emp.id) || (fNom && fNom === empNom)) && f.fecha === getLocalDateString();
            });
            return (
              <div key={emp.id} className="border border-[#E2E8F0] p-3.5 rounded-xl flex items-center gap-3 bg-[#FFFDF6]/40">
                <img
                  src={emp.foto_avatar}
                  alt={emp.nombre}
                  className="w-10 h-10 rounded-full object-cover border border-[#E2E8F0]"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#2C3E50] text-xs truncate">{emp.nombre}</p>
                  {fichaje ? (
                    (() => {
                      const dur = calcularHorasTurno(fichaje.hora_entrada, fichaje.hora_salida);
                      return (
                        <div className="space-y-1 mt-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              fichaje.puntual ? 'bg-[#EBF5FB] text-[#4B9CD3]' : 'bg-red-100 text-red-800'
                            }`}>
                              {fichaje.puntual ? 'Puntual' : 'Retraso'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">
                              In: {fichaje.hora_entrada || '--:--'} {fichaje.hora_salida ? `| Out: ${fichaje.hora_salida}` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                              fichaje.hora_salida 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                            }`}>
                              {fichaje.hora_salida ? `⏱️ Turno: ${dur.textoCorto}` : `⏱️ En curso: ${dur.textoCorto}`}
                            </span>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1">Sin registrar ingreso hoy</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Registro Completo de Ingresos y Salidas al Administrador */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-[#2C3E50] flex items-center gap-1.5">
              <UserCheck className="w-4.5 h-4.5 text-[#4B9CD3]" />
              Registro de Ingresos y Salidas al Administrador
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Lista histórica y en tiempo real de todas las asistencias, horas de entrada y de salida reportadas por el personal de barra.
            </p>
          </div>
          <span className="text-xs bg-[#EBF5FB] text-[#4B9CD3] px-2.5 py-1 rounded-md font-bold self-start sm:self-auto">
            Total Registros: {fichajes.length}
          </span>
        </div>

        <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FFFDF6] border-b border-[#E2E8F0] text-slate-600 font-bold">
                <th className="p-3">Empleado</th>
                <th className="p-3">Fecha</th>
                <th className="p-3">Hora de Ingreso</th>
                <th className="p-3">Hora de Salida</th>
                <th className="p-3">Horas de Turno</th>
                <th className="p-3">Puntualidad</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]/40">
              {fichajes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                    No hay registros de asistencia en este momento. Los ingresos registrados se mostrarán aquí inmediatamente.
                  </td>
                </tr>
              ) : (
                [...fichajes]
                  .sort((a, b) => {
                    const dDiff = b.fecha.localeCompare(a.fecha);
                    if (dDiff !== 0) return dDiff;
                    return (b.hora_entrada || '').localeCompare(a.hora_entrada || '');
                  })
                  .map(f => {
                    const emp = usuarios.find(u => u.id === f.usuario_id || u.id === (f as any).empleado_id) || {
                      id: f.usuario_id || (f as any).empleado_id || 'emp',
                      nombre: (f as any).empleado_nombre || (f as any).usuario_nombre || 'Empleado',
                      foto_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'
                    };
                    const dur = calcularHorasTurno(f.hora_entrada, f.hora_salida);
                    return (
                      <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 flex items-center gap-2.5">
                          <img
                            src={emp?.foto_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'}
                            alt={emp?.nombre}
                            className="w-7 h-7 rounded-full object-cover border border-[#E2E8F0]"
                            referrerPolicy="no-referrer"
                          />
                          <span className="font-extrabold text-[#2C3E50]">{emp?.nombre || 'Empleado'}</span>
                        </td>
                        <td className="p-3 text-slate-700 font-bold">
                          {(() => {
                            const raw = f.fecha ? String(f.fecha).trim() : '';
                            if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
                              const [yyyy, mm, dd] = raw.split('-');
                              return (
                                <div className="flex items-center gap-1.5">
                                  <span className="bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded text-[11px] border border-slate-200">
                                    {dd}/{mm}/{yyyy}
                                  </span>
                                </div>
                              );
                            }
                            if (raw.includes('T')) {
                              const datePart = raw.split('T')[0];
                              if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
                                const [yyyy, mm, dd] = datePart.split('-');
                                return (
                                  <span className="bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded text-[11px] border border-slate-200">
                                    {dd}/{mm}/{yyyy}
                                  </span>
                                );
                              }
                            }
                            const [yyyy, mm, dd] = getLocalDateString().split('-');
                            return (
                              <span className="bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded text-[11px] border border-slate-200">
                                {dd}/{mm}/{yyyy}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-3">
                          <span className="font-black text-slate-800 bg-sky-50 text-sky-800 px-2.5 py-1 rounded-md border border-sky-200/50">
                            {f.hora_entrada || 'Sin registrar'}
                          </span>
                        </td>
                        <td className="p-3">
                          {f.hora_salida ? (
                            <span className="font-black text-slate-800 bg-red-50 text-red-800 px-2.5 py-1 rounded-md border border-red-200/50">
                              {f.hora_salida}
                            </span>
                          ) : (
                            <span className="text-[10px] text-orange-600 font-extrabold bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/50 animate-pulse">
                              En servicio...
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {f.hora_entrada ? (
                            <div className="flex flex-col">
                              <span className={`font-black text-[11px] px-2 py-0.5 rounded-md inline-block w-fit border ${
                                f.hora_salida 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                  : 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                              }`}>
                                {dur.textoCorto}
                              </span>
                              <span className="text-[9px] text-slate-500 font-semibold mt-0.5">
                                {f.hora_salida ? `Total: ${dur.texto}` : 'En curso'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">--</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            f.puntual ? 'bg-[#EBF5FB] text-[#4B9CD3] border border-[#AED6F1]/50' : 'bg-red-50 text-red-600 border border-red-200/50'
                          }`}>
                            {f.puntual ? 'Puntual' : 'Retraso'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('¿Desea eliminar este registro de asistencia?')) {
                                onDeleteFichaje?.(f.id);
                              }
                            }}
                            className="text-red-500 hover:text-red-700 text-[10px] font-bold underline cursor-pointer font-black"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Mesa de Control y Calidad (Fotos de Evidencia) */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
        <h3 className="text-base font-bold text-[#2C3E50] mb-4 flex items-center gap-1.5">
          <CheckCircle className="w-4.5 h-4.5 text-[#4B9CD3]" />
          Mesa de Control y Calidad (Fotos de Evidencia)
        </h3>

        {tareas.filter(t => t.requiere_foto && t.estado === 'Completada').length === 0 ? (
          <p className="text-center py-10 text-slate-400 text-xs">
            No se han registrado evidencias fotográficas completadas hoy.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {tareas.filter(t => t.requiere_foto && t.estado === 'Completada').map(t => (
              <div key={t.id} className="border border-[#E2E8F0] rounded-xl overflow-hidden flex flex-col justify-between bg-white">
                <div className="relative h-40 bg-[#FFFDF6] flex items-center justify-center overflow-hidden">
                  {t.foto_url ? (
                    <button
                      type="button"
                      onClick={() => onPreviewPhoto?.(t.foto_url || null)}
                      className="w-full h-full cursor-pointer hover:opacity-90 transition-opacity focus:outline-hidden"
                      title="Click para ver en tamaño completo"
                    >
                      <img
                        src={t.foto_url}
                        alt={t.titulo}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-xs flex flex-col items-center">
                      <FileText className="w-8 h-8 text-slate-300 mb-1" />
                      <span>Sin foto cargada (Solo notas registradas)</span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-[#2C3E50]/80 backdrop-blur-xs text-white px-2.5 py-1 text-[9px] font-bold rounded-md">
                    {t.area}
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400">Evidencia de {getEmpleadoNombre(t.asignado_a)}</p>
                    <h4 className="font-extrabold text-[#2C3E50] text-xs mt-1">{t.titulo}</h4>
                    <p className="text-[10px] text-slate-600 italic mt-2 border-l-2 border-[#4B9CD3] pl-2 bg-[#EBF5FB]/30 py-1">
                      "{t.nota_evidencia || 'Sin comentarios adicionales'}"
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-semibold">Completada a las {t.hora_fin || '--:--'}</span>
                    <span className="text-[10px] bg-[#EBF5FB] text-[#4B9CD3] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                      ✓ Aprobado
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
