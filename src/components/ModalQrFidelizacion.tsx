import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Copy, Check, ExternalLink, X, Smartphone, Sparkles } from 'lucide-react';

interface ModalQrFidelizacionProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalQrFidelizacion({ isOpen, onClose }: ModalQrFidelizacionProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // URL a la que dirigirá el QR
  const registrationUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/registro-cliente`
    : 'https://coccolefit.app/registro-cliente';

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(registrationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Error copying to clipboard:', e);
    }
  };

  const handleOpenLink = () => {
    window.open(registrationUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decoración de fondo suave */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#EBF5FB] rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-amber-50 rounded-full blur-2xl pointer-events-none" />

        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          title="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF5FB] text-[#4B9CD3] text-[11px] font-extrabold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Programa de Fidelización
        </div>

        <h3 className="text-xl font-black text-[#2C3E50] tracking-tight">
          QR de Registro para Clientes
        </h3>
        
        <p className="text-xs text-slate-500 mt-1 max-w-[260px]">
          Muestra este código al cliente en caja para que complete su inscripción en segundos.
        </p>

        {/* Contenedor del Código QR */}
        <div className="my-5 p-4 bg-white rounded-2xl shadow-md border-2 border-slate-100 flex items-center justify-center relative group">
          <QRCodeSVG
            value={registrationUrl}
            size={230}
            level="H"
            includeMargin={true}
            imageSettings={{
              src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234B9CD3'><circle cx='12' cy='12' r='10'/></svg>",
              x: undefined,
              y: undefined,
              height: 28,
              width: 28,
              excavate: true,
            }}
          />
        </div>

        {/* Texto Requerido bajo el QR */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 w-full mb-4 flex items-center gap-2.5 text-left">
          <div className="w-8 h-8 rounded-lg bg-[#EBF5FB] text-[#4B9CD3] flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-[#2C3E50] leading-snug">
            Escanea con la cámara de tu celular para registrarte y empezar a acumular beneficios.
          </p>
        </div>

        {/* Enlace y Acciones Rápidas */}
        <div className="flex items-center gap-2 w-full">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-[#2C3E50] font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">¡Enlace Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Copiar Enlace</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenLink}
            className="py-2.5 px-3 bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            title="Abrir formulario en otra pestaña para prueba"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Abrir</span>
          </button>
        </div>
      </div>
    </div>
  );
}
