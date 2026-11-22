import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import {
  FeedbackToastItem,
  ConfirmDialogOptions,
  subscribeFeedbackToasts,
  subscribeConfirmDialogs,
} from '../utils/feedback';

interface ActiveConfirm {
  id: string;
  options: Required<ConfirmDialogOptions>;
  resolve: (accepted: boolean) => void;
}

export const GlobalFeedbackHost: React.FC = () => {
  const [toasts, setToasts] = useState<FeedbackToastItem[]>([]);
  const [confirmQueue, setConfirmQueue] = useState<ActiveConfirm[]>([]);

  useEffect(() => {
    const unsubToast = subscribeFeedbackToasts((toast) => {
      setToasts((prev) => [...prev.slice(-3), toast]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, toast.durationMs);
    });

    const unsubConfirm = subscribeConfirmDialogs((req) => {
      setConfirmQueue((prev) => [...prev, req]);
    });

    return () => {
      unsubToast();
      unsubConfirm();
    };
  }, []);

  const currentConfirm = confirmQueue[0] || null;

  const handleResolveConfirm = (accepted: boolean) => {
    if (!currentConfirm) return;
    currentConfirm.resolve(accepted);
    setConfirmQueue((prev) => prev.slice(1));
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      {/* Contenedor de Toasts */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed top-4 right-4 z-[90] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
        >
          {toasts.map((t) => {
            const styles =
              t.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : t.type === 'error'
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : t.type === 'warning'
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-[#FFFDF6] border-[#AED6F1] text-[#2C3E50]';

            const Icon =
              t.type === 'success'
                ? CheckCircle2
                : t.type === 'error'
                  ? XCircle
                  : t.type === 'warning'
                    ? AlertTriangle
                    : Info;

            const iconColor =
              t.type === 'success'
                ? 'text-emerald-600'
                : t.type === 'error'
                  ? 'text-rose-600'
                  : t.type === 'warning'
                    ? 'text-amber-600'
                    : 'text-[#4B9CD3]';

            return (
              <div
                key={t.id}
                className={`pointer-events-auto flex items-start gap-2.5 p-3.5 rounded-xl border shadow-lg text-xs font-bold leading-snug animate-in fade-in slide-in-from-top-2 duration-150 ${styles}`}
              >
                <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
                <span className="flex-1 whitespace-pre-line">{t.message}</span>
                <button
                  type="button"
                  onClick={() => dismissToast(t.id)}
                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer shrink-0"
                  aria-label="Cerrar notificación"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmación Reutilizable */}
      {currentConfirm && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => handleResolveConfirm(false)}
        >
          <div
            className="bg-[#FFFDF6] border-2 border-[#4B9CD3] rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 text-[#2C3E50] space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  currentConfirm.options.variant === 'danger'
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-[#EBF5FB] text-[#4B9CD3]'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-sm font-extrabold text-[#2C3E50]">
                  {currentConfirm.options.title}
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-line">
                  {currentConfirm.options.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/70">
              <button
                type="button"
                onClick={() => handleResolveConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                {currentConfirm.options.cancelText}
              </button>
              <button
                type="button"
                onClick={() => handleResolveConfirm(true)}
                className={`px-4 py-2 rounded-xl text-white font-extrabold text-xs transition-colors cursor-pointer shadow-xs ${
                  currentConfirm.options.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#4B9CD3] hover:bg-[#3A82B4]'
                }`}
              >
                {currentConfirm.options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalFeedbackHost;
