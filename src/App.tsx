/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Usuario, Tarea, ProductoPromocion, RegistroVenta, Fichaje, Incidencia, Anuncio, AreaType, Feedback, InventarioItem, TurnoSemanal, Producto, Venta, AlertaPanico, CuadreCaja, ToastNotification, RankingWeights, DEFAULT_RANKING_WEIGHTS, UpsellRule, DEFAULT_UPSELL_RULES } from './types';
import { loadAppState, saveAppState, INITIAL_USUARIOS } from './mockData';
import AnalyticsPanel from './components/AnalyticsPanel';
import Leaderboard from './components/Leaderboard';
import AdminDashboard from './components/AdminDashboard';
import EmployeeWorkspace from './components/EmployeeWorkspace';
import Login from './components/Login';
import { Logo } from './components/Logo';
import { PushToastContainer } from './components/PushToastContainer';
import { Salad, User, RotateCcw, Sparkles, Trophy, TrendingUp, ClipboardList, Bell, Smartphone, ShieldCheck, HelpCircle, Boxes, Calendar, UserCheck, Megaphone, CheckCircle, Clock, AlertCircle, AlertTriangle } from 'lucide-react';
import { getGlobalMetrics } from './utils/metrics';
import {
  isSupabaseConfigured,
  fetchProfilesFromSupabase,
  fetchSalesFromSupabase,
  fetchCustomersFromSupabase,
  fetchInventoryFromSupabase,
  fetchTimeEntriesFromSupabase,
  insertSaleInSupabase,
  updateSaleInSupabase,
  upsertCustomerInSupabase,
  upsertInventoryInSupabase,
  upsertProfileInSupabase,
  insertTimeEntryInSupabase,
  subscribeToRealtimeUpdates,
  fetchRankingWeightsFromSupabase,
  saveRankingWeightsToSupabase,
  fetchUpsellRulesFromSupabase,
  saveUpsellRulesToSupabase
} from './lib/supabaseClient';


export default function App() {
  // Cargar estados desde localStorage o iniciar con mockData
  const [state, setState] = useState(() => loadAppState());
  
  // Ponderación del Ranking de Colaboradores
  const [rankingWeights, setRankingWeights] = useState<RankingWeights>(DEFAULT_RANKING_WEIGHTS);

  // Reglas de Venta Sugerida (Cross-selling)
  const [upsellRules, setUpsellRules] = useState<UpsellRule[]>(DEFAULT_UPSELL_RULES);

  // Rol activo (Admin o ID de un Empleado específico)
  const [activeUserRole, setActiveUserRole] = useState<string | null>(null);
  
  // Filtro de tiempo compartido ('diario', 'semanal', 'mensual')
  const [filtroGeneral, setFiltroGeneral] = useState<'diario' | 'semanal' | 'mensual'>('diario');

  // Pestaña activa del administrador
  const [activeTab, setActiveTab] = useState<'tareas' | 'productos' | 'calidad' | 'anuncios' | 'empleados' | 'inventario' | 'horarios' | 'ventas'>('tareas');
  
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
        const [supaProfiles, supaSales, supaCustomers, supaInventory, supaTimeEntries] = await Promise.all([
          fetchProfilesFromSupabase(),
          fetchSalesFromSupabase(),
          fetchCustomersFromSupabase(),
          fetchInventoryFromSupabase(),
          fetchTimeEntriesFromSupabase()
        ]);

        setState(prev => ({
          ...prev,
          usuarios: supaProfiles && supaProfiles.length > 0 ? supaProfiles : prev.usuarios,
          ventasRegistradas: supaSales && supaSales.length > 0 ? supaSales : prev.ventasRegistradas,
          clientes: supaCustomers && supaCustomers.length > 0 ? supaCustomers : prev.clientes,
          inventario: supaInventory && supaInventory.length > 0 ? supaInventory : prev.inventario,
          fichajes: supaTimeEntries && supaTimeEntries.length > 0 ? supaTimeEntries.map((f: any) => ({
            id: f.id,
            usuario_id: f.empleado_id,
            fecha: f.hora_entrada?.split(' ')[0] || new Date().toISOString().split('T')[0],
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

    // Suscripción Realtime en tablas sales e inventory para actualización en vivo
    const unsubscribe = subscribeToRealtimeUpdates(
      async () => {
        const sales = await fetchSalesFromSupabase();
        if (sales) {
          setState(prev => ({ ...prev, ventasRegistradas: sales }));
        }
      },
      async () => {
        const inv = await fetchInventoryFromSupabase();
        if (inv) {
          setState(prev => ({ ...prev, inventario: inv }));
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
    saveAppState(state);
  }, [state]);

  // Agregar una notificación al feed
  const pushNotification = (text: string, type: 'success' | 'alert' | 'info' = 'info') => {
    const newNotif = {
      id: Date.now().toString(),
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

  // Obtener usuario activo actual
  const currentUser = state.usuarios.find(u => u.id === activeUserRole) || state.usuarios[0];

  // Si no hay usuario activo, mostramos el login
  if (!activeUserRole) {
    return <Login usuarios={state.usuarios} onLogin={setActiveUserRole} onCreateAdmin={handleCreateAdmin} />;
  }

  // Obtener métricas globales del negocio
  const metrics = getGlobalMetrics(state.tareas, state.ventas, state.productos, filtroGeneral);

  // --- ACTIONS: GESTOR DE TAREAS ---
  
  const handleAddTarea = (newTarea: Omit<Tarea, 'id'>) => {
    const tarea: Tarea = {
      ...newTarea,
      id: `tsk-${Date.now()}`
    };
    setState(prev => ({
      ...prev,
      tareas: [tarea, ...prev.tareas]
    }));
    
    const assignedUser = state.usuarios.find(u => u.id === newTarea.asignado_a);
    pushNotification(`Nueva tarea asignada a ${assignedUser?.nombre || 'empleado'}.`, 'info');
  };

  const handleEditTarea = (updatedTarea: Tarea) => {
    setState(prev => ({
      ...prev,
      tareas: prev.tareas.map(t => t.id === updatedTarea.id ? updatedTarea : t)
    }));
    pushNotification(`Tarea "${updatedTarea.titulo}" actualizada correctamente.`, 'info');
  };

  const handleDeleteTarea = (id: string) => {
    const deleted = state.tareas.find(t => t.id === id);
    setState(prev => ({
      ...prev,
      tareas: prev.tareas.filter(t => t.id !== id)
    }));
    if (deleted) {
      pushNotification(`Tarea eliminada: "${deleted.titulo}"`, 'alert');
    }
  };

  const handleUpdateTareaEstado = (
    id: string,
    estado: 'Pendiente' | 'En proceso' | 'Completada',
    foto_url?: string,
    nota_evidencia?: string
  ) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    setState(prev => ({
      ...prev,
      tareas: prev.tareas.map(t => {
        if (t.id === id) {
          const updated: Tarea = { ...t, estado };
          if (estado === 'En proceso') {
            updated.hora_inicio = t.hora_inicio || timeStr;
          } else if (estado === 'Completada') {
            updated.hora_fin = t.hora_fin || timeStr;
            if (foto_url) updated.foto_url = foto_url;
            if (nota_evidencia) updated.nota_evidencia = nota_evidencia;
          } else {
            // Pendiente reset
            updated.hora_inicio = undefined;
            updated.hora_fin = undefined;
          }
          return updated;
        }
        return t;
      })
    }));

    const task = state.tareas.find(t => t.id === id);
    const label = estado === 'Completada' ? 'completó' : estado === 'En proceso' ? 'inició' : 'marcó como pendiente';
    pushNotification(`${currentUser.nombre} ${label} la tarea: "${task?.titulo}"`, estado === 'Completada' ? 'success' : 'info');
  };

  // --- ACTIONS: PRODUCTOS A PROMOCIONAR ---

  const handleAddProducto = (newProd: Omit<ProductoPromocion, 'id'>) => {
    const prod: ProductoPromocion = {
      ...newProd,
      id: `prod-${Date.now()}`
    };
    setState(prev => ({
      ...prev,
      productos: [prod, ...prev.productos]
    }));
    pushNotification(`Se agregó "${newProd.nombre_producto}" a la campaña diaria. Meta: ${newProd.meta_diaria_unidades}.`, 'success');
  };

  // --- ACTIONS: VENTAS SUGERIDAS (+1 CONTADOR EXPRESS) ---

  const handleAddVentaSugerida = (producto_id: string, usuario_id: string, metodo_pago: string) => {
    const todayStr = '2026-08-20'; // Usamos fecha fija del mock de hoy
    
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

  const handleRegistrarFichaje = (usuario_id: string, tipo: 'entrada' | 'salida', horaPersonalizada?: string) => {
    const todayStr = '2026-08-20';
    const now = new Date();
    const timeStr = horaPersonalizada || `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    setState(prev => {
      let updatedFichajes = [...prev.fichajes];
      
      if (tipo === 'entrada') {
        let punctual = true;
        if (horaPersonalizada) {
          const [h, m] = horaPersonalizada.split(':').map(Number);
          punctual = h < 8 || (h === 8 && m <= 5);
        } else {
          punctual = now.getHours() < 8 || (now.getHours() === 8 && now.getMinutes() <= 5);
        }

        const existingIdx = updatedFichajes.findIndex(f => f.usuario_id === usuario_id && f.fecha === todayStr);
        if (existingIdx !== -1) {
          updatedFichajes[existingIdx] = {
            ...updatedFichajes[existingIdx],
            hora_entrada: timeStr,
            puntual: punctual,
            activo: true
          };
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
        }
        const empNombre = prev.usuarios.find(u => u.id === usuario_id)?.nombre || 'Empleado';
        pushNotification(`${empNombre} registró ENTRADA a las ${timeStr} (${punctual ? 'Puntual' : 'Retraso'}).`, punctual ? 'success' : 'info');
      } else {
        // Salida: actualizar registro activo de hoy
        updatedFichajes = updatedFichajes.map(f => {
          if (f.usuario_id === usuario_id && f.fecha === todayStr && f.activo) {
            return {
              ...f,
              hora_salida: timeStr,
              activo: false
            };
          }
          return f;
        });
        const empNombre = prev.usuarios.find(u => u.id === usuario_id)?.nombre || 'Empleado';
        pushNotification(`${empNombre} registró SALIDA a las ${timeStr}. Turno finalizado.`, 'info');
      }
      return {
        ...prev,
        fichajes: updatedFichajes
      };
    });
  };

  const handleDeleteFichaje = (id: string) => {
    setState(prev => ({
      ...prev,
      fichajes: prev.fichajes.filter(f => f.id !== id)
    }));
    pushNotification('Registro de asistencia eliminado de la bitácora.', 'info');
  };

  // --- ACTIONS: GESTION DE TRABAJADORES (EDITAR, ELIMINAR, CREAR) ---

  const handleCreateUsuario = (newUsr: Omit<Usuario, 'id'>) => {
    const newUser: Usuario = {
      ...newUsr,
      id: `usr-${Date.now()}`
    };
    setState(prev => ({
      ...prev,
      usuarios: [...prev.usuarios, newUser]
    }));
    upsertProfileInSupabase(newUser);
    pushNotification(`Nuevo colaborador registrado: ${newUser.nombre}.`, 'success');
  };

  const handleEditUsuario = (updatedUsr: Usuario) => {
    setState(prev => ({
      ...prev,
      usuarios: prev.usuarios.map(u => u.id === updatedUsr.id ? updatedUsr : u)
    }));
    upsertProfileInSupabase(updatedUsr);
    pushNotification(`Perfil de ${updatedUsr.nombre} editado con éxito.`, 'success');
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

  const handleUpdateStock = (itemId: string, newStock: number, nombreUsuario: string) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
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
          
          if (updated.stock_actual <= updated.stock_minimo_alerta) {
            const hasIncidencia = prev.incidencias.some(i => i.titulo.includes(item.nombre) && i.estado === 'Pendiente');
            if (!hasIncidencia) {
              extraIncidencia = {
                id: `inc-auto-${Date.now()}`,
                usuario_id: 'usr-admin',
                fecha: '2026-08-20',
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

  const handleSaveInventarioItem = (item: Omit<InventarioItem, 'id'> & { id?: string }) => {
    let savedItem: InventarioItem;
    setState(prev => {
      const items = prev.inventario || [];
      if (item.id) {
        savedItem = { ...items.find(i => i.id === item.id), ...item } as InventarioItem;
        const updated = items.map(i => i.id === item.id ? savedItem : i);
        pushNotification(`Item de inventario "${item.nombre}" modificado exitosamente.`, 'success');
        return { ...prev, inventario: updated };
      } else {
        savedItem = {
          ...item,
          id: `inv-${Date.now()}`,
          ultima_actualizacion_fecha: '2026-08-20 00:00',
          ultima_actualizacion_por: 'Administrador'
        } as InventarioItem;
        pushNotification(`Nuevo item "${item.nombre}" ingresado al inventario.`, 'success');
        return { ...prev, inventario: [...items, savedItem] };
      }
    });
    if (savedItem!) {
      upsertInventoryInSupabase(savedItem);
    }
  };

  const handleDeleteInventarioItem = (id: string) => {
    setState(prev => {
      const deleted = (prev.inventario || []).find(i => i.id === id);
      const filtered = (prev.inventario || []).filter(i => i.id !== id);
      if (deleted) {
        pushNotification(`Eliminado de inventario: "${deleted.nombre}"`, 'alert');
      }
      return { ...prev, inventario: filtered };
    });
  };

  // --- ACTIONS: GESTIÓN DE HORARIOS Y TURNOS ---

  const handleSaveTurno = (turno: Omit<TurnoSemanal, 'id'> & { id?: string }) => {
    setState(prev => {
      const turnos = prev.horarios || [];
      if (turno.id) {
        const updated = turnos.map(t => t.id === turno.id ? { ...t, ...turno } as TurnoSemanal : t);
        const emp = prev.usuarios.find(u => u.id === turno.usuario_id);
        pushNotification(`Turno de ${emp?.nombre} actualizado para el ${turno.dia_semana}.`, 'success');
        return { ...prev, horarios: updated };
      } else {
        const newTurno: TurnoSemanal = {
          ...turno,
          id: `t-${Date.now()}`
        };
        const emp = prev.usuarios.find(u => u.id === turno.usuario_id);
        pushNotification(`Turno programado para ${emp?.nombre} el ${turno.dia_semana}.`, 'success');
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

  const handleAddAnuncio = (newAn: Omit<Anuncio, 'id'>) => {
    const an: Anuncio = {
      ...newAn,
      id: `an-${Date.now()}`
    };
    setState(prev => ({
      ...prev,
      anuncios: [an, ...prev.anuncios]
    }));
    pushNotification('Nuevo anuncio general publicado en el tablero.', 'success');
  };

  // --- ACTIONS: CATÁLOGO DE PRODUCTOS (CÓDIGOS Y PRECIOS) ---

  const handleSaveProductoCatalogo = (prod: Omit<Producto, 'id'> & { id?: string }) => {
    setState(prev => {
      const catalog = prev.productosCatalogo || [];
      if (prod.id) {
        const updated = catalog.map(p => p.id === prod.id ? { ...p, ...prod } as Producto : p);
        pushNotification(`Producto "${prod.nombre}" actualizado en catálogo.`, 'success');
        return { ...prev, productosCatalogo: updated };
      } else {
        const newProd: Producto = {
          ...prod,
          id: `cat-${Date.now()}`
        };
        pushNotification(`Producto "${prod.nombre}" registrado con código ${prod.codigo}.`, 'success');
        return { ...prev, productosCatalogo: [...catalog, newProd] };
      }
    });
  };

  const handleDeleteProductoCatalogo = (id: string) => {
    setState(prev => {
      const filtered = (prev.productosCatalogo || []).filter(p => p.id !== id);
      pushNotification('Producto removido del catálogo de ventas.', 'alert');
      return { ...prev, productosCatalogo: filtered };
    });
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
      const today = new Date().toISOString().split('T')[0];

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

    pushNotification(`¡Venta registrada con éxito por ${vendedorNombre}! Total: $${nuevaVenta.total.toFixed(2)} (${nuevaVenta.metodo_pago || 'efectivo'})`, 'success');
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
      localStorage.clear();
      window.location.reload();
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
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex flex-col text-right">
                <span className="text-sm font-bold text-[#2C3E50]">{currentUser.nombre}</span>
                <span className="text-[10px] font-bold text-[#4B9CD3] uppercase tracking-wider">{currentUser.rol === 'admin' ? 'Administrador' : 'Staff'}</span>
              </div>
              <button
                onClick={() => {
                  setActiveUserRole(null);
                  pushNotification('Sesión cerrada.', 'info');
                }}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-[#2C3E50] border border-[#E2E8F0] hover:bg-slate-50 rounded-lg transition-all"
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

            {/* Reset simulator */}
            <button
              onClick={handleResetData}
              className="p-1.5 text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 border border-[#E2E8F0] hover:border-red-100 rounded-lg transition-all"
              title="Reiniciar datos del simulador"
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
                    setActiveTab('tareas');
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
                    setActiveTab('productos');
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
                    setActiveTab('inventario');
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
                    setActiveTab('horarios');
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
                    setActiveTab('calidad');
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
                    setActiveTab('anuncios');
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
                    setActiveTab('empleados');
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
                    setActiveTab('ventas');
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
        
        {/* BANNER INFORMATIVO DEL SIMULADOR MULTI-ROL */}
        <div className="bg-[#EBF5FB] text-[#2C3E50] border border-[#AED6F1] rounded-2xl p-5 shadow-xs relative overflow-hidden">
          {/* Decoraciones de fondo */}
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
            <div className="space-y-1">
              <span className="bg-[#4B9CD3] text-[10px] text-white font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                Simulador Interactivo de Alta Fidelidad
              </span>
              <h2 className="text-lg font-extrabold tracking-tight mt-1">Prueba el flujo de trabajo en tiempo real</h2>
              <p className="text-xs text-[#2C3E50]/80 leading-relaxed max-w-2xl">
                ¿Cómo funciona? Selecciona un rol de <strong>Empleado (Staff)</strong> arriba para marcar asistencia, completar checklists con fotos o sumar ventas sugeridas (+1). Luego regresa al rol de <strong>Dueño (Admin)</strong> para ver cómo se actualizan instantáneamente los gráficos, evidencias y el ranking de estrellas.
              </p>
            </div>
            <div className="text-xs bg-white border border-[#AED6F1] p-2.5 rounded-lg flex items-center gap-2 self-stretch sm:self-auto justify-center shadow-2xs">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <div>
                <p className="font-bold text-[#2C3E50]">Prueba completa</p>
                <p className="text-[10px] text-[#4B9CD3] font-semibold">100% de persistencia en local</p>
              </div>
            </div>
          </div>
        </div>

        {currentUser.rol === 'admin' ? (
          /* ========================================================= */
          /* VISTA ADMINISTRADOR (VISTA DEL DUEÑO / MARIANA SILVA) */
          /* ========================================================= */
          <div className="space-y-6">
            
            {/* FILA 2: BARRA DE MÉTRICAS RÁPIDAS Y FILTRO DE TIEMPO COMPACTO */}
            <div id="admin-kpi-bar" className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-2.5 mb-3">
                <div>
                  <h3 className="font-extrabold text-xs text-[#4B9CD3] uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-[#4B9CD3]" />
                    Resumen Operativo del Local
                  </h3>
                  <p className="text-[10px] text-slate-500">Métricas clave consolidadas en tiempo real</p>
                </div>

                {/* Selector de Periodo de tiempo global */}
                <div className="flex bg-[#EBF5FB] p-0.5 rounded-lg border border-[#AED6F1]/70">
                  {(['diario', 'semanal', 'mensual'] as const).map((mode) => (
                    <button
                      key={mode}
                      id={`global-filter-btn-${mode}`}
                      onClick={() => {
                        setFiltroGeneral(mode);
                        pushNotification(`Cambiando periodo de métricas a: ${mode}.`, 'info');
                      }}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all capitalize ${
                        filtroGeneral === mode
                          ? 'bg-[#4B9CD3] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-[#2C3E50]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid de KPIs - Compacto grid-cols-4 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* KPI 1: Cumplimiento de tareas */}
                <div id="kpi-task-completion" className="bg-[#EBF5FB] border border-[#AED6F1] p-3 rounded-lg flex items-center gap-2.5">
                  <div className="p-2 bg-[#4B9CD3] text-white rounded-lg shrink-0">
                    <CheckCircle className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold text-[#4B9CD3] uppercase tracking-wider truncate">Cumplimiento Tareas</p>
                    <h3 className="text-lg font-black text-[#2C3E50] leading-none mt-0.5">
                      {metrics.porcentajeTareasCompletadas}%
                    </h3>
                    <p className="text-[9px] text-[#4B9CD3] font-semibold mt-0.5 truncate">
                      {metrics.tareasCompletadas}/{metrics.tareasTotales} listas
                    </p>
                  </div>
                </div>

                {/* KPI 2: Ventas Sugeridas */}
                <div id="kpi-suggested-sales" className="bg-orange-50 border border-orange-100/80 p-3 rounded-lg flex items-center gap-2.5">
                  <div className="p-2 bg-orange-100 text-orange-700 rounded-lg shrink-0">
                    <Sparkles className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold text-orange-800 uppercase tracking-wider truncate">Ventas Sugeridas</p>
                    <h3 className="text-lg font-black text-orange-950 leading-none mt-0.5">
                      {metrics.totalVentasSugeridas}
                    </h3>
                    <p className="text-[9px] text-orange-700 font-semibold mt-0.5 truncate">
                      Meta: {metrics.metaVentasAcumulada}
                    </p>
                  </div>
                </div>

                {/* KPI 3: Eficiencia de Tiempo */}
                <div id="kpi-time-efficiency" className="bg-white border border-[#E2E8F0] p-3 rounded-lg flex items-center gap-2.5 shadow-2xs">
                  <div className="p-2 bg-[#85C1E9] text-white rounded-lg shrink-0">
                    <Clock className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate">Eficiencia Tiempo</p>
                    <h3 className="text-lg font-black text-[#2C3E50] leading-none mt-0.5">
                      {metrics.eficienciaTiempoGlobal}%
                    </h3>
                    <p className="text-[9px] text-[#4B9CD3] font-semibold mt-0.5 truncate">
                      A tiempo
                    </p>
                  </div>
                </div>

                {/* KPI 4: Estado Operativo */}
                <div id="kpi-operational-status" className="bg-[#FFFDF6] border border-[#E2E8F0] p-3 rounded-lg flex items-center gap-2.5">
                  <div className="p-2 bg-[#E2E8F0] text-[#2C3E50] rounded-lg shrink-0">
                    <AlertCircle className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate">En Cola de Espera</p>
                    <h3 className="text-lg font-black text-[#2C3E50] leading-none mt-0.5">
                      {metrics.tareasEnProgreso + metrics.tareasPendientes}
                    </h3>
                    <p className="text-[9px] text-slate-600 font-semibold mt-0.5 truncate">
                      {metrics.tareasEnProgreso} act · {metrics.tareasPendientes} pte
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SECUENCIA DE FILAS 100% HORIZONTALES (Full-Width Row Layout) */}
            <div className="flex flex-col gap-6 w-full">
              
              {/* FILA 3: Visualización de Progreso (w-full) */}
              <div id="row-progress" className="w-full">
                <AnalyticsPanel
                  tareas={state.tareas}
                  ventas={state.ventas}
                  productos={state.productos}
                  filtro={filtroGeneral}
                  setFiltro={setFiltroGeneral}
                  renderMode="progress"
                />
              </div>

              {/* FILA 4: Impulso Operativo Coccole Fit (w-full) */}
              <div id="row-impulse" className="w-full">
                <AnalyticsPanel
                  tareas={state.tareas}
                  ventas={state.ventas}
                  productos={state.productos}
                  filtro={filtroGeneral}
                  setFiltro={setFiltroGeneral}
                  renderMode="impulse"
                />
              </div>

              {/* FILA 5: Tabla de Posiciones y Ranking (w-full) */}
              <div id="row-leaderboard" className="w-full">
                <Leaderboard
                  usuarios={state.usuarios}
                  tareas={state.tareas}
                  ventas={state.ventas}
                  fichajes={state.fichajes}
                  productos={state.productos}
                  filtro={filtroGeneral}
                  posVentas={state.ventasRegistradas}
                  rankingWeights={rankingWeights}
                />
              </div>


              {/* FILA 6: Alertas e Incidencias del Local (w-full) */}
              <div id="row-incidencias" className="w-full rounded-xl border bg-white p-5 shadow-sm font-sans">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-3 mb-4">
                  <div>
                    <h3 className="font-bold text-[#2C3E50] text-sm flex items-center gap-2">
                      <Bell className="w-4.5 h-4.5 text-red-600" />
                      Alertas e Incidencias del Local
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Reportes de incidencias críticas de equipos o insumos en tiempo real.</p>
                  </div>
                  <span className="text-[10px] bg-red-100 text-red-800 font-extrabold px-3 py-1 rounded-full shrink-0">
                    {state.incidencias.filter(i => i.estado === 'Pendiente').length} Activas Hoy
                  </span>
                </div>

                {state.incidencias.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-xs">No hay alertas ni incidencias reportadas el día de hoy.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {state.incidencias.map(inc => (
                      <div
                        key={inc.id}
                        className={`p-4 rounded-xl border text-xs flex flex-col justify-between transition-all shadow-3xs ${
                          inc.estado === 'Pendiente'
                            ? 'bg-red-50/50 border-red-200 text-red-950 hover:bg-red-50'
                            : 'bg-slate-50/50 border-slate-200 text-[#2C3E50] hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className={`font-black uppercase text-[9px] tracking-wider px-2 py-0.5 rounded-full ${
                              inc.tipo === 'insumo' ? 'bg-amber-100 text-amber-950' : 'bg-red-100 text-red-950'
                            }`}>
                              {inc.tipo === 'insumo' ? 'Falta Insumo' : 'Falla Equipo'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">{inc.fecha}</span>
                          </div>
                          <h4 className="font-extrabold text-sm text-[#2C3E50]">{inc.titulo}</h4>
                          <p className="text-slate-600 mt-1 text-[11px] leading-relaxed mb-3">{inc.descripcion}</p>
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                          <span className="text-[9px] text-slate-400 font-bold">
                            Por: {state.usuarios.find(u => u.id === inc.usuario_id)?.nombre || 'Colaborador'}
                          </span>
                          {inc.estado === 'Pendiente' ? (
                            <button
                              onClick={() => handleResolveIncidencia(inc.id)}
                              className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-3 py-1 rounded-lg transition-all shadow-3xs"
                            >
                              Resolver Alerta
                            </button>
                          ) : (
                            <span className="text-[#4B9CD3] font-extrabold text-[10px] uppercase flex items-center gap-1">
                              ✓ Resuelto
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FILA 7: Actividades Recientes y Reportes (w-full) */}
              <div id="row-activities" className="w-full rounded-xl border bg-white p-5 shadow-sm font-sans">
                <div className="border-b border-slate-200 pb-3 mb-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-[#2C3E50] text-sm flex items-center gap-2">
                      <ClipboardList className="w-4.5 h-4.5 text-[#4B9CD3]" />
                      Actividades Recientes y Reportes del Sistema
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Log en tiempo real de operaciones, fichajes, y checklists completados.</p>
                  </div>
                  <span className="text-[9px] bg-[#EBF5FB] text-[#4B9CD3] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Conexión Activa
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {notifications.map(notif => (
                    <div
                      key={notif.id}
                      className="p-3 bg-slate-50 border border-slate-150 rounded-lg flex items-start gap-2.5 hover:bg-slate-100 transition-colors"
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        notif.type === 'success' ? 'bg-[#4B9CD3]' : notif.type === 'alert' ? 'bg-red-500' : 'bg-sky-500'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-700 text-[11px] leading-relaxed font-semibold break-words">{notif.text}</p>
                        <span className="text-[9px] text-slate-400 font-extrabold mt-1 block">{notif.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* FILA 4: MÓDULOS DE GESTIÓN INTERACTIVOS - FULL WIDTH */}
            <div className="w-full">
              <AdminDashboard
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                rankingWeights={rankingWeights}
                onUpdateRankingWeights={handleUpdateRankingWeights}
                upsellRules={upsellRules}
                onUpdateUpsellRules={handleUpdateUpsellRules}
                usuarios={state.usuarios}

                tareas={state.tareas}
                productos={state.productos}
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
                onEditTarea={handleEditTarea}
                onDeleteTarea={handleDeleteTarea}
                onAddProducto={handleAddProducto}
                onAddAnuncio={handleAddAnuncio}
                onResolveIncidencia={handleResolveIncidencia}
                onAddFeedback={handleAddFeedback}
                onCreateUsuario={handleCreateUsuario}
                onEditUsuario={handleEditUsuario}
                onDeleteUsuario={handleDeleteUsuario}
                onSaveInventarioItem={handleSaveInventarioItem}
                onDeleteInventarioItem={handleDeleteInventarioItem}
                onSaveTurno={handleSaveTurno}
                onDeleteTurno={handleDeleteTurno}
                onDeleteFichaje={handleDeleteFichaje}
                onSaveProductoCatalogo={handleSaveProductoCatalogo}
                onDeleteProductoCatalogo={handleDeleteProductoCatalogo}
                onDuplicarHorarios={handleDuplicarHorarios}
                onUpdateVenta={handleUpdateVenta}
                onAnularVenta={handleAnularVenta}
              />
            </div>

          </div>
        ) : (
          /* ========================================================= */
          /* VISTA EMPLEADO (ESTACIÓN DE TRABAJO PC DE NUTRIFIT)       */
          /* ========================================================= */
          <div className="space-y-6 max-w-7xl mx-auto py-4">
            
            {/* Banner elegante de instrucciones para la terminal de PC */}
            <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="space-y-1">
                <p className="font-extrabold text-xs text-[#4B9CD3] uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" /> Modo Terminal de Empleado (PC del Negocio)
                </p>
                <p className="text-xs text-slate-600">
                  Estás simulando la terminal de trabajo activa para <strong>{currentUser.nombre}</strong>. Registra asistencia, completa checklists operativos y suma puntos de venta fit.
                </p>
              </div>
              <div className="text-[11px] bg-[#FFFDF6] border border-[#E2E8F0] px-3 py-1.5 rounded-lg text-slate-500 font-bold flex items-center gap-2 shrink-0">
                <span>Tip administrativo:</span>
                <span>Cambia a Mariana (Admin) en la cabecera para ver las métricas de este empleado.</span>
              </div>
            </div>

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
              onUpdateTareaEstado={handleUpdateTareaEstado}

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
