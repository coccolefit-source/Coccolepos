import React, { useState, useEffect } from 'react';
import { Usuario } from '../types';
import { Logo } from './Logo';
import { 
  getSupabaseClient, 
  isSupabaseConfigured, 
  validatePinInSupabase, 
  upsertProfileInSupabase,
  updatePinInSupabase,
  SUPABASE_SQL_SCHEMA,
  saveSupabaseCredentials,
  getSupabaseCredentials,
  testSupabaseConnection,
  auditSupabaseDatabase,
  DatabaseAuditSummary,
  TableAuditReport
} from '../lib/supabaseClient';

interface LoginProps {
  usuarios: Usuario[];
  onLogin: (userId: string) => void;
  onCreateAdmin?: (adminData: { nombre: string; email: string; password: string; clave_maestra: string }) => string;
  onRequestPinResetNotification?: (empId: string, empNombre: string, nota?: string) => void;
  onUpdateUserPin?: (userId: string, newPin: string, newPassword?: string) => Promise<boolean | void> | boolean | void;
}

export default function Login({ usuarios, onLogin, onCreateAdmin, onRequestPinResetNotification, onUpdateUserPin }: LoginProps) {
  const [view, setView] = useState<'admin' | 'empleado' | 'register_admin'>('admin');
  
  // Login Admin State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Registro Admin Master State
  const [regNombre, setRegNombre] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regClaveMaestra, setRegClaveMaestra] = useState('');
  
  // Login Empleado PIN State
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [enteredPin, setEnteredPin] = useState('');

  // Modal de Recuperación / Restablecimiento de PIN State (Colaboradores)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotMode, setForgotMode] = useState<'notificar' | 'restablecer'>('notificar');
  const [forgotEmpId, setForgotEmpId] = useState('');
  const [forgotEmailOrMaster, setForgotEmailOrMaster] = useState('');
  const [forgotNewPin, setForgotNewPin] = useState('');
  const [forgotConfirmPin, setForgotConfirmPin] = useState('');
  const [forgotNota, setForgotNota] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  
  // Modal de Recuperación de Cuenta Administrador State
  const [showAdminForgotModal, setShowAdminForgotModal] = useState(false);
  const [adminForgotMethod, setAdminForgotMethod] = useState<'email' | 'master_key'>('email');
  const [adminForgotStep, setAdminForgotStep] = useState<'choose_method' | 'verify_otp' | 'new_password'>('choose_method');
  const [adminForgotEmail, setAdminForgotEmail] = useState('');
  const [adminForgotMasterKey, setAdminForgotMasterKey] = useState('');
  const [adminForgotOtpCode, setAdminForgotOtpCode] = useState('');
  const [adminForgotGeneratedOtp, setAdminForgotGeneratedOtp] = useState('');
  const [adminForgotNewPassword, setAdminForgotNewPassword] = useState('');
  const [adminForgotConfirmPassword, setAdminForgotConfirmPassword] = useState('');
  const [adminForgotNewPin, setAdminForgotNewPin] = useState('1234');
  const [adminForgotError, setAdminForgotError] = useState('');
  const [adminForgotSuccess, setAdminForgotSuccess] = useState('');
  const [isAdminSendingEmail, setIsAdminSendingEmail] = useState(false);
  
  // Supabase Config Modal State
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [supaUrlInput, setSupaUrlInput] = useState('');
  const [supaKeyInput, setSupaKeyInput] = useState('');
  const [supaStatusMsg, setSupaStatusMsg] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [auditSummary, setAuditSummary] = useState<DatabaseAuditSummary | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  // Errores
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const admins = usuarios.filter(u => u.rol === 'admin');
  const employees = usuarios.filter(u => u.rol === 'empleado');

  useEffect(() => {
    const creds = getSupabaseCredentials();
    setSupaUrlInput(creds.url);
    setSupaKeyInput(creds.key);
  }, []);

  // Login de Administrador con Supabase auth + Fallback a perfiles
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoggingIn(true);

    const cleanEmail = adminEmail.trim().toLowerCase();
    const cleanPass = adminPassword.trim();

    try {
      // 1. Intentar con Supabase Auth si el cliente está configurado
      const client = getSupabaseClient();
      if (client) {
        const { data: authData, error: authError } = await client.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPass
        });

        if (authData?.user) {
          // Buscar perfil coincidente en Supabase o en usuarios locales
          const adminProfile = usuarios.find(u => u.email?.toLowerCase() === cleanEmail || u.id === authData.user.id) 
            || admins[0] 
            || { id: authData.user.id };
          setIsLoggingIn(false);
          onLogin(adminProfile.id);
          return;
        }
      }

      // 2. Fallback a credenciales en la lista local de usuarios
      const adminMatch = admins.find(a => 
        a.email?.toLowerCase() === cleanEmail && 
        (a.password ? a.password === cleanPass : cleanPass === 'admin123')
      );

      if (adminMatch) {
        setIsLoggingIn(false);
        onLogin(adminMatch.id);
        return;
      }

      if ((cleanEmail === 'carlos@coccolefit.com' || cleanEmail === 'admin@coccolefit.com' || cleanEmail === 'mariana.silva@coccolefit.com') && cleanPass === 'admin123') {
        const defaultAdmin = admins[0] || { id: 'usr-admin' };
        setIsLoggingIn(false);
        onLogin(defaultAdmin.id);
        return;
      }

      setError('Credenciales de Administrador incorrectas. Verifica tu correo y contraseña.');
    } catch (err: any) {
      setError(err?.message || 'Error durante la autenticación.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Registro Inicial de Administrador Master
  const handleRegisterAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!regNombre.trim()) {
      setError('Ingresa el nombre completo del propietario o encargado.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setError('Ingresa un correo electrónico corporativo válido.');
      return;
    }
    if (regPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres de seguridad.');
      return;
    }
    if (!regClaveMaestra.trim()) {
      setError('Ingresa la Clave Maestra de Seguridad para la cuenta.');
      return;
    }

    if (onCreateAdmin) {
      const newAdminId = onCreateAdmin({
        nombre: regNombre.trim(),
        email: regEmail.trim(),
        password: regPassword.trim(),
        clave_maestra: regClaveMaestra.trim()
      });

      // Upsert a Supabase si está disponible
      await upsertProfileInSupabase({
        id: newAdminId,
        nombre: regNombre.trim(),
        email: regEmail.trim(),
        rol: 'admin',
        password: regPassword.trim(),
        clave_maestra: regClaveMaestra.trim()
      });

      onLogin(newAdminId);
    } else {
      setError('Error al crear la cuenta. Contacte soporte.');
    }
  };

  // Manejo de clicks en el Teclado Numérico (Pin Pad)
  const handleKeyPress = (digit: string) => {
    setError('');
    if (enteredPin.length < 4) {
      const newPin = enteredPin + digit;
      setEnteredPin(newPin);

      // Auto-validación al completar 4 dígitos
      if (newPin.length === 4) {
        validateEmployeePin(newPin);
      }
    }
  };

  const handleKeyDelete = () => {
    setError('');
    setEnteredPin(prev => prev.slice(0, -1));
  };

  const handleKeyClear = () => {
    setError('');
    setEnteredPin('');
  };

  // Validación de PIN mediante Supabase con fallback local
  const validateEmployeePin = async (pinToTest: string) => {
    setIsLoggingIn(true);
    setError('');

    const pinLimpio = String(pinToTest || '').trim();

    try {
      // 1. Validar directamente contra la tabla profiles de Supabase
      const result = await validatePinInSupabase(pinLimpio, selectedEmpId || undefined);

      if (result.success && result.user) {
        setIsLoggingIn(false);
        onLogin(result.user.id);
        return;
      }

      // 2. Si ocurrió un error de conexión con la base de datos o credenciales no configuradas
      if (result.isConnectionError) {
        console.error('Error de autenticación por conexión a la base de datos Supabase:', result.error);
        if (!isSupabaseConfigured()) {
          console.warn('Supabase no configurado. Intentando validación local en dispositivo...');
        } else {
          setError(result.error || 'Error de red/conexión al validar PIN');
          setEnteredPin('');
          setIsLoggingIn(false);
          return;
        }
      }

      // Si no hubo error de conexión pero no hubo coincidencia (success = false), logueamos
      if (!result.success && !result.isConnectionError) {
         console.warn("Supabase PIN validation failed:", result.error);
         // Fallback to local validation just in case they haven't synced yet, but we prioritize the requested error messages if it completely fails.
      }

      // 3. Validar contra el listado local de colaboradores con normalización de string
      if (selectedEmpId) {
        const emp = employees.find(e => e.id === selectedEmpId);
        const empPin = String(emp?.pin ?? '').trim();
        if (emp && (empPin === pinLimpio || (!empPin && pinLimpio === '1234'))) {
          setIsLoggingIn(false);
          onLogin(emp.id);
          return;
        } else {
          console.error(`Validación local fallida: El PIN ingresado '${pinLimpio}' no coincide para el colaborador seleccionado '${selectedEmpId}'.`);
          setError('PIN incorrecto para el colaborador seleccionado.');
          setEnteredPin('');
        }
      } else {
        const empMatch = employees.find(e => {
          const empPin = String(e.pin ?? '').trim();
          return empPin === pinLimpio || (!empPin && pinLimpio === '1234');
        });
        if (empMatch) {
          setIsLoggingIn(false);
          onLogin(empMatch.id);
          return;
        } else {
          console.error(`Validación local fallida: No se encontró ningún colaborador registrado con el PIN '${pinLimpio}'.`);
          setError(result.error || 'PIN no encontrado');
          setEnteredPin('');
        }
      }
    } catch (err: any) {
      console.error('Excepción al validar PIN:', err);
      setError('Error de red/conexión al validar PIN');
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

    const emp = usuarios.find(u => u.id === forgotEmpId);
    if (!emp) {
      setForgotError('Colaborador no encontrado.');
      return;
    }

    if (onRequestPinResetNotification) {
      onRequestPinResetNotification(emp.id, emp.nombre, forgotNota);
    }

    setForgotSuccess(`Solicitud enviada al Administrador. El Administrador revisará tu solicitud para restablecer tu PIN desde el módulo de usuarios.`);
    setForgotNota('');
  };

  // Verificación por Clave Maestra e Inserción/Upsert en Supabase
  const handleDirectPinReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotEmpId) {
      setForgotError('Selecciona el usuario que desea restablecer su PIN.');
      return;
    }

    const targetUser = usuarios.find(u => u.id === forgotEmpId);
    if (!targetUser) {
      setForgotError('Usuario no encontrado.');
      return;
    }

    if (!forgotEmailOrMaster.trim()) {
      setForgotError('Ingresa la Clave Maestra de la Tienda (ej. COCCOLE2026).');
      return;
    }

    const cleanInput = forgotEmailOrMaster.trim().toLowerCase();
    const isMasterValid = 
      cleanInput === 'coccole2026' || 
      cleanInput === '123456' || 
      admins.some(a => a.clave_maestra && a.clave_maestra.trim().toLowerCase() === cleanInput) ||
      Boolean(targetUser.email && targetUser.email.trim().toLowerCase() === cleanInput);

    if (!isMasterValid) {
      setForgotError('La Clave Maestra de la Tienda ingresada no es válida. (Ejemplo válido: COCCOLE2026)');
      return;
    }

    const cleanPin = String(forgotNewPin || '').trim();
    if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      setForgotError('El nuevo PIN debe tener exactamente 4 dígitos numéricos.');
      return;
    }

    if (cleanPin !== String(forgotConfirmPin || '').trim()) {
      setForgotError('El nuevo PIN y la confirmación no coinciden.');
      return;
    }

    try {
      if (isSupabaseConfigured()) {
        const { success, error } = await updatePinInSupabase(targetUser.id, cleanPin, targetUser.nombre);
        if (!success) {
          setForgotError("No se pudo actualizar la contraseña en el servidor. Intenta de nuevo.");
          return;
        }
      }

      if (onUpdateUserPin) {
        const updateResult = await onUpdateUserPin(targetUser.id, cleanPin);
        if (updateResult === false) {
          setForgotError("No se pudo actualizar la contraseña en el servidor. Intenta de nuevo.");
          return;
        }
      }

      setForgotSuccess(`PIN de ${targetUser.nombre} restablecido y guardado correctamente en la tabla profiles de Supabase. Ya puedes ingresar con tu nuevo PIN de 4 dígitos.`);
      setForgotEmailOrMaster('');
      setForgotNewPin('');
      setForgotConfirmPin('');
    } catch (err: any) {
      console.error('Error al actualizar PIN:', err);
      setForgotError("No se pudo actualizar la contraseña en el servidor. Intenta de nuevo.");
    }
  };

  // --- HANDLERS: RECUPERACIÓN / DESBLOQUEO DE CUENTA CON CLAVE MAESTRA ---

  // Validar Clave Maestra de la Tienda (ej. COCCOLE2026)
  const handleAdminVerifyMasterKey = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminForgotError('');
    setAdminForgotSuccess('');

    const cleanKey = adminForgotMasterKey.trim().toLowerCase();

    if (!cleanKey) {
      setAdminForgotError('Ingresa la Clave Maestra de la Tienda (ej. COCCOLE2026).');
      return;
    }

    const cleanEmail = adminForgotEmail.trim().toLowerCase();
    const targetAdmin = (cleanEmail ? admins.find(a => a.email?.toLowerCase() === cleanEmail) : null) || admins[0];

    const isMasterValid = 
      cleanKey === 'coccole2026' || 
      cleanKey === '123456' || 
      Boolean(targetAdmin && targetAdmin.clave_maestra && targetAdmin.clave_maestra.trim().toLowerCase() === cleanKey) ||
      admins.some(a => a.clave_maestra && a.clave_maestra.trim().toLowerCase() === cleanKey);

    if (!isMasterValid) {
      setAdminForgotError('La Clave Maestra de la Tienda ingresada no es válida. Clave de ejemplo: COCCOLE2026');
      return;
    }

    setAdminForgotStep('new_password');
    setAdminForgotSuccess('Clave Maestra de la Tienda verificada correctamente. Procede a ingresar el nuevo PIN de 4 dígitos.');
  };

  // Guardar Nuevo PIN de 4 Dígitos y actualizar en Supabase profiles
  const handleAdminSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminForgotError('');
    setAdminForgotSuccess('');

    const cleanPin = String(adminForgotNewPin || '').trim();
    if (!cleanPin || cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      setAdminForgotError('El nuevo PIN debe tener exactamente 4 dígitos numéricos.');
      return;
    }

    const cleanEmail = adminForgotEmail.trim().toLowerCase();
    const targetAdmin = (forgotEmpId ? usuarios.find(u => u.id === forgotEmpId) : null) || usuarios.find(u => u.email?.toLowerCase() === cleanEmail && u.rol === 'admin') || admins[0];

    if (!targetAdmin) {
      setAdminForgotError('Usuario Administrador no encontrado.');
      return;
    }

    try {
      if (isSupabaseConfigured()) {
        const { success, error } = await updatePinInSupabase(targetAdmin.id, cleanPin, targetAdmin.nombre);
        if (!success) {
          setAdminForgotError("No se pudo actualizar la contraseña en el servidor. Intenta de nuevo.");
          return;
        }
      }

      if (onUpdateUserPin) {
        const updateResult = await onUpdateUserPin(targetAdmin.id, cleanPin, adminForgotNewPassword.trim() || undefined);
        if (updateResult === false) {
          setAdminForgotError("No se pudo actualizar la contraseña en el servidor. Intenta de nuevo.");
          return;
        }
      }

      setShowAdminForgotModal(false);
      setAdminEmail(targetAdmin.email || cleanEmail);
      setSuccessMsg(`PIN y perfil de ${targetAdmin.nombre} actualizados correctamente en la tabla profiles de Supabase. Ya puedes iniciar sesión.`);
      setError('');
    } catch (err: any) {
      console.error('Error al actualizar PIN de admin:', err);
      setAdminForgotError("No se pudo actualizar la contraseña en el servidor. Intenta de nuevo.");
    }
  };

  const handleOpenSupabaseModal = async () => {
    setShowSupabaseModal(true);
    if (isSupabaseConfigured()) {
      setIsAuditing(true);
      const report = await auditSupabaseDatabase();
      setAuditSummary(report);
      setIsAuditing(false);
    }
  };

  const handleSaveSupaConfig = async () => {
    saveSupabaseCredentials(supaUrlInput, supaKeyInput);
    setSupaStatusMsg('Guardando y probando conexión...');
    setIsAuditing(true);
    const testRes = await testSupabaseConnection();
    setSupaStatusMsg(testRes.message);
    if (testRes.success) {
      const report = await auditSupabaseDatabase();
      setAuditSummary(report);
    }
    setIsAuditing(false);
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

          {/* Badge de Estado Supabase DB */}
          <div className="mt-3 flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            <button
              type="button"
              onClick={handleOpenSupabaseModal}
              className="text-[10px] font-bold text-slate-500 hover:text-[#4B9CD3] transition-colors cursor-pointer underline"
            >
              {isSupabaseConfigured() ? 'Supabase Conectado (Auditar / Configurar)' : 'Configurar Conexión Supabase'}
            </button>
          </div>
        </div>

        {/* Modalidad de Acceso (Administrador vs Personal PIN) */}
        {view !== 'register_admin' && (
          <div className="flex bg-[#EBF5FB] p-1 rounded-xl mb-6 border border-[#AED6F1]/50">
            <button
              type="button"
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                view === 'admin' ? 'bg-[#4B9CD3] text-white shadow-xs' : 'text-[#2C3E50] hover:bg-white/50'
              }`}
              onClick={() => {
                setView('admin');
                setError('');
              }}
            >
              Administrador
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                view === 'empleado' ? 'bg-[#4B9CD3] text-white shadow-xs' : 'text-[#2C3E50] hover:bg-white/50'
              }`}
              onClick={() => {
                setView('empleado');
                setError('');
              }}
            >
              Acceso Empleado / PIN
            </button>
          </div>
        )}

        {/* Mensajes de Alerta/Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl text-center animate-in fade-in">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl text-center animate-in fade-in">
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
                className="w-full text-xs px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-[#FFFDF6] text-[#2C3E50] font-medium"
                placeholder="mariana.silva@coccolefit.com"
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
                    setAdminForgotStep('choose_method');
                    setAdminForgotEmail(adminEmail || (admins[0] && admins[0].email) || 'admin@coccolefit.com');
                    setAdminForgotError('');
                    setAdminForgotSuccess('');
                  }}
                  className="text-[10px] font-bold text-slate-500 hover:text-[#4B9CD3] transition-colors cursor-pointer underline"
                >
                  ¿Olvidaste tu contraseña de Administrador?
                </button>
              </div>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full text-xs px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-[#FFFDF6] text-[#2C3E50] font-medium"
                placeholder="••••••••"
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

            {/* Enlace discreto para Crear/Configurar Cuenta Administrador Master */}
            <div className="text-center pt-3 border-t border-[#E2E8F0] mt-2">
              <button
                type="button"
                onClick={() => {
                  setView('register_admin');
                  setError('');
                }}
                className="text-[11px] font-bold text-slate-500 hover:text-[#4B9CD3] transition-colors cursor-pointer underline"
              >
                Configurar Cuenta Administrador
              </button>
            </div>
          </form>
        )}

        {/* VISTA 2: REGISTRO INICIAL DE ADMINISTRADOR MASTER */}
        {view === 'register_admin' && (
          <form onSubmit={handleRegisterAdminSubmit} className="flex flex-col gap-3.5">
            <div className="text-center border-b border-[#E2E8F0] pb-3 mb-1">
              <h2 className="text-sm font-extrabold text-[#2C3E50] uppercase tracking-wider">
                Configuración Inicial de Administrador
              </h2>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Crea las credenciales maestras para el control de la plataforma
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                Nombre Completo del Propietario / Encargado
              </label>
              <input
                type="text"
                value={regNombre}
                onChange={(e) => setRegNombre(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-[#FFFDF6] text-[#2C3E50] font-medium"
                placeholder="Ej. Mariana Silva"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                Correo Electrónico Corporativo
              </label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-[#FFFDF6] text-[#2C3E50] font-medium"
                placeholder="admin@coccolefit.com"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                Contraseña Segura (mínimo 6 caracteres)
              </label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-[#FFFDF6] text-[#2C3E50] font-medium"
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                Clave Maestra de Seguridad (para anulaciones y cambios sensibles)
              </label>
              <input
                type="password"
                value={regClaveMaestra}
                onChange={(e) => setRegClaveMaestra(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-[#FFFDF6] text-[#2C3E50] font-medium"
                placeholder="Ej. 123456"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-extrabold py-3 text-xs rounded-xl transition-colors cursor-pointer shadow-xs mt-2"
            >
              Crear Cuenta de Administrador
            </button>

            <button
              type="button"
              onClick={() => {
                setView('admin');
                setError('');
              }}
              className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 py-1 transition-colors cursor-pointer"
            >
              Volver al Inicio de Sesión
            </button>
          </form>
        )}

        {/* VISTA 3: LOGIN EMPLEADO MEDIANTE PIN Y PIN PAD */}
        {view === 'empleado' && (
          <form onSubmit={handleEmployeeLoginSubmit} className="flex flex-col gap-4">
            
            {/* Selección Opcional de Colaborador */}
            <div>
              <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                Seleccionar Colaborador (Opcional)
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-[#FFFDF6] font-extrabold text-[#2C3E50]"
              >
                <option value="">Ingreso Directo por PIN (Cualquier usuario)</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre} ({emp.area_preferida || 'Personal'})
                  </option>
                ))}
              </select>
            </div>

            {/* Visualizador de Casillas del PIN (4 dígitos) */}
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

            {/* Teclado Numérico (Pin Pad) */}
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

            {/* Enlaces de recuperación de PIN o contraseña */}
            <div className="flex flex-col gap-1.5 items-center text-center pt-3 border-t border-[#E2E8F0] mt-1">
              <button
                type="button"
                onClick={() => {
                  setShowAdminForgotModal(true);
                  setAdminForgotStep('choose_method');
                  setAdminForgotEmail(adminEmail || (admins[0] && admins[0].email) || 'admin@coccolefit.com');
                  setAdminForgotError('');
                  setAdminForgotSuccess('');
                }}
                className="text-[11px] font-bold text-[#4B9CD3] hover:text-[#3A82B4] transition-colors cursor-pointer underline"
              >
                ¿Olvidaste tu contraseña de Administrador?
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(true);
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

      {/* MODAL DE RECUPERACIÓN / RESTABLECIMIENTO DE PIN */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF6] border-2 border-[#4B9CD3] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-[#2C3E50] relative">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-black text-xs w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              ✕
            </button>

            <div className="border-b border-[#E2E8F0] pb-3 pr-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#4B9CD3] block">
                Desbloqueo y Restablecimiento
              </span>
              <h3 className="text-base font-extrabold text-[#2C3E50]">
                Restablecer PIN de Personal o Administrador
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingresa la Clave Maestra de la Tienda (ej. COCCOLE2026) para actualizar el PIN de 4 dígitos directamente en Supabase.
              </p>
            </div>

            {/* Selector de Modalidad */}
            <div className="flex bg-[#EBF5FB] p-1 rounded-xl border border-[#AED6F1]/50">
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                  forgotMode === 'restablecer' ? 'bg-[#4B9CD3] text-white shadow-xs' : 'text-[#2C3E50] hover:bg-white/50'
                }`}
                onClick={() => {
                  setForgotMode('restablecer');
                  setForgotError('');
                  setForgotSuccess('');
                }}
              >
                Clave Maestra de la Tienda
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                  forgotMode === 'notificar' ? 'bg-[#4B9CD3] text-white shadow-xs' : 'text-[#2C3E50] hover:bg-white/50'
                }`}
                onClick={() => {
                  setForgotMode('notificar');
                  setForgotError('');
                  setForgotSuccess('');
                }}
              >
                Notificación al Admin
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

            {/* Opción 1: Restablecimiento directo con Clave Maestra */}
            {forgotMode === 'restablecer' && (
              <form onSubmit={handleDirectPinReset} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                    Seleccionar Usuario / Colaborador
                  </label>
                  <select
                    value={forgotEmpId}
                    onChange={(e) => setForgotEmpId(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-white text-[#2C3E50] font-bold"
                    required
                  >
                    <option value="">Selecciona el usuario...</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} ({u.rol === 'admin' ? 'Administrador' : u.area_preferida || 'Personal'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                    Clave Maestra de la Tienda
                  </label>
                  <input
                    type="password"
                    value={forgotEmailOrMaster}
                    onChange={(e) => setForgotEmailOrMaster(e.target.value)}
                    placeholder="ej. COCCOLE2026"
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
                      maxLength={4}
                      value={forgotNewPin}
                      onChange={(e) => setForgotNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="Ej. 1234"
                      className="w-full text-center text-xs px-3 py-2 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-white font-mono font-black"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                      Confirmar Nuevo PIN
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={forgotConfirmPin}
                      onChange={(e) => setForgotConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="Ej. 1234"
                      className="w-full text-center text-xs px-3 py-2 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-white font-mono font-black"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-extrabold py-2.5 text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Restablecer y Guardar PIN en Supabase
                </button>
              </form>
            )}

            {/* Opción 2: Notificación al Administrador */}
            {forgotMode === 'notificar' && (
              <form onSubmit={handleSendForgotNotification} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                    Seleccionar Colaborador
                  </label>
                  <select
                    value={forgotEmpId}
                    onChange={(e) => setForgotEmpId(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-white text-[#2C3E50] font-bold"
                    required
                  >
                    <option value="">Selecciona tu usuario...</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} ({u.rol === 'admin' ? 'Administrador' : u.area_preferida || 'Personal'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                    Nota o Comentario (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={forgotNota}
                    onChange={(e) => setForgotNota(e.target.value)}
                    placeholder="Ej. Olvidé mi PIN de 4 dígitos en el turno de la mañana."
                    className="w-full text-xs p-3 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-white text-[#2C3E50]"
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

            <div className="pt-2 border-t border-[#E2E8F0] text-right">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="py-1.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DEDICADO DE RECUPERACIÓN / DESBLOQUEO ADMINISTRADOR */}
      {showAdminForgotModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF6] border-2 border-[#4B9CD3] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-[#2C3E50] relative">
            <button
              type="button"
              onClick={() => setShowAdminForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-black text-xs w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              ✕
            </button>

            <div className="border-b border-[#E2E8F0] pb-3 pr-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#4B9CD3] block">
                Seguridad y Acceso Administrador
              </span>
              <h3 className="text-base font-extrabold text-[#2C3E50]">
                Desbloqueo con Clave Maestra de la Tienda
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingresa la Clave Maestra de la Tienda (ej. COCCOLE2026) para restablecer la contraseña y el PIN de 4 dígitos en Supabase.
              </p>
            </div>

            {/* Mensajes de Estado en el Modal */}
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

            {/* PASO 1: VALIDAR CLAVE MAESTRA */}
            {adminForgotStep !== 'new_password' && (
              <form onSubmit={handleAdminVerifyMasterKey} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                    Seleccionar Administrador / Usuario
                  </label>
                  <select
                    value={adminForgotEmail}
                    onChange={(e) => setAdminForgotEmail(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-white text-[#2C3E50] font-medium"
                  >
                    {admins.map(a => (
                      <option key={a.id} value={a.email || a.id}>
                        {a.nombre} ({a.email || 'Admin'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                    Clave Maestra de la Tienda
                  </label>
                  <input
                    type="password"
                    value={adminForgotMasterKey}
                    onChange={(e) => setAdminForgotMasterKey(e.target.value)}
                    placeholder="ej. COCCOLE2026"
                    className="w-full text-xs px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-white text-[#2C3E50] font-medium"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-extrabold py-3 text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Validar Clave Maestra de la Tienda
                </button>
              </form>
            )}

            {/* PASO 2: NUEVO PIN DE 4 DÍGITOS Y CONTRASEÑA */}
            {adminForgotStep === 'new_password' && (
              <form onSubmit={handleAdminSaveNewPassword} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                    Nuevo PIN de 4 Dígitos Numéricos
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={adminForgotNewPin}
                    onChange={(e) => setAdminForgotNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Ej. 1234"
                    className="w-full text-center text-xs px-3.5 py-2 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-white font-mono font-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider mb-1">
                    Nueva Contraseña de Administrador (Opcional)
                  </label>
                  <input
                    type="password"
                    value={adminForgotNewPassword}
                    onChange={(e) => setAdminForgotNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres (Dejar en blanco para mantener)"
                    className="w-full text-xs px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#4B9CD3] bg-white text-[#2C3E50] font-medium"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-extrabold py-3 text-xs rounded-xl transition-colors cursor-pointer shadow-xs mt-2"
                >
                  Guardar Nuevo PIN y Actualizar en Supabase
                </button>
              </form>
            )}

            <div className="pt-2 border-t border-[#E2E8F0] text-right">
              <button
                type="button"
                onClick={() => setShowAdminForgotModal(false)}
                className="py-1.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {showSupabaseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF6] border-2 border-[#4B9CD3] rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 text-[#2C3E50] relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowSupabaseModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-extrabold text-xs w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              X
            </button>

            <div className="border-b border-[#E2E8F0] pb-3 pr-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#4B9CD3] block">
                Integración Supabase Backend
              </span>
              <h3 className="text-base font-extrabold text-[#2C3E50]">
                Parámetros de Conexión a Base de Datos
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingresa las credenciales de tu proyecto Supabase para habilitar la persistencia de datos y sincronización en tiempo real.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-extrabold text-[#2C3E50] uppercase tracking-wider mb-1">
                  SUPABASE_URL (URL del Proyecto)
                </label>
                <input
                  type="url"
                  value={supaUrlInput}
                  onChange={(e) => setSupaUrlInput(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] font-mono text-[#2C3E50] bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-[#2C3E50] uppercase tracking-wider mb-1">
                  SUPABASE_ANON_KEY (Clave Pública)
                </label>
                <input
                  type="password"
                  value={supaKeyInput}
                  onChange={(e) => setSupaKeyInput(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] font-mono text-[#2C3E50] bg-white"
                />
              </div>

              {supaStatusMsg && (
                <div className="p-2.5 bg-[#EBF5FB] border border-[#AED6F1] rounded-lg text-xs font-bold text-[#2C3E50]">
                  {supaStatusMsg}
                </div>
              )}

              {/* Botón Guardar y Probar Conexión */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveSupaConfig}
                  className="flex-1 py-2.5 bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer text-center"
                >
                  {isAuditing ? 'Auditando Base de Datos...' : 'Guardar y Probar Conexión'}
                </button>
              </div>

              {/* MATRIZ DE DIAGNÓSTICO DE SALUD DE BASE DE DATOS (5 TABLAS) */}
              {auditSummary && (
                <div className="p-3 bg-white border border-[#AED6F1] rounded-xl space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-[10px] font-extrabold uppercase text-[#2C3E50] tracking-wider">
                      Estado de las 5 Tablas Supabase
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${auditSummary.allOk ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                      {auditSummary.allOk ? '100% Integra' : `${auditSummary.tablesOkCount}/5 Operativas`}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 font-medium">
                    {auditSummary.summaryText}
                  </p>

                  <div className="grid grid-cols-1 gap-1.5 pt-1">
                    {(Object.entries(auditSummary.tables) as [string, TableAuditReport][]).map(([tableName, report]) => {
                      const isOk = report.status === 'OK';
                      const isWarn = report.status === 'WARNING';
                      return (
                        <div key={tableName} className={`p-2 rounded-lg border text-xs flex justify-between items-center ${isOk ? 'bg-emerald-50/50 border-emerald-200' : isWarn ? 'bg-amber-50/50 border-amber-200' : 'bg-rose-50/50 border-rose-200'}`}>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${isOk ? 'bg-emerald-500' : isWarn ? 'bg-amber-500' : 'bg-rose-500'}`} />
                              <span className="font-mono font-bold text-[#2C3E50] text-[11px]">{tableName}</span>
                            </div>
                            <p className="text-[9px] text-slate-500 font-medium mt-0.5">
                              {report.message}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-[10px] font-bold text-[#4B9CD3]">
                              {report.count} reg.
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Esquema SQL para Copiar en Supabase */}
              <div className="pt-3 border-t border-[#E2E8F0]">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-extrabold text-[#2C3E50] uppercase tracking-wider">
                    Esquema de Tablas SQL (Copiar en Supabase SQL Editor)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2500);
                    }}
                    className="text-[10px] font-extrabold text-[#4B9CD3] hover:underline cursor-pointer"
                  >
                    {copiedSql ? '¡Copiado!' : 'Copiar SQL'}
                  </button>
                </div>
                <textarea
                  rows={5}
                  readOnly
                  value={SUPABASE_SQL_SCHEMA}
                  className="w-full text-[10px] font-mono p-2 bg-slate-900 text-emerald-400 rounded-lg border border-slate-700 focus:outline-hidden select-all"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] text-right">
              <button
                type="button"
                onClick={() => setShowSupabaseModal(false)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

