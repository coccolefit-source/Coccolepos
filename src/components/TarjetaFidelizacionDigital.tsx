import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getSupabaseClient } from '../lib/supabaseClient';
import {
  Gift,
  Sparkles,
  Smartphone,
  Share,
  PlusSquare,
  X,
  RefreshCw,
  Award,
  Copy,
  Check,
  QrCode
} from 'lucide-react';

export interface ClienteWalletData {
  id: string;
  nombre?: string;
  full_name?: string;
  telefono?: string;
  phone?: string;
  stickers_count?: number;
  rewards_redeemed?: number;
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

const CONFETTI_PIECES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${(i * 37) % 96 + 2}%`,
  delay: `${(i % 7) * 0.22}s`,
  duration: `${2.4 + (i % 5) * 0.45}s`,
  emoji: i % 4 === 0 ? '🍓' : i % 4 === 1 ? '🥤' : i % 4 === 2 ? '🎉' : '✨'
}));

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
  const rewardsRedeemed = Number(cliente?.rewards_redeemed ?? 0);

  // Priorizar stickers_count para respetar el reinicio a 1 tras redimir premio
  const hasExplicitStickers =
    cliente?.stickers_count !== undefined &&
    cliente?.stickers_count !== null &&
    Number(cliente.stickers_count) > 0;

  const rawStickersCount = hasExplicitStickers
    ? Number(cliente?.stickers_count)
    : Math.max(
        Number(cliente?.visitas_acumuladas ?? 0),
        Number(cliente?.total_visits ?? 0),
        Number(cliente?.total_compras_count ?? 0),
        1
      );

  // Cálculo de sellos activos en el ciclo actual (1 a 10)
  const sellosActivos = rawStickersCount <= 0
    ? 1
    : rawStickersCount >= 10 && rawStickersCount % 10 === 0
    ? 10
    : rawStickersCount > 10
    ? rawStickersCount % 10
    : rawStickersCount;

  const isGoalCompleted = sellosActivos >= 10;
  const porcentajeProgreso = Math.min(100, Math.round((sellosActivos / 10) * 100));
  const qrIdentificationValue = displayPhone || cliente?.id || clienteId;

  if (isLoading && !cliente) {
    return (
      <div className="min-h-screen bg-[#F0F9FF] flex flex-col items-center justify-center p-6 text-[#0c4a6e] antialiased">
        <div className="w-12 h-12 border-4 border-[#0284c7] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-extrabold text-[#0369a1] tracking-wide">
          Cargando tu Pasaporte de Beneficios...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-[#E0F2FE] via-[#F0F9FF] to-[#FFFDF6] flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 antialiased font-sans text-[#0c4a6e] select-none relative overflow-x-hidden">
      {/* Animación de felicitaciones (Confeti) cuando alcanza 10/10 sellos */}
      {isGoalCompleted && (
        <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
          {CONFETTI_PIECES.map((piece) => (
            <span
              key={piece.id}
              className="absolute -top-8 text-lg sm:text-xl animate-bounce opacity-90"
              style={{
                left: piece.left,
                animationDelay: piece.delay,
                animationDuration: piece.duration,
                top: `${(piece.id * 19) % 85}%`
              }}
            >
              {piece.emoji}
            </span>
          ))}
        </div>
      )}

      {/* Contenedor Principal Móvil */}
      <div className="w-full max-w-[410px] space-y-4 my-auto relative z-10">

        {/* Notificación flotante cuando recibe un sello en vivo */}
        {justUpdatedStamp && (
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-lg border border-emerald-300 flex items-center gap-3 animate-bounce">
            <Sparkles className="w-5 h-5 shrink-0" />
            <div className="text-xs font-extrabold leading-tight">
              ¡Tu Pasaporte de Beneficios se ha actualizado en vivo!
            </div>
          </div>
        )}

        {/* =========================================================
            TARJETA DE FIDELIZACIÓN — PALETA COCCOLE POS (#0284c7 a #38bdf8)
        ========================================================= */}
        <div className="relative rounded-3xl bg-linear-to-br from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] p-5 sm:p-6 shadow-xl border-2 border-white/80 text-white overflow-hidden">
          
          {/* Acentos luminosos suaves blancos/crema */}
          <div className="absolute -top-24 -right-20 w-56 h-56 bg-[#FFFDF6]/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute top-1/2 -left-24 w-48 h-48 bg-white/15 rounded-full blur-2xl pointer-events-none" />

          {/* 1. ENCABEZADO DE LA TARJETA */}
          <div className="flex items-start justify-between gap-2.5 pb-4 border-b border-white/25">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#FFFDF6] p-0.5 shadow-md border border-white flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src="/logo.jpeg"
                  alt="Coccole POS"
                  className="w-full h-full object-cover rounded-[14px]"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
                <Sparkles className="w-5 h-5 text-[#0284c7] hidden" />
              </div>
              <div>
                <span className="inline-block px-2 py-0.5 rounded-md bg-[#FFFDF6]/20 border border-white/50 text-[#FFFDF6] text-[9px] font-black tracking-widest uppercase mb-0.5">
                  FIDELIZACIÓN OFICIAL
                </span>
                <h1 className="text-xs sm:text-sm font-black tracking-wide text-white leading-tight drop-shadow-2xs">
                  Coccole POS - Pasaporte de Beneficios
                </h1>
              </div>
            </div>

            {/* Badges con bordes nítidos */}
            <div className="flex flex-col items-end shrink-0 gap-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFFDF6] border border-white text-[#0284c7] text-[9px] font-black uppercase tracking-wider shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                En Vivo
              </span>
              {rewardsRedeemed > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-300 text-slate-900 border border-white text-[9px] font-black uppercase">
                  🏆 {rewardsRedeemed} {rewardsRedeemed === 1 ? 'Premio' : 'Premios'}
                </span>
              )}
            </div>
          </div>

          {/* Datos del Titular en recuadro crema/blanco contrastante */}
          <div className="my-3.5 p-3 rounded-2xl bg-[#FFFDF6] text-[#0c4a6e] border border-white shadow-sm flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#0284c7] block">
                CLIENTE TITULAR
              </span>
              <p className="text-sm sm:text-base font-black text-[#0c4a6e] tracking-wide truncate mt-0.5">
                {displayName}
              </p>
            </div>
            {displayPhone && (
              <div className="text-right shrink-0 pl-2 border-l border-sky-100">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">
                  CELULAR
                </span>
                <p className="text-xs font-black text-[#0284c7] tracking-wider mt-0.5">
                  {displayPhone}
                </p>
              </div>
            )}
          </div>

          {/* 2. ÁREA DE SELLOS INTERCALADOS (FRESAS 🍓 Y BATIDOS 🥤) */}
          <div className="my-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#FFFDF6] flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-200" />
                Tus Sellos (🍓 Fresa / 🥤 Batido)
              </span>
              <button
                type="button"
                onClick={fetchClienteData}
                className="text-[10px] font-extrabold text-[#0284c7] bg-[#FFFDF6] hover:bg-white px-2.5 py-1 rounded-full border border-white flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                title="Actualizar sellos"
              >
                <RefreshCw className="w-3 h-3" />
                Sincronizar
              </button>
            </div>

            {/* Banner de Meta Completada (10/10) o Sello de Bienvenida */}
            {isGoalCompleted ? (
              <div className="mb-3 px-3.5 py-2.5 rounded-2xl bg-[#FFFDF6] border-2 border-amber-300 text-[#0c4a6e] flex items-center justify-center gap-2 text-center shadow-md animate-bounce">
                <Gift className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="text-xs sm:text-[13px] font-black text-[#0c4a6e]">
                  🎉 ¡Completaste tus 10 sellos! Reclama tu premio en caja
                </span>
              </div>
            ) : (
              <div className="mb-3 px-3 py-1.5 rounded-xl bg-white/20 border border-white/50 flex items-center justify-center gap-1.5 text-center backdrop-blur-2xs">
                <span className="text-xs font-extrabold text-[#FFFDF6] tracking-wide">
                  🎁 ¡Primer sello de bienvenida regalado!
                </span>
              </div>
            )}

            {/* Cuadrícula de 10 casillas (2 filas de 5) */}
            <div className="bg-[#0369a1]/45 border-2 border-white/35 rounded-2xl p-3.5 sm:p-4 shadow-inner backdrop-blur-2xs">
              <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
                {Array.from({ length: 10 }, (_, idx) => {
                  const numeroCasilla = idx + 1;
                  const isCompleted = numeroCasilla <= sellosActivos;
                  // Casillas 1, 3, 5, 7, 9 -> Fresa (🍓) | Casillas 2, 4, 6, 8, 10 -> Batido de Proteína (🥤)
                  const isStrawberrySlot = numeroCasilla % 2 !== 0;
                  const stampEmoji = isStrawberrySlot ? '🍓' : '🥤';

                  return (
                    <div
                      key={numeroCasilla}
                      className="aspect-square flex flex-col items-center justify-center relative"
                    >
                      {isCompleted ? (
                        /* Sello Activo (Obtenido): Círculo blanco brillante, borde destacado, animación sutil y emoji grande */
                        <div
                          className={`w-full h-full rounded-full bg-linear-to-b from-white to-[#FFFDF6] border-2 border-white ring-2 ${
                            numeroCasilla === 10
                              ? 'ring-amber-300 shadow-lg shadow-amber-300/40 animate-bounce'
                              : 'ring-sky-200/90 shadow-md'
                          } flex flex-col items-center justify-center transition-all duration-300 scale-100 hover:scale-105`}
                        >
                          <span
                            className="text-xl sm:text-2xl leading-none select-none drop-shadow-2xs animate-[bounce_1.8s_infinite]"
                            style={{ animationIterationCount: numeroCasilla === sellosActivos ? 'infinite' : 1 }}
                          >
                            {stampEmoji}
                          </span>
                          <span className="text-[8px] font-black text-[#0284c7] uppercase tracking-tighter mt-0.5">
                            {numeroCasilla === 10 ? 'PREMIO' : `#${numeroCasilla}`}
                          </span>
                        </div>
                      ) : (
                        /* Sello Pendiente: Círculo translúcido con borde punteado suave y número tenue */
                        <div className="w-full h-full rounded-full border-2 border-dashed border-white/45 bg-white/10 flex flex-col items-center justify-center transition-all">
                          <span className="text-xs sm:text-sm font-black text-white/75">
                            {numeroCasilla}
                          </span>
                          <span className="text-[9px] opacity-40 leading-none mt-0.5">
                            {stampEmoji}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Barra de Progreso Inferior */}
              <div className="mt-4 pt-3 border-t border-white/25">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-extrabold text-[#FFFDF6]">
                    Llevas <strong className="text-amber-200 font-black">{sellosActivos} de 10</strong> sellos para tu recompensa
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 border border-white/40 text-[10px] font-black text-white">
                    {porcentajeProgreso}%
                  </span>
                </div>

                <div className="w-full h-3 bg-[#0c4a6e]/50 rounded-full overflow-hidden p-0.5 border border-white/30">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-[#FFFDF6] via-amber-200 to-emerald-300 transition-all duration-700"
                    style={{ width: `${porcentajeProgreso}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Separador tipo ticket perforado */}
          <div className="relative flex items-center justify-between my-3 -mx-6">
            <div className="w-5 h-5 rounded-full bg-[#F0F9FF]" />
            <div className="flex-1 border-t-2 border-dashed border-white/40 mx-2" />
            <div className="w-5 h-5 rounded-full bg-[#F0F9FF]" />
          </div>

          {/* 3. CÓDIGO QR / BARRAS INFERIOR EN RECUADRO BLANCO LIMPIO */}
          <div className="bg-white text-[#0c4a6e] rounded-2xl p-4 shadow-md border border-sky-100 flex flex-col items-center text-center">
            <div className="flex items-center gap-1.5 text-[10px] font-black text-[#0284c7] uppercase tracking-widest mb-2">
              <QrCode className="w-3.5 h-3.5 text-[#0284c7]" />
              Presenta este código en caja
            </div>

            <div className="p-2.5 bg-white rounded-2xl border border-slate-100 shadow-xs">
              <QRCodeSVG
                value={String(qrIdentificationValue)}
                size={130}
                level="M"
                includeMargin={false}
              />
            </div>

            {/* Código de barras 1D + ID */}
            <div className="mt-3 w-full max-w-[220px]">
              <div
                className="h-6 w-full opacity-85"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, #0c4a6e 0px, #0c4a6e 2px, transparent 2px, transparent 4px, #0c4a6e 4px, #0c4a6e 5px, transparent 5px, transparent 8px, #0c4a6e 8px, #0c4a6e 11px, transparent 11px, transparent 13px)'
                }}
              />
              <p className="font-mono text-xs font-black tracking-[0.25em] text-[#0c4a6e] mt-1">
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
            className="w-full py-3.5 px-5 bg-linear-to-r from-[#0284c7] to-[#0369a1] hover:from-[#0369a1] hover:to-[#075985] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-[#0284c7]/25 transition-all cursor-pointer flex items-center justify-center gap-2.5 active:scale-98"
          >
            <Smartphone className="w-5 h-5" />
            <span>Guardar en mi Teléfono</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCardLink}
              className="flex-1 py-2.5 px-4 bg-white hover:bg-sky-50 text-[#0c4a6e] font-extrabold text-xs rounded-xl border border-sky-200 shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              {copiedUrl ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">¡Enlace copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#0284c7]" />
                  <span>Copiar enlace de mi tarjeta</span>
                </>
              )}
            </button>

            {onCambiarCuenta && (
              <button
                type="button"
                onClick={onCambiarCuenta}
                className="py-2.5 px-3.5 bg-white hover:bg-sky-50 text-slate-600 hover:text-[#0c4a6e] font-bold text-xs rounded-xl border border-sky-200 shadow-2xs transition-colors cursor-pointer"
              >
                Cambiar
              </button>
            )}
          </div>
        </div>

        <p className="text-[11px] text-center text-slate-500 font-medium pt-1">
          Los sellos se actualizan automáticamente en vivo cuando registras tu compra en caja.
        </p>
      </div>

      {/* =========================================================
           MODAL GUÍA RÁPIDA: "GUARDAR EN MI TELÉFONO" (PWA / HOME SCREEN)
      ========================================================= */}
      {showSaveGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setShowSaveGuideModal(false)}
        >
          <div
            className="bg-[#FFFDF6] border-2 border-[#0284c7] rounded-3xl max-w-md w-full p-6 text-[#0c4a6e] shadow-2xl space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowSaveGuideModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#E0F2FE] border border-[#7DD3FC] flex items-center justify-center text-[#0284c7] shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#0c4a6e]">
                  Guardar Tarjeta en tu Celular
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Accede en 1 toque como una App sin ocupar espacio
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-[#E0F2FE]/60 border border-[#BAE6FD] rounded-2xl text-xs text-[#0c4a6e] leading-relaxed font-medium">
              Para tener tu tarjeta siempre a mano: Pulsa <strong>Compartir</strong> en Safari/Chrome y selecciona <strong>&apos;Agregar a pantalla de inicio&apos;</strong>.
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-start gap-3">
                <Share className="w-4 h-4 text-[#0284c7] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#0c4a6e] block">En iPhone (Safari):</strong>
                  <span className="text-slate-600 text-[11px]">
                    Toca el ícono <strong>Compartir</strong> en la barra inferior y elige <strong>&quot;Agregar a inicio&quot;</strong>.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-start gap-3">
                <PlusSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#0c4a6e] block">En Android (Chrome):</strong>
                  <span className="text-slate-600 text-[11px]">
                    Toca el menú de <strong>3 puntos (⋮)</strong> arriba a la derecha y selecciona <strong>&quot;Agregar a la pantalla principal&quot;</strong> o <strong>&quot;Instalar aplicación&quot;</strong>.
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSaveGuideModal(false)}
              className="w-full py-3 bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
            >
              ¡Entendido!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
