import React, { useState } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import TarjetaFidelizacionDigital, { ClienteWalletData } from './TarjetaFidelizacionDigital';
import {
  Sparkles,
  ShieldCheck,
  Smartphone,
  User,
  ArrowRight,
  X,
  FileText,
  AlertCircle,
  CreditCard
} from 'lucide-react';

export default function RegistroClientePublico() {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [habeasDataAccepted, setHabeasDataAccepted] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado para redirigir/mostrar la tarjeta digital inmediatamente tras el registro
  const [activeWalletClient, setActiveWalletClient] = useState<ClienteWalletData | null>(() => {
    try {
      const saved = localStorage.getItem('coccole_cliente_wallet');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return null;
  });

  // Formateador y validador de teléfono (10 dígitos colombianos)
  const cleanPhoneDigits = telefono.replace(/\D/g, '').slice(0, 10);
  const isPhoneValid = cleanPhoneDigits.length === 10;
  const isNameValid = nombre.trim().length >= 3;
  const isFormValid = isNameValid && isPhoneValid && habeasDataAccepted;

  const redirectToWalletCard = (clientData: ClienteWalletData) => {
    try {
      localStorage.setItem('coccole_cliente_wallet', JSON.stringify(clientData));
      const newUrl = `/tarjeta/${encodeURIComponent(clientData.id)}`;
      window.history.pushState({ clienteId: clientData.id }, '', newUrl);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (e) {}
    setActiveWalletClient(clientData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isNameValid) {
      setErrorMessage('Por favor ingresa tu nombre y apellido completo.');
      return;
    }

    if (!isPhoneValid) {
      setErrorMessage('El número de celular debe tener exactamente 10 dígitos (ej. 3001234567).');
      return;
    }

    if (!habeasDataAccepted) {
      setErrorMessage('Debes autorizar el tratamiento de datos personales para continuar.');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = (window as any).supabase || getSupabaseClient();
      if (!supabase) {
        setErrorMessage('No hay conexión con el servidor en este momento. Intenta de nuevo.');
        setIsLoading(false);
        return;
      }

      const cleanPhone = cleanPhoneDigits;
      const cleanName = nombre.trim();

      // 1. Validar si el teléfono ya existe en la tabla customers
      const { data: existingClients, error: searchError } = await supabase
        .from('customers')
        .select('*')
        .or(`phone.eq.${cleanPhone},telefono.eq.${cleanPhone}`)
        .limit(1);

      if (searchError) {
        console.warn('Error verificando cliente existente:', searchError.message);
      }

      if (existingClients && existingClients.length > 0) {
        const clientFound = existingClients[0];
        const currentStickers = Math.max(
          Number(clientFound.stickers_count ?? 0),
          Number(clientFound.visitas_acumuladas ?? 0),
          Number(clientFound.total_visits ?? 0),
          1
        );
        const normalizedClient = {
          ...clientFound,
          stickers_count: currentStickers,
          visitas_acumuladas: currentStickers,
          total_visits: currentStickers
        };
        setIsLoading(false);
        // Redirigir de inmediato a su tarjeta digital existente
        redirectToWalletCard(normalizedClient);
        return;
      }

      // 2. Insertar nuevo cliente con Sello de Bienvenida (stickers_count: 1)
      const timestampId = `cli-${Date.now()}`;
      const payload: any = {
        id: timestampId,
        phone: cleanPhone,
        telefono: cleanPhone,
        full_name: cleanName,
        nombre: cleanName,
        stickers_count: 1,
        total_visits: 1,
        visitas_acumuladas: 1,
        total_gastado: 0,
        habeas_data_accepted: true,
        accepted_at: new Date().toISOString(),
        terms_version: 'v1.0-Ley1581'
      };

      const { error: insertError } = await supabase
        .from('customers')
        .insert([payload]);

      if (insertError) {
        console.error('Error insertando cliente en Supabase:', insertError);

        // Si la tabla no tiene alguna columna extendida (ej. habeas_data o stickers_count), hacer fallback progresivo
        if (insertError.message?.includes('habeas_data') || insertError.message?.includes('column') || insertError.code === '42703') {
          const fallbackWithStickers = {
            id: timestampId,
            phone: cleanPhone,
            telefono: cleanPhone,
            full_name: cleanName,
            nombre: cleanName,
            stickers_count: 1,
            total_visits: 1,
            visitas_acumuladas: 1,
            total_gastado: 0
          };
          const { error: fallbackErr1 } = await supabase.from('customers').insert([fallbackWithStickers]);
          if (fallbackErr1) {
            // Segundo fallback si la columna stickers_count aún no fue agregada en Supabase
            const minimalPayload = {
              id: timestampId,
              phone: cleanPhone,
              telefono: cleanPhone,
              full_name: cleanName,
              nombre: cleanName,
              total_visits: 1,
              visitas_acumuladas: 1,
              total_gastado: 0
            };
            const { error: fallbackErr2 } = await supabase.from('customers').insert([minimalPayload]);
            if (fallbackErr2) {
              setErrorMessage('No pudimos completar tu registro: ' + fallbackErr2.message);
              setIsLoading(false);
              return;
            }
          }
        } else if (insertError.code === '23505') {
          // Teléfono ya registrado: buscar el registro existente y redirigir a su tarjeta
          const { data: retryExisting } = await supabase
            .from('customers')
            .select('*')
            .or(`phone.eq.${cleanPhone},telefono.eq.${cleanPhone}`)
            .limit(1)
            .maybeSingle();

          setIsLoading(false);
          const mergedExisting = retryExisting
            ? {
                ...retryExisting,
                stickers_count: Math.max(
                  Number(retryExisting.stickers_count ?? 0),
                  Number(retryExisting.visitas_acumuladas ?? 0),
                  Number(retryExisting.total_visits ?? 0),
                  1
                )
              }
            : payload;
          redirectToWalletCard(mergedExisting);
          return;
        } else {
          setErrorMessage('Error al registrar: ' + insertError.message);
          setIsLoading(false);
          return;
        }
      }

      // 3. Redirigir de inmediato a la Tarjeta Digital del cliente (/tarjeta/:id)
      redirectToWalletCard(payload);
    } catch (err: any) {
      console.error('Excepción en registro de cliente:', err);
      setErrorMessage(err.message || 'Error inesperado de conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  // Si ya hay una sesión activa o recién se registró, mostrar la Tarjeta Digital
  if (activeWalletClient) {
    return (
      <TarjetaFidelizacionDigital
        clienteId={activeWalletClient.id}
        initialData={activeWalletClient}
        onCambiarCuenta={() => {
          try {
            localStorage.removeItem('coccole_cliente_wallet');
            window.history.pushState({}, '', '/registro-cliente');
          } catch (e) {}
          setActiveWalletClient(null);
          setNombre('');
          setTelefono('');
          setHabeasDataAccepted(false);
        }}
      />
    );
  }

  // -------------------------------------------------------------
  // VISTA PRINCIPAL: FORMULARIO RESPONSIVE MOBILE FIRST
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-linear-to-b from-[#EBF5FB] via-slate-50 to-white flex flex-col items-center justify-center p-4 sm:p-6 antialiased font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8 relative overflow-hidden">
        {/* Barra superior con gradiente de marca */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-linear-to-r from-[#4B9CD3] via-sky-400 to-[#2C3E50]" />

        {/* Encabezado */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF5FB] text-[#4B9CD3] text-[11px] font-extrabold uppercase tracking-wider mb-2.5">
            <Sparkles className="w-3.5 h-3.5" />
            COCCOLE FIT
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#2C3E50] tracking-tight">
            Programa de Fidelización
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 font-medium leading-relaxed">
            Regístrate en segundos y acumula beneficios en cada visita.
          </p>
        </div>

        {/* Mensaje de Error */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo: Nombre y Apellido */}
          <div>
            <label className="block text-xs font-bold text-[#2C3E50] mb-1.5">
              Nombre y Apellido <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Carolina Rodríguez"
                className="w-full pl-10 pr-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-[#2C3E50] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4B9CD3] transition-all"
              />
            </div>
          </div>

          {/* Campo: Número de Celular (10 dígitos) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#2C3E50]">
                Número de Celular <span className="text-red-500">*</span>
              </label>
              <span className={`text-[10px] font-bold ${cleanPhoneDigits.length === 10 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {cleanPhoneDigits.length}/10 dígitos
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Smartphone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                required
                inputMode="numeric"
                value={cleanPhoneDigits}
                onChange={(e) => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Ej. 3001234567"
                className={`w-full pl-10 pr-3.5 py-3 text-sm bg-slate-50 border rounded-xl font-bold tracking-wider text-[#2C3E50] focus:bg-white focus:outline-none transition-all ${
                  cleanPhoneDigits.length > 0 && cleanPhoneDigits.length < 10
                    ? 'border-amber-400 focus:ring-2 focus:ring-amber-300'
                    : cleanPhoneDigits.length === 10
                    ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-300'
                    : 'border-slate-200 focus:ring-2 focus:ring-[#4B9CD3]'
                }`}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Ingresa los 10 números de tu celular sin espacios ni guiones.
            </p>
          </div>

          {/* Bloque Legal Obligatorio (Ley 1581 de 2012 de Colombia) */}
          <div className="pt-2 pb-1">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={habeasDataAccepted}
                  onChange={(e) => setHabeasDataAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-md border-slate-300 text-[#4B9CD3] focus:ring-[#4B9CD3] cursor-pointer shrink-0"
                />
                <span className="text-xs text-slate-600 leading-snug font-medium">
                  Autorizo el tratamiento de mis datos personales conforme a la <strong>Ley 1581 de 2012</strong> y acepto los Términos y Condiciones del Programa.
                </span>
              </label>

              <div className="pl-6.5">
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(true)}
                  className="text-[11px] font-bold text-[#4B9CD3] hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Ver política de datos
                </button>
              </div>
            </div>
          </div>

          {/* Botón Principal: Unirme al Programa */}
          <button
            type="submit"
            disabled={isLoading || !isFormValid}
            className="w-full py-3.5 px-6 bg-[#4B9CD3] hover:bg-[#3A82B4] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span>Activando tu Tarjeta Digital...</span>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Unirme y Abrir mi Tarjeta Digital</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-[10px] text-center text-slate-400 mt-5">
          Tus datos están protegidos y solo se usan para tus beneficios en caja.
        </p>
      </div>

      {/* MODAL DE POLÍTICA FORMAL DE DATOS (LEY 1581 DE 2012) */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col text-left relative max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2 text-[#4B9CD3]">
                <FileText className="w-5 h-5" />
                <h3 className="text-base font-black text-[#2C3E50]">
                  Política de Tratamiento de Datos Personales
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPolicyModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Texto Legal Formal Completo */}
            <div className="overflow-y-auto pr-1 text-xs text-slate-600 space-y-3 leading-relaxed">
              <p className="font-semibold text-slate-800">
                De conformidad con la Ley 1581 de 2012 de Protección de Datos Personales de Colombia y su Decreto Reglamentario 1377 de 2013:
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p>
                  Autorizo de manera libre, previa, expresa e informada para que mis datos personales (nombre y teléfono) sean recolectados, almacenados y utilizados con el propósito de:
                </p>
                <ol className="list-decimal pl-5 space-y-1 font-medium text-slate-700">
                  <li>Gestionar mi inscripción, registro de visitas y redención de beneficios del programa de fidelización;</li>
                  <li>Enviar notificaciones de saldo, promociones y novedades comerciales vía WhatsApp o SMS;</li>
                  <li>Fines estadísticos y de servicio al cliente.</li>
                </ol>
              </div>

              <p className="text-[11px] text-slate-500">
                Declaro conocer que tengo derecho a conocer, actualizar, rectificar y revocar esta autorización en cualquier momento mediante solicitud a través de nuestros canales oficiales de atención al cliente.
              </p>
            </div>

            {/* Botón de cierre */}
            <div className="pt-4 border-t border-slate-100 mt-4 text-right">
              <button
                type="button"
                onClick={() => setShowPolicyModal(false)}
                className="py-2.5 px-5 bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
