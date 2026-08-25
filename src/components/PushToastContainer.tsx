import React, { useEffect, useState } from 'react';
import { ToastNotification } from '../types';

export function formatMetodoPagoLabel(method?: string): string {
  if (!method) return 'Efectivo';
  const m = method.toLowerCase();
  if (m.includes('tarjeta') || m.includes('datafono') || m.includes('datáfono')) return 'Tarjeta (Datáfono)';
  if (m.includes('transferencia') || m.includes('nequi') || m.includes('bancolombia')) return 'Transferencia (Nequi/Bancolombia)';
  if (m.includes('rappi')) return 'Rappi';
  if (m.includes('efectivo')) return 'Efectivo';
  return method;
}

interface PushToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

export function PushToastContainer({ toasts, onDismiss }: PushToastContainerProps) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      id="push-notifications-toast-container"
      className="fixed top-4 right-4 sm:top-5 sm:right-5 z-50 flex flex-col gap-3 max-w-sm sm:max-w-md w-full px-3 pointer-events-none"
    >
      {toasts.map(toast => (
        <PushToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function PushToastCard({ toast, onDismiss }: { toast: ToastNotification; onDismiss: (id: string) => void; key?: string }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 250);
  };

  return (
    <div
      className={`transform transition-all duration-300 ease-out pointer-events-auto ${
        isVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95'
      }`}
    >
      {toast.kind === 'sale_ticket' && (
        <div className="bg-[#FFFDF6] border-l-4 border-[#4B9CD3] border-y border-r border-[#E2E8F0] shadow-xl rounded-xl p-4 text-slate-800 relative">
          <div className="flex justify-between items-start border-b border-[#E2E8F0] pb-2 mb-2">
            <div>
              <span className="text-[9px] font-black uppercase text-[#4B9CD3] tracking-wider block">Factura de Venta</span>
              <h4 className="text-xs font-black text-[#2C3E50]">{toast.title || "Venta Registrada con Éxito"}</h4>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 font-bold text-xs px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
              title="Cerrar notificación"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {/* Detalle de Artículos */}
            <div className="bg-white p-2 rounded-lg border border-slate-100">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase block mb-1">Detalle de Artículos</span>
              <ul className="divide-y divide-slate-100">
                {toast.articulos && toast.articulos.length > 0 ? (
                  toast.articulos.map((art, idx) => (
                    <li key={idx} className="flex justify-between items-center py-1 font-semibold text-slate-700 text-[11px]">
                      <span>{art.cantidad} {art.nombre}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500 py-1">1 Producto Registrado</li>
                )}
              </ul>
            </div>

            {/* Cliente Fidelizado (Si existe) */}
            {toast.clienteNombre && (
              <div className="bg-white p-2 rounded-lg border border-slate-100 flex justify-between items-center text-[11px]">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase">Cliente Fidelizado</span>
                <span className="font-bold text-[#2C3E50]">
                  {toast.clienteNombre} {toast.clienteTelefono ? `(${toast.clienteTelefono})` : ''}
                </span>
              </div>
            )}

            {/* Medio de Pago & Total */}
            <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded-lg border border-slate-100">
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Medio de Pago Seleccionado</span>
                <span className="font-bold text-[#2C3E50] text-xs">{formatMetodoPagoLabel(toast.metodoPago)}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Total Facturado</span>
                <span className="font-black text-[#4B9CD3] text-sm">${(toast.total || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Colaborador & Hora */}
            <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-dashed border-slate-200">
              <span>Colaborador: <strong className="text-[#2C3E50]">{toast.colaborador || 'Staff'}</strong></span>
              <span>{toast.horaStr || 'Ahora'}</span>
            </div>
          </div>
        </div>
      )}

      {toast.kind === 'cash_closure' && (
        <div className="bg-[#FFFDF6] border-l-4 border-[#2C3E50] border-y border-r border-[#E2E8F0] shadow-2xl rounded-xl p-4 text-slate-800 relative">
          <div className="flex justify-between items-start border-b border-[#E2E8F0] pb-2 mb-2">
            <div>
              <span className="text-[9px] font-black uppercase text-[#4B9CD3] tracking-widest block">Notificación de Alta Prioridad</span>
              <h4 className="text-xs font-black text-[#2C3E50]">Cierre de Caja Confirmado - {toast.colaborador}</h4>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 font-bold text-xs px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
              title="Cerrar notificación"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {/* Total General Facturado */}
            <div className="bg-[#EBF5FB] border border-[#AED6F1] p-2.5 rounded-lg flex justify-between items-center">
              <span className="text-[10px] font-black text-[#2C3E50] uppercase tracking-wider">Total General Facturado</span>
              <span className="text-base font-black text-[#4B9CD3]">${(toast.totalGeneral || 0).toFixed(2)}</span>
            </div>

            {/* Desglose por Medio de Pago */}
            <div className="bg-white p-2 rounded-lg border border-slate-100 space-y-1">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Desglose por Medio de Pago</span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="bg-slate-50 p-1.5 rounded flex justify-between">
                  <span className="text-slate-500 font-medium">Efectivo:</span>
                  <span className="font-bold text-slate-800">${(toast.desglose?.efectivo || 0).toFixed(2)}</span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded flex justify-between">
                  <span className="text-slate-500 font-medium">Tarjeta:</span>
                  <span className="font-bold text-slate-800">${(toast.desglose?.tarjeta || 0).toFixed(2)}</span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded flex justify-between">
                  <span className="text-slate-500 font-medium">Transferencia:</span>
                  <span className="font-bold text-slate-800">${(toast.desglose?.transferencia || 0).toFixed(2)}</span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded flex justify-between">
                  <span className="text-slate-500 font-medium">Rappi:</span>
                  <span className="font-bold text-slate-800">${(toast.desglose?.rappi || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Estado de Validación */}
            <div className="bg-white p-2 rounded-lg border border-slate-100">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase block mb-0.5">Estado de Validación</span>
              <span className="font-extrabold text-xs text-[#2C3E50] block">{toast.estadoValidacion || 'Efectivo Conciliado'}</span>
            </div>

            <div className="text-[9px] text-slate-400 text-right">
              <span>{toast.horaStr || 'Ahora'}</span>
            </div>
          </div>
        </div>
      )}

      {toast.kind === 'standard' && (
        <div className={`bg-[#FFFDF6] border-l-4 border-y border-r border-[#E2E8F0] shadow-md rounded-xl p-3 text-slate-800 flex items-start gap-2.5 ${
          toast.type === 'alert' ? 'border-l-red-500' : toast.type === 'success' ? 'border-l-[#4B9CD3]' : 'border-l-sky-500'
        }`}>
          <div className="flex-1 min-w-0">
            {toast.title && <h5 className="text-xs font-black text-[#2C3E50]">{toast.title}</h5>}
            <p className="text-xs text-slate-700 font-medium leading-tight">{toast.text}</p>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer">✕</button>
        </div>
      )}
    </div>
  );
}
