import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getSupabaseClient } from '../lib/supabaseClient';
import {
  Star,
  Gift,
  Sparkles,
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  RefreshCw,
  Award,
  Copy,
  Check,
  QrCode,
  Wifi
} from 'lucide-react';

export interface ClienteWalletData {
  id: string;
  nombre?: string;
  full_name?: string;
  telefono?: string;
  phone?: string;
  stickers_count?: number;
  total_visits?: number;
  visitas_acumuladas?: number;
  total_compras_count?: number;
  total_gastado?: number;
  total_compras_monto?: number;
}

interface TarjetaFidelizacionDigitalProps {
  clienteId: string;
  initialData?: ClienteWalletData | null;
  onCambiarCuenta?: () => void;
}

export default function TarjetaFidelizacionDigital({
  clienteId,
  initialData = null,
  onCambiarCuenta
}: TarjetaFidelizacionDigitalProps) {
  const [cliente, setCliente] = useState<ClienteWalletData | null>(() => {
    if (initialData) return initialData;
    try {
      const saved = localStorage.getItem('coccole_cliente_wallet');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.id === clienteId || !clienteId)) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(!cliente);
  const [showSaveGuideModal, setShowSaveGuideModal] = useState(false);
  const [justUpdatedStamp, setJustUpdatedStamp] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Capturar evento PWA beforeinstallprompt si está disponible
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // 1. Consulta inicial del cliente en Supabase
  const fetchClienteData = async () => {
    const supabase = (window as any).supabase || getSupabaseClient();
    if (!supabase || !clienteId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', clienteId)
        .maybeSingle();

      if (!error && data) {
        setCliente(data);
        try {
          localStorage.setItem('coccole_cliente_wallet', JSON.stringify(data));
        } catch (e) {}
      } else {
        // Búsqueda alternativa por teléfono si clienteId fuera un teléfono
        const { data: byPhone } = await supabase
          .from('customers')
          .select('*')
          .or(`phone.eq.${clienteId},telefono.eq.${clienteId}`)
          .limit(1)
          .maybeSingle();

        if (byPhone) {
          setCliente(byPhone);
          try {
            localStorage.setItem('coccole_cliente_wallet', JSON.stringify(byPhone));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('Error cargando tarjeta digital:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClienteData();
  }, [clienteId]);

  // 2. Suscripción en Vivo a Supabase Realtime (tabla customers filtrando por el ID del cliente)
  useEffect(() => {
    const supabase = (window as any).supabase || getSupabaseClient();
    const targetId = cliente?.id || clienteId;
    if (!supabase || !targetId) return;

    const channel = supabase
      .channel('cliente-stickers')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'customers', filter: `id=eq.${targetId}` },
        (payload: any) => {
          if (payload && payload.new) {
            setCliente(payload.new);
            setJustUpdatedStamp(true);
            try {
              localStorage.setItem('coccole_cliente_wallet', JSON.stringify(payload.new));
            } catch (e) {}
            setTimeout(() => setJustUpdatedStamp(false), 4500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clienteId, cliente?.id]);

  const handleSaveToPhone = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        return;
      }
    }
    setShowSaveGuideModal(true);
  };

  const handleCopyCardLink = () => {
    const activeId = cliente?.id || clienteId;
    const cardUrl = `${window.location.origin}/?view=tarjeta&id=${encodeURIComponent(activeId)}#/tarjeta/${encodeURIComponent(activeId)}`;
    try {
      navigator.clipboard.writeText(cardUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch (e) {}
  };

  const displayName = (cliente?.full_name || cliente?.nombre || 'CLIENTE COCCOLE FIT').toUpperCase();
  const displayPhone = cliente?.phone || cliente?.telefono || '';
  const totalVisitasHistoricas = Math.max(
    Number(cliente?.stickers_count ?? 0),
    Number(cliente?.visitas_acumuladas ?? 0),
    Number(cliente?.total_visits ?? 0),
    Number(cliente?.total_compras_count ?? 0),
    1
  );

  // Cálculo de sellos en el ciclo actual de 10 (iniciando en 1 con el sello de bienvenida)
  const sellosActivos = totalVisitasHistoricas <= 0
    ? 1
    : totalVisitasHistoricas % 10 === 0
    ? 10
    : totalVisitasHistoricas % 10;

  const porcentajeProgreso = Math.min(100, Math.round((sellosActivos / 10) * 100));
  const qrIdentificationValue = displayPhone || cliente?.id || clienteId;

  if (isLoading && !cliente) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white antialiased">
        <div className="w-12 h-12 border-4 border-[#4B9CD3] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-300 tracking-wide">Cargando tu Pasaporte de Beneficios...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 antialiased font-sans text-white select-none">
      
      {/* Contenedor Principal Móvil */}
      <div className="w-full max-w-[400px] space-y-4 my-auto">

        {/* Notificación flotante cuando recibe un sello en vivo */}
        {justUpdatedStamp && (
          <div className="bg-emerald-500 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-bounce">
            <Sparkles className="w-5 h-5 shrink-0" />
            <div className="text-xs font-extrabold leading-tight">
              ¡Nuevo sello registrado en vivo! Tu tarjeta se ha actualizado automáticamente.
            </div>
          </div>
        )}

        {/* =========================================================
            TARJETA ESTILO APPLE WALLET (PASAPORTE DE BENEFICIOS)
        ========================================================= */}
        <div className="relative rounded-[28px] bg-linear-to-br from-[#111C2D] via-[#1A2B45] to-[#0D1624] p-5 sm:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border border-white/15 overflow-hidden">
          
          {/* Brillos decorativos tipo tarjeta prémium */}
          <div className="absolute -top-24 -right-24 w-56 h-56 bg-[#4B9CD3]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 -left-24 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
          
          {/* Línea superior brillante */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-[#4B9CD3] via-amber-300 to-emerald-400" />

          {/* 1. ENCABEZADO DE LA TARJETA */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white p-0.5 shadow-md flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src="/logo.jpeg"
                  alt="COCCOLE FIT"
                  className="w-full h-full object-cover rounded-[14px]"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
                <Sparkles className="w-5 h-5 text-[#4B9CD3] hidden" />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-[0.2em] text-[#7FB8E6] uppercase block">
                  COCCOLE FIT
                </span>
                <h1 className="text-sm sm:text-base font-black tracking-wider text-white uppercase leading-tight">
                  PASAPORTE DE BENEFICIOS
                </h1>
              </div>
            </div>

            {/* Indicador Sincronización Realtime */}
            <div className="flex flex-col items-end">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[9px] font-extrabold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                En Vivo
              </span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1">
                Visitas: <strong className="text-white">{totalVisitasHistoricas}</strong>
              </span>
            </div>
          </div>

          {/* Datos del Titular */}
          <div className="py-3.5 flex items-center justify-between border-b border-white/10">
            <div className="min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">
                TITULAR DEL PASAPORTE
              </span>
              <p className="text-base sm:text-lg font-black text-white tracking-wide truncate mt-0.5">
                {displayName}
              </p>
            </div>
            {displayPhone && (
              <div className="text-right shrink-0 pl-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">
                  ID CELULAR
                </span>
                <p className="text-xs font-extrabold text-[#7FB8E6] tracking-wider mt-0.5">
                  {displayPhone}
                </p>
              </div>
            )}
          </div>

          {/* 2. ÁREA DE STICKERS / SELLOS (2 FILAS DE 5 = 10 CASILLAS) */}
          <div className="my-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                Tus Sellos Acumulados
              </span>
              <button
                type="button"
                onClick={fetchClienteData}
                className="text-[10px] font-bold text-[#7FB8E6] hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                title="Actualizar sellos"
              >
                <RefreshCw className="w-3 h-3" />
                Sincronizar
              </button>
            </div>

            {/* Insignia / Banner festivo de Sello de Bienvenida */}
            <div className="mb-3 px-3 py-2 rounded-xl bg-linear-to-r from-amber-400/20 via-emerald-400/15 to-[#4B9CD3]/20 border border-amber-300/35 flex items-center justify-center gap-2 text-center shadow-xs">
              <span className="text-xs sm:text-[13px] font-extrabold text-amber-200 tracking-wide">
                🎁 ¡Primer sello de bienvenida regalado!
              </span>
            </div>

            {/* Cuadrícula 2x5 en contenedor esmerilado */}
            <div className="bg-slate-950/50 border border-white/10 rounded-2xl p-3.5 sm:p-4 shadow-inner">
              <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
                {Array.from({ length: 10 }, (_, idx) => {
                  const numeroCasilla = idx + 1;
                  const isCompleted = numeroCasilla <= sellosActivos;
                  const isRewardSlot = numeroCasilla === 10;

                  return (
                    <div
                      key={numeroCasilla}
                      className="aspect-square flex flex-col items-center justify-center relative"
                    >
                      {isCompleted ? (
                        /* Casilla Completada: Sticker circular brillante con animación */
                        <div
                          className={`w-full h-full rounded-full flex flex-col items-center justify-center shadow-lg transition-all duration-500 scale-100 ${
                            isRewardSlot
                              ? 'bg-linear-to-br from-amber-300 via-amber-500 to-orange-500 text-slate-950 ring-2 ring-amber-200 shadow-amber-500/40 animate-pulse'
                              : 'bg-linear-to-br from-[#4B9CD3] via-sky-400 to-emerald-400 text-white ring-2 ring-white/40 shadow-sky-500/30'
                          }`}
                        >
                          {isRewardSlot ? (
                            <Gift className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5] drop-shadow" />
                          ) : (
                            <Star className="w-5 h-5 sm:w-6 sm:h-6 fill-amber-200 text-white stroke-[2] drop-shadow" />
                          )}
                          <span className="text-[8px] font-black uppercase tracking-tighter mt-0.5 opacity-90">
                            {isRewardSlot ? 'PREMIO' : `#${numeroCasilla}`}
                          </span>
                        </div>
                      ) : (
                        /* Casilla Pendiente: Círculo punteado semitransparente numerado */
                        <div
                          className={`w-full h-full rounded-full border-2 border-dashed flex flex-col items-center justify-center transition-all ${
                            isRewardSlot
                              ? 'border-amber-400/40 bg-amber-400/5 text-amber-300/70'
                              : 'border-white/20 bg-white/5 text-slate-400'
                          }`}
                        >
                          {isRewardSlot ? (
                            <>
                              <Gift className="w-4 h-4 mb-0.5 opacity-75" />
                              <span className="text-[9px] font-black">10</span>
                            </>
                          ) : (
                            <span className="text-xs sm:text-sm font-black opacity-60">
                              {numeroCasilla}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Barra de Progreso Inferior */}
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-200">
                    Llevas <strong className="text-amber-300 font-black">{sellosActivos} de 10</strong> sellos para tu recompensa
                  </span>
                  <span className="text-[11px] font-black text-[#7FB8E6]">
                    {porcentajeProgreso}%
                  </span>
                </div>

                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-[#4B9CD3] via-sky-400 to-emerald-400 transition-all duration-700"
                    style={{ width: `${porcentajeProgreso}%` }}
                  />
                </div>

                {sellosActivos >= 10 && (
                  <div className="mt-2.5 p-2 rounded-xl bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[11px] font-extrabold text-center flex items-center justify-center gap-1.5">
                    <Gift className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>¡Felicidades! Tienes una recompensa lista para redimir en caja.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Separador tipo ticket perforado de Wallet */}
          <div className="relative flex items-center justify-between my-3 -mx-6">
            <div className="w-5 h-5 rounded-full bg-slate-950" />
            <div className="flex-1 border-t-2 border-dashed border-white/15 mx-2" />
            <div className="w-5 h-5 rounded-full bg-slate-950" />
          </div>

          {/* 3. CÓDIGO DE IDENTIFICACIÓN PARA ESCANEO EN CAJA */}
          <div className="bg-white text-[#2C3E50] rounded-2xl p-4 shadow-md flex flex-col items-center text-center">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">
              <QrCode className="w-3.5 h-3.5 text-[#4B9CD3]" />
              Presenta este código en caja
            </div>

            <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-2xs">
              <QRCodeSVG
                value={String(qrIdentificationValue)}
                size={130}
                level="M"
                includeMargin={false}
              />
            </div>

            {/* Representación visual estilo código de barras 1D + ID */}
            <div className="mt-3 w-full max-w-[220px]">
              <div
                className="h-6 w-full opacity-80"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, #1e293b 0px, #1e293b 2px, transparent 2px, transparent 4px, #1e293b 4px, #1e293b 5px, transparent 5px, transparent 8px, #1e293b 8px, #1e293b 11px, transparent 11px, transparent 13px)'
                }}
              />
              <p className="font-mono text-xs font-black tracking-[0.25em] text-slate-700 mt-1">
                {displayPhone || cliente?.id || clienteId}
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================
            BOTÓN "GUARDAR EN MI TELÉFONO" Y ACCIONES
        ========================================================= */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={handleSaveToPhone}
            className="w-full py-3.5 px-5 bg-linear-to-r from-[#4B9CD3] to-[#3A82B4] hover:from-[#3A82B4] hover:to-[#2E6DA4] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-[#4B9CD3]/25 transition-all cursor-pointer flex items-center justify-center gap-2.5 active:scale-98"
          >
            <Smartphone className="w-5 h-5" />
            <span>Guardar en mi Teléfono</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCardLink}
              className="flex-1 py-2.5 px-4 bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-xs rounded-xl border border-white/10 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              {copiedUrl ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">¡Enlace copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Copiar enlace de mi tarjeta</span>
                </>
              )}
            </button>

            {onCambiarCuenta && (
              <button
                type="button"
                onClick={onCambiarCuenta}
                className="py-2.5 px-3.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold text-xs rounded-xl border border-white/10 transition-colors cursor-pointer"
              >
                Cambiar
              </button>
            )}
          </div>
        </div>

        <p className="text-[11px] text-center text-slate-500 pt-1">
          Los sellos se actualizan automáticamente en vivo cuando registras tu compra en caja.
        </p>
      </div>

      {/* =========================================================
          MODAL GUÍA RÁPIDA: "GUARDAR EN MI TELÉFONO" (PWA / HOME SCREEN)
      ========================================================= */}
      {showSaveGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setShowSaveGuideModal(false)}
        >
          <div
            className="bg-slate-900 border border-white/15 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowSaveGuideModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#4B9CD3]/20 border border-[#4B9CD3]/40 flex items-center justify-center text-[#7FB8E6] shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  Guardar Tarjeta en tu Celular
                </h3>
                <p className="text-xs text-slate-400">
                  Accede en 1 toque como una App sin ocupar espacio
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl text-xs text-slate-200 leading-relaxed font-medium">
              Para tener tu tarjeta siempre a mano: Pulsa <strong>Compartir</strong> en Safari/Chrome y selecciona <strong>&apos;Agregar a pantalla de inicio&apos;</strong>.
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-white/5 flex items-start gap-3">
                <Share className="w-4 h-4 text-[#7FB8E6] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">En iPhone (Safari):</strong>
                  <span className="text-slate-300 text-[11px]">
                    Toca el ícono <strong>Compartir</strong> en la barra inferior y elige <strong>&quot;Agregar a inicio&quot;</strong>.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-white/5 flex items-start gap-3">
                <PlusSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">En Android (Chrome):</strong>
                  <span className="text-slate-300 text-[11px]">
                    Toca el menú de <strong>3 puntos (⋮)</strong> arriba a la derecha y selecciona <strong>&quot;Agregar a la pantalla principal&quot;</strong> o <strong>&quot;Instalar aplicación&quot;</strong>.
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSaveGuideModal(false)}
              className="w-full py-3 bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
            >
              ¡Entendido!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
