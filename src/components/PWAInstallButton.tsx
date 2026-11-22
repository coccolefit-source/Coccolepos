import React, { useState } from 'react';
import { Download, Smartphone, WifiOff } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#EBF5FB] hover:bg-[#D6EAF8] border border-[#AED6F1] px-2.5 py-1.5 text-[11px] font-extrabold text-[#1B4F72] transition-colors cursor-pointer shrink-0"
        title="Instalar Coccole POS como aplicación"
      >
        <Download className="w-3.5 h-3.5 text-[#4B9CD3]" />
        <span className="hidden sm:inline">Instalar App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#EBF5FB] hover:bg-[#D6EAF8] border border-[#AED6F1] px-2.5 py-1.5 text-[11px] font-extrabold text-[#1B4F72] transition-colors cursor-pointer shrink-0"
          title="Instalar Coccole POS en iPhone o iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#4B9CD3]" />
          <span className="hidden sm:inline">Instalar App</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-[#FFFDF6] border-2 border-[#4B9CD3] p-6 shadow-2xl text-[#2C3E50] space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-extrabold text-[#2C3E50]">
                Instalar Coccole POS en iPhone / iPad
              </h3>
              <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                <li>
                  Toca el botón <strong>Compartir</strong> en la barra inferior de Safari.
                </li>
                <li>
                  Desliza hacia abajo y selecciona <strong>Agregar a pantalla de inicio</strong>.
                </li>
                <li>
                  Toca <strong>Agregar</strong> para abrir Coccole POS como app nativa.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-[#4B9CD3] hover:bg-[#3A82B4] py-2 text-xs font-extrabold text-white transition-colors cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[85] flex items-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white shadow-lg border border-amber-400">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Sin conexión — revisa tu red antes de cerrar caja</span>
    </div>
  );
};
