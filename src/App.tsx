/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Usuario, Tarea, ProductoPromocion, RegistroVenta, Fichaje, Incidencia, Anuncio, AreaType, Feedback, InventarioItem, TurnoSemanal, Producto, Venta, AlertaPanico, CuadreCaja, ToastNotification, RankingWeights, DEFAULT_RANKING_WEIGHTS, UpsellRule, DEFAULT_UPSELL_RULES, DEFAULT_PRODUCTOS_CATALOGO } from './types';
import AnalyticsPanel from './components/AnalyticsPanel';
import Leaderboard from './components/Leaderboard';
import AdminDashboard from './components/AdminDashboard';
import EmployeeWorkspace from './components/EmployeeWorkspace';
import Login from './components/Login';
import { Logo } from './components/Logo';
import { PushToastContainer } from './components/PushToastContainer';
import { Salad, User, RotateCcw, Sparkles, Trophy, TrendingUp, ClipboardList, Bell, Smartphone, ShieldCheck, HelpCircle, Boxes, Calendar, UserCheck, Megaphone, CheckCircle, Clock, AlertCircle, AlertTriangle, Database } from 'lucide-react';
import { getGlobalMetrics, formatMoney } from './utils/metrics';
import {
  isSupabaseConfigured,
  fetchProfilesFromSupabase,
  fetchSalesFromSupabase,
  fetchCustomersFromSupabase,
  fetchInventoryFromSupabase,
  fetchTimeEntriesFromSupabase,
  saveFichajeToSupabase,
  deleteTimeEntryFromSupabase,
  insertSaleInSupabase,
  updateSaleInSupabase,
  upsertCustomerInSupabase,
  upsertInventoryInSupabase,
  deleteInventoryFromSupabase,
  upsertProfileInSupabase,
  updatePinInSupabase,
  actualizarPinEnSupabase,
  insertTimeEntryInSupabase,
  subscribeToRealtimeUpdates,
  fetchRankingWeightsFromSupabase,
  saveRankingWeightsToSupabase,
  fetchUpsellRulesFromSupabase,
  saveUpsellRulesToSupabase,
  fetchDailyTasksFromSupabase,
  fetchPinResetRequestsFromSupabase,
  insertDailyTaskInSupabase,
  updateDailyTaskStatusInSupabase,
  deleteDailyTaskFromSupabase,
  fetchCampaignProductsFromSupabase,
  clearOldCampaignProductsInSupabase,
  insertCampaignProductInSupabase,
  updateCampaignProductInSupabase,
  deleteCampaignProductFromSupabase,
  insertScheduleInSupabase,
  fetchSchedulesFromSupabase,
  fetchSchedulesForEmployeeFromSupabase,
  guardarProgresoEnSupabase,
  getSupabaseClient,
  updateTaskOrdersInSupabase,
  getLocalDateString,
  deleteAllDailyTasksFromSupabase,
  fetchAllAnnouncementsFromSupabase,
  fetchActiveAnnouncementsFromSupabase,
  insertAnnouncementInSupabase,
  updateAnnouncementInSupabase,
  deleteAnnouncementFromSupabase,
  fetchCatalogFromSupabase,
  upsertCatalogProductInSupabase,
  deleteCatalogProductFromSupabase,
  upsertCatalogProductsBatchInSupabase,
  upsertInventoryBatchInSupabase
} from './lib/supabaseClient';
import {
  inicializarSesionProgresoEmpleadoSeguro,
  renderizarSeccionProductividadAdminSeguro,
  activarSuscripcionTiempoRealSegura
} from './lib/realtimeProductivityModule';


export type AdminTab = 'tareas' | 'productos' | 'calidad' | 'anuncios' | 'empleados' | 'inventario' | 'horarios' | 'ventas' | 'supabase';

export default function App() {
 
  const [state, setState] = useState(() => {
    let initialCatalogo: Producto[] = DEFAULT_PRODUCTOS_CATALOGO;
    try {
      const saved = localStorage.getItem('coccole_productos_catalogo');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialCatalogo = parsed;
        }
      }
    } catch (e) {
      console.error('Error loading coccole_productos_catalogo:', e);
    }
    return {
      usuarios: [],
      tareas: [],
      productos: [],
      ventas: [],
      fichajes: [],
      incidencias: [],
      anuncios: [],
      feedbacks: [],
      inventario: [],
      horarios: [],
      productosCatalogo: initialCatalogo,
      ventasRegistradas: [],
      alertasPanico: [],
      cuadresCaja: [],
      clientes: []
    };
  });
  
  // Ponderación del Ranking de Colaboradores
  const [rankingWeights, setRankingWeights] = useState<RankingWeights>(DEFAULT_RANKING_WEIGHTS);

  // Reglas de Venta Sugerida (Cross-selling)
  const [upsellRules, setUpsellRules] = useState<UpsellRule[]>(DEFAULT_UPSELL_RULES);

  // Rol activo (Admin o ID de un Empleado específico) con persistencia robusta
  const [activeUserRole, setActiveUserRole] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedRole = localStorage.getItem('coccole_active_user_role');
        if (savedRole) return savedRole;

        const sesionStr = localStorage.getItem('coccole_sesion');
        if (sesionStr) {
          const parsed = JSON.parse(sesionStr);
          if (parsed?.id) return parsed.id;
          if (parsed?.rol === 'admin') return 'usr-admin';
          if (parsed?.rol === 'empleado') return parsed.nombre || 'usr-shelsy';
        }

        const sesionActual = (window as any).sesionActual;
        if (sesionActual?.id) return sesionActual.id;
        if (sesionActual?.rol === 'admin') return 'usr-admin';
        if (sesionActual?.rol === 'empleado') return sesionActual.nombre || 'usr-shelsy';
      }
    } catch (e) {}
    return null;
  });
  
  // Filtro de tiempo compartido ('diario', 'semanal', 'mensual')
  const [filtroGeneral, setFiltroGeneral] = useState<'diario' | 'semanal' | 'mensual'>('diario');

  // Pestaña activa y pestañas abiertas del administrador (Multi-Tab Admin)
  const [openTabs, setOpenTabs] = useState<AdminTab[]>(['tareas']);
  const [activeTab, setActiveTab] = useState<AdminTab>('tareas');

  const handleSelectTab = (tab: AdminTab) => {
    if (!openTabs.includes(tab)) {
      setOpenTabs(prev => [...prev, tab]);
    }
    setActiveTab(tab);
  };

  const handleCloseTab = (tabToClose: AdminTab) => {
    setOpenTabs(prev => {
      const nextTabs = prev.filter(t => t !== tabToClose);
      if (nextTabs.length === 0) {
        setActiveTab('tareas');
        return ['tareas'];
      }
      if (activeTab === tabToClose) {
        const idx = prev.indexOf(tabToClose);
        const fallback = nextTabs[idx] || nextTabs[idx - 1] || nextTabs[0];
        setActiveTab(fallback);
      }
      return nextTabs;
    });
  };

  const handleRequestPinResetNotification = (empId: string, empNombre: string, nota?: string) => {
    const inc: Incidencia = {
      id: `inc-pin-${Date.now()}`,
      usuario_id: empId,
      tipo: 'equipo',
      titulo: `Solicitud de Restablecimiento de PIN: ${empNombre}`,
      descripcion: nota ? `El colaborador ${empNombre} solicita apoyo para restablecer su PIN. Comentario: ${nota}` : `El colaborador ${empNombre} solicita apoyo al Administrador para consultar o restablecer su PIN de 4 dígitos.`,
      fecha: getLocalDateString(),
      estado: 'Pendiente'
    };
    setState(prev => ({
      ...prev,
      incidencias: [inc, ...prev.incidencias]
    }));
    pushNotification(`Solicitud de restablecimiento de PIN enviada para ${empNombre}.`, 'info');
  };

  const handleUpdateUserPin = async (userId: string, newPin: string, newPassword?: string): Promise<boolean> => {
    const pinLimpio = String(newPin || '').trim();
    const targetUser = state.usuarios.find(u => u.id === userId);
    const userName = targetUser?.nombre;

    if (isSupabaseConfigured()) {
      const success = await actualizarPinEnSupabase(userId, pinLimpio);
      if (!success) {
        pushNotification("No se pudo actualizar la contraseña en el servidor. Intenta de nuevo.", "alert");
        return false;
      }

      // Fuerza re-consulta para asegurar que el estado global lea la información recién guardada en Supabase
      const supaProfiles = await fetchProfilesFromSupabase();
      if (supaProfiles && supaProfiles.length > 0) {
        setState(prev => ({
          ...prev,
          usuarios: supaProfiles
        }));
      } else {
        setState(prev => ({
          ...prev,
          usuarios: prev.usuarios.map(u => {
            if (u.id === userId) {
              return {
                ...u,
                pin: pinLimpio,
                ...(newPassword ? { password: newPassword } : {})
              };
            }
            return u;
          })
        }));
      }
      return true;
    } else {
      // Sin Supabase configurado, actualizar estado local
      setState(prev => ({
        ...prev,
        usuarios: prev.usuarios.map(u => {
          if (u.id === userId) {
            return {
              ...u,
              pin: pinLimpio,
              ...(newPassword ? { password: newPassword } : {})
            };
          }
          return u;
        })
      }));
      return true;
    }
  };
  
  // Cargar ponderaciones de ranking y reglas de upsell al montar
  useEffect(() => {
    fetchRankingWeightsFromSupabase().then(weights => {
      if (weights) setRankingWeights(weights);
    });
    fetchUpsellRulesFromSupabase().then(rules => {
      if (rules && rules.length > 0) setUpsellRules(rules);
    });
  }, []);

  // Handler para guardar ponderación de ranking
  const handleUpdateRankingWeights = async (newWeights: RankingWeights) => {
    setRankingWeights(newWeights);
    await saveRankingWeightsToSupabase(newWeights);
    pushNotification('Ponderación del ranking guardada y recalculada exitosamente.', 'success');
  };

  // Handler para guardar reglas de venta sugerida
  const handleUpdateUpsellRules = async (newRules: UpsellRule[]) => {
    setUpsellRules(newRules);
    await saveUpsellRulesToSupabase(newRules);
    pushNotification('Reglas de venta sugerida actualizadas exitosamente.', 'success');
  };

  // Estado para Sincronización Manual de Datos
  const [isSyncing, setIsSyncing] = useState(false);

  // Función de Sincronización Manual y Recarga de Datos Silenciosa (Fetch In-Memory)
  const cargarDatosSilencioso = async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      // Función de Recarga Silenciosa (Fetch In-Memory) de lectura de datos completa
      const [supaTasks, supaSales, supaInventory, supaProfiles, supaWeights, supaUpsell, supaCampaignProds, supaAnnouncements, supaCatalog, supaTimeEntries] = await Promise.all([
        fetchDailyTasksFromSupabase(getLocalDateString()),
        fetchSalesFromSupabase(),
        fetchInventoryFromSupabase(),
        fetchProfilesFromSupabase(),
        fetchRankingWeightsFromSupabase(),
        fetchUpsellRulesFromSupabase(),
        fetchCampaignProductsFromSupabase(),
        fetchAllAnnouncementsFromSupabase(),
        fetchCatalogFromSupabase(),
        fetchTimeEntriesFromSupabase()
      ]);

      setState(prev => {
        // Preservación Estricta de la Sesión Activa mediante combinación selectiva de perfiles
        let updatedUsuarios = [...prev.usuarios];
        if (supaProfiles && supaProfiles.length > 0) {
          supaProfiles.forEach(supaU => {
            const idx = updatedUsuarios.findIndex(u => u.id === supaU.id);
            if (idx !== -1) {
              updatedUsuarios[idx] = { ...updatedUsuarios[idx], ...supaU };
            } else {
              updatedUsuarios.push(supaU);
            }
          });
        }

        if (supaCatalog && supaCatalog.length > 0) {
          try {
            localStorage.setItem('coccole_productos_catalogo', JSON.stringify(supaCatalog));
          } catch (e) {}
        }

        return {
          ...prev,
          usuarios: updatedUsuarios,
          tareas: supaTasks && supaTasks.length > 0 ? supaTasks : prev.tareas,
          ventasRegistradas: supaSales && supaSales.length > 0 ? supaSales : prev.ventasRegistradas,
          inventario: supaInventory !== null ? supaInventory : prev.inventario,
          productos: supaCampaignProds && supaCampaignProds.length > 0 ? supaCampaignProds : prev.productos,
          anuncios: supaAnnouncements && supaAnnouncements.length > 0 ? supaAnnouncements : prev.anuncios,
          productosCatalogo: supaCatalog && supaCatalog.length > 0 ? supaCatalog : prev.productosCatalogo,
          fichajes: supaTimeEntries && supaTimeEntries.length > 0 ? supaTimeEntries.map((f: any) => {
            const cleanFecha = (f.fecha && /^\d{4}-\d{2}-\d{2}$/.test(String(f.fecha).trim()))
              ? String(f.fecha).trim()
              : (f.clock_in ? getLocalDateString(f.clock_in) : (f.created_at ? getLocalDateString(f.created_at) : getLocalDateString()));
            return {
              id: f.id,
              usuario_id: f.usuario_id || f.empleado_id,
              fecha: cleanFecha,
              hora_entrada: f.hora_entrada,
              hora_salida: f.hora_salida,
              puntual: f.puntual !== undefined ? f.puntual : true,
              activo: !f.hora_salida
            };
          }) : prev.fichajes
        };
      });

      if (supaWeights) {
        setRankingWeights(supaWeights);
      }
      if (supaUpsell && supaUpsell.length > 0) {
        setUpsellRules(supaUpsell);
      }

      // Notificación Toast discreta de éxito
      triggerPushToast({
        kind: 'standard',
        type: 'success',
        text: 'Datos actualizados'
      });
      pushNotification('Datos actualizados', 'success');
    } catch (err) {
      console.error('Error al sincronizar datos con Supabase:', err);
      triggerPushToast({
        kind: 'standard',
        type: 'alert',
        text: 'Error de conexión al sincronizar datos.'
      });
      pushNotification('Error de conexión al sincronizar datos.', 'alert');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncData = async () => {
    await cargarDatosSilencioso();
  };

  
  // Registro de notificaciones/logs flotantes para feedback inmediato
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; time: string; type: 'success' | 'alert' | 'info' }>>([
    { id: '1', text: 'Bienvenido a Coccole Fit Ops. Datos de prueba inicializados.', time: 'Hace un momento', type: 'info' },
    { id: '2', text: 'Diego Torres registró asistencia puntual hoy.', time: 'Hace 5 min', type: 'success' }
  ]);

  // Sistema de notificaciones push flotantes
  const [activeToasts, setActiveToasts] = useState<ToastNotification[]>([]);

  // Effect para Sincronización Inicial con Supabase y Realtime Channel
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    async function syncFromSupabase() {
      try {
        const [supaProfiles, supaSales, supaCustomers, supaInventory, supaTimeEntries, supaCampaignProds, supaAnnouncements, supaCatalog] = await Promise.all([
          fetchProfilesFromSupabase(),
          fetchSalesFromSupabase(),
          fetchCustomersFromSupabase(),
          fetchInventoryFromSupabase(),
          fetchTimeEntriesFromSupabase(),
          fetchCampaignProductsFromSupabase(),
          fetchAllAnnouncementsFromSupabase(),
          fetchCatalogFromSupabase()
        ]);

        if (supaCatalog && supaCatalog.length > 0) {
          try {
            localStorage.setItem('coccole_productos_catalogo', JSON.stringify(supaCatalog));
          } catch (e) {}
        }

        setState(prev => ({
          ...prev,
          usuarios: supaProfiles && supaProfiles.length > 0 ? supaProfiles : prev.usuarios,
          ventasRegistradas: supaSales && supaSales.length > 0 ? supaSales : prev.ventasRegistradas,
          clientes: supaCustomers && supaCustomers.length > 0 ? supaCustomers : prev.clientes,
          inventario: supaInventory !== null ? supaInventory : prev.inventario,
          productos: supaCampaignProds && supaCampaignProds.length > 0 ? supaCampaignProds : prev.productos,
          anuncios: supaAnnouncements && supaAnnouncements.length > 0 ? supaAnnouncements : prev.anuncios,
          productosCatalogo: supaCatalog && supaCatalog.length > 0 ? supaCatalog : prev.productosCatalogo,
          fichajes: supaTimeEntries && supaTimeEntries.length > 0 ? supaTimeEntries.map((f: any) => ({
            id: f.id,
            usuario_id: f.empleado_id,
            fecha: f.hora_entrada?.split(' ')[0] || getLocalDateString(),
            hora_entrada: f.hora_entrada,
            hora_salida: f.hora_salida,
            puntual: true,
            activo: !f.hora_salida
          })) : prev.fichajes
        }));
      } catch (e) {
        console.warn('Error sincronizando con Supabase:', e);
      }
    }

    syncFromSupabase();

    // Suscripción Realtime en tablas sales, inventory, campaign_products, announcements y products_catalog para actualización en vivo
    const unsubscribe = subscribeToRealtimeUpdates(
      async () => {
        const sales = await fetchSalesFromSupabase();
        if (sales) {
          setState(prev => ({ ...prev, ventasRegistradas: sales }));
        }
      },
      async () => {
        const inv = await fetchInventoryFromSupabase();
        if (inv !== null) {
          setState(prev => ({ ...prev, inventario: inv }));
        }
      },
      async () => {
        const campaignProds = await fetchCampaignProductsFromSupabase();
        if (campaignProds && campaignProds.length > 0) {
          setState(prev => ({ ...prev, productos: campaignProds }));
        }
      },
      async () => {
        const announcements = await fetchAllAnnouncementsFromSupabase();
        if (announcements) {
          setState(prev => ({ ...prev, anuncios: announcements }));
        }
      },
      async () => {
        const freshCatalog = await fetchCatalogFromSupabase();
        if (freshCatalog && freshCatalog.length > 0) {
          setState(prev => ({ ...prev, productosCatalogo: freshCatalog }));
          try {
            localStorage.setItem('coccole_productos_catalogo', JSON.stringify(freshCatalog));
          } catch (e) {}
        }
      },
      async () => {
        const timeEntries = await fetchTimeEntriesFromSupabase();
        if (timeEntries && timeEntries.length > 0) {
          setState(prev => ({
            ...prev,
            fichajes: timeEntries.map((f: any) => {
              const cleanFecha = (f.fecha && /^\d{4}-\d{2}-\d{2}$/.test(String(f.fecha).trim()))
                ? String(f.fecha).trim()
                : (f.clock_in ? getLocalDateString(f.clock_in) : (f.created_at ? getLocalDateString(f.created_at) : getLocalDateString()));
              return {
                id: f.id,
                usuario_id: f.usuario_id || f.empleado_id,
                fecha: cleanFecha,
                hora_entrada: f.hora_entrada,
                hora_salida: f.hora_salida,
                puntual: f.puntual !== undefined ? f.puntual : true,
                activo: !f.hora_salida
              };
            })
          }));
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const triggerPushToast = (toastData: Omit<ToastNotification, 'id' | 'horaStr'>) => {
    const id = `push-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const horaStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const newToast: ToastNotification = {
      ...toastData,
      id,
      horaStr
    };

    setActiveToasts(prev => [newToast, ...prev]);

    // Permanecer visible durante 4.5 segundos
    setTimeout(() => {
      setActiveToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const handleDismissToast = (id: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- ALERTA SONORA DE PÁNICO CONFIGURABLE ---
  const [soundEnabled, setSoundEnabled] = useState(true);

  const playPanicSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 alert tone
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.error('Audio Context not allowed or failed:', e);
    }
  };

  useEffect(() => {
    const activeAlerts = state.alertasPanico?.filter(a => !a.atendida) || [];
    if (activeAlerts.length > 0 && soundEnabled && activeUserRole === 'usr-admin') {
      // play immediately
      playPanicSound();
      const interval = setInterval(() => {
        playPanicSound();
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [state.alertasPanico, soundEnabled, activeUserRole]);

  // Sincronizar cambios del estado general con localStorage
  useEffect(() => {
  }, [state]);

  // Sincronizar activeUserRole y coccole_sesion con localStorage de manera persistente
  useEffect(() => {
    if (activeUserRole) {
      try {
        localStorage.setItem('coccole_active_user_role', activeUserRole);
        const user = state.usuarios.find(u => u.id === activeUserRole);
        const rol = (user && user.rol === 'admin') || activeUserRole === 'usr-admin' ? 'admin' : 'empleado';
        const nombre = user?.nombre || (rol === 'admin' ? 'Administrador' : 'Empleado');
        const sesion = { rol, nombre, id: activeUserRole };
        localStorage.setItem('coccole_sesion', JSON.stringify(sesion));
        (window as any).sesionActual = sesion;
      } catch (e) {}
    } else {
      try {
        localStorage.removeItem('coccole_active_user_role');
        localStorage.removeItem('coccole_sesion');
        (window as any).sesionActual = { rol: null, nombre: null };
      } catch (e) {}
    }
  }, [activeUserRole, state.usuarios]);

  // Cargar tareas actualizadas de Supabase al cambiar de rol/usuario
  useEffect(() => {
    if (!activeUserRole || !isSupabaseConfigured()) return;
    
    async function loadFreshTasks() {
      try {
        const supaTasks = await fetchDailyTasksFromSupabase(getLocalDateString());
        if (supaTasks) {
          setState(prev => ({
            ...prev,
            tareas: supaTasks
          }));
        }
      } catch (err) {
        console.error("Error al cargar tareas diarias desde Supabase en transición de rol:", err);
      }
    }
    
    loadFreshTasks();
  }, [activeUserRole]);

  // Sincronizar cambios de sesión entre pestañas sin loops ni deslogueos automáticos
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'coccole_sesion' || e.key === 'coccole_active_user_role') {
        try {
          const savedRole = localStorage.getItem('coccole_active_user_role');
          if (savedRole && savedRole !== activeUserRole) {
            setActiveUserRole(savedRole);
          } else if (!savedRole && !localStorage.getItem('coccole_sesion') && activeUserRole !== null) {
            setActiveUserRole(null);
          }
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [activeUserRole]);

  useEffect(() => {
    if (!activeUserRole) return;
    const user = state.usuarios.find(u => u.id === activeUserRole);
    const rol = (user && user.rol === 'admin') || activeUserRole === 'usr-admin' ? 'admin' : 'empleado';
    const nombre = user?.nombre || (window as any).sesionActual?.nombre || (rol === 'admin' ? 'Administrador' : 'Shelsy');
    
    (window as any).sesionActual = { rol, nombre };

    const timer = setTimeout(() => {
      if (rol === 'admin') {
        const existingAdminPanel = document.getElementById('admin-productividad-panel');
        if (existingAdminPanel) {
          existingAdminPanel.remove();
        }
      } else {
        inicializarSesionProgresoEmpleadoSeguro(nombre);
      }
      activarSuscripcionTiempoRealSegura();
    }, 300);

    return () => clearTimeout(timer);
  }, [activeUserRole]);

  // Agregar una notificación al feed
  const pushNotification = (text: string, type: 'success' | 'alert' | 'info' = 'info') => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newNotif = {
      id: uniqueId,
      text,
      time: 'Hace un instante',
      type
    };
    setNotifications(prev => [newNotif, ...prev.slice(0, 4)]);
  };

  const handleCreateAdmin = (adminData: { nombre: string; email: string; password: string; clave_maestra: string }) => {
    const newAdminId = `usr-admin-${Date.now()}`;
    const newAdmin: Usuario = {
      id: newAdminId,
      nombre: adminData.nombre,
      rol: 'admin',
      email: adminData.email,
      password: adminData.password,
      clave_maestra: adminData.clave_maestra,
      foto_avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120'
    };

    setState(prev => ({
      ...prev,
      usuarios: [newAdmin, ...prev.usuarios]
    }));

    pushNotification(`Cuenta de Administrador Master "${newAdmin.nombre}" creada con éxito.`, 'success');
    return newAdminId;
  };

  // Si no hay usuario activo, mostramos el login
  if (!activeUserRole) {
    return (
      <Login
        usuarios={state.usuarios}
        onLogin={setActiveUserRole}
        onCreateAdmin={handleCreateAdmin}
        onRequestPinResetNotification={handleRequestPinResetNotification}
        onUpdateUserPin={handleUpdateUserPin}
      />
    );
  }

  // Obtener usuario activo actual
  const defaultAdminUser: Usuario = {
    id: 'usr-admin',
    nombre: (window as any).sesionActual?.nombre || 'Administrador',
    email: 'admin@coccolefit.com',
    rol: 'admin',
    pin: '1234'
  };
  const defaultEmployeeUser: Usuario = {
    id: activeUserRole || 'usr-shelsy',
    nombre: (window as any).sesionActual?.nombre || 'Shelsy',
    rol: 'empleado',
    pin: '1234'
  };
  const currentUser = state.usuarios.find(u => 
    u.id === activeUserRole || 
    (Boolean(activeUserRole) && u.nombre?.toLowerCase() === activeUserRole.toLowerCase())
  ) || (activeUserRole === 'usr-admin' ? defaultAdminUser : defaultEmployeeUser);

  // Obtener métricas globales del negocio
  const metrics = getGlobalMetrics(state.tareas, state.ventas, state.productos, filtroGeneral);

  // --- ACTIONS: GESTOR DE TAREAS ---
  
  const handleAddTarea = async (newTarea: Omit<Tarea, 'id'>) => {
    const assignedUser = state.usuarios.find(u => u.id === newTarea.asignado_a);
    const assignedName = assignedUser?.nombre || 'empleado';
    const TareaId = `tsk-${Date.now()}`;
    const tarea: Tarea = {
      ...newTarea,
      id: TareaId,
      fecha: newTarea.fecha || getLocalDateString()
    };

    if (!isSupabaseConfigured()) {
      setState(prev => ({
        ...prev,
        tareas: [tarea, ...prev.tareas]
      }));
      pushNotification(`Nueva tarea asignada a ${assignedName} (Local).`, 'info');
      return;
    }

    try {
      // 1. Guardar en la nube (Supabase-First)
      const ok = await insertDailyTaskInSupabase(tarea, assignedName);
      if (!ok) {
        console.error('Error Supabase INSERT: returned false');
        alert('Error al crear tarea en la nube: No se pudo guardar el registro.');
        triggerPushToast({
          kind: 'standard',
          type: 'alert',
          text: 'Fallo al guardar la tarea en la nube.'
        });
        pushNotification('Fallo al guardar la tarea en la nube.', 'alert');
        return;
      }

      // 2. Solo si fue exitoso en Supabase, refrescar silenciosamente
      await cargarDatosSilencioso();
      pushNotification(`Nueva tarea asignada a ${assignedName}.`, 'info');
    } catch (err: any) {
      console.error('Error in handleAddTarea:', err);
      alert('Error al crear la tarea en la nube: ' + (err?.message || err));
    }
  };

  const handleAddTareasBulk = async (newTareas: Omit<Tarea, 'id'>[]): Promise<boolean> => {
    if (newTareas.length === 0) return true;

    // Generar tareas con IDs completamente únicos usando timestamp, índice y sufijo aleatorio para evitar colisiones
    const processedTareas: Tarea[] = newTareas.map((t, idx) => {
      const uniqueSuffix = Math.random().toString(36).substring(2, 6);
      const TareaId = `tsk-${Date.now()}-${idx}-${uniqueSuffix}`;
      return {
        ...t,
        id: TareaId,
        fecha: t.fecha || getLocalDateString()
      };
    });

    if (!isSupabaseConfigured()) {
      setState(prev => ({
        ...prev,
        tareas: [...processedTareas, ...prev.tareas]
      }));
      pushNotification(`${processedTareas.length} tareas oficiales generadas correctamente (Local).`, 'info');
      return true;
    }

    try {
      // Registrar tareas una por una de forma simultánea en Supabase para evitar roundtrips secuenciales de recarga
      const promises = processedTareas.map(async (t) => {
        const assignedUser = state.usuarios.find(u => u.id === t.asignado_a);
        const assignedName = assignedUser?.nombre || 'empleado';
        return insertDailyTaskInSupabase(t, assignedName);
      });

      const results = await Promise.all(promises);
      const allOk = results.every(res => res === true);

      if (!allOk) {
        console.error('Error al insertar algunas tareas en Supabase');
        alert('Algunas tareas no se pudieron guardar en la nube. Verifique la conexión.');
      }

      // Sincronizar en memoria una sola vez al terminar todo el lote
      await cargarDatosSilencioso();
      pushNotification(`${processedTareas.length} tareas oficiales guardadas en lote correctamente.`, 'info');
      return allOk;
    } catch (err: any) {
      console.error('Error in handleAddTareasBulk:', err);
      alert('Error al registrar tareas en lote en la nube: ' + (err?.message || err));
      return false;
    }
  };

  const handleEditTarea = async (updatedTarea: Tarea) => {
    const originalTarea = state.tareas.find(t => t.id === updatedTarea.id);
    if (!originalTarea) return;

    if (!isSupabaseConfigured()) {
      setState(prev => ({
        ...prev,
        tareas: prev.tareas.map(t => t.id === updatedTarea.id ? updatedTarea : t)
      }));
      pushNotification(`Tarea "${updatedTarea.titulo}" actualizada correctamente (Local).`, 'info');
      return;
    }

    try {
      // 1. Guardar en la nube (Supabase-First)
      const assignedUser = state.usuarios.find(u => u.id === updatedTarea.asignado_a);
      const ok = await insertDailyTaskInSupabase(updatedTarea, assignedUser?.nombre);
      if (!ok) {
        console.error('Error Supabase UPDATE: returned false');
        alert('Error al actualizar la tarea en la nube: No se pudo guardar el registro.');
        triggerPushToast({
          kind: 'standard',
          type: 'alert',
          text: 'Fallo al guardar la edición de tarea en la nube.'
        });
        pushNotification('Fallo al actualizar la tarea en la nube.', 'alert');
        return;
      }

      // 2. Solo si fue exitoso en Supabase, refrescar silenciosamente
      await cargarDatosSilencioso();
      pushNotification(`Tarea "${updatedTarea.titulo}" actualizada correctamente.`, 'info');
    } catch (err: any) {
      console.error('Error in handleEditTarea:', err);
      alert('Error al actualizar la tarea en la nube: ' + (err?.message || err));
    }
  };

  const handleDeleteTarea = async (id: string) => {
    const deleted = state.tareas.find(t => t.id === id);
    if (!deleted) return;

    if (!isSupabaseConfigured()) {
      setState(prev => ({
        ...prev,
        tareas: prev.tareas.filter(t => t.id !== id)
      }));
      pushNotification(`Tarea eliminada: "${deleted.titulo}" (Local)`, 'alert');
      return;
    }

    try {
      // 1. Borrar en la nube (Supabase-First)
      const ok = await deleteDailyTaskFromSupabase(id);
      if (!ok) {
        console.error('Error Supabase DELETE: returned false');
        alert('Error al borrar en la nube: No se pudo eliminar el registro.');
        triggerPushToast({
          kind: 'standard',
          type: 'alert',
          text: 'Fallo al eliminar la tarea de la nube.'
        });
        pushNotification('Fallo al eliminar la tarea de la nube.', 'alert');
        return;
      }

      // 2. Solo si fue exitoso en Supabase, refrescar silenciosamente
      await cargarDatosSilencioso();
      pushNotification(`Tarea eliminada: "${deleted.titulo}"`, 'alert');
    } catch (err: any) {
      console.error('Error in handleDeleteTarea:', err);
      alert('Error inesperado al borrar la tarea en la nube: ' + (err?.message || err));
    }
  };

  const handleDeleteAllTareas = async (fecha?: string) => {
    const targetFecha = getLocalDateString(fecha);
    if (!isSupabaseConfigured()) {
      setState(prev => ({
        ...prev,
        tareas: prev.tareas.filter(t => t.fecha && getLocalDateString(t.fecha) !== targetFecha)
      }));
      pushNotification(`Todas las tareas de la fecha ${targetFecha} han sido eliminadas (Local)`, 'alert');
      return;
    }

    try {
      const ok = await deleteAllDailyTasksFromSupabase(targetFecha);
      if (ok) {
        setState(prev => ({
          ...prev,
          tareas: prev.tareas.filter(t => t.fecha && getLocalDateString(t.fecha) !== targetFecha)
        }));
        pushNotification(`Todas las tareas del ${targetFecha} fueron eliminadas en Supabase.`, 'alert');
      } else {
        throw new Error('No se pudo completar el borrado en Supabase.');
      }
    } catch (err: any) {
      console.error('Error in handleDeleteAllTareas:', err);
      throw err;
    }
  };

  const handleUpdateTaskOrders = async (orders: {id: string, orden: number}[]) => {
    setState(prev => ({
      ...prev,
      tareas: prev.tareas.map(t => {
        const orderMatch = orders.find(o => o.id === t.id);
        if (orderMatch) {
          return { ...t, orden: orderMatch.orden };
        }
        return t;
      })
    }));
    await updateTaskOrdersInSupabase(orders);
    await cargarDatosSilencioso();
  };

  const handleUpdateTareaEstado = async (
    id: string,
    estado: 'Pendiente' | 'En proceso' | 'Completada',
    foto_url?: string,
    nota_evidencia?: string
  ) => {
    const originalTask = state.tareas.find(t => t.id === id);
    if (!originalTask) return;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // 1. Actualización optimista INMEDIATA del estado local en React (0ms de latencia)
    setState(prev => ({
      ...prev,
      tareas: prev.tareas.map(t => {
        if (t.id === id) {
          const updated: Tarea = { ...t, estado };
          if (estado === 'En proceso') {
            updated.hora_inicio = t.hora_inicio || timeStr;
            updated.started_at = t.started_at || now.toISOString();
          } else if (estado === 'Completada') {
            updated.hora_fin = t.hora_fin || timeStr;
            updated.completed_at = t.completed_at || now.toISOString();
            if (foto_url) updated.foto_url = foto_url;
            if (nota_evidencia) updated.nota_evidencia = nota_evidencia;
          } else {
            updated.hora_inicio = undefined;
            updated.hora_fin = undefined;
            updated.started_at = undefined;
            updated.completed_at = undefined;
          }
          return updated;
        }
        return t;
      })
    }));

    const label = estado === 'Completada' ? 'completó' : estado === 'En proceso' ? 'inició' : 'marcó como pendiente';
    pushNotification(`${currentUser.nombre} ${label} la tarea: "${originalTask.titulo}"`, estado === 'Completada' ? 'success' : 'info');

    if (!isSupabaseConfigured()) return;

    try {
      // 2. Guardar en Supabase en segundo plano sin congelar la UI
      const isCompleted = estado === 'Completada';
      const success = await updateDailyTaskStatusInSupabase(
        id,
        estado,
        isCompleted,
        foto_url,
        nota_evidencia,
        estado === 'En proceso' ? (originalTask.hora_inicio || timeStr) : undefined,
        estado === 'Completada' ? (originalTask.hora_fin || timeStr) : undefined
      );

      if (success) {
        const assignedUser = state.usuarios.find(u => u.id === originalTask.asignado_a);
        const empName = assignedUser?.nombre || currentUser.nombre;
        if (empName) {
          const hoyStr = getLocalDateString();
          const userTasksRaw = state.tareas.filter(t => 
            (t.asignado_a === (assignedUser?.id || currentUser.id) || t.asignado_a === empName || !t.asignado_a) &&
            (!t.fecha || getLocalDateString(t.fecha) === hoyStr)
          );
          const deduplicatedMap = new Map<string, Tarea>();
          userTasksRaw.forEach(t => {
            const key = (t.titulo || '').trim().toLowerCase();
            const isComp = t.id === id ? estado === 'Completada' : t.estado === 'Completada';
            if (!deduplicatedMap.has(key)) {
              deduplicatedMap.set(key, { ...t, estado: isComp ? 'Completada' : t.estado });
            } else if (isComp) {
              deduplicatedMap.set(key, { ...t, estado: 'Completada' });
            }
          });
          const userTasks = Array.from(deduplicatedMap.values());
          const totalCount = userTasks.length > 24 && userTasks.length % 24 === 0 ? 24 : (userTasks.length > 0 ? Math.min(userTasks.length, 24) : 24);
          const completedCount = userTasks.filter(t => t.estado === 'Completada').length;
          guardarProgresoEnSupabase(empName, completedCount, totalCount, hoyStr);
        }
      }
    } catch (err: any) {
      console.error('Error al actualizar estado de la tarea en Supabase:', err);
    }
  };

  // --- ACTIONS: PRODUCTOS A PROMOCIONAR ---

  const handleAddProducto = async (newProd: Omit<ProductoPromocion, 'id'>) => {
    const fechaHoy = newProd.fecha || getLocalDateString();
    const mainProd: ProductoPromocion = {
      ...newProd,
      id: `prod-${Date.now()}`,
      fecha: fechaHoy
    };

    // Actualización local limpia sin duplicados por empleado
    setState(prev => {
      const existingFiltered = (prev.productos || []).filter(
        p => p.nombre_producto.trim().toLowerCase() !== mainProd.nombre_producto.trim().toLowerCase()
      );
      return {
        ...prev,
        productos: [mainProd, ...existingFiltered]
      };
    });

    try {
      const ok = await insertCampaignProductInSupabase(mainProd);
      if (ok) {
        pushNotification(`¡Campaña de ventas "${newProd.nombre_producto}" guardada exitosamente en Supabase!`, 'success');
      } else {
        pushNotification(`Atención: Supabase no permitió guardar. Ejecuta 'ALTER TABLE public.campaign_products DISABLE ROW LEVEL SECURITY;' en tu SQL Editor de Supabase.`, 'alert');
      }
      await cargarDatosSilencioso();
    } catch (err) {
      console.error('Error insertando producto de campaña:', err);
    }
  };

  const handleEditProducto = async (updatedProd: ProductoPromocion) => {
    // Actualización local para velocidad inmediata de interfaz
    setState(prev => ({
      ...prev,
      productos: prev.productos.map(p => p.id === updatedProd.id ? updatedProd : p)
    }));

    if (!isSupabaseConfigured()) {
      pushNotification(`Se actualizó "${updatedProd.nombre_producto}" en la campaña diaria.`, 'success');
      return;
    }

    try {
      const ok = await updateCampaignProductInSupabase(updatedProd);
      if (ok) {
        pushNotification(`¡Sincronizado! Se actualizó "${updatedProd.nombre_producto}" en la nube.`, 'success');
      } else {
        pushNotification(`Se actualizó "${updatedProd.nombre_producto}" localmente (Error al sincronizar)`, 'info');
      }
      await cargarDatosSilencioso();
    } catch (err) {
      console.error('Error actualizando producto de campaña en Supabase:', err);
    }
  };

  const handleDeleteProducto = async (id: string) => {
    const prodToDelete = state.productos.find(p => p.id === id);
    if (!prodToDelete) return;

    // Actualización local para velocidad inmediata de interfaz
    setState(prev => ({
      ...prev,
      productos: prev.productos.filter(p => p.id !== id)
    }));

    if (!isSupabaseConfigured()) {
      pushNotification(`Se eliminó "${prodToDelete.nombre_producto}" de la campaña diaria.`, 'info');
      return;
    }

    try {
      const ok = await deleteCampaignProductFromSupabase(id);
      if (ok) {
        pushNotification(`¡Sincronizado! Se eliminó "${prodToDelete.nombre_producto}" de la nube.`, 'info');
      } else {
        pushNotification(`Se eliminó "${prodToDelete.nombre_producto}" localmente (Error al borrar de Supabase)`, 'info');
      }
      await cargarDatosSilencioso();
    } catch (err) {
      console.error('Error eliminando producto de campaña de Supabase:', err);
    }
  };

  // --- ACTIONS: VENTAS SUGERIDAS (+1 CONTADOR EXPRESS) ---

  const handleAddVentaSugerida = (producto_id: string, usuario_id: string, metodo_pago: string) => {
    const todayStr = getLocalDateString();
    
    setState(prev => {
      // Buscar si ya hay un registro de este producto y usuario hoy para acumularlo, o crear uno nuevo
      const existingIdx = prev.ventas.findIndex(v => v.producto_id === producto_id && v.usuario_id === usuario_id && v.fecha === todayStr);
      
      let updatedVentas = [...prev.ventas];
      if (existingIdx !== -1) {
        updatedVentas[existingIdx] = {
          ...updatedVentas[existingIdx],
          unidades_contadas: updatedVentas[existingIdx].unidades_contadas + 1,
          metodo_pago
        };
      } else {
        const newVenta: RegistroVenta = {
          id: `v-${Date.now()}`,
          producto_id,
          usuario_id,
          fecha: todayStr,
          unidades_contadas: 1,
          metodo_pago
        };
        updatedVentas.push(newVenta);
      }
      
      return {
        ...prev,
        ventas: updatedVentas
      };
    });

    const prod = state.productos.find(p => p.id === producto_id);
    const prodCat = state.productosCatalogo?.find(pc => pc.nombre.toLowerCase().includes(prod?.nombre_producto.toLowerCase() || '') || pc.id === producto_id);
    const emp = state.usuarios.find(u => u.id === usuario_id);

    const nombreProd = prod?.nombre_producto || 'Venta Sugerida';
    const precioProd = prodCat?.precio || 45.00;

    triggerPushToast({
      kind: 'sale_ticket',
      colaborador: emp?.nombre || 'Empleado',
      articulos: [{ nombre: nombreProd, cantidad: 1 }],
      total: precioProd,
      metodoPago: metodo_pago || 'efectivo'
    });

    pushNotification(`¡${emp?.nombre} vendió 1 adición de ${nombreProd}! (+${prod?.puntos_por_unidad || 5} pts)`, 'success');
  };

  // --- ACTIONS: FICHAJE / ASISTENCIA ---

  const handleRegistrarFichaje = async (usuario_id: string, tipo: 'entrada' | 'salida', horaPersonalizada?: string) => {
    const todayStr = getLocalDateString();
    const now = new Date();
    const timeStr = horaPersonalizada || `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const empObj = state.usuarios.find(u => u.id === usuario_id);
    const empNombre = empObj?.nombre || 'Empleado';

    let punctual = true;
    if (horaPersonalizada) {
      const [h, m] = horaPersonalizada.split(':').map(Number);
      punctual = h < 8 || (h === 8 && m <= 5);
    } else {
      punctual = now.getHours() < 8 || (now.getHours() === 8 && now.getMinutes() <= 5);
    }

    let updatedFichajes = [...state.fichajes];
    let fichajeToSave: Fichaje | null = null;

    if (tipo === 'entrada') {
      const existingIdx = updatedFichajes.findIndex(f => (f.usuario_id === usuario_id || (f as any).empleado_id === usuario_id) && f.fecha === todayStr);
      if (existingIdx !== -1) {
        const updated = {
          ...updatedFichajes[existingIdx],
          hora_entrada: timeStr,
          puntual: punctual,
          activo: true
        };
        updatedFichajes[existingIdx] = updated;
        fichajeToSave = updated;
      } else {
        const newFichaje: Fichaje = {
          id: `f-${Date.now()}`,
          usuario_id,
          fecha: todayStr,
          hora_entrada: timeStr,
          puntual: punctual,
          activo: true
        };
        updatedFichajes.push(newFichaje);
        fichajeToSave = newFichaje;
      }
      pushNotification(`${empNombre} registró ENTRADA a las ${timeStr} (${punctual ? 'Puntual' : 'Retraso'}).`, punctual ? 'success' : 'info');
    } else {
      // Salida: actualizar registro activo de hoy
      updatedFichajes = updatedFichajes.map(f => {
        if ((f.usuario_id === usuario_id || (f as any).empleado_id === usuario_id) && (f.activo || !f.hora_salida)) {
          const updated = {
            ...f,
            hora_salida: timeStr,
            activo: false
          };
          fichajeToSave = updated;
          return updated;
        }
        return f;
      });
      pushNotification(`${empNombre} registró SALIDA a las ${timeStr}. Turno finalizado.`, 'info');
    }

    // Actualizar estado local inmediatamente
    setState(prev => ({
      ...prev,
      fichajes: updatedFichajes
    }));

    try {
      localStorage.setItem('coccole_fichajes', JSON.stringify(updatedFichajes));
    } catch (e) {}

    // Guardar en Supabase en la nube
    if (fichajeToSave) {
      try {
        const ok = await saveFichajeToSupabase(fichajeToSave, empNombre);
        if (ok) {
          console.log('✅ Fichaje sincronizado en Supabase con éxito');
        } else {
          console.warn('⚠️ No se pudo guardar fichaje en Supabase, conservado localmente');
        }
      } catch (err) {
        console.error('Error guardando fichaje en Supabase:', err);
      }
    }
  };

  const handleDeleteFichaje = async (id: string) => {
    setState(prev => {
      const updated = prev.fichajes.filter(f => f.id !== id);
      try {
        localStorage.setItem('coccole_fichajes', JSON.stringify(updated));
      } catch (e) {}
      return {
        ...prev,
        fichajes: updated
      };
    });

    try {
      await deleteTimeEntryFromSupabase(id);
    } catch (e) {
      console.error('Error eliminando fichaje en Supabase:', e);
    }

    pushNotification('Registro de asistencia eliminado de la bitácora.', 'info');
  };

  // --- ACTIONS: GESTION DE TRABAJADORES (EDITAR, ELIMINAR, CREAR) ---

  const handleCreateUsuario = async (newUsr: Omit<Usuario, 'id'>): Promise<boolean> => {
    try {
      const userId = typeof crypto !== 'undefined' && crypto.randomUUID ? `usr-${crypto.randomUUID()}` : `usr-${Date.now()}`;
      const emailVal = newUsr.email && newUsr.email.trim() ? newUsr.email.trim() : `${userId}@coccolefit.local`;
      const newUser: Usuario = {
        ...newUsr,
        id: userId,
        email: emailVal
      };

      const result = await upsertProfileInSupabase(newUser);
      if (result.success) {
        setState(prev => ({
          ...prev,
          usuarios: [...prev.usuarios, newUser]
        }));
        pushNotification('Colaborador registrado correctamente', 'success');
        return true;
      } else {
        console.error('Error al guardar perfil:', result.error);
        pushNotification(`Error al guardar perfil: ${result.error}`, 'alert');
        return false;
      }
    } catch (error) {
      console.error('Error al guardar perfil:', error);
      pushNotification(`Error al guardar perfil: ${error}`, 'alert');
      return false;
    }
  };

  const handleEditUsuario = async (updatedUsr: Usuario): Promise<boolean> => {
    try {
      const result = await upsertProfileInSupabase(updatedUsr);
      if (result.success) {
        setState(prev => ({
          ...prev,
          usuarios: prev.usuarios.map(u => u.id === updatedUsr.id ? updatedUsr : u)
        }));
        pushNotification(`Perfil de ${updatedUsr.nombre} actualizado correctamente.`, 'success');
        return true;
      } else {
        console.error('Error al guardar perfil:', result.error);
        pushNotification(`Error al guardar perfil: ${result.error}`, 'alert');
        return false;
      }
    } catch (error) {
      console.error('Error al guardar perfil:', error);
      pushNotification(`Error al guardar perfil: ${error}`, 'alert');
      return false;
    }
  };

  const handleDeleteUsuario = (id: string) => {
    if (id === 'usr-admin') {
      alert('No se puede eliminar al usuario administrador.');
      return;
    }
    setState(prev => {
      const emp = prev.usuarios.find(u => u.id === id);
      return {
        ...prev,
        usuarios: prev.usuarios.filter(u => u.id !== id),
        tareas: prev.tareas.filter(t => t.asignado_a !== id),
        fichajes: prev.fichajes.filter(f => f.usuario_id !== id)
      };
    });
    pushNotification('Trabajador eliminado del sistema de Coccole Fit.', 'alert');
  };

  // --- ACTIONS: REGISTRO DE FEEDBACK / CONVERSACIONES ---

  const handleAddFeedback = (newFb: Omit<Feedback, 'id' | 'fecha'>) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const fb: Feedback = {
      ...newFb,
      id: `fb-${Date.now()}`,
      fecha: dateStr
    };

    setState(prev => ({
      ...prev,
      feedbacks: [fb, ...(prev.feedbacks || [])]
    }));

    const empName = state.usuarios.find(u => u.id === newFb.usuario_id)?.nombre || 'Trabajador';
    pushNotification(`Conversación registrada para ${empName}: "${newFb.titulo}"`, 'success');
  };

  // --- ACTIONS: INCIDENCIAS ---

  const handleAddIncidencia = (newInc: Omit<Incidencia, 'id'>) => {
    const inc: Incidencia = {
      ...newInc,
      id: `inc-${Date.now()}`
    };
    setState(prev => ({
      ...prev,
      incidencias: [inc, ...prev.incidencias]
    }));
    pushNotification(`ALERTA: Reporte de ${newInc.tipo} enviado por ${currentUser.nombre}.`, 'alert');
  };

  const handleResolveIncidencia = (id: string) => {
    setState(prev => ({
      ...prev,
      incidencias: prev.incidencias.map(i => i.id === id ? { ...i, estado: 'Resuelta' } : i)
    }));
    pushNotification('Incidencia resuelta por el administrador.', 'success');
  };

  // --- ACTIONS: INVENTARIO INTEGRADO ---

  const handleUpdateStock = async (itemId: string, newStock: number, nombreUsuario: string) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    let targetItemToPersist: InventarioItem | null = null;

    setState(prev => {
      let extraIncidencia: Incidencia | null = null;
      let extraAlertaPanico: AlertaPanico | null = null;

      const updatedInventario = (prev.inventario || []).map(item => {
        if (item.id === itemId) {
          const updated = {
            ...item,
            stock_actual: Number(newStock),
            ultima_actualizacion_fecha: dateStr,
            ultima_actualizacion_por: nombreUsuario
          };
          targetItemToPersist = updated;
          
          if (updated.stock_actual <= updated.stock_minimo_alerta) {
            const hasIncidencia = prev.incidencias.some(i => i.titulo.includes(item.nombre) && i.estado === 'Pendiente');
            if (!hasIncidencia) {
              extraIncidencia = {
                id: `inc-auto-${Date.now()}`,
                usuario_id: 'usr-admin',
                fecha: new Date().toISOString().split('T')[0],
                titulo: `Alerta: Stock bajo en ${item.nombre}`,
                descripcion: `El nivel bajó a ${updated.stock_actual} ${item.unidad} (mínimo de seguridad: ${item.stock_minimo_alerta} ${item.unidad}).`,
                tipo: 'insumo',
                estado: 'Pendiente'
              };
            }
          }

          if (updated.stock_actual === 0) {
            extraAlertaPanico = {
              id: `panic-${Date.now()}`,
              usuario_id: currentUser.id,
              usuario_nombre: currentUser.nombre,
              insumo_id: itemId,
              insumo_nombre: item.nombre,
              fecha_hora: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} del ${now.getDate()}/${now.getMonth() + 1}`,
              atendida: false
            };
          }

          return updated;
        }
        return item;
      });

      return {
        ...prev,
        inventario: updatedInventario,
        incidencias: extraIncidencia ? [extraIncidencia, ...prev.incidencias] : prev.incidencias,
        alertasPanico: extraAlertaPanico ? [extraAlertaPanico, ...(prev.alertasPanico || [])] : (prev.alertasPanico || [])
      };
    });

    if (targetItemToPersist) {
      await upsertInventoryInSupabase(targetItemToPersist);
    }

    const item = (state.inventario || []).find(i => i.id === itemId);
    if (item) {
      if (Number(newStock) === 0) {
        pushNotification(`ALERTA DE PÁNICO: Se reportó STOCK CERO en "${item.nombre}" por ${currentUser.nombre}!`, 'alert');
        playPanicSound();
      } else if (Number(newStock) <= item.stock_minimo_alerta) {
        pushNotification(`Stock de "${item.nombre}" actualizado a ${newStock} ${item.unidad} (BAJO EL MÍNIMO!)`, 'alert');
      } else {
        pushNotification(`Stock de "${item.nombre}" actualizado a ${newStock} ${item.unidad}.`, 'success');
      }
    }
  };

  const handleAtenderAlertaPanico = (alertaId: string) => {
    setState(prev => ({
      ...prev,
      alertasPanico: (prev.alertasPanico || []).map(a => a.id === alertaId ? { ...a, atendida: true } : a)
    }));
    pushNotification('La alerta de pánico ha sido atendida y reabastecida.', 'success');
  };

  const handleRegistrarCuadreCaja = (cuadre: Omit<CuadreCaja, 'id'>) => {
    const nuevoCuadre: CuadreCaja = {
      ...cuadre,
      id: `cuadre-${Date.now()}`
    };
    setState(prev => ({
      ...prev,
      cuadresCaja: [nuevoCuadre, ...(prev.cuadresCaja || [])]
    }));

    // Sincronizar Cierre de Turno / Cuadre en Supabase
    insertTimeEntryInSupabase(nuevoCuadre);

    const colaborador = cuadre.empleado_nombre || cuadre.usuario_nombre || 'Colaborador';
    const ef = cuadre.efectivo_esperado || 0;
    const tar = cuadre.tarjeta_esperado || 0;
    const tr = cuadre.transferencia_esperado || 0;
    const rap = cuadre.rappi_esperado || 0;
    const totalGeneral = ef + tar + tr + rap;

    const dif = cuadre.diferencia_total ?? ((cuadre.efectivo_contado || 0) - ef);
    let estadoValidacion = "Efectivo Conciliado (Sin Diferencia)";
    if (Math.abs(dif) >= 0.01) {
      if (dif < 0) {
        estadoValidacion = `Diferencia en Efectivo: -$${Math.abs(dif).toFixed(2)} (Faltante en caja)`;
      } else {
        estadoValidacion = `Diferencia en Efectivo: +$${dif.toFixed(2)} (Sobrante en caja)`;
      }
    }

    triggerPushToast({
      kind: 'cash_closure',
      colaborador,
      totalGeneral,
      desglose: {
        efectivo: ef,
        tarjeta: tar,
        transferencia: tr,
        rappi: rap
      },
      estadoValidacion
    });

    pushNotification(`Cierre de caja de ${colaborador} enviado a revisión. Total: $${totalGeneral.toFixed(2)}`, 'success');
  };

  const handleConfirmarLecturaAnuncio = (anuncioId: string, usuarioId: string) => {
    setState(prev => ({
      ...prev,
      anuncios: prev.anuncios.map(an => {
        if (an.id === anuncioId) {
          const reads = an.lecturas_confirmadas || [];
          if (!reads.includes(usuarioId)) {
            return {
              ...an,
              lecturas_confirmadas: [...reads, usuarioId]
            };
          }
        }
        return an;
      })
    }));
    pushNotification('Confirmación de lectura enviada correctamente.', 'success');
  };

  const handleDuplicarHorarios = () => {
    setState(prev => {
      const baseTurnos = prev.horarios && prev.horarios.length > 0 ? prev.horarios : [
        { id: 'sch-1', usuario_id: 'usr-1', dia_semana: 'Lunes' as const, hora_entrada: '08:00', hora_salida: '16:00', nota: 'Apertura' },
        { id: 'sch-2', usuario_id: 'usr-1', dia_semana: 'Martes' as const, hora_entrada: '08:00', hora_salida: '16:00', nota: 'Apertura' },
        { id: 'sch-3', usuario_id: 'usr-1', dia_semana: 'Miércoles' as const, hora_entrada: '08:00', hora_salida: '16:00', nota: 'Apertura' },
        { id: 'sch-4', usuario_id: 'usr-2', dia_semana: 'Jueves' as const, hora_entrada: '12:00', hora_salida: '20:00', nota: 'Tarde' },
        { id: 'sch-5', usuario_id: 'usr-2', dia_semana: 'Viernes' as const, hora_entrada: '12:00', hora_salida: '20:00', nota: 'Tarde' },
        { id: 'sch-6', usuario_id: 'usr-3', dia_semana: 'Sábado' as const, hora_entrada: '09:00', hora_salida: '17:00', nota: 'Finde' },
      ];
      
      const duplicated = baseTurnos.map(t => ({
        ...t,
        id: `sch-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      }));
      
      return {
        ...prev,
        horarios: duplicated
      };
    });
    pushNotification('Se duplicaron con éxito todos los horarios de la semana anterior para la semana activa actual.', 'success');
  };

  const handleSaveInventarioItem = async (item: Omit<InventarioItem, 'id'> & { id?: string }) => {
    let savedItem: InventarioItem;
    if (item.id) {
      const items = state.inventario || [];
      const existing = items.find(i => i.id === item.id);
      savedItem = {
        ...existing,
        ...item,
        ultima_actualizacion_fecha: new Date().toISOString().substring(0, 16).replace('T', ' '),
        ultima_actualizacion_por: 'Administrador'
      } as InventarioItem;
      setState(prev => {
        const currentItems = prev.inventario || [];
        const updated = currentItems.map(i => i.id === item.id ? savedItem : i);
        return { ...prev, inventario: updated };
      });
      pushNotification(`Item de inventario "${item.nombre}" modificado exitosamente.`, 'success');
    } else {
      savedItem = {
        ...item,
        id: `inv-${Date.now()}`,
        ultima_actualizacion_fecha: new Date().toISOString().substring(0, 16).replace('T', ' '),
        ultima_actualizacion_por: 'Administrador'
      } as InventarioItem;
      setState(prev => {
        const currentItems = prev.inventario || [];
        return { ...prev, inventario: [...currentItems, savedItem] };
      });
      pushNotification(`Nuevo item "${item.nombre}" ingresado al inventario.`, 'success');
    }

    try {
      await upsertInventoryInSupabase(savedItem);
      const latestInventory = await fetchInventoryFromSupabase();
      if (latestInventory !== null) {
        setState(prev => ({ ...prev, inventario: latestInventory }));
      }
    } catch (err) {
      console.error('Error guardando inventario en Supabase:', err);
    }
  };

  const handleBulkSaveInventario = async (items: InventarioItem[]) => {
    if (!items || items.length === 0) return;

    setState(prev => {
      const existing = [...(prev.inventario || [])];
      items.forEach(newItem => {
        const idx = existing.findIndex(i => i.nombre.toLowerCase().trim() === newItem.nombre.toLowerCase().trim());
        if (idx >= 0) {
          existing[idx] = { ...existing[idx], ...newItem };
        } else {
          existing.push(newItem);
        }
      });
      return { ...prev, inventario: existing };
    });

    if (isSupabaseConfigured()) {
      try {
        await upsertInventoryBatchInSupabase(items);
        const latestInventory = await fetchInventoryFromSupabase();
        if (latestInventory !== null) {
          setState(prev => ({ ...prev, inventario: latestInventory }));
        }
      } catch (err) {
        console.error('Error guardando lote de inventario en Supabase:', err);
      }
    }
  };

  const handleDeleteInventarioItem = async (id: string) => {
    const deleted = (state.inventario || []).find(i => i.id === id);
    setState(prev => {
      const filtered = (prev.inventario || []).filter(i => i.id !== id);
      return { ...prev, inventario: filtered };
    });
    if (deleted) {
      pushNotification(`Eliminado de inventario: "${deleted.nombre}"`, 'alert');
    }

    try {
      await deleteInventoryFromSupabase(id);
      const latestInventory = await fetchInventoryFromSupabase();
      if (latestInventory !== null) {
        setState(prev => ({ ...prev, inventario: latestInventory }));
      }
    } catch (err) {
      console.error('Error eliminando inventario de Supabase:', err);
    }
  };

  // --- ACTIONS: GESTIÓN DE HORARIOS Y TURNOS ---

  const handleSaveTurno = (turno: Omit<TurnoSemanal, 'id'> & { id?: string }) => {
    const emp = state.usuarios.find(u => u.id === turno.usuario_id);
    const empNombre = emp?.nombre || turno.usuario_id;

    insertScheduleInSupabase({
      id: turno.id || ('shift_' + Date.now()),
      usuario_id: turno.usuario_id,
      employee_name: empNombre,
      dia_semana: turno.dia_semana,
      hora_entrada: turno.hora_entrada,
      hora_salida: turno.hora_salida,
      nota: turno.nota
    });

    setState(prev => {
      const turnos = prev.horarios || [];
      if (turno.id) {
        const updated = turnos.map(t => t.id === turno.id ? { ...t, ...turno } as TurnoSemanal : t);
        pushNotification(`Turno de ${empNombre} actualizado para el ${turno.dia_semana}.`, 'success');
        return { ...prev, horarios: updated };
      } else {
        const newTurno: TurnoSemanal = {
          ...turno,
          id: `t-${Date.now()}`
        };
        pushNotification(`Turno programado para ${empNombre} el ${turno.dia_semana}.`, 'success');
        return { ...prev, horarios: [...turnos, newTurno] };
      }
    });
  };

  const handleDeleteTurno = (id: string) => {
    setState(prev => {
      const filtered = (prev.horarios || []).filter(t => t.id !== id);
      pushNotification('Turno removido del calendario de la semana.', 'alert');
      return { ...prev, horarios: filtered };
    });
  };

  // --- ACTIONS: ANUNCIOS ---

  const handleAddAnuncio = async (newAn: Anuncio | Omit<Anuncio, 'id'>) => {
    const hasPreassignedId = Boolean((newAn as any).id);
    const anId = (newAn as any).id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `an-${Date.now()}`);
    const an: Anuncio = {
      ...newAn,
      id: anId,
      activo: newAn.activo !== undefined ? newAn.activo : true,
      fecha_creacion: newAn.fecha_creacion || new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      anuncios: [an, ...prev.anuncios.filter(a => a.id !== anId)]
    }));
    pushNotification('Nuevo comunicado publicado en el tablero.', 'success');

    // Si no fue guardado previamente con ID asignado, guardar en Supabase
    if (!hasPreassignedId && isSupabaseConfigured()) {
      try {
        await insertAnnouncementInSupabase({
          titulo: an.titulo,
          contenido: an.contenido,
          activo: an.activo !== false,
          prioridad: 'normal',
          fecha_creacion: an.fecha_creacion
        });
      } catch (err) {
        console.error('Error al insertar comunicado en Supabase:', err);
      }
    }
  };

  const handleDeleteAnuncio = async (id: string) => {
    setState(prev => ({
      ...prev,
      anuncios: prev.anuncios.filter(an => an.id !== id)
    }));
    pushNotification('Comunicado eliminado del sistema.', 'alert');

    if (isSupabaseConfigured()) {
      try {
        await deleteAnnouncementFromSupabase(id);
      } catch (err) {
        console.error('Error al eliminar comunicado en Supabase:', err);
      }
    }
  };

  const handleToggleAnuncioActivo = async (id: string, activo: boolean) => {
    setState(prev => ({
      ...prev,
      anuncios: prev.anuncios.map(an => an.id === id ? { ...an, activo } : an)
    }));
    pushNotification(activo ? 'Comunicado activado.' : 'Comunicado desactivado.', 'info');

    if (isSupabaseConfigured()) {
      try {
        await updateAnnouncementInSupabase(id, { activo });
      } catch (err) {
        console.error('Error al actualizar estado del comunicado en Supabase:', err);
      }
    }
  };

  // --- ACTIONS: CATÁLOGO DE PRODUCTOS (CÓDIGOS Y PRECIOS) ---

  const handleSaveProductoCatalogo = async (prod: Omit<Producto, 'id'> & { id?: string }) => {
    const finalId = prod.id || `cat-${Date.now()}`;
    const cleanCodigo = (prod.codigo || '').toUpperCase().trim();
    const cleanNombre = (prod.nombre || '').trim();
    const vb = Number(prod.valor_bruto != null ? prod.valor_bruto : prod.precio) || 0;
    const desc = Number(prod.descuento || 0);
    const subt = Number(prod.subtotal != null ? prod.subtotal : Math.max(0, vb - desc));
    const imp = Number(prod.impuesto_cargo || 0);
    const tot = Number(prod.total != null ? prod.total : prod.precio) || (subt + imp);
    const costo = Number(prod.precio_costo || 0);
    const ganancia = Number(prod.margen_ganancia != null ? prod.margen_ganancia : (tot - costo));

    const productToSave: Producto = {
      ...prod,
      id: finalId,
      codigo: cleanCodigo,
      nombre: cleanNombre,
      categoria: prod.categoria || 'General',
      valor_bruto: vb,
      descuento: desc,
      subtotal: subt,
      impuesto_cargo: imp,
      total: tot,
      precio: tot,
      precio_costo: costo,
      margen_ganancia: ganancia
    };

    setState(prev => {
      const catalog = prev.productosCatalogo || [];
      const isExisting = catalog.some(p => p.id === productToSave.id || p.codigo === productToSave.codigo);
      let updatedCatalog: Producto[];
      if (isExisting) {
        updatedCatalog = catalog.map(p => (p.id === productToSave.id || p.codigo === productToSave.codigo) ? productToSave : p);
        pushNotification(`Producto "${productToSave.nombre}" actualizado en catálogo.`, 'success');
      } else {
        updatedCatalog = [...catalog, productToSave];
        pushNotification(`Producto "${productToSave.nombre}" registrado con código ${productToSave.codigo}.`, 'success');
      }
      try {
        localStorage.setItem('coccole_productos_catalogo', JSON.stringify(updatedCatalog));
      } catch (e) {
        console.error('Error saving coccole_productos_catalogo to localStorage:', e);
      }
      return { ...prev, productosCatalogo: updatedCatalog };
    });

    if (isSupabaseConfigured()) {
      try {
        const saved = await upsertCatalogProductInSupabase(productToSave);
        if (saved) {
          triggerPushToast({
            kind: 'standard',
            type: 'success',
            text: `Producto ${productToSave.codigo} sincronizado en la nube de Supabase.`
          });
        } else {
          console.warn('No se pudo confirmar guardado en Supabase para:', productToSave.codigo);
        }
      } catch (err) {
        console.error('Error al guardar producto en catálogo de Supabase:', err);
      }
    }
  };

  const handleBulkSaveProductosCatalogo = async (newProducts: Omit<Producto, 'id'>[]) => {
    if (!newProducts || newProducts.length === 0) return;

    const processedProducts: Producto[] = newProducts.map((p, idx) => {
      const finalId = `cat-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`;
      const cleanCodigo = (p.codigo || '').toUpperCase().trim();
      const cleanNombre = (p.nombre || '').trim();
      const vb = Number(p.valor_bruto != null ? p.valor_bruto : p.precio) || 0;
      const desc = Number(p.descuento || 0);
      const subt = Number(p.subtotal != null ? p.subtotal : Math.max(0, vb - desc));
      const imp = Number(p.impuesto_cargo || 0);
      const tot = Number(p.total != null ? p.total : p.precio) || (subt + imp);
      const costo = Number(p.precio_costo || 0);
      const ganancia = Number(p.margen_ganancia != null ? p.margen_ganancia : (tot - costo));

      return {
        ...p,
        id: finalId,
        codigo: cleanCodigo,
        nombre: cleanNombre,
        categoria: p.categoria || 'General',
        valor_bruto: vb,
        descuento: desc,
        subtotal: subt,
        impuesto_cargo: imp,
        total: tot,
        precio: tot,
        precio_costo: costo,
        margen_ganancia: ganancia
      };
    });

    setState(prev => {
      const catalog = prev.productosCatalogo || [];
      const updatedCatalog = [...catalog];

      processedProducts.forEach(newP => {
        const existingIdx = updatedCatalog.findIndex(cp => cp.codigo === newP.codigo);
        if (existingIdx >= 0) {
          updatedCatalog[existingIdx] = { ...updatedCatalog[existingIdx], ...newP };
        } else {
          updatedCatalog.push(newP);
        }
      });

      try {
        localStorage.setItem('coccole_productos_catalogo', JSON.stringify(updatedCatalog));
      } catch (e) {
        console.error('Error saving coccole_productos_catalogo to localStorage:', e);
      }

      pushNotification(`Carga masiva completada: ${processedProducts.length} productos procesados.`, 'success');
      return { ...prev, productosCatalogo: updatedCatalog };
    });

    if (isSupabaseConfigured()) {
      try {
        const ok = await upsertCatalogProductsBatchInSupabase(processedProducts);
        if (ok) {
          triggerPushToast({
            kind: 'standard',
            type: 'success',
            text: `Se sincronizaron ${processedProducts.length} productos en la nube de Supabase.`
          });
        }
      } catch (err) {
        console.error('Error en carga masiva a Supabase:', err);
      }
    }
  };

  const handleDeleteProductoCatalogo = async (id: string) => {
    setState(prev => {
      const filtered = (prev.productosCatalogo || []).filter(p => p.id !== id);
      try {
        localStorage.setItem('coccole_productos_catalogo', JSON.stringify(filtered));
      } catch (e) {
        console.error('Error saving coccole_productos_catalogo to localStorage:', e);
      }
      pushNotification('Producto removido del catálogo de ventas.', 'alert');
      return { ...prev, productosCatalogo: filtered };
    });

    if (isSupabaseConfigured()) {
      try {
        await deleteCatalogProductFromSupabase(id);
      } catch (err) {
        console.error('Error al eliminar producto del catálogo en Supabase:', err);
      }
    }
  };

  // --- ACTIONS: REGISTRO DE VENTAS DEL DÍA (EMPLEADOS) ---

  const handleRegistrarVenta = (nuevaVenta: Omit<Venta, 'id' | 'vendedor_nombre'>) => {
    const seller = state.usuarios.find(u => u.id === nuevaVenta.usuario_id || u.id === (nuevaVenta as any).cajero_id);
    const vendedorNombre = seller?.nombre || (nuevaVenta as any).cajero_nombre || 'Empleado';
    const venta: Venta = {
      ...nuevaVenta,
      id: `vreg-${Date.now()}`,
      vendedor_nombre: vendedorNombre
    };

    let updatedClientes = [...(state.clientes || [])];
    if (nuevaVenta.cliente_telefono) {
      const cleanPhone = nuevaVenta.cliente_telefono.trim();
      const existingIdx = updatedClientes.findIndex(
        c => c.telefono.replace(/\D/g, '') === cleanPhone.replace(/\D/g, '') || c.telefono === cleanPhone
      );
      const today = getLocalDateString();

      if (existingIdx >= 0) {
        const existing = updatedClientes[existingIdx];
        const updatedCli = {
          ...existing,
          nombre: nuevaVenta.cliente_nombre || existing.nombre,
          total_compras_monto: existing.total_compras_monto + nuevaVenta.total,
          total_compras_count: existing.total_compras_count + 1,
          ultima_fecha_compra: today
        };
        updatedClientes[existingIdx] = updatedCli;
        upsertCustomerInSupabase(updatedCli);
      } else if (nuevaVenta.cliente_nombre) {
        const newCli = {
          id: `cli-${Date.now()}`,
          nombre: nuevaVenta.cliente_nombre,
          telefono: cleanPhone,
          fecha_registro: today,
          total_compras_monto: nuevaVenta.total,
          total_compras_count: 1,
          ultima_fecha_compra: today
        };
        updatedClientes.push(newCli);
        upsertCustomerInSupabase(newCli);
      }
    }

    setState(prev => ({
      ...prev,
      ventasRegistradas: [venta, ...(prev.ventasRegistradas || [])],
      clientes: updatedClientes
    }));

    // Sincronizar Venta en Supabase
    insertSaleInSupabase(venta);

    const rawItems = nuevaVenta.productos_vendidos || (nuevaVenta as any).productos || [];
    const articulos = rawItems.map((p: any) => ({
      nombre: p.nombre,
      cantidad: p.cantidad || 1
    }));

    triggerPushToast({
      kind: 'sale_ticket',
      colaborador: vendedorNombre,
      articulos: articulos.length > 0 ? articulos : [{ nombre: 'Venta Directa POS', cantidad: 1 }],
      total: nuevaVenta.total,
      metodoPago: nuevaVenta.metodo_pago || 'efectivo',
      clienteNombre: nuevaVenta.cliente_nombre,
      clienteTelefono: nuevaVenta.cliente_telefono
    });

    pushNotification(`¡Venta registrada con éxito por ${vendedorNombre}! Total: ${formatMoney(nuevaVenta.total)} (${nuevaVenta.metodo_pago || 'efectivo'})`, 'success');
  };

  const handleUpdateVenta = (ventaActualizada: Venta) => {
    setState(prev => {
      const updatedVentas = (prev.ventasRegistradas || []).map(v =>
        v.id === ventaActualizada.id ? ventaActualizada : v
      );

      let updatedClientes = [...(prev.clientes || [])];
      if (ventaActualizada.cliente_telefono) {
        const cleanPhone = ventaActualizada.cliente_telefono.trim();
        const existingIdx = updatedClientes.findIndex(
          c => c.telefono.replace(/\D/g, '') === cleanPhone.replace(/\D/g, '') || c.telefono === cleanPhone
        );
        if (existingIdx >= 0 && ventaActualizada.cliente_nombre) {
          updatedClientes[existingIdx] = {
            ...updatedClientes[existingIdx],
            nombre: ventaActualizada.cliente_nombre
          };
          upsertCustomerInSupabase(updatedClientes[existingIdx]);
        }
      }

      pushNotification(`Venta ${ventaActualizada.id} actualizada correctamente por el Administrador.`, 'success');
      return {
        ...prev,
        ventasRegistradas: updatedVentas,
        clientes: updatedClientes
      };
    });

    // Sincronizar Edición de Venta en Supabase
    updateSaleInSupabase(ventaActualizada);
  };

  const handleAnularVenta = (ventaId: string, motivo: string) => {
    let anuladaVenta: Venta | null = null;
    setState(prev => {
      const targetVenta = (prev.ventasRegistradas || []).find(v => v.id === ventaId);
      if (!targetVenta) return prev;

      anuladaVenta = {
        ...targetVenta,
        estado: 'Anulada' as const,
        motivo_anulacion: motivo
      };

      const updatedVentas = (prev.ventasRegistradas || []).map(v => {
        if (v.id === ventaId) {
          return anuladaVenta!;
        }
        return v;
      });

      let updatedClientes = [...(prev.clientes || [])];
      if (targetVenta.cliente_telefono) {
        const cleanPhone = targetVenta.cliente_telefono.trim();
        const existingIdx = updatedClientes.findIndex(
          c => c.telefono.replace(/\D/g, '') === cleanPhone.replace(/\D/g, '') || c.telefono === cleanPhone
        );
        if (existingIdx >= 0) {
          const existing = updatedClientes[existingIdx];
          const updatedCli = {
            ...existing,
            total_compras_monto: Math.max(0, existing.total_compras_monto - targetVenta.total),
            total_compras_count: Math.max(0, existing.total_compras_count - 1)
          };
          updatedClientes[existingIdx] = updatedCli;
          upsertCustomerInSupabase(updatedCli);
        }
      }

      pushNotification(`Venta anulada por el Administrador. Motivo: ${motivo}`, 'alert');

      return {
        ...prev,
        ventasRegistradas: updatedVentas,
        clientes: updatedClientes
      };
    });

    if (anuladaVenta!) {
      updateSaleInSupabase(anuladaVenta);
    }
  };

  // --- REINICIAR DATOS DEL SIMULADOR ---
  const handleResetData = () => {
    if (window.confirm('¿Seguro que deseas reiniciar los datos de simulación? Se borrará todo el historial creado.')) {
      // localStorage eliminado
      setActiveUserRole(null);
      setState({ usuarios: [], tareas: [], productos: [], ventas: [], fichajes: [], incidencias: [], anuncios: [], feedbacks: [], inventario: [], horarios: [], productosCatalogo: [], ventasRegistradas: [], alertasPanico: [], cuadresCaja: [], clientes: [] });
      triggerPushToast({
        kind: 'standard',
        type: 'success',
        text: 'Datos reiniciados con éxito'
      });
    }
  };

  return (
    <div className="w-full max-w-[1280px] mx-auto min-h-screen bg-slate-50 p-4 overflow-x-hidden text-[#2C3E50] flex flex-col antialiased font-sans">
      <PushToastContainer toasts={activeToasts} onDismiss={handleDismissToast} />
      
      {/* HEADER SUPERIOR */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-30 shadow-xs w-full">
        {/* Navbar top row */}
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col md:flex-row justify-between items-center gap-3">
          
          {/* Izquierda: Logotipo "COCCOLE FIT" y selector de roles */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            {/* Logo y título */}
            <div className="flex items-center gap-2 shrink-0">
              <Logo size="sm" />
              <div>
                <h1 className="font-bold text-base text-[#2C3E50] tracking-tight leading-none">
                  COCCOLE FIT
                </h1>
                <p className="text-[9px] text-gray-500 tracking-widest font-semibold leading-none mt-1">
                  Placer sin culpa
                </p>
              </div>
            </div>

            {/* Información del Usuario y Cerrar Sesión */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex flex-col text-right">
                <span className="text-sm font-bold text-[#2C3E50]">{currentUser.nombre}</span>
                <span className="text-[10px] font-bold text-[#4B9CD3] uppercase tracking-wider">{currentUser.rol === 'admin' ? 'Administrador' : 'Staff'}</span>
              </div>
              <button
                id="sync-data-button"
                onClick={handleSyncData}
                disabled={isSyncing}
                className="px-3 py-1.5 text-xs font-bold text-white bg-[#4B9CD3] hover:bg-[#3A85B8] active:bg-[#2C6F99] disabled:bg-[#4B9CD3]/60 disabled:cursor-not-allowed rounded-lg shadow-xs transition-all cursor-pointer shrink-0"
                title="Sincronizar datos con la nube"
              >
                {isSyncing ? 'Sincronizando...' : 'Actualizar Datos'}
              </button>
              <button
                id="btn-cerrar-sesion"
                onClick={(e) => {
                  e.preventDefault();
                  if (typeof (window as any).cerrarSesion === 'function') {
                    (window as any).cerrarSesion();
                  } else {
                    if ((window as any).sesionActual) {
                      (window as any).sesionActual = { rol: null, nombre: null };
                    }
                    localStorage.removeItem('coccole_sesion');
                    setActiveUserRole(null);
                    window.location.reload();
                  }
                }}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-[#2C3E50] border border-[#E2E8F0] hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>

          {/* Derecha: Botón de reset y simulador */}
          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            {/* Alarma sonora toggle button */}
            <button
              onClick={() => {
                setSoundEnabled(prev => !prev);
                pushNotification(soundEnabled ? 'Alarma sonora desactivada.' : 'Alarma sonora activada.', 'info');
              }}
              className={`p-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${
                soundEnabled 
                  ? 'bg-sky-50 text-sky-800 border-[#AED6F1]' 
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
              title="Activar/Desactivar Alerta Sonora de Stock Cero"
            >
              <span>{soundEnabled ? 'Alarma Activa' : 'Alarma Inactiva'}</span>
            </button>

            {/* Actualizar página */}
            <button
              onClick={() => window.location.reload()}
              className="p-1.5 text-slate-500 hover:text-blue-600 bg-white hover:bg-blue-50 border border-[#E2E8F0] hover:border-blue-200 rounded-lg transition-all"
              title="Actualizar página"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Abajo del Header: Menú principal con las pestañas (solo visible si es Admin) */}
        {currentUser.rol === 'admin' && (
          <div className="border-t border-slate-100 bg-slate-50/50">
            <div className="max-w-7xl mx-auto px-4 py-1.5">
              <nav className="flex flex-wrap items-center gap-1.5 w-full">
                <button
                  id="admin-tab-tareas"
                  onClick={() => {
                    handleSelectTab('tareas');
                    pushNotification('Ingresando al gestor de tareas diarias.', 'info');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'tareas'
                      ? 'bg-[#4B9CD3] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-[#EBF5FB]/60 hover:text-[#2C3E50]'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Tareas Diarias</span>
                </button>
                
                <button
                  id="admin-tab-productos"
                  onClick={() => {
                    handleSelectTab('productos');
                    pushNotification('Revisando el módulo de ventas sugeridas.', 'info');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'productos'
                      ? 'bg-[#4B9CD3] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-[#EBF5FB]/60 hover:text-[#2C3E50]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ventas Sugeridas</span>
                </button>

                <button
                  id="admin-tab-inventario"
                  onClick={() => {
                    handleSelectTab('inventario');
                    pushNotification('Accediendo al control de stock e inventario.', 'info');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'inventario'
                      ? 'bg-[#4B9CD3] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-[#EBF5FB]/60 hover:text-[#2C3E50]'
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Inventario</span>
                </button>

                <button
                  id="admin-tab-horarios"
                  onClick={() => {
                    handleSelectTab('horarios');
                    pushNotification('Abriendo la agenda de horarios y turnos semanales.', 'info');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'horarios'
                      ? 'bg-[#4B9CD3] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-[#EBF5FB]/60 hover:text-[#2C3E50]'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Horarios</span>
                </button>

                <button
                  id="admin-tab-calidad"
                  onClick={() => {
                    handleSelectTab('calidad');
                    pushNotification('Consultando el log de control de fichajes.', 'info');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'calidad'
                      ? 'bg-[#4B9CD3] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-[#EBF5FB]/60 hover:text-[#2C3E50]'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Fichajes</span>
                </button>

                <button
                  id="admin-tab-anuncios"
                  onClick={() => {
                    handleSelectTab('anuncios');
                    pushNotification('Entrando al pizarrón de anuncios y comunicados.', 'info');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'anuncios'
                      ? 'bg-[#4B9CD3] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-[#EBF5FB]/60 hover:text-[#2C3E50]'
                  }`}
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Comunicados</span>
                </button>

                <button
                  id="admin-tab-empleados"
                  onClick={() => {
                    handleSelectTab('empleados');
                    pushNotification('Visualizando nómina de trabajadores.', 'info');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'empleados'
                      ? 'bg-[#4B9CD3] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-[#EBF5FB]/60 hover:text-[#2C3E50]'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Trabajadores</span>
                </button>

                <button
                  id="admin-tab-ventas"
                  onClick={() => {
                    handleSelectTab('ventas');
                    pushNotification('Abriendo módulo de ventas y reportes históricos.', 'info');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'ventas'
                      ? 'bg-[#4B9CD3] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-[#EBF5FB]/60 hover:text-[#2C3E50]'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Reportes</span>
                </button>

                <button
                  id="admin-tab-supabase"
                  onClick={() => {
                    handleSelectTab('supabase');
                    pushNotification('Abriendo módulo de auditoría y diagnóstico de Supabase DB.', 'info');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'supabase'
                      ? 'bg-[#4B9CD3] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-[#EBF5FB]/60 hover:text-[#2C3E50]'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Auditoría DB</span>
                </button>
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* CUERPO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-6">

        {/* BANNER DE NOTIFICACIONES CRÍTICAS Y ALERTAS DE PÁNICO (STOCK CERO) */}
        {state.alertasPanico && state.alertasPanico.some(a => !a.atendida) && (
          <div id="panic-alerts-banner" className="w-full bg-red-50 border-2 border-red-600 rounded-2xl p-5 shadow-md space-y-4 animate-pulse">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-start gap-3">
                <div className="bg-red-600 p-2 rounded-xl text-white mt-1 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-red-900 text-sm uppercase tracking-wider">
                    ¡ALERTA CRÍTICA: DETECTADO STOCK CERO!
                  </h3>
                  <p className="text-xs text-red-700 font-medium mt-1">
                    Se han agotado insumos críticos que detienen la preparación en la estación de comida. Atienda de inmediato.
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-red-600 text-white font-extrabold px-3 py-1 rounded-full shrink-0">
                Prioridad Alta (Urgente)
              </span>
            </div>

            <div className="divide-y divide-red-100 bg-white border border-red-200 rounded-xl overflow-hidden shadow-2xs">
              {state.alertasPanico.filter(a => !a.atendida).map(alerta => (
                <div key={alerta.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-red-50/35 transition-colors">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-900">
                      Insumo Agotado: <span className="font-black text-red-600">{alerta.insumo_nombre}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Reportado por: <strong>{alerta.usuario_nombre}</strong> a las <strong>{alerta.fecha_hora}</strong>
                    </p>
                  </div>
                  {currentUser.rol === 'admin' ? (
                    <button
                      type="button"
                      id={`resolve-panic-${alerta.id}`}
                      onClick={() => handleAtenderAlertaPanico(alerta.id)}
                      className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1.5 px-4 rounded-lg transition-colors cursor-pointer text-center"
                    >
                      Atender / Reabastecer
                    </button>
                  ) : (
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-lg">
                      Esperando Administrador
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {currentUser.rol === 'admin' ? (
          /* ========================================================= */
          /* VISTA ADMINISTRADOR (VISTA DEL DUEÑO / MARIANA SILVA) */
          /* ========================================================= */
          <div className="w-full">
            <AdminDashboard
              openTabs={openTabs}
              activeTab={activeTab}
              setActiveTab={handleSelectTab}
              onCloseTab={handleCloseTab}
              rankingWeights={rankingWeights}
              onUpdateRankingWeights={handleUpdateRankingWeights}
              upsellRules={upsellRules}
              onUpdateUpsellRules={handleUpdateUpsellRules}
              usuarios={state.usuarios}

              tareas={state.tareas}
              productos={state.productos}
              ventas={state.ventas}
              fichajes={state.fichajes}
              incidencias={state.incidencias}
              anuncios={state.anuncios}
              feedbacks={state.feedbacks || []}
              inventario={state.inventario || []}
              horarios={state.horarios || []}
              productosCatalogo={state.productosCatalogo || []}
              ventasRegistradas={state.ventasRegistradas || []}
              cuadresCaja={state.cuadresCaja || []}
              alertasPanico={state.alertasPanico || []}
              clientes={state.clientes || []}
              onAddTarea={handleAddTarea}
              onAddTareasBulk={handleAddTareasBulk}
              onEditTarea={handleEditTarea}
              onDeleteTarea={handleDeleteTarea}
              onDeleteAllTareas={handleDeleteAllTareas}
              onUpdateTaskOrders={handleUpdateTaskOrders}
              onAddProducto={handleAddProducto}
              onEditProducto={handleEditProducto}
              onDeleteProducto={handleDeleteProducto}
              onAddAnuncio={handleAddAnuncio}
              onDeleteAnuncio={handleDeleteAnuncio}
              onToggleAnuncioActivo={handleToggleAnuncioActivo}
              onResolveIncidencia={handleResolveIncidencia}
              onAddFeedback={handleAddFeedback}
              onCreateUsuario={handleCreateUsuario}
              onEditUsuario={handleEditUsuario}
              onDeleteUsuario={handleDeleteUsuario}
              onSaveInventarioItem={handleSaveInventarioItem}
              onBulkSaveInventario={handleBulkSaveInventario}
              onDeleteInventarioItem={handleDeleteInventarioItem}
              onSaveTurno={handleSaveTurno}
              onDeleteTurno={handleDeleteTurno}
              onDeleteFichaje={handleDeleteFichaje}
              onSaveProductoCatalogo={handleSaveProductoCatalogo}
              onBulkSaveProductosCatalogo={handleBulkSaveProductosCatalogo}
              onDeleteProductoCatalogo={handleDeleteProductoCatalogo}
              onDuplicarHorarios={handleDuplicarHorarios}
              onUpdateVenta={handleUpdateVenta}
              onAnularVenta={handleAnularVenta}
            />
          </div>
        ) : (
          /* ========================================================= */
          /* VISTA EMPLEADO (ESTACIÓN DE TRABAJO PC DE NUTRIFIT)       */
          /* ========================================================= */
          <div className="space-y-6 max-w-7xl mx-auto py-4">
            <EmployeeWorkspace
              empleado={currentUser}
              usuarios={state.usuarios}
              tareas={state.tareas}
              productos={state.productos}
              ventas={state.ventas}
              fichajes={state.fichajes}
              incidencias={state.incidencias}
              anuncios={state.anuncios}
              feedbacks={state.feedbacks || []}
              inventario={state.inventario || []}
              horarios={state.horarios || []}
              productosCatalogo={state.productosCatalogo || []}
              ventasRegistradas={state.ventasRegistradas || []}
              cuadresCaja={state.cuadresCaja || []}
              clientes={state.clientes || []}
              posVentas={state.ventasRegistradas}
              rankingWeights={rankingWeights}
              upsellRules={upsellRules}
              notifications={notifications}
              onResolveIncidencia={handleResolveIncidencia}
              onUpdateTareaEstado={handleUpdateTareaEstado}
              onUpdateTaskOrders={handleUpdateTaskOrders}

              onAddVentaSugerida={handleAddVentaSugerida}
              onRegistrarFichaje={handleRegistrarFichaje}
              onAddIncidencia={handleAddIncidencia}
              onUpdateStock={handleUpdateStock}
              onRegistrarVenta={handleRegistrarVenta}
              onRegistrarCuadreCaja={handleRegistrarCuadreCaja}
              onConfirmarLecturaAnuncio={handleConfirmarLecturaAnuncio}
            />

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-5 text-center text-xs text-slate-400">
        <p className="font-medium">COCCOLE FIT © {new Date().getFullYear()} - Placer Sin Culpa</p>
        <p className="text-[10px] text-slate-400 mt-1">Diseñado con propósitos administrativos, control operativo, gamificación e integraciones de calidad.</p>
      </footer>

    </div>
  );
}
