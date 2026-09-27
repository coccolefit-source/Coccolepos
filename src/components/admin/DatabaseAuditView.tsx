/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Componente modularizado de Diagnóstico y Auditoría de Base de Datos Supabase
 */

import React from 'react';
import { DatabaseAuditSummary, TableAuditReport, SUPABASE_SQL_SCHEMA } from '../../lib/supabaseClient';
import { RefreshCw } from 'lucide-react';

interface DatabaseAuditViewProps {
  dbAuditReport: DatabaseAuditSummary | null;
  isRunningAudit: boolean;
  onRunHealthCheck: () => void;
  copiedSql: boolean;
  onCopySql: () => void;
}

export const DatabaseAuditView: React.FC<DatabaseAuditViewProps> = React.memo(({
  dbAuditReport,
  isRunningAudit,
  onRunHealthCheck,
  copiedSql,
  onCopySql
}) => {
  return (
    <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-6">
      {/* Cabecera y Botón de Prueba de Salud */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase text-[#4B9CD3] tracking-widest block">
              Control de Salud e Integridad del Backend
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${dbAuditReport?.allOk ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {dbAuditReport?.allOk ? '100% Integra (5/5 Tablas OK)' : 'Revisión Recomendada'}
            </span>
          </div>
          <h3 className="text-base font-extrabold text-[#2C3E50]">
            Auditoría de Base de Datos & Verificación de Tablas Supabase
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Diagnóstico interactivo para validar las 5 tablas principales (<span className="font-mono font-bold">profiles, customers, sales, inventory, time_entries</span>) y su estructura de columnas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onRunHealthCheck}
            disabled={isRunningAudit}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunningAudit ? 'animate-spin' : ''}`} />
            {isRunningAudit ? 'Ejecutando Health Check...' : 'Ejecutar Prueba de Salud'}
          </button>

          <button
            type="button"
            onClick={onCopySql}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            {copiedSql ? '¡Script Copiado!' : 'Copiar Script SQL'}
          </button>
        </div>
      </div>

      {/* RESUMEN DE LA AUDITORÍA DE SALUD */}
      {dbAuditReport && (
        <div className="p-4 bg-[#EBF5FB]/60 border border-[#AED6F1] rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#2C3E50] uppercase tracking-wider">
              Resultado del Diagnóstico en Tiempo Real
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Verificado: {new Date(dbAuditReport.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-xs font-medium text-[#2C3E50]">
            {dbAuditReport.summaryText}
          </p>
        </div>
      )}

      {/* TARJETAS DE LAS 5 TABLAS AUDITADAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dbAuditReport && (Object.entries(dbAuditReport.tables) as [string, TableAuditReport][]).map(([tableName, report]) => {
          const isOk = report.status === 'OK';
          const isWarn = report.status === 'WARNING';
          
          return (
            <div 
              key={tableName} 
              className={`p-4 rounded-xl border space-y-3 bg-white transition-all shadow-2xs ${
                isOk ? 'border-emerald-200 hover:border-emerald-300' : isWarn ? 'border-amber-300 bg-amber-50/10' : 'border-rose-300 bg-rose-50/10'
              }`}
            >
              <div className="flex justify-between items-start border-b border-slate-100 pb-2.5">
                <div>
                  <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider block">
                    Tabla Supabase
                  </span>
                  <h4 className="font-mono font-extrabold text-sm text-[#2C3E50]">
                    {tableName}
                  </h4>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                  isOk ? 'bg-emerald-100 text-emerald-800' : isWarn ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-800'
                }`}>
                  {isOk ? 'ESTRUCTURA OK' : isWarn ? 'ADVERTENCIA' : 'TABLA FALTANTE'}
                </span>
              </div>

              {/* Métrica y Estado */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Registros Almacenados:</span>
                <span className="font-mono font-black text-[#4B9CD3] text-sm">
                  {report.count}
                </span>
              </div>

              {/* Chequeo de Columnas Requeridas */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Verificación de Columnas:
                </span>
                <div className="flex flex-wrap gap-1">
                  {report.columnsChecked.map(col => (
                    <span 
                      key={col.name} 
                      className={`font-mono text-[9px] px-2 py-0.5 rounded-md font-bold ${
                        col.present 
                          ? 'bg-slate-100 text-slate-700' 
                          : 'bg-rose-100 text-rose-700 border border-rose-300'
                      }`}
                    >
                      {col.present ? `✓ ${col.name}` : `✗ ${col.name}`}
                    </span>
                  ))}
                </div>
              </div>

              {/* Mensaje Informativo */}
              <p className="text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-100">
                {report.message}
              </p>
            </div>
          );
        })}
      </div>

      {/* CONSOLE DIAGNOSTIC NOTICE */}
      <div className="p-3 bg-slate-900 text-slate-300 rounded-xl text-xs flex justify-between items-center font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Los logs de auditoría detallados han sido registrados en la consola del navegador (<span className="text-emerald-400 font-bold">console.group</span>).</span>
        </div>
        <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Consola F12</span>
      </div>

      {/* SCRIPT SQL COMPLETO PARA REPARACIÓN / INSTALACIÓN */}
      <div className="pt-2 border-t border-[#E2E8F0] space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-xs font-extrabold text-[#2C3E50] uppercase tracking-wider">
              Script SQL Completo de Tablas y Publicaciones Realtime
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Copia y ejecuta este script en el <span className="font-bold text-[#4B9CD3]">SQL Editor de Supabase</span> para garantizar la creación e integridad de las 5 tablas.
            </p>
          </div>

          <button
            type="button"
            onClick={onCopySql}
            className="px-3 py-1.5 bg-[#EBF5FB] hover:bg-[#D4E6F1] text-[#4B9CD3] font-extrabold text-xs rounded-lg transition-colors cursor-pointer border border-[#AED6F1]"
          >
            {copiedSql ? '¡Script Copiado!' : 'Copiar SQL'}
          </button>
        </div>

        <textarea
          rows={8}
          readOnly
          value={SUPABASE_SQL_SCHEMA}
          className="w-full text-[11px] font-mono p-3 bg-slate-900 text-emerald-400 rounded-xl border border-slate-700 focus:outline-none select-all"
        />
      </div>
    </div>
  );
});

DatabaseAuditView.displayName = 'DatabaseAuditView';
