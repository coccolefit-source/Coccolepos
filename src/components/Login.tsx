import React, { useState } from 'react';
import { Usuario } from '../types';
import { Logo } from './Logo';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  validatePinInSupabase,
  resetPinWithMasterKeyInSupabase
} from '../lib/supabaseClient';

interface LoginProps {
  usuarios: Usuario[];
  onLogin: (userId: string, authenticatedUser?: Usuario) => void;
  onCreateAdmin?: (adminData: { nombre: string; email: string; password: string; clave_maestra: string }) => string;
  onRequestPinResetNotification?: (empId: string, empNombre: string, nota?: string) => void;
  onUpdateUserPin?: (userId: string, newPin: string, newPassword?: string) => Promise<boolean | void> | boolean | void;
}

export default function Login({
  usuarios,
  onLogin,
  onRequestPinResetNotification,
  onUpdateUserPin
}: LoginProps) {
  const [view, setView] = useState<'admin' | 'empleado'>('admin');

  // Login Admin State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Login Empleado PIN State
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [enteredPin, setEnteredPin] = useState('');

  // Modal de Recuperación de PIN (Colaboradores)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotMode, setForgotMode] = useState<'notificar' | 'restablecer'>('notificar');
  const [forgotEmpId, setForgotEmpId] = useState('');
  const [forgotMasterKey, setForgotMasterKey] = useState('');
  const [forgotNewPin, setForgotNewPin] = useState('');
  const [forgotConfirmPin, setForgotConfirmPin] = useState('');
  const [forgotNota, setForgotNota] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [isResettingPin, setIsResettingPin] = useState(false);

  // Modal de Recuperación de Contraseña Administrador (vía Supabase Auth)
  const [showAdminForgotModal, setShowAdminForgotModal] = useState(false);
  const [adminForgotEmail, setAdminForgotEmail] = useState('');
  const [adminForgotError, setAdminForgotError] = useState('');
  const [adminForgotSuccess, setAdminForgotSuccess] = useState('');
  const [isSendingRecovery, setIsSendingRecovery] = useState(false);

  // Mensajes generales
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const admins = usuarios.filter((u) => u.rol === 'admin');
  const employees = usuarios.filter((u) => u.rol === 'empleado');
  const supabaseReady = isSupabaseConfigured();

  // Login de Administrador estrictamente validado contra Supabase Auth
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoggingIn(true);

    const cleanEmail = adminEmail.trim().toLowerCase();
    const cleanPass = adminPassword.trim();

    if (!cleanEmail || !cleanPass) {
      setError('Ingresa tu correo corporativo y contraseña.');
      setIsLoggingIn(false);
      return;
    }

    try {
      const client = getSupabaseClient();
      if (client) {
        const { data: authData, error: authError } = await client.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPass
        });

        if (authError || !authData?.user) {
          setError('Credenciales de administrador incorrectas. Verifica tu correo y contraseña.');
          setIsLoggingIn(false);
          return;
        }

        const adminProfile: Usuario =
          usuarios.find(
            (u) =>
              u.rol === 'admin' &&
              (u.email?.toLowerCase() === cleanEmail || u.id === authData.user.id)
          ) ||
          admins[0] || {
            id: authData.user.id,
            nombre: authData.user.user_metadata?.full_name || 'Administrador',
            email: authData.user.email || cleanEmail,
            rol: 'admin'
          };

        const sesion = {
          rol: 'admin',
          nombre: adminProfile.nombre || 'Administrador',
          id: adminProfile.id
        };
        (window as any).sesionActual = sesion;
        try {
          localStorage.setItem('coccole_sesion', JSON.stringify(sesion));
          localStorage.setItem('coccole_active_user_role', adminProfile.id);
        } catch {
          // Ignore storage errors
        }
        onLogin(adminProfile.id, adminProfile);
        return;
      }

      // Modo local sin Supabase configurado (nunca acepta claves por defecto ni correos hardcodeados)
      const localAdminMatch = admins.find(
        (a) =>
          a.email?.toLowerCase() === cleanEmail &&
          Boolean(a.password) &&
          a.password === cleanPass
      );

      if (localAdminMatch) {
        const sesion = {
          rol: 'admin',
          nombre: localAdminMatch.nombre || 'Administrador',
          id: localAdminMatch.id
        };
        (window as any).sesionActual = sesion;
        try {
          localStorage.setItem('coccole_sesion', JSON.stringify(sesion));
          localStorage.setItem('coccole_active_user_role', localAdminMatch.id);
        } catch {
          // Ignore storage errors
        }
        onLogin(localAdminMatch.id, localAdminMatch);
        return;
      }

      setError('Credenciales de administrador incorrectas. Verifica tu correo y contraseña.');
    } catch {
      setError('No se pudo completar la autenticación. Intenta nuevamente.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Recuperación de contraseña de administrador mediante correo oficial de Supabase Auth
  const handleAdminPasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminForgotError('');
    setAdminForgotSuccess('');

    const cleanEmail = adminForgotEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAdminForgotError('Ingresa un correo electrónico corporativo válido.');
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setAdminForgotError('La recuperación por correo requiere conexión activa con el servidor.');
      return;
    }

    setIsSendingRecovery(true);
    try {
      const { error: resetErr } = await client.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
      });
      if (resetErr) {
        setAdminForgotError('No se pudo enviar el enlace de recuperación. Verifica el correo o intenta más tarde.');
      } else {
        setAdminForgotSuccess(
          'Si el correo está registrado como administrador, recibirás un enlace seguro para restablecer tu contraseña.'
        );
      }
    } catch {
      setAdminForgotError('Error de conexión al solicitar el restablecimiento.');
    } finally {
      setIsSendingRecovery(false);
    }
  };

  // Teclado Numérico (Pin Pad)
  const handleKeyPress = (digit: string) => {
    setError('');
    if (enteredPin.length < 4 && !isLoggingIn) {
      const newPin = enteredPin + digit;
      setEnteredPin(newPin);
      if (newPin.length === 4) {
        validateEmployeePin(newPin);
      }
    }
  };

  const handleKeyDelete = () => {
    setError('');
    setEnteredPin((prev) => prev.slice(0, -1));
  };

  const handleKeyClear = () => {
    setError('');
    setEnteredPin('');
  };

  // Validación de PIN de colaborador mediante RPC SECURITY DEFINER en Supabase
  const validateEmployeePin = async (pinToTest: string) => {
    setIsLoggingIn(true);
    setError('');

    const pinLimpio = String(pinToTest || '').trim();
    if (!/^\d{4}$/.test(pinLimpio)) {
      setError('Ingresa un PIN válido de 4 dígitos.');
      setEnteredPin('');
      setIsLoggingIn(false);
      return;
    }

    try {
      if (supabaseReady) {
        const result = await validatePinInSupabase(pinLimpio, selectedEmpId || undefined);

        if (result.success && result.user) {
          const empNombre = result.user.nombre || 'Colaborador';
          const sesion = {
            rol: result.user.rol || 'empleado',
            nombre: empNombre,
            id: result.user.id
          };
          (window as any).sesionActual = sesion;
          try {
            localStorage.setItem('coccole_sesion', JSON.stringify(sesion));
            localStorage.setItem('coccole_active_user_role', result.user.id);
          } catch {
            // Ignore storage errors
          }
          if (typeof (window as any).inicializarSesionProgresoEmpleadoSeguro === 'function') {
            (window as any).inicializarSesionProgresoEmpleadoSeguro(empNombre);
          }
          if (typeof (window as any).activarSuscripcionTiempoRealSegura === 'function') {
            (window as any).activarSuscripcionTiempoRealSegura();
          }
          onLogin(result.user.id, result.user);
          return;
        }

        setError(result.error || 'PIN incorrecto. Verifica e intenta nuevamente.');
        setEnteredPin('');
        return;
      }

      // Modo sin Supabase (solo entorno de pruebas local)
      const candidates = selectedEmpId
        ? employees.filter((e) => e.id === selectedEmpId)
        : employees;
      const empMatch = candidates.find((e) => {
        const storedPin = String(e.pin ?? '').trim();
        return storedPin.length === 4 && storedPin === pinLimpio;
      });

      if (empMatch) {
        const sesion = { rol: 'empleado', nombre: empMatch.nombre, id: empMatch.id };
        (window as any).sesionActual = sesion;
        try {
          localStorage.setItem('coccole_sesion', JSON.stringify(sesion));
          localStorage.setItem('coccole_active_user_role', empMatch.id);
        } catch {
          // Ignore storage errors
        }
        onLogin(empMatch.id, empMatch);
        return;
      }

      setError(
        selectedEmpId
          ? 'PIN incorrecto para el colaborador seleccionado.'
          : 'PIN incorrecto. Verifica con el administrador.'
      );
      setEnteredPin('');
    } catch {
      setError('Error al validar el PIN en el servidor.');
      setEnteredPin('');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmployeeLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin.length === 4) {
      validateEmployeePin(enteredPin);
    } else {
      setError('Ingresa el PIN completo de 4 dígitos numéricos.');
    }
  };

  // Notificación al Administrador para restablecer PIN
  const handleSendForgotNotification = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotEmpId) {
      setForgotError('Selecciona el colaborador que requiere apoyo con su PIN.');
      return;
    }

    const emp = employees.find((u) => u.id === forgotEmpId);
    if (!emp) {
      setForgotError('Colaborador no encontrado.');
      return;
    }

    if (onRequestPinResetNotification) {
      onRequestPinResetNotification(emp.id, emp.nombre, forgotNota);
    }

    setForgotSuccess(
      'Solicitud enviada al administrador. Podrá asignarte un nuevo PIN desde el panel de usuarios.'
    );
    setForgotNota('');
  };

  // Restablecimiento de PIN validado estrictamente en el servidor (RPC pgcrypto)
  const handleServerPinReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotEmpId) {
      setForgotError('Selecciona el colaborador que desea restablecer su PIN.');
      return;
    }

    const targetUser = employees.find((u) => u.id === forgotEmpId);
    if (!targetUser) {
      setForgotError('Colaborador no encontrado.');
      return;
    }

    if (!forgotMasterKey.trim()) {
      setForgotError('Ingresa la clave maestra del administrador.');
      return;
    }

    const cleanPin = String(forgotNewPin || '').trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      setForgotError('El nuevo PIN debe tener exactamente 4 dígitos numéricos.');
      return;
    }

    if (cleanPin !== String(forgotConfirmPin || '').trim()) {
      setForgotError('El nuevo PIN y su confirmación no coinciden.');
      return;
    }

    if (!supabaseReady) {
      setForgotError('Esta función requiere conexión activa con el servidor.');
      return;
    }

    setIsResettingPin(true);
    try {
      const res = await resetPinWithMasterKeyInSupabase(
        targetUser.id,
        forgotMasterKey.trim(),
        cleanPin
      );
      if (!res.success) {
        setForgotError(res.error || 'No se pudo validar la autorización. Contacta al administrador.');
        return;
      }

      if (onUpdateUserPin) {
        await onUpdateUserPin(targetUser.id, cleanPin);
      }

      setForgotSuccess(
        `PIN de ${targetUser.nombre} actualizado de forma segura. Ya puedes iniciar sesión.`
      );
      setForgotMasterKey('');
      setForgotNewPin('');
      setForgotConfirmPin('');
    } finally {
      setIsResettingPin(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#FFFDF6] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 sm:p-8 border border-[#E2E8F0] relative">
        {/* Cabecera / Identidad Coccole Fit */}
        <div className="flex flex-col items-center mb-6">
          <Logo size="xl" className="mb-3" />
          <h1 className="font-extrabold text-2xl text-[#2C3E50] tracking-tight leading-none mb-1.5">
            COCCOLE FIT
          </h1>
          <p className="text-[11px] text-slate-500 tracking-widest font-bold uppercase">
            Placer sin culpa
          </p>

          {/* Indicador pasivo de conectividad (sin exposición de configuración o auditoría en pantalla pública) */}
          <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-slate-500">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                supabaseReady ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
            <span>{supabaseReady ? 'Conectado en tiempo real' : 'Modo sin conexión a la nube'}</span>
          </div>
        </div>

        {/* Selector de Modalidad (Administrador vs Personal PIN) */}
        <div className="flex bg-[#EBF5FB] p-1 rounded-xl mb-6 border border-[#AED6F1]/50">
          <button
            type="button"
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
              view === 'admin'
                ? 'bg-[#4B9CD3] text-white shadow-xs'
                : 'text-[#2C3E50] hover:bg-white/50'
            }`}
            onClick={() => {
              setView('admin');
              setError('');
              setSuccessMsg('');
            }}
          >
            Administrador
          </button>
          <button
            type="button"
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
              view === 'empleado'
                ? 'bg-[#4B9CD3] text-white shadow-xs'
                : 'text-[#2C3E50] hover:bg-white/50'
            }`}
            onClick={() => {
              setView('empleado');
              setError('');
              setSuccessMsg('');
            }}
          >
            Acceso Empleado / PIN
          </button>
        </div>

        {/* Mensajes de Alerta / Éxito */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl text-center">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl text-center">
            {successMsg}
          </div>
        )}

        {/* VISTA 1: FORMULARIO LOGIN ADMINISTRADOR */}
        {view === 'admin' && (
          <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                Correo Electrónico Corporativo
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                autoComplete="username"
                className="w-full text-xs px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-[#FFFDF6] text-[#2C3E50] font-medium"
                placeholder="correo@empresa.com"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminForgotModal(true);
                    setAdminForgotEmail(adminEmail);
                    setAdminForgotError('');
                    setAdminForgotSuccess('');
                  }}
                  className="text-[10px] font-bold text-slate-500 hover:text-[#4B9CD3] transition-colors cursor-pointer underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full text-xs px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-[#FFFDF6] text-[#2C3E50] font-medium"
                placeholder="Ingresa tu contraseña"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-extrabold py-3 text-xs rounded-xl transition-colors cursor-pointer shadow-xs mt-1 disabled:opacity-50"
            >
              {isLoggingIn ? 'Verificando...' : 'Ingresar al Panel de Control'}
            </button>
          </form>
        )}

        {/* VISTA 2: LOGIN EMPLEADO MEDIANTE PIN Y PIN PAD */}
        {view === 'empleado' && (
          <form onSubmit={handleEmployeeLoginSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                Seleccionar Colaborador (Opcional)
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-[#FFFDF6] font-extrabold text-[#2C3E50]"
              >
                <option value="">Ingreso Directo por PIN</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre} ({emp.area_preferida || 'Personal'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-2 text-center">
                PIN de Acceso (4 dígitos)
              </label>
              <div className="flex justify-center gap-3 mb-2">
                {[0, 1, 2, 3].map((idx) => {
                  const hasDigit = enteredPin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center font-black text-xl transition-all ${
                        hasDigit
                          ? 'border-[#4B9CD3] bg-[#EBF5FB] text-[#4B9CD3] shadow-xs scale-105'
                          : 'border-[#E2E8F0] bg-white text-slate-300'
                      }`}
                    >
                      {hasDigit ? '•' : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-[#FFFDF6] p-3 rounded-2xl border border-[#E2E8F0]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeyPress(digit)}
                  className="py-3 bg-white hover:bg-[#EBF5FB] active:bg-[#4B9CD3] active:text-white border border-[#E2E8F0] text-[#2C3E50] font-black text-lg rounded-xl transition-all cursor-pointer shadow-xs text-center select-none"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={handleKeyDelete}
                className="py-3 bg-[#FFFDF6] hover:bg-slate-100 border border-[#E2E8F0] text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer text-center select-none"
              >
                Borrar
              </button>

              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="py-3 bg-white hover:bg-[#EBF5FB] active:bg-[#4B9CD3] active:text-white border border-[#E2E8F0] text-[#2C3E50] font-black text-lg rounded-xl transition-all cursor-pointer shadow-xs text-center select-none"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleKeyClear}
                className="py-3 bg-[#FFFDF6] hover:bg-slate-100 border border-[#E2E8F0] text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer text-center select-none"
              >
                Limpiar
              </button>
            </div>

            <button
              type="submit"
              disabled={enteredPin.length !== 4 || isLoggingIn}
              className={`w-full font-extrabold py-3 text-xs rounded-xl transition-colors cursor-pointer shadow-xs ${
                enteredPin.length === 4 && !isLoggingIn
                  ? 'bg-[#4B9CD3] hover:bg-[#3A82B4] text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isLoggingIn ? 'Validando PIN...' : 'Ingresar a la Plataforma'}
            </button>

            <div className="text-center pt-3 border-t border-[#E2E8F0] mt-1">
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(true);
                  setForgotMode('notificar');
                  setForgotError('');
                  setForgotSuccess('');
                  if (selectedEmpId) setForgotEmpId(selectedEmpId);
                }}
                className="text-[11px] font-bold text-slate-500 hover:text-[#4B9CD3] transition-colors cursor-pointer underline"
              >
                ¿Olvidaste tu PIN de Colaborador?
              </button>
            </div>
          </form>
        )}
      </div>

      {/* MODAL DE RECUPERACIÓN DE CONTRASEÑA DE ADMINISTRADOR */}
      {showAdminForgotModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF6] border-2 border-[#4B9CD3] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-[#2C3E50] relative">
            <button
              type="button"
              onClick={() => setShowAdminForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-black text-xs w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
              aria-label="Cerrar"
            >
              ✕
            </button>

            <div className="border-b border-[#E2E8F0] pb-3 pr-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#4B9CD3] block">
                Recuperación Segura
              </span>
              <h3 className="text-base font-extrabold text-[#2C3E50]">
                Restablecer Contraseña de Administrador
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Te enviaremos un enlace oficial de verificación a tu correo corporativo registrado.
              </p>
            </div>

            {adminForgotError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl text-center">
                {adminForgotError}
              </div>
            )}

            {adminForgotSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl text-center">
                {adminForgotSuccess}
              </div>
            )}

            <form onSubmit={handleAdminPasswordRecovery} className="space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                  Correo Electrónico Corporativo
                </label>
                <input
                  type="email"
                  value={adminForgotEmail}
                  onChange={(e) => setAdminForgotEmail(e.target.value)}
                  placeholder="correo@empresa.com"
                  className="w-full text-xs px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-white text-[#2C3E50] font-medium"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSendingRecovery}
                className="w-full bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-extrabold py-2.5 text-xs rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSendingRecovery ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE RECUPERACIÓN / RESTABLECIMIENTO DE PIN DE COLABORADOR */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF6] border-2 border-[#4B9CD3] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-[#2C3E50] relative">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-black text-xs w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
              aria-label="Cerrar"
            >
              ✕
            </button>

            <div className="border-b border-[#E2E8F0] pb-3 pr-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#4B9CD3] block">
                Soporte de Acceso
              </span>
              <h3 className="text-base font-extrabold text-[#2C3E50]">
                Restablecer PIN de Colaborador
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Solicita ayuda al administrador o utiliza la autorización del encargado.
              </p>
            </div>

            <div className="flex bg-[#EBF5FB] p-1 rounded-xl border border-[#AED6F1]/50">
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                  forgotMode === 'notificar'
                    ? 'bg-[#4B9CD3] text-white shadow-xs'
                    : 'text-[#2C3E50] hover:bg-white/50'
                }`}
                onClick={() => {
                  setForgotMode('notificar');
                  setForgotError('');
                  setForgotSuccess('');
                }}
              >
                Notificar al Admin
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                  forgotMode === 'restablecer'
                    ? 'bg-[#4B9CD3] text-white shadow-xs'
                    : 'text-[#2C3E50] hover:bg-white/50'
                }`}
                onClick={() => {
                  setForgotMode('restablecer');
                  setForgotError('');
                  setForgotSuccess('');
                }}
              >
                Autorización Encargado
              </button>
            </div>

            {forgotError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl text-center">
                {forgotError}
              </div>
            )}

            {forgotSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl text-center">
                {forgotSuccess}
              </div>
            )}

            {forgotMode === 'notificar' && (
              <form onSubmit={handleSendForgotNotification} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                    Seleccionar Colaborador
                  </label>
                  <select
                    value={forgotEmpId}
                    onChange={(e) => setForgotEmpId(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-white text-[#2C3E50] font-bold"
                    required
                  >
                    <option value="">Selecciona tu nombre...</option>
                    {employees.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} ({u.area_preferida || 'Personal'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                    Nota Opcional
                  </label>
                  <textarea
                    value={forgotNota}
                    onChange={(e) => setForgotNota(e.target.value)}
                    rows={2}
                    placeholder="Indica brevemente qué ocurrió..."
                    className="w-full text-xs px-3.5 py-2 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-white text-[#2C3E50]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-extrabold py-2.5 text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Enviar Solicitud al Administrador
                </button>
              </form>
            )}

            {forgotMode === 'restablecer' && (
              <form onSubmit={handleServerPinReset} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                    Colaborador
                  </label>
                  <select
                    value={forgotEmpId}
                    onChange={(e) => setForgotEmpId(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-white text-[#2C3E50] font-bold"
                    required
                  >
                    <option value="">Selecciona el colaborador...</option>
                    {employees.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} ({u.area_preferida || 'Personal'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                    Clave Maestra del Administrador
                  </label>
                  <input
                    type="password"
                    value={forgotMasterKey}
                    onChange={(e) => setForgotMasterKey(e.target.value)}
                    placeholder="Ingresa la clave maestra autorizada"
                    autoComplete="off"
                    className="w-full text-xs px-3.5 py-2 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-white text-[#2C3E50] font-medium"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                      Nuevo PIN (4 dígitos)
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={forgotNewPin}
                      onChange={(e) => setForgotNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="••••"
                      className="w-full text-center text-xs px-3 py-2 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-white font-mono font-black"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                      Confirmar PIN
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={forgotConfirmPin}
                      onChange={(e) =>
                        setForgotConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                      }
                      placeholder="••••"
                      className="w-full text-center text-xs px-3 py-2 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-white font-mono font-black"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isResettingPin}
                  className="w-full bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-extrabold py-2.5 text-xs rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isResettingPin ? 'Validando...' : 'Actualizar PIN'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
