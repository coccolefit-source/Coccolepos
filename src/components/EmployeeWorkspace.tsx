/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Usuario,
  Tarea,
  ProductoPromocion,
  RegistroVenta,
  Fichaje,
  Incidencia,
  Anuncio,
  Feedback,
  InventarioItem,
  TurnoSemanal,
  Producto,
  Venta,
  CuadreCaja,
  Cliente,
  isEfectivo,
  isTarjeta,
  isTransferencia,
  isRappi,
  isTarjetaRegalo,
  TarjetaRegalo,
  RankingWeights,
  UpsellRule,
  DEFAULT_UPSELL_RULES,
  Gasto,
  PagoFraccionado,
  getDesglosePagosVenta,
  getResumenPagosVentas
} from '../types';

import { calculateLeaderboard, getGlobalMetrics, formatMoney } from '../utils/metrics';
import { calcularTiempoTarea } from '../lib/taskUtils';
import { compressImage } from '../utils/imageCompressor';
import {
  getSupabaseClient,
  fetchSchedulesForEmployeeFromSupabase,
  guardarProgresoEnSupabase,
  obtenerProgresoLocal,
  mostrarProgresoEmpleadoActual,
  actualizarVistaProductividadEmpleado,
  renderizarSeccionProductividadEmpleado,
  inicializarSesionProgresoEmpleado,
  updateEmployeeAvatarInSupabase,
  fetchDailyTasksFromSupabase,
  fetchCampaignProductsFromSupabase,
  getLocalDateString,
  getBogotaDateDaysAgo,
  calcularHorasTurno,
  fetchActiveAnnouncementsFromSupabase,
  subscribeToAnnouncementsRealtime,
  formatFechaLegible
} from '../lib/supabaseClient';

import {
  CheckCircle2,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  ShoppingCart,
  Sparkles,
  Boxes,
  Calendar,
  TrendingUp,
  Trash2,
  PlusCircle,
  MinusCircle,
  DollarSign,
  Check,
  Camera,
  GripVertical,
  Megaphone,
  ImageIcon,
  Gift,
  ArrowLeft,
  QrCode
} from 'lucide-react';
import AnalyticsPanel from './AnalyticsPanel';
import Leaderboard from './Leaderboard';
import GastosModule from './GastosModule';
import ModalQrFidelizacion from './ModalQrFidelizacion';

interface EmployeeWorkspaceProps {
  empleado: Usuario;
  usuarios: Usuario[];
  tareas: Tarea[];
  productos: ProductoPromocion[];
  ventas: RegistroVenta[];
  fichajes: Fichaje[];
  incidencias: Incidencia[];
  anuncios: Anuncio[];
  feedbacks: Feedback[];
  inventario: InventarioItem[];
  horarios: TurnoSemanal[];
  productosCatalogo: Producto[];
  ventasRegistradas: Venta[];
  cuadresCaja: CuadreCaja[];
  clientes?: Cliente[];
  posVentas?: Venta[];
  rankingWeights?: RankingWeights;
  upsellRules?: UpsellRule[];
  notifications?: Array<{ id: string; text: string; time: string; type: 'success' | 'alert' | 'info' }>;
  gastos: Gasto[];
  onResolveIncidencia?: (id: string) => void;
  onUpdateTareaEstado: (id: string, estado: 'Pendiente' | 'En proceso' | 'Completada', foto_url?: string, nota_evidencia?: string) => void;
  onUpdateTaskOrders: (orders: {id: string, orden: number}[]) => void;

  onAddVentaSugerida: (producto_id: string, usuario_id: string, metodo_pago: string) => void;
  onRegistrarFichaje: (usuario_id: string, tipo: 'entrada' | 'salida', horaPersonalizada?: string) => void;
  onAddIncidencia: (incidencia: Omit<Incidencia, 'id'>) => void;
  onUpdateStock: (id: string, nuevoStock: number, usuario_nombre: string) => void;
  onRegistrarVenta: (venta: Omit<Venta, 'id'>) => void;
  onRegistrarCuadreCaja: (cuadre: Omit<CuadreCaja, 'id'>) => void;
  onConfirmarLecturaAnuncio: (anuncioId: string, usuarioId: string) => void;
  onSaveGasto: (gasto: Omit<Gasto, 'id'> & { id?: string }) => void;
  onDeleteGasto: (id: string) => void;
  tarjetasRegalo?: TarjetaRegalo[];
  onRedeemTarjetaRegalo?: (codigo: string, monto: number) => Promise<{ success: boolean; saldoRestante: number; error?: string }>;
}

const PHOTO_PRESETS = [
  { nombre: 'Barra Sanitizada ', url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=300' },
  { nombre: 'Ensaladas Preparadas ', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=300' },
  { nombre: 'Cajas Despachadas ', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=300' },
  { nombre: 'Licuadoras Limpias ', url: 'https://images.unsplash.com/photo-1578643463396-0997cb5328c1?auto=format&fit=crop&q=80&w=300' }
];

export default function EmployeeWorkspace({
  empleado,
  usuarios,
  tareas,
  productos,
  ventas,
  fichajes,
  incidencias,
  anuncios,
  feedbacks,
  inventario,
  horarios,
  productosCatalogo,
  ventasRegistradas,
  cuadresCaja,
  clientes = [],
  posVentas = [],
  rankingWeights,
  upsellRules = DEFAULT_UPSELL_RULES,
  notifications = [],
  onResolveIncidencia,
  onUpdateTareaEstado,
  onUpdateTaskOrders,
  onAddVentaSugerida,
  onRegistrarFichaje,
  onAddIncidencia,
  onUpdateStock,
  onRegistrarVenta,
  onRegistrarCuadreCaja,
  onConfirmarLecturaAnuncio,
  gastos = [],
  onSaveGasto,
  onDeleteGasto,
}: EmployeeWorkspaceProps) {
  const [localProductos, setLocalProductos] = useState<ProductoPromocion[]>(productos);
  const [localHorarios, setLocalHorarios] = useState<TurnoSemanal[]>(horarios);
  const [filtroGeneral, setFiltroGeneral] = useState<'diario' | 'semanal' | 'mensual'>('diario');
  const metrics = getGlobalMetrics(tareas, ventas, localProductos, filtroGeneral);
  const [currentAvatar, setCurrentAvatar] = useState<string>(empleado.foto_avatar);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCurrentAvatar(empleado.foto_avatar);
  }, [empleado.foto_avatar]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const compressedBase64 = await compressImage(file, 400, 400, 0.8);
      const res = await updateEmployeeAvatarInSupabase(empleado.id || empleado.nombre, compressedBase64);
      if (res.success) {
        setCurrentAvatar(compressedBase64);
        empleado.foto_avatar = compressedBase64;
      } else {
        alert('Error al guardar foto en Supabase: ' + (res.error || 'Error de conexión'));
      }
    } catch (err) {
      console.error('Error al procesar la foto:', err);
      alert('No se pudo procesar la foto seleccionada.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const hoyFormatted = getLocalDateString();
  const [fechaFiltroTareas, setFechaFiltroTareas] = useState<string>(hoyFormatted);
  const [tareasFechaSupabase, setTareasFechaSupabase] = useState<Tarea[] | null>(null);
  const [cargandoTareasFecha, setCargandoTareasFecha] = useState<boolean>(false);

  // Estados y Sincronización en Tiempo Real de Comunicados de Supabase
  const [liveAnnouncements, setLiveAnnouncements] = useState<Anuncio[]>(() => {
    return (anuncios || []).filter(a => a.activo !== false);
  });
  const [cargandoComunicados, setCargandoComunicados] = useState<boolean>(false);

  const cargarComunicadosActivos = async () => {
    try {
      setCargandoComunicados(true);
      const data = await fetchActiveAnnouncementsFromSupabase();
      if (data !== null) {
        setLiveAnnouncements(data);
      }
    } catch (err) {
      console.error('Error al consultar tabla announcements en Supabase:', err);
    } finally {
      setCargandoComunicados(false);
    }
  };

  useEffect(() => {
    // 1. Carga inicial de comunicados activos desde Supabase
    cargarComunicadosActivos();

    // 2. Suscripción a cambios en tiempo real en la tabla announcements
    const unsubscribe = subscribeToAnnouncementsRealtime(() => {
      cargarComunicadosActivos();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (anuncios && anuncios.length > 0) {
      setLiveAnnouncements(prev => {
        if (prev.length === 0) {
          return anuncios.filter(a => a.activo !== false);
        }
        return prev;
      });
    }
  }, [anuncios]);

  useEffect(() => {
    let isMounted = true;
    const cargarTareasPorFecha = async () => {
      try {
        setCargandoTareasFecha(true);
        const data = await fetchDailyTasksFromSupabase(fechaFiltroTareas);
        if (isMounted) {
          setTareasFechaSupabase(data);
        }
        await actualizarVistaProductividadEmpleado(empleado.nombre, fechaFiltroTareas);
      } catch (err) {
        console.error('Error al cargar tareas de fecha:', err);
      } finally {
        if (isMounted) setCargandoTareasFecha(false);
      }
    };

    cargarTareasPorFecha();
    return () => { isMounted = false; };
  }, [fechaFiltroTareas, empleado.nombre]);

  // Sincronizar localProductos y localHorarios si cambian las props
  useEffect(() => {
    setLocalProductos(productos);
  }, [productos]);

  useEffect(() => {
    setLocalHorarios(horarios);
  }, [horarios]);

  // Cargar progreso del día desde Supabase para el empleado
  const [progresoHoySupabase, setProgresoHoySupabase] = useState<number | null>(null);

  useEffect(() => {
    if (empleado?.nombre) {
      mostrarProgresoEmpleadoActual(empleado.nombre).then(res => {
        if (res && typeof res.porcentajeHoy === 'number') {
          setProgresoHoySupabase(res.porcentajeHoy);
        }
      });
      actualizarVistaProductividadEmpleado(empleado.nombre);
      renderizarSeccionProductividadEmpleado(empleado.nombre);
    }
  }, [empleado?.nombre]);

  // Suscripción en Tiempo Real para los horarios de trabajo (schedules)
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    const cargarHorarioEmpleado = async () => {
      try {
        const turnos = await fetchSchedulesForEmployeeFromSupabase(empleado.nombre);
        if (turnos && turnos.length > 0) {
          setLocalHorarios(turnos);
        } else {
          const turnosById = await fetchSchedulesForEmployeeFromSupabase(empleado.id);
          if (turnosById && turnosById.length > 0) {
            setLocalHorarios(turnosById);
          }
        }
      } catch (err) {
        console.error("Error al cargar horarios del empleado:", err);
      }
    };

    cargarHorarioEmpleado();

    const subscriptionSchedules = client
      .channel('sync_schedules_empleado')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        () => {
          cargarHorarioEmpleado();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(subscriptionSchedules);
    };
  }, [empleado.nombre, empleado.id]);

  // Suscripción en Tiempo Real para los productos de campaña / ventas sugeridas
  useEffect(() => {
    const client = getSupabaseClient();

    const cargarVentasSugeridasEmpleado = async () => {
      try {
        const campanas = await fetchCampaignProductsFromSupabase();
        if (campanas && campanas.length > 0) {
          setLocalProductos(campanas);
        } else if (productos && productos.length > 0) {
          setLocalProductos(productos);
        }
      } catch (err) {
        if (productos && productos.length > 0) {
          setLocalProductos(productos);
        }
      }
    };

    // 1. Cargar al montar
    cargarVentasSugeridasEmpleado();

    if (!client) return;

    // 2. Escuchar cambios en tiempo real con canales seguros
    const subscriptionCampaigns = client
      .channel('public:campaign_updates_worker')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'upsell_rules' },
        () => {
          cargarVentasSugeridasEmpleado();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaign_products' },
        () => {
          cargarVentasSugeridasEmpleado();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'productos_promocion' },
        () => {
          cargarVentasSugeridasEmpleado();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(subscriptionCampaigns);
    };
  }, [productos]);

  // Filtrar tareas asignadas a este empleado para la fecha seleccionada
  const tareasFuente = tareasFechaSupabase !== null
    ? tareasFechaSupabase
    : tareas;

  // Filtrar tareas para este colaborador en la fecha seleccionada
  const misTareasRaw = useMemo(() => {
    return (tareasFuente || []).filter(t => {
      // Verificar fecha
      const fechaOk = !t.fecha || getLocalDateString(t.fecha) === fechaFiltroTareas;
      if (!fechaOk) return false;

      // Si tiene asignación explícita a este empleado
      const matchDirecto = t.asignado_a === empleado.id || 
        t.asignado_a === empleado.nombre || 
        (Boolean(t.asignado_a) && Boolean(empleado.nombre) && t.asignado_a.toLowerCase() === empleado.nombre.toLowerCase()) ||
        t.asignado_a === 'ALL';
      if (matchDirecto) return true;

      // Si no tiene asignado_a, sólo incluirla si no existen tareas explícitamente asignadas a este empleado en el lote
      const hayAsignadasAEmpleado = (tareasFuente || []).some(x => 
        x.asignado_a === empleado.id || 
        x.asignado_a === empleado.nombre || 
        (Boolean(x.asignado_a) && Boolean(empleado.nombre) && x.asignado_a.toLowerCase() === empleado.nombre.toLowerCase())
      );
      return !t.asignado_a && !hayAsignadasAEmpleado;
    });
  }, [tareasFuente, empleado.id, empleado.nombre, fechaFiltroTareas]);

  // Deduplicar tareas por título y fecha para garantizar que hoy se cuenten exactamente las 24 tareas oficiales
  const misTareas = useMemo(() => {
    const map = new Map<string, Tarea>();
    for (const t of misTareasRaw) {
      const key = (t.titulo || '').trim().toLowerCase();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, t);
      } else {
        // Si una de las dos está completada, priorizar la completada
        if (t.estado === 'Completada' && existing.estado !== 'Completada') {
          map.set(key, t);
        }
      }
    }
    const unicas = Array.from(map.values()).sort((a, b) => (a.orden || 0) - (b.orden || 0));
    return unicas.length > 0 ? unicas : misTareasRaw.sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }, [misTareasRaw]);

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedTaskId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (sourceId === targetId || !sourceId) return;

    setDraggedTaskId(null);

    const sourceIndex = misTareas.findIndex(t => t.id === sourceId);
    const targetIndex = misTareas.findIndex(t => t.id === targetId);
    
    if (sourceIndex < 0 || targetIndex < 0) return;

    const newOrder = [...misTareas];
    const [removed] = newOrder.splice(sourceIndex, 1);
    newOrder.splice(targetIndex, 0, removed);

    const updates = newOrder.map((task, index) => ({
      id: task.id,
      orden: index
    }));

    if (tareasFechaSupabase) {
      setTareasFechaSupabase(prev => {
        if (!prev) return null;
        return prev.map(t => {
          const u = updates.find(update => update.id === t.id);
          return u ? { ...t, orden: u.orden } : t;
        });
      });
    }

    onUpdateTaskOrders(updates);
  };

  const tareasCompletadasCount = misTareas.filter(t => t.estado === 'Completada').length;
  // La jornada diaria oficial de tareas consta de 24 tareas
  const totalTareasCount = misTareas.length > 0 ? (misTareas.length > 24 && misTareas.length % 24 === 0 ? 24 : misTareas.length) : 24;
  const porcentajeCumplimientoTareas = totalTareasCount > 0 ? Math.round((tareasCompletadasCount / totalTareasCount) * 100) : 100;

  // Sincronizar progreso de tareas a Supabase
  useEffect(() => {
    if (empleado?.nombre) {
      guardarProgresoEnSupabase(empleado.nombre, tareasCompletadasCount, totalTareasCount, fechaFiltroTareas);
    }
  }, [empleado?.nombre, tareasCompletadasCount, totalTareasCount, fechaFiltroTareas]);

  // Auto-cierre de turno olvidado del día anterior cuando cambia el día
  useEffect(() => {
    if (!fichajes || !empleado?.id) return;
    const hoyStr = getLocalDateString();
    
    // Buscar si existe un fichaje activo o sin hora de salida de un día anterior
    const turnoAnteriorAbierto = fichajes.find(f => 
      (f.usuario_id === empleado.id || (f as any).empleado_id === empleado.id) &&
      (f.activo || !f.hora_salida) &&
      f.fecha && f.fecha < hoyStr
    );

    if (turnoAnteriorAbierto) {
      console.log(`[Auto-Cierre] Se detectó turno abierto de fecha anterior (${turnoAnteriorAbierto.fecha}). Cerrando automáticamente...`);
      onRegistrarFichaje(empleado.id, 'salida', '23:59');
    }
  }, [fichajes, empleado.id, onRegistrarFichaje]);

  // Buscar fichaje de hoy
  const miFichaje = fichajes.find(f => (f.usuario_id === empleado.id || (f as any).empleado_id === empleado.id) && f.fecha === getLocalDateString());

  // Obtener ranking de este empleado en la vista "diario"
  const leaderboardData = calculateLeaderboard(usuarios, tareas, ventas, fichajes, localProductos, 'diario', getLocalDateString(), posVentas.length > 0 ? posVentas : ventasRegistradas, rankingWeights);

  const miPosicion = leaderboardData.findIndex(item => item.usuario.id === empleado.id) + 1;
  const misPuntos = leaderboardData.find(item => item.usuario.id === empleado.id)?.puntosTotales || 0;

  // Modales
  const [employeeTab, setEmployeeTab] = useState<'tareas' | 'inventario' | 'horarios' | 'ventas' | 'progreso' | 'gastos'>('tareas');
  const [fechaProgresoHistorial, setFechaProgresoHistorial] = useState<string>(getLocalDateString());
  const [historialProgresoData, setHistorialProgresoData] = useState<{ completadas: number; totales: number; porcentaje: number; updated_at: string } | null>(null);
  const [isLoadingProgresoHistorial, setIsLoadingProgresoHistorial] = useState<boolean>(false);

  const cargarProgresoHistorial = async (fechaConsulta: string) => {
    setIsLoadingProgresoHistorial(true);
    try {
      let resolvedData: any = null;
      const client = getSupabaseClient();
      if (client) {
        const { data, error } = await client
          .from('task_progress')
          .select('*')
          .eq('employee_name', empleado.nombre)
          .eq('fecha', fechaConsulta)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.warn('Error al consultar task_progress:', error.message);
        }

        if (data) {
          resolvedData = data;
        }
      }

      if (!resolvedData) {
        resolvedData = obtenerProgresoLocal(empleado.nombre, fechaConsulta);
      }

      if (resolvedData) {
        setHistorialProgresoData({
          completadas: Number(resolvedData.completadas) || 0,
          totales: Number(resolvedData.totales) || 0,
          porcentaje: Number(resolvedData.porcentaje) || 0,
          updated_at: resolvedData.updated_at || new Date().toISOString()
        });
      } else {
        setHistorialProgresoData(null);
      }
    } catch (e) {
      console.warn('Excepción al cargar historial de progreso:', e);
    } finally {
      setIsLoadingProgresoHistorial(false);
    }
  };

  const [tempStock, setTempStock] = useState<Record<string, number>>({});
  const [activePaymentSugerida, setActivePaymentSugerida] = useState<string | null>(null);
  const [posPaymentMethod, setPosPaymentMethod] = useState<string>('Efectivo');

  // Estados Módulo de Fidelización de Clientes POS
  const [clienteTelefonoInput, setClienteTelefonoInput] = useState('');
  const [selectedClient, setSelectedClient] = useState<{
    id?: string;
    nombre: string;
    telefono: string;
    stickers_count?: number;
    rewards_redeemed?: number;
  } | null>(null);
  const [phoneError, setPhoneError] = useState(false);
  const [newClientModal, setNewClientModal] = useState<{ open: boolean; phone: string; name: string }>({
    open: false,
    phone: '',
    name: ''
  });
  const [showQrModal, setShowQrModal] = useState(false);
  const [isRedeemingLoyaltyReward, setIsRedeemingLoyaltyReward] = useState(false);
  const [loyaltyRedeemConfirmation, setLoyaltyRedeemConfirmation] = useState<string | null>(null);
  const [posSaleSuccessModal, setPosSaleSuccessModal] = useState<{
    open: boolean;
    clienteNombre: string;
    clienteTelefono: string;
    prevStickers: number;
    newStickers: number;
    newStickersCycle: number;
    totalVenta: number;
    metodoPago: string;
    rewardRedeemedNow?: boolean;
  } | null>(null);

  const resolveClientStickers = (c: any): number => {
    if (c?.stickers_count !== undefined && c?.stickers_count !== null && Number(c.stickers_count) > 0) {
      return Number(c.stickers_count);
    }
    return Math.max(
      Number(c?.visitas_acumuladas ?? 0),
      Number(c?.total_visits ?? 0),
      Number(c?.total_compras_count ?? 0),
      1
    );
  };

  const handleRedimirPremioFidelizacion = async () => {
    if (!selectedClient) return;
    setIsRedeemingLoyaltyReward(true);
    setLoyaltyRedeemConfirmation(null);

    const nextRewards = (Number(selectedClient.rewards_redeemed) || 0) + 1;

    try {
      const supabase = (window as any).supabase || getSupabaseClient();
      if (supabase) {
        let targetId = selectedClient.id;
        const cleanDigits = (selectedClient.telefono || '').replace(/\D/g, '');

        if (!targetId && cleanDigits) {
          const { data: found } = await supabase
            .from('customers')
            .select('id, rewards_redeemed')
            .or(`phone.eq.${cleanDigits},telefono.eq.${cleanDigits}`)
            .limit(1)
            .maybeSingle();
          if (found?.id) targetId = found.id;
        }

        if (targetId) {
          const { error } = await supabase
            .from('customers')
            .update({
              stickers_count: 1,
              rewards_redeemed: nextRewards,
              visitas_acumuladas: 1
            })
            .eq('id', targetId);

          if (error && (error.message?.includes('rewards_redeemed') || error.message?.includes('column') || error.code === '42703')) {
            await supabase
              .from('customers')
              .update({
                stickers_count: 1,
                visitas_acumuladas: 1
              })
              .eq('id', targetId);
          }
        }
      }
    } catch (err) {
      console.warn('Error al redimir premio en Supabase:', err);
    } finally {
      setIsRedeemingLoyaltyReward(false);
    }

    setSelectedClient(prev =>
      prev
        ? {
            ...prev,
            stickers_count: 1,
            rewards_redeemed: nextRewards
          }
        : null
    );
    setLoyaltyRedeemConfirmation('¡Premio redimido! El nuevo ciclo del cliente inicia con 1 sello activo');
  };

  const handleSearchClient = async () => {
    const cleanPhone = clienteTelefonoInput.trim();
    setLoyaltyRedeemConfirmation(null);
    if (!cleanPhone) {
      setPhoneError(true);
      setSelectedClient(null);
      return;
    }

    setPhoneError(false);
    const cleanDigits = cleanPhone.replace(/\D/g, '');
    const existingClient = (clientes || []).find(c => {
      const cDigits = c.telefono.replace(/\D/g, '');
      return (cDigits && cDigits === cleanDigits) || c.telefono === cleanPhone || c.id === cleanPhone;
    });

    // Consultar en vivo en Supabase para obtener el conteo exacto de sellos y premios
    try {
      const supa = (window as any).supabase || getSupabaseClient();
      if (supa) {
        const { data: remoteFound } = await supa
          .from('customers')
          .select('*')
          .or(`phone.eq.${cleanDigits || cleanPhone},telefono.eq.${cleanDigits || cleanPhone},id.eq.${cleanPhone}`)
          .limit(1)
          .maybeSingle();

        if (remoteFound) {
          const currentStickers = resolveClientStickers(remoteFound);
          setSelectedClient({
            id: remoteFound.id,
            nombre: remoteFound.full_name || remoteFound.nombre || existingClient?.nombre || 'Cliente',
            telefono: remoteFound.phone || remoteFound.telefono || existingClient?.telefono || cleanPhone,
            stickers_count: currentStickers,
            rewards_redeemed: Number(remoteFound.rewards_redeemed ?? existingClient?.rewards_redeemed ?? 0)
          });
          return;
        }
      }
    } catch (e) {}

    if (existingClient) {
      const currentStickers = resolveClientStickers(existingClient);
      setSelectedClient({
        id: existingClient.id,
        nombre: existingClient.nombre,
        telefono: existingClient.telefono,
        stickers_count: currentStickers,
        rewards_redeemed: Number(existingClient.rewards_redeemed ?? 0)
      });
      return;
    }

    setSelectedClient(null);
    setNewClientModal({
      open: true,
      phone: cleanPhone,
      name: ''
    });
  };

  // Modal obligatorio de cobro previo a registro
  const [mandatoryPaymentModal, setMandatoryPaymentModal] = useState<{
    kind: 'sugerida' | 'pos';
    sugeridaProdId?: string;
    articulos: Array<{ nombre: string; cantidad: number; subtotal: number }>;
    total: number;
  } | null>(null);

  // Estados para el flujo de cobro con Tarjeta de Regalo conectada a Supabase
  const [isGiftCardPaymentActive, setIsGiftCardPaymentActive] = useState<boolean>(false);
  const [giftCardCodeInput, setGiftCardCodeInput] = useState<string>('');
  const [isLoadingGiftCard, setIsLoadingGiftCard] = useState<boolean>(false);
  const [giftCardError, setGiftCardError] = useState<string | null>(null);
  const [giftCardVerifiedData, setGiftCardVerifiedData] = useState<{
    code: string;
    current_balance: number;
    is_active: boolean;
  } | null>(null);
  const [secondaryPaymentMethod, setSecondaryPaymentMethod] = useState<string>('Efectivo');
  const [giftCardCustomAmountInput, setGiftCardCustomAmountInput] = useState<string>('');
  const [isDebitingGiftCard, setIsDebitingGiftCard] = useState<boolean>(false);

  // Estados para Pago Mixto / Dividido (Varios Medios de Pago)
  const [isSplitPaymentActive, setIsSplitPaymentActive] = useState<boolean>(false);
  const [splitPaymentRows, setSplitPaymentRows] = useState<Array<{ id: string; metodo: string; monto: string }>>([
    { id: 'sp-1', metodo: 'Tarjeta (Datáfono)', monto: '' },
    { id: 'sp-2', metodo: 'Efectivo', monto: '' }
  ]);
  const [splitPaymentError, setSplitPaymentError] = useState<string | null>(null);

  const handleClosePaymentModal = () => {
    setMandatoryPaymentModal(null);
    setIsGiftCardPaymentActive(false);
    setGiftCardCodeInput('');
    setIsLoadingGiftCard(false);
    setGiftCardError(null);
    setGiftCardVerifiedData(null);
    setSecondaryPaymentMethod('Efectivo');
    setGiftCardCustomAmountInput('');
    setIsDebitingGiftCard(false);
    setIsSplitPaymentActive(false);
    setSplitPaymentError(null);
    setSplitPaymentRows([
      { id: 'sp-1', metodo: 'Tarjeta (Datáfono)', monto: '' },
      { id: 'sp-2', metodo: 'Efectivo', monto: '' }
    ]);
  };

  const handleConsultarSaldoGiftCard = async () => {
    const rawCode = giftCardCodeInput.trim();
    const cleanCode = rawCode.replace(/\s+/g, '');
    if (!cleanCode) {
      setGiftCardError('Por favor ingresa el código de la tarjeta de regalo.');
      return;
    }

    setIsLoadingGiftCard(true);
    setGiftCardError(null);
    setGiftCardVerifiedData(null);

    try {
      const client = (window as any).supabase || getSupabaseClient();
      if (!client) {
        setGiftCardError('No se encontró conexión con Supabase.');
        setIsLoadingGiftCard(false);
        return;
      }

      // Consulta a la tabla gift_cards buscando coincidencia exacta ignorando mayúsculas/minúsculas
      const { data, error } = await client
        .from('gift_cards')
        .select('code, current_balance, is_active')
        .ilike('code', cleanCode);

      if (error) {
        console.error('Error al consultar gift_cards en Supabase:', error.message);
        setGiftCardError(`Error de Supabase: ${error.message}`);
        setIsLoadingGiftCard(false);
        return;
      }

      let matchedCard = (data || []).find((c: any) => 
        (c.code || '').replace(/\s+/g, '').toLowerCase() === cleanCode.toLowerCase()
      );

      // Si no se encontró mediante ilike directo, realizar búsqueda amplia insensible a espacios
      if (!matchedCard) {
        const { data: allCards } = await client
          .from('gift_cards')
          .select('code, current_balance, is_active')
          .limit(200);
        if (allCards) {
          matchedCard = allCards.find((c: any) => 
            (c.code || '').replace(/\s+/g, '').toLowerCase() === cleanCode.toLowerCase()
          );
        }
      }

      // 1. Validar si no existe
      if (!matchedCard) {
        setGiftCardError('El código de tarjeta de regalo no existe.');
        setIsLoadingGiftCard(false);
        return;
      }

      // 2. Validar si is_active es false
      if (!matchedCard.is_active) {
        setGiftCardError('La tarjeta de regalo no está activa o se encuentra deshabilitada.');
        setIsLoadingGiftCard(false);
        return;
      }

      // 3. Validar si current_balance <= 0
      const currentBalance = Number(matchedCard.current_balance || 0);
      if (currentBalance <= 0) {
        setGiftCardError('La tarjeta de regalo no tiene saldo disponible ($0).');
        setIsLoadingGiftCard(false);
        return;
      }

      // Si es válida, mostrar el saldo actual de forma visible y pre-llenar el monto a descontar
      const maxInitialDebit = mandatoryPaymentModal
        ? Math.min(currentBalance, mandatoryPaymentModal.total)
        : currentBalance;
      setGiftCardCustomAmountInput(String(maxInitialDebit));
      setGiftCardVerifiedData({
        code: matchedCard.code,
        current_balance: currentBalance,
        is_active: Boolean(matchedCard.is_active)
      });
    } catch (err: any) {
      console.error('Excepción al consultar saldo de tarjeta de regalo:', err);
      setGiftCardError(err.message || 'Error de conexión al consultar saldo.');
    } finally {
      setIsLoadingGiftCard(false);
    }
  };

  const handleConfirmarCobroGiftCard = async () => {
    if (!mandatoryPaymentModal || !giftCardVerifiedData) return;

    const totalFactura = mandatoryPaymentModal.total;
    const saldoActual = Number(giftCardVerifiedData.current_balance || 0);
    const maxAplicable = Math.min(saldoActual, totalFactura);
    const parsedCustom = parseFloat(giftCardCustomAmountInput);
    const montoADescontar =
      !isNaN(parsedCustom) && parsedCustom > 0
        ? Math.min(parsedCustom, maxAplicable)
        : maxAplicable;

    if (montoADescontar <= 0) {
      setGiftCardError('El monto a descontar de la tarjeta regalo debe ser mayor a $0.');
      return;
    }

    const isFullPayment = Math.abs(totalFactura - montoADescontar) < 0.01;
    const saldoRestanteProyectado = Math.max(0, saldoActual - montoADescontar);
    const montoComplementario = isFullPayment ? 0 : Math.max(0, Number((totalFactura - montoADescontar).toFixed(2)));
    const metodoComplementario = isFullPayment ? undefined : secondaryPaymentMethod;

    setIsDebitingGiftCard(true);
    setGiftCardError(null);

    try {
      const client = (window as any).supabase || getSupabaseClient();
      if (!client) {
        setGiftCardError('No hay conexión con Supabase.');
        setIsDebitingGiftCard(false);
        return;
      }

      // 1. Ejecutar RPC debit_gift_card
      const { data: rpcResult, error: rpcError } = await client.rpc('debit_gift_card', {
        p_code: giftCardVerifiedData.code,
        p_amount: montoADescontar
      });

      if (rpcError) {
        console.error('Error al ejecutar RPC debit_gift_card:', rpcError);
        setGiftCardError(rpcError.message || 'Error de base de datos al debitar la tarjeta.');
        setIsDebitingGiftCard(false);
        return;
      }

      // Validar respuesta del RPC
      const isSuccess =
        rpcResult === true ||
        (typeof rpcResult === 'object' && rpcResult !== null && (rpcResult.success === true || rpcResult.status === 'success'));

      if (!isSuccess && typeof rpcResult === 'object' && rpcResult !== null && rpcResult.success === false) {
        setGiftCardError(rpcResult.error || rpcResult.message || 'La base de datos rechazó el débito.');
        setIsDebitingGiftCard(false);
        return;
      }

      // 2. Si el RPC responde success: true, guardar la venta registrando el desglose exacto de pago
      const ventaId = `vreg-${Date.now()}`;
      const cleanPhone = clienteTelefonoInput.trim();
      const cleanPhoneFinal = cleanPhone || selectedClient?.telefono || '';
      const clienteNombreFinal = selectedClient?.nombre || (cleanPhone ? `Cliente ${cleanPhone}` : 'Cliente General');

      const pagosDivididos: PagoFraccionado[] = [
        {
          metodo: 'Tarjeta Regalo',
          monto: montoADescontar,
          codigo_tarjeta: giftCardVerifiedData.code
        }
      ];
      if (montoComplementario > 0 && metodoComplementario) {
        pagosDivididos.push({
          metodo: metodoComplementario,
          monto: montoComplementario
        });
      }

      const metodoPagoFinal = montoComplementario > 0
        ? `Tarjeta Regalo (${formatMoney(montoADescontar)}) + ${metodoComplementario} (${formatMoney(montoComplementario)})`
        : 'Tarjeta Regalo';

      const itemsVendidos = mandatoryPaymentModal.articulos.map(art => ({
        producto_id: 'prod-' + art.nombre,
        nombre: art.nombre,
        codigo: 'COD-' + art.nombre.substring(0, 3).toUpperCase(),
        precio: art.cantidad > 0 ? art.subtotal / art.cantidad : art.subtotal,
        cantidad: art.cantidad
      }));

      const desglosePago = {
        tarjeta_regalo: montoADescontar,
        codigo_tarjeta: giftCardVerifiedData.code,
        saldo_anterior: saldoActual,
        saldo_restante: saldoRestanteProyectado,
        complementario: montoComplementario,
        metodo_complementario: metodoComplementario || null,
        pagos: pagosDivididos
      };

      const prevStickers = Math.max(Number(selectedClient?.stickers_count ?? 1), 1);
      const prevRewards = Number(selectedClient?.rewards_redeemed ?? 0);
      const shouldResetCycle = prevStickers >= 10;
      const newStickers = shouldResetCycle ? 1 : prevStickers + 1;
      const nextRewards = shouldResetCycle ? prevRewards + 1 : prevRewards;
      const newStickersCycle = newStickers % 10 === 0 ? 10 : newStickers % 10;

      if (shouldResetCycle && selectedClient?.id) {
        try {
          await client
            .from('customers')
            .update({
              stickers_count: 1,
              rewards_redeemed: nextRewards,
              visitas_acumuladas: 1
            })
            .eq('id', selectedClient.id);
        } catch (e) {}
      }

      const ventaPayload: any = {
        id: ventaId,
        fecha: getLocalDateString(),
        hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        cajero_id: empleado.id,
        cajero_nombre: empleado.nombre,
        usuario_id: empleado.id,
        vendedor_id: empleado.id,
        vendedor_nombre: empleado.nombre,
        productos_vendidos: itemsVendidos,
        total: totalFactura,
        metodo_pago: metodoPagoFinal,
        cliente_id: selectedClient?.id,
        cliente_nombre: clienteNombreFinal,
        cliente_telefono: cleanPhoneFinal,
        cliente_stickers_count: newStickers,
        cliente_rewards_redeemed: nextRewards,
        cliente_reward_redeemed_now: shouldResetCycle,
        estado: 'completada',
        monto_tarjeta_regalo: montoADescontar,
        tarjeta_regalo_codigo: giftCardVerifiedData.code,
        monto_complementario: montoComplementario,
        metodo_pago_complementario: metodoComplementario || null,
        pagos_divididos: pagosDivididos,
        desglose_pago: desglosePago
      };

      // Guardar en tabla 'orders' en Supabase si existe
      try {
        await client.from('orders').insert([{
          id: ventaId,
          order_id: ventaId,
          staff_id: empleado.id,
          vendedor_id: empleado.id,
          vendedor_nombre: empleado.nombre,
          customer_phone: cleanPhoneFinal,
          cliente_id: selectedClient?.id || null,
          cliente_nombre: clienteNombreFinal,
          cliente_telefono: cleanPhoneFinal,
          total_amount: totalFactura,
          total: totalFactura,
          payment_method: metodoPagoFinal,
          metodo_pago: metodoPagoFinal,
          gift_card_code: giftCardVerifiedData.code,
          tarjeta_regalo_codigo: giftCardVerifiedData.code,
          gift_card_amount: montoADescontar,
          monto_tarjeta_regalo: montoADescontar,
          complementary_amount: montoComplementario,
          monto_complementario: montoComplementario,
          complementary_payment_method: metodoComplementario || null,
          metodo_pago_complementario: metodoComplementario || null,
          desglose_pago: desglosePago,
          items: itemsVendidos,
          productos_vendidos: itemsVendidos,
          fecha: getLocalDateString(),
          hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          estado: 'completada'
        }]);
      } catch (errOrders) {
        console.warn('Nota: guardado en tabla orders:', errOrders);
      }

      // Guardar la venta en la aplicación y sincronizar con sales en Supabase
      if (mandatoryPaymentModal.kind === 'sugerida' && mandatoryPaymentModal.sugeridaProdId) {
        onAddVentaSugerida(mandatoryPaymentModal.sugeridaProdId, empleado.id, metodoPagoFinal);
      } else {
        onRegistrarVenta(ventaPayload);
        setPosSaleSuccessModal({
          open: true,
          clienteNombre: clienteNombreFinal,
          clienteTelefono: cleanPhoneFinal,
          prevStickers,
          newStickers,
          newStickersCycle,
          totalVenta: totalFactura,
          metodoPago: metodoPagoFinal,
          rewardRedeemedNow: shouldResetCycle
        });
      }

      // Limpiar carrito y cerrar modal
      setCartItems([]);
      setClienteTelefonoInput('');
      setSelectedClient(null);
      setLoyaltyRedeemConfirmation(null);
      setPhoneError(false);
      handleClosePaymentModal();
    } catch (err: any) {
      console.error('Error general al confirmar cobro con tarjeta de regalo:', err);
      setGiftCardError(err.message || 'Error inesperado al registrar el cobro.');
    } finally {
      setIsDebitingGiftCard(false);
    }
  };

  const handleSelectMandatoryPayment = async (metodo: string) => {
    if (!mandatoryPaymentModal) return;

    if (metodo === 'Tarjeta Regalo') {
      setIsGiftCardPaymentActive(true);
      setIsSplitPaymentActive(false);
      setGiftCardError(null);
      setGiftCardVerifiedData(null);
      setGiftCardCodeInput('');
      setGiftCardCustomAmountInput('');
      return;
    }

    if (metodo === 'Pago Mixto') {
      setIsSplitPaymentActive(true);
      setIsGiftCardPaymentActive(false);
      setSplitPaymentError(null);
      const half = Math.floor(mandatoryPaymentModal.total / 2);
      const rest = Number((mandatoryPaymentModal.total - half).toFixed(2));
      setSplitPaymentRows([
        { id: `sp-${Date.now()}-1`, metodo: 'Tarjeta (Datáfono)', monto: String(half) },
        { id: `sp-${Date.now()}-2`, metodo: 'Efectivo', monto: String(rest) }
      ]);
      return;
    }

    if (mandatoryPaymentModal.kind === 'sugerida' && mandatoryPaymentModal.sugeridaProdId) {
      onAddVentaSugerida(mandatoryPaymentModal.sugeridaProdId, empleado.id, metodo);
    } else if (mandatoryPaymentModal.kind === 'pos') {
      const prevStickers = Math.max(Number(selectedClient?.stickers_count ?? 1), 1);
      const prevRewards = Number(selectedClient?.rewards_redeemed ?? 0);
      const shouldResetCycle = prevStickers >= 10;
      const newStickers = shouldResetCycle ? 1 : prevStickers + 1;
      const nextRewards = shouldResetCycle ? prevRewards + 1 : prevRewards;
      const newStickersCycle = newStickers % 10 === 0 ? 10 : newStickers % 10;

      if (shouldResetCycle && selectedClient?.id) {
        try {
          const supabase = (window as any).supabase || getSupabaseClient();
          if (supabase) {
            await supabase
              .from('customers')
              .update({
                stickers_count: 1,
                rewards_redeemed: nextRewards,
                visitas_acumuladas: 1
              })
              .eq('id', selectedClient.id);
          }
        } catch (e) {}
      }

      const newVenta = {
        fecha: getLocalDateString(),
        hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        cajero_id: empleado.id,
        cajero_nombre: empleado.nombre,
        usuario_id: empleado.id,
        productos_vendidos: mandatoryPaymentModal.articulos.map(art => ({
          producto_id: 'prod-' + art.nombre,
          nombre: art.nombre,
          codigo: 'COD-' + art.nombre.substring(0, 3).toUpperCase(),
          precio: art.cantidad > 0 ? art.subtotal / art.cantidad : art.subtotal,
          cantidad: art.cantidad
        })),
        total: mandatoryPaymentModal.total,
        metodo_pago: metodo,
        cliente_id: selectedClient?.id,
        cliente_nombre: selectedClient?.nombre,
        cliente_telefono: selectedClient?.telefono,
        cliente_stickers_count: newStickers,
        cliente_rewards_redeemed: nextRewards,
        cliente_reward_redeemed_now: shouldResetCycle,
        estado: 'completada'
      };

      onRegistrarVenta(newVenta as any);
      setPosSaleSuccessModal({
        open: true,
        clienteNombre: selectedClient?.nombre || 'Cliente',
        clienteTelefono: selectedClient?.telefono || '',
        prevStickers,
        newStickers,
        newStickersCycle,
        totalVenta: mandatoryPaymentModal.total,
        metodoPago: metodo,
        rewardRedeemedNow: shouldResetCycle
      });
      setCartItems([]);
      setClienteTelefonoInput('');
      setSelectedClient(null);
      setLoyaltyRedeemConfirmation(null);
      setPhoneError(false);
    }

    handleClosePaymentModal();
  };

  const handleConfirmarPagoMixto = async () => {
    if (!mandatoryPaymentModal) return;

    const totalFactura = Number(mandatoryPaymentModal.total || 0);
    const validRows = splitPaymentRows
      .map(r => ({
        metodo: r.metodo,
        monto: Number(parseFloat(r.monto || '0').toFixed(2))
      }))
      .filter(r => !isNaN(r.monto) && r.monto > 0);

    if (validRows.length === 0) {
      setSplitPaymentError('Ingresa los montos a cobrar en cada medio de pago.');
      return;
    }

    const sumaPagos = Number(validRows.reduce((acc, r) => acc + r.monto, 0).toFixed(2));
    const diff = Number((totalFactura - sumaPagos).toFixed(2));

    if (Math.abs(diff) >= 0.01) {
      if (diff > 0) {
        setSplitPaymentError(`Faltan ${formatMoney(diff)} por asignar para cubrir el total de ${formatMoney(totalFactura)}.`);
      } else {
        setSplitPaymentError(`La suma ingresada (${formatMoney(sumaPagos)}) supera el total por ${formatMoney(Math.abs(diff))}.`);
      }
      return;
    }

    // Consolidar pagos del mismo método si el cajero seleccionó dos filas iguales
    const groupedMap = new Map<string, number>();
    validRows.forEach(r => {
      groupedMap.set(r.metodo, Number(((groupedMap.get(r.metodo) || 0) + r.monto).toFixed(2)));
    });
    const pagosDivididos: PagoFraccionado[] = Array.from(groupedMap.entries()).map(([metodo, monto]) => ({
      metodo,
      monto
    }));

    const metodoPagoFinal =
      pagosDivididos.length === 1
        ? pagosDivididos[0].metodo
        : pagosDivididos.map(p => `${p.metodo} (${formatMoney(p.monto)})`).join(' + ');

    if (mandatoryPaymentModal.kind === 'sugerida' && mandatoryPaymentModal.sugeridaProdId) {
      onAddVentaSugerida(mandatoryPaymentModal.sugeridaProdId, empleado.id, metodoPagoFinal);
    } else if (mandatoryPaymentModal.kind === 'pos') {
      const prevStickers = Math.max(Number(selectedClient?.stickers_count ?? 1), 1);
      const prevRewards = Number(selectedClient?.rewards_redeemed ?? 0);
      const shouldResetCycle = prevStickers >= 10;
      const newStickers = shouldResetCycle ? 1 : prevStickers + 1;
      const nextRewards = shouldResetCycle ? prevRewards + 1 : prevRewards;
      const newStickersCycle = newStickers % 10 === 0 ? 10 : newStickers % 10;

      if (shouldResetCycle && selectedClient?.id) {
        try {
          const supabase = (window as any).supabase || getSupabaseClient();
          if (supabase) {
            await supabase
              .from('customers')
              .update({
                stickers_count: 1,
                rewards_redeemed: nextRewards,
                visitas_acumuladas: 1
              })
              .eq('id', selectedClient.id);
          }
        } catch (e) {}
      }

      const newVenta = {
        fecha: getLocalDateString(),
        hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        cajero_id: empleado.id,
        cajero_nombre: empleado.nombre,
        usuario_id: empleado.id,
        productos_vendidos: mandatoryPaymentModal.articulos.map(art => ({
          producto_id: 'prod-' + art.nombre,
          nombre: art.nombre,
          codigo: 'COD-' + art.nombre.substring(0, 3).toUpperCase(),
          precio: art.cantidad > 0 ? art.subtotal / art.cantidad : art.subtotal,
          cantidad: art.cantidad
        })),
        total: totalFactura,
        metodo_pago: metodoPagoFinal,
        pagos_divididos: pagosDivididos,
        desglose_pago: {
          pagos: pagosDivididos
        },
        cliente_id: selectedClient?.id,
        cliente_nombre: selectedClient?.nombre,
        cliente_telefono: selectedClient?.telefono,
        cliente_stickers_count: newStickers,
        cliente_rewards_redeemed: nextRewards,
        cliente_reward_redeemed_now: shouldResetCycle,
        estado: 'completada'
      };

      onRegistrarVenta(newVenta as any);
      setPosSaleSuccessModal({
        open: true,
        clienteNombre: selectedClient?.nombre || 'Cliente',
        clienteTelefono: selectedClient?.telefono || '',
        prevStickers,
        newStickers,
        newStickersCycle,
        totalVenta: totalFactura,
        metodoPago: metodoPagoFinal,
        rewardRedeemedNow: shouldResetCycle
      });
      setCartItems([]);
      setClienteTelefonoInput('');
      setSelectedClient(null);
      setLoyaltyRedeemConfirmation(null);
      setPhoneError(false);
    }

    handleClosePaymentModal();
  };

  const handleProcessPosSale = async () => {
    if (cartItems.length === 0) return;

    const cleanPhone = clienteTelefonoInput.trim();

    // Regla de Bloqueo Estricto: Si el campo está vacío, no se permite avanzar al cobro
    if (!cleanPhone) {
      setPhoneError(true);
      return;
    }

    setPhoneError(false);

    const cleanDigits = cleanPhone.replace(/\D/g, '');
    const existingClient = (clientes || []).find(c => {
      const cDigits = c.telefono.replace(/\D/g, '');
      return (cDigits && cDigits === cleanDigits) || c.telefono === cleanPhone || c.id === cleanPhone;
    });

    const items = cartItems.map(item => ({
      nombre: item.producto.nombre,
      cantidad: item.cantidad,
      subtotal: item.producto.precio * item.cantidad
    }));
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    if (selectedClient && (selectedClient.telefono === cleanPhone || selectedClient.telefono.replace(/\D/g, '') === cleanPhone.replace(/\D/g, ''))) {
      setMandatoryPaymentModal({
        kind: 'pos',
        articulos: items,
        total: total
      });
      return;
    }

    if (existingClient) {
      const currentStickers = resolveClientStickers(existingClient);
      setSelectedClient({
        id: existingClient.id,
        nombre: existingClient.nombre,
        telefono: existingClient.telefono,
        stickers_count: currentStickers
      });
      setMandatoryPaymentModal({
        kind: 'pos',
        articulos: items,
        total: total
      });
      return;
    }

    // Consultar también en vivo en Supabase por si el cliente recién escaneó el QR de registro
    try {
      const supa = (window as any).supabase || getSupabaseClient();
      if (supa) {
        const { data: remoteFound } = await supa
          .from('customers')
          .select('*')
          .or(`phone.eq.${cleanDigits || cleanPhone},telefono.eq.${cleanDigits || cleanPhone},id.eq.${cleanPhone}`)
          .limit(1)
          .maybeSingle();

        if (remoteFound) {
          const currentStickers = resolveClientStickers(remoteFound);
          setSelectedClient({
            id: remoteFound.id,
            nombre: remoteFound.full_name || remoteFound.nombre || 'Cliente',
            telefono: remoteFound.phone || remoteFound.telefono || cleanPhone,
            stickers_count: currentStickers
          });
          setMandatoryPaymentModal({
            kind: 'pos',
            articulos: items,
            total: total
          });
          return;
        }
      }
    } catch (e) {}

    // Cliente nuevo: Abre modal emergente para solicitar nombre completo
    // NO abre el modal de medio de pago sin registrar al cliente primero
    setNewClientModal({
      open: true,
      phone: cleanPhone,
      name: ''
    });
  };

  // --- ESTADOS PARA REGISTRO DE VENTAS EN TIENDA (EMPLEADO) ---
  const [cartItems, setCartItems] = useState<Array<{ producto: Producto; cantidad: number }>>([]);
  const [salesSearch, setSalesSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [evidencePhoto, setEvidencePhoto] = useState(PHOTO_PRESETS[0].url);
  const [evidenceNote, setEvidenceNote] = useState('');

  // Ticker para forzar re-renderizado de tiempos transcurridos en tiempo real
  const [ticker, setTicker] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTicker(t => t + 1);
    }, 10000); // Actualiza cada 10 segundos
    return () => clearInterval(interval);
  }, []);

  const [showIncidenciaModal, setShowIncidenciaModal] = useState(false);
  const [incidenciaTitulo, setIncidenciaTitulo] = useState('');
  const [incidenciaDesc, setIncidenciaDesc] = useState('');
  const [incidenciaTipo, setIncidenciaTipo] = useState<'insumo' | 'equipo'>('insumo');

  // Anuncio más reciente
  const anuncioReciente = anuncios[0];

  // --- ESTADOS PARA CIERRE DE TURNO Y CUADRE DE CAJA (CORTE DIARIO) ---
  const [cuadreEfectivo, setCuadreEfectivo] = useState('');
  const [cuadreTarjeta, setCuadreTarjeta] = useState('');
  const [cuadreObs, setCuadreObs] = useState('');
  const [cuadrePosContadoInput, setCuadrePosContadoInput] = useState('');
  const [cuadrePosSuccess, setCuadrePosSuccess] = useState(false);
  const [filtroHistorialVentas, setFiltroHistorialVentas] = useState<'todas' | 'mias'>('todas');

  const yaCuadrado = (cuadresCaja || []).some(
    c => c.usuario_id === empleado.id && c.fecha === getLocalDateString()
  );

  const handleCuadreCajaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuadreEfectivo || !cuadreTarjeta || !cuadreObs.trim()) return;

    onRegistrarCuadreCaja({
      usuario_id: empleado.id,
      usuario_nombre: empleado.nombre,
      fecha: getLocalDateString(),
      hora: `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`,
      efectivo_contado: Number(cuadreEfectivo),
      tarjeta_esperado: Number(cuadreTarjeta),
      observaciones: cuadreObs
    });

    setCuadreEfectivo('');
    setCuadreTarjeta('');
    setCuadreObs('');
  };

  const handleCompletarConFoto = (taskId: string) => {
    const existing = tareas.find(t => t.id === taskId);
    if (existing && existing.foto_url) {
      setEvidencePhoto(existing.foto_url);
      setEvidenceNote(existing.nota_evidencia || '');
    } else {
      setEvidencePhoto(PHOTO_PRESETS[0].url);
      setEvidenceNote('');
    }
    setSelectedTaskId(taskId);
    setShowPhotoModal(true);
  };

  const handleModalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setEvidencePhoto(compressed);
      } catch (err) {
        console.error("Error compressing image:", err);
        // Fallback
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setEvidencePhoto(reader.result);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleToggleTareaEstado = (
    taskId: string,
    nuevoEstado: 'Pendiente' | 'En proceso' | 'Completada',
    fotoUrl?: string,
    notaEvidencia?: string
  ) => {
    // Actualización optimista instantánea en el estado del componente (0ms delay)
    if (tareasFechaSupabase) {
      setTareasFechaSupabase(prev => {
        if (!prev) return null;
        return prev.map(t => {
          if (t.id === taskId) {
            const updated = { ...t, estado: nuevoEstado };
            if (fotoUrl !== undefined) updated.foto_url = fotoUrl;
            if (notaEvidencia !== undefined) updated.nota_evidencia = notaEvidencia;
            return updated;
          }
          return t;
        });
      });
    }

    onUpdateTareaEstado(taskId, nuevoEstado, fotoUrl, notaEvidencia);
  };

  const handleSavePhotoEvidence = () => {
    if (selectedTaskId) {
      handleToggleTareaEstado(selectedTaskId, 'Completada', evidencePhoto, evidenceNote);
      setShowPhotoModal(false);
      setSelectedTaskId(null);
      setEvidenceNote('');
    }
  };

  const handleIncidenciaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidenciaTitulo.trim()) return;

    onAddIncidencia({
      usuario_id: empleado.id,
      fecha: getLocalDateString(),
      titulo: incidenciaTitulo,
      descripcion: incidenciaDesc,
      tipo: incidenciaTipo,
      estado: 'Pendiente',
    });

    setIncidenciaTitulo('');
    setIncidenciaDesc('');
    setShowIncidenciaModal(false);
    alert('Reporte de incidencia enviado al administrador.');
  };

  const getVentasProductoCount = (productId: string) => {
    return ventas
      .filter(v => v.producto_id === productId && v.usuario_id === empleado.id && v.fecha === getLocalDateString())
      .reduce((sum, v) => sum + v.unidades_contadas, 0);
  };

  return (
    <div id="employee-workspace" className="relative w-full text-slate-800 space-y-6">
      
      {/* HEADER PRINCIPAL DE LA ESTACIÓN DE TRABAJO (PC VIEW) */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-xs gap-4">
        <div className="flex items-center gap-4">
          <div
            className="relative group cursor-pointer"
            onClick={() => avatarInputRef.current?.click()}
            title="Haz clic para actualizar tu foto de perfil en Supabase"
          >
            <img
              src={currentAvatar || empleado.foto_avatar}
              alt={empleado.nombre}
              className="w-16 h-16 rounded-full object-cover border-2 border-[#4B9CD3] shadow-xs group-hover:opacity-80 transition-opacity"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-[9px] font-bold">
              <Camera className="w-4 h-4 mb-0.5" />
              <span>Cambiar</span>
            </div>
            {isUploadingAvatar && (
              <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-[#4B9CD3] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <input
              type="file"
              ref={avatarInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estación de Trabajo Activa</p>
            <h3 className="font-black text-2xl text-[#2C3E50] tracking-tight">{empleado.nombre}</h3>
          </div>
        </div>

        {/* Marcación de Fichaje y Stats Rápidos */}
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
          
          {/* Stats rápidos */}
          <div className="flex gap-3">
            <div className="bg-[#85C1E9]/20 border border-[#85C1E9]/40 px-4 py-2 rounded-xl text-center min-w-[100px]">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Mis Puntos</p>
              <p className="text-lg font-black text-[#4B9CD3]">{misPuntos} pts</p>
            </div>
            <div className="bg-[#2C3E50] px-4 py-2 rounded-xl text-center min-w-[100px] text-white">
              <p className="text-[9px] font-bold text-[#85C1E9] uppercase tracking-wider">Ranking Hoy</p>
              <p className="text-lg font-black">#{miPosicion} <span className="text-[10px] font-medium opacity-85">/ {leaderboardData.length}</span></p>
            </div>
           {/* Fichaje widget */}
          {(() => {
            const duracionInfo = miFichaje?.hora_entrada ? calcularHorasTurno(miFichaje.hora_entrada, miFichaje.hora_salida) : null;
            return (
              <div className="bg-white border border-[#E2E8F0] p-2.5 px-4 rounded-xl flex flex-wrap sm:flex-nowrap items-center gap-4 shadow-xs">
                <div>
                  <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">
                    {miFichaje?.hora_salida ? 'Turno Finalizado' : miFichaje?.hora_entrada ? 'Turno en Curso' : 'Control de Asistencia'}
                  </p>
                  <div className="text-[11px] text-slate-700 font-bold mt-0.5 flex flex-wrap items-center gap-1.5">
                    {miFichaje?.hora_entrada ? (
                      <>
                        <span>Entrada: <strong className="text-slate-900">{miFichaje.hora_entrada}</strong></span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                          miFichaje.puntual 
                            ? 'bg-[#EBF5FB] text-[#4B9CD3] border border-[#AED6F1]/70' 
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {miFichaje.puntual ? '✓ Puntual' : '⚠️ Retraso'}
                        </span>
                        {miFichaje.hora_salida ? (
                          <>
                            <span>| Salida: <strong className="text-slate-900">{miFichaje.hora_salida}</strong></span>
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-md text-[10px] font-black flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              Total: {duracionInfo?.texto || duracionInfo?.textoCorto}
                            </span>
                          </>
                        ) : (
                          <span className="bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-md text-[10px] font-black animate-pulse flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            {duracionInfo?.textoCorto} en turno ({duracionInfo?.texto})
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400 font-semibold">Sin registrar ingreso hoy</span>
                    )}
                  </div>
                </div>

                <div className="ml-auto sm:ml-0">
                  {miFichaje ? (
                    miFichaje.hora_salida ? (
                      <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg font-black uppercase tracking-wider inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-slate-500" />
                        Jornada Cerrada
                      </span>
                    ) : (
                      <button
                        id="fichaje-out-btn"
                        onClick={() => onRegistrarFichaje(empleado.id, 'salida')}
                        className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-black px-3.5 py-2 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 cursor-pointer uppercase tracking-wider active:scale-95"
                        title="Registrar salida de turno y guardar en la nube"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Registrar Salida Ahora
                      </button>
                    )
                  ) : (
                    <button
                      id="fichaje-in-btn"
                      onClick={() => onRegistrarFichaje(empleado.id, 'entrada')}
                      className="bg-[#4B9CD3] hover:bg-[#3A82B4] text-white text-[11px] font-black px-3.5 py-2 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 cursor-pointer uppercase tracking-wider active:scale-95"
                      title="Registrar hora de entrada del turno"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Registrar Entrada Ahora
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
          </div>

        </div>
      </div>

      {/* BARRA DE MÉTRICAS RÁPIDAS Y FILTRO DE TIEMPO (RESUMEN OPERATIVO DEL LOCAL) */}
      <div id="worker-kpi-bar" className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
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
                id={`worker-filter-btn-${mode}`}
                onClick={() => setFiltroGeneral(mode)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all capitalize cursor-pointer ${
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
                {porcentajeCumplimientoTareas}%
              </h3>
              <p className="text-[9px] text-[#4B9CD3] font-semibold mt-0.5 truncate">
                {tareasCompletadasCount}/{totalTareasCount} listas
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

      {/* SECUENCIA DE FILAS 100% HORIZONTALES (Full-Width Row Layout) EN LA SESIÓN DE TRABAJADORES */}
      <div className="flex flex-col gap-6 w-full">
        {/* FILA: Tabla de Posiciones y Ranking (w-full) */}
        <div id="row-leaderboard" className="w-full">
          <Leaderboard
            usuarios={usuarios}
            tareas={tareas}
            ventas={ventas}
            fichajes={fichajes}
            productos={localProductos}
            filtro={filtroGeneral}
            posVentas={posVentas || ventasRegistradas}
            rankingWeights={rankingWeights}
          />
        </div>
      </div>

      {/* MÓDULO DE CIERRE DE TURNO Y CUADRE DE CAJA (CORTE DIARIO) */}
      {miFichaje && !miFichaje.hora_salida && (
        <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4 mb-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black text-[#2C3E50] uppercase tracking-wider">Cierre de Turno y Cuadre de Caja (Corte Diario)</h3>
            <p className="text-[11px] text-slate-500">
              Paso obligatorio antes de registrar la salida de tu jornada laboral. Registra los valores contados en caja para rendir cuentas al administrador.
            </p>
          </div>

          {yaCuadrado ? (
            <div className="bg-[#EBF5FB] border border-[#AED6F1] p-4 rounded-xl text-[#2C3E50] text-xs font-semibold">
              El cuadre de caja diario ha sido registrado con éxito. El botón para registrar la salida de tu turno ya está habilitado en la parte superior derecha.
            </div>
          ) : (
            <form onSubmit={handleCuadreCajaSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Efectivo Contado en Caja ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={cuadreEfectivo}
                    onChange={(e) => setCuadreEfectivo(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg bg-white h-9 focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3]"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total Datáfono / Transferencias ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={cuadreTarjeta}
                    onChange={(e) => setCuadreTarjeta(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg bg-white h-9 focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3]"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Observaciones de entrega de turno y novedades de caja</label>
                <textarea
                  rows={3}
                  required
                  value={cuadreObs}
                  onChange={(e) => setCuadreObs(e.target.value)}
                  className="w-full text-xs p-3 border border-[#E2E8F0] rounded-lg bg-[#FFFDF6]/20 focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3]"
                  placeholder="Detalla cualquier novedad sobre el efectivo, faltantes, sobrantes o novedades del turno..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-bold text-xs py-2 px-4 rounded-lg transition-colors cursor-pointer"
              >
                Guardar Cuadre y Habilitar Fichaje de Salida
              </button>
            </form>
          )}
        </div>
      )}

      {/* CUERPO DEL PANEL DE TRABAJO (GRID DE ESCRITORIO DE DOS COLUMNAS) */}
      <div className="flex flex-col gap-6 items-start w-full">
        
        {/* COLUMNA LATERAL IZQUIERDA (CONTROLES, VENTAS Y AVISOS) - SPAN 5 */}
        <div className="w-full space-y-6">

        {/* TABLERO DE COMUNICADOS */}
        <div id="tablero-comunicados-empleado" className="w-full bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
            <div>
              <h4 className="font-extrabold text-xs text-[#2C3E50] uppercase tracking-wider flex items-center gap-1.5">
                <Megaphone className="w-4 h-4 text-[#4B9CD3]" />
                Tablero de Comunicados
              </h4>
              <p className="text-[10px] text-slate-500">Mantente al tanto de las novedades y directrices de administración.</p>
            </div>
            {liveAnnouncements.length > 0 && (
              <span className="text-[10px] bg-[#EBF5FB] text-[#4B9CD3] font-bold px-2 py-0.5 rounded-md">
                {liveAnnouncements.length} {liveAnnouncements.length === 1 ? 'comunicado activo' : 'comunicados activos'}
              </span>
            )}
          </div>

          {liveAnnouncements.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-slate-400 italic">No hay comunicados activos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {liveAnnouncements.map(an => {
                const yaLeido = (an.lecturas_confirmadas || []).includes(empleado.id);
                const fechaLegible = formatFechaLegible(an.fecha_creacion || an.fecha);
                return (
                  <div key={an.id} className="bg-[#EBF5FB]/40 border border-[#AED6F1]/80 p-3.5 rounded-xl relative shadow-3xs hover:border-[#4B9CD3] transition-all">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-[9px] font-bold text-[#4B9CD3] uppercase tracking-wider">
                        De: {an.creador_nombre || 'Mariana Silva (Admin)'}
                      </p>
                      <span className="text-[9px] text-slate-400 font-semibold shrink-0">
                        {fechaLegible}
                      </span>
                    </div>

                    <h5 className="font-extrabold text-xs text-[#2C3E50] mt-1">{an.titulo}</h5>
                    <p className="text-[11px] text-slate-700 mt-1.5 whitespace-pre-line leading-relaxed">
                      {an.contenido}
                    </p>
                    
                    <div className="mt-3 pt-2.5 border-t border-[#AED6F1]/40 flex justify-between items-center">
                      <span className="text-[9px] text-[#4B9CD3] font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-[#4B9CD3]" />
                        Confirmación de Lectura
                      </span>
                      {yaLeido ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          ✓ Leído
                        </span>
                      ) : (
                        <button
                          type="button"
                          id={`read-btn-${an.id}`}
                          onClick={() => {
                            onConfirmarLecturaAnuncio(an.id, empleado.id);
                            setLiveAnnouncements(prev => prev.map(item => {
                              if (item.id === an.id) {
                                const currentReads = item.lecturas_confirmadas || [];
                                return { ...item, lecturas_confirmadas: [...currentReads, empleado.id] };
                              }
                              return item;
                            }));
                          }}
                          className="bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-extrabold text-[9px] px-2.5 py-1 rounded-md transition-all cursor-pointer uppercase tracking-wider shadow-3xs"
                        >
                          Marcar como Leído
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* TARJETA DEL PRODUCTO DEL DÍA A IMPULSAR */}
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#4B9CD3]" />
            Producto a impulsar
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(() => {
              const displayCampanas = localProductos;
              return displayCampanas.slice(0, 4).map(prod => {
                const currentSold = getVentasProductoCount(prod.id);
                const progressPct = Math.min((currentSold / prod.meta_diaria_unidades) * 100, 100);
                return (
                  <div key={prod.id} className="bg-white border border-[#E2E8F0] p-3.5 rounded-xl shadow-3xs flex items-center justify-between gap-3 relative">
                    <div className="flex-1">
                      <p className="text-[10px] font-extrabold text-[#4B9CD3] uppercase tracking-wider">
                        +{prod.puntos_por_unidad} PTS / UNIDAD
                      </p>
                      <h5 className="font-black text-xs text-[#2C3E50] mt-0.5">{prod.nombre_producto}</h5>
                      
                      {/* Barra de progreso de meta */}
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-[#FFFDF6] rounded-full overflow-hidden border border-[#E2E8F0]">
                          <div className="h-full bg-[#4B9CD3]" style={{ width: `${progressPct}%` }}></div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-600">{currentSold}/{prod.meta_diaria_unidades}</span>
                      </div>
                    </div>

                    <button
                      id={`increment-btn-${prod.id}`}
                      onClick={() => {
                        const prodCat = productosCatalogo?.find(pc => pc.nombre.toLowerCase().includes(prod.nombre_producto.toLowerCase()));
                        const precio = prodCat?.precio || 45.00;
                        setMandatoryPaymentModal({
                          kind: 'sugerida',
                          sugeridaProdId: prod.id,
                          articulos: [{ nombre: prod.nombre_producto, cantidad: 1, subtotal: precio }],
                          total: precio
                        });
                      }}
                      className="h-10 w-10 bg-[#4B9CD3] hover:bg-[#3A82B4] active:scale-95 text-white rounded-lg flex items-center justify-center font-black text-lg transition-all shadow-2xs relative cursor-pointer"
                      title="Vender 1 unidad"
                    >
                      +1
                    </button>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        </div>

        {/* COLUMNA CENTRAL DERECHA (TABS DE OPERACIONES: TAREAS, STOCK, HORARIOS) - SPAN 7 */}
        <div className="w-full space-y-4">
          
          {/* Navegación de Tabs para Terminal de Empleado */}
          <div className="flex border border-[#E2E8F0] bg-white p-1 rounded-xl shadow-3xs gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setEmployeeTab('tareas')}
              className={`flex-1 py-2.5 px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-[120px] ${
                employeeTab === 'tareas'
                  ? 'bg-[#4B9CD3] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-[#EBF5FB]/40 hover:text-[#2C3E50]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span id="tab-mis-tareas-label">Mis Tareas ({tareasCompletadasCount}/{totalTareasCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setEmployeeTab('inventario')}
              className={`flex-1 py-2.5 px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-[120px] ${
                employeeTab === 'inventario'
                  ? 'bg-[#4B9CD3] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-[#EBF5FB]/40 hover:text-[#2C3E50]'
              }`}
            >
              <Boxes className="w-4 h-4 shrink-0" />
              <span>Inventario</span>
            </button>
            
            <button
              type="button"
              onClick={() => setEmployeeTab('ventas')}
              className={`flex-1 py-2.5 px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-[120px] ${
                employeeTab === 'ventas'
                  ? 'bg-[#4B9CD3] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-[#EBF5FB]/40 hover:text-[#2C3E50]'
              }`}
            >
              <DollarSign className="w-4 h-4 shrink-0" />
              <span>Caja / Ventas</span>
            </button>

            <button
              type="button"
              onClick={() => setEmployeeTab('horarios')}
              className={`flex-1 py-2.5 px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-[120px] ${
                employeeTab === 'horarios'
                  ? 'bg-[#4B9CD3] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-[#EBF5FB]/40 hover:text-[#2C3E50]'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Ver Turnos</span>
            </button>

            <button
              id="btn-tab-progreso-react"
              type="button"
              onClick={() => {
                setEmployeeTab('progreso');
                const hoy = getLocalDateString();
                const fecha = fechaProgresoHistorial || hoy;
                cargarProgresoHistorial(fecha);
              }}
              className={`flex-1 py-2.5 px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-[120px] ${
                employeeTab === 'progreso'
                  ? 'bg-[#4B9CD3] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-[#EBF5FB]/40 hover:text-[#2C3E50]'
              }`}
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span>Progreso</span>
            </button>

            <button
              type="button"
              onClick={() => setEmployeeTab('gastos')}
              className={`flex-1 py-2.5 px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-[120px] ${
                employeeTab === 'gastos'
                  ? 'bg-[#4B9CD3] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-[#EBF5FB]/40 hover:text-[#2C3E50]'
              }`}
            >
              <DollarSign className="w-4 h-4 shrink-0" />
              <span>Gastos</span>
            </button>
          </div>

          {/* TAB 1: MI CHECKLIST DE TAREAS OPERATIVAS Y BARRA DE PROGRESO */}
          {employeeTab === 'tareas' && (
            <div className="w-full rounded-xl border border-[#E2E8F0] bg-white p-5 mb-6 shadow-sm animate-in fade-in duration-150">
              
              {/* Selector de Fecha de Jornada (Conectado a Supabase) */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 border border-slate-200 p-3.5 rounded-2xl mb-4 gap-3 shadow-2xs">
                <div className="flex flex-wrap items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#4B9CD3]" />
                  <span className="text-xs font-bold text-slate-700">Fecha de jornada:</span>
                  <input
                    type="date"
                    value={fechaFiltroTareas}
                    onChange={(e) => setFechaFiltroTareas(e.target.value)}
                    className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#4B9CD3] shadow-2xs cursor-pointer"
                  />
                  {fechaFiltroTareas !== hoyFormatted && (
                    <button
                      type="button"
                      onClick={() => setFechaFiltroTareas(hoyFormatted)}
                      className="text-xs bg-[#EBF5FB] hover:bg-[#D4E6F1] text-[#4B9CD3] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      Ir a Hoy ({hoyFormatted})
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                    {fechaFiltroTareas === hoyFormatted ? 'Jornada de Hoy' : `Historial de Supabase: ${fechaFiltroTareas}`}
                  </span>
                  {cargandoTareasFecha && (
                    <span className="text-[10px] text-blue-600 font-bold animate-pulse">Cargando datos...</span>
                  )}
                </div>
              </div>

              {/* Tarjeta de Productividad Diaria del Empleado */}
              <div id="seccion-productividad-empleado" className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    Progreso Diario
                  </h3>
                  <span id="label-porcentaje-prod" className="text-sm font-extrabold text-blue-600">
                    {porcentajeCumplimientoTareas}%
                  </span>
                </div>
                
                {/* Barra de progreso visual */}
                <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
                  <div
                    id="barra-progreso-prod"
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${porcentajeCumplimientoTareas}%` }}
                  ></div>
                </div>
                
                <p id="label-detalle-prod" className="text-xs text-gray-400 text-right">
                  {tareasCompletadasCount} de {totalTareasCount} tareas completadas {fechaFiltroTareas === hoyFormatted ? 'hoy' : `el ${fechaFiltroTareas}`}
                </p>
              </div>

              {/* 2. Lista Interactiva de Tareas del Día */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lista Operativa de Tareas de la Jornada</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#4B9CD3] font-bold bg-[#EBF5FB] px-2.5 py-0.5 rounded-full">
                      {empleado.area_preferida || 'Operaciones'}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        const completadas = misTareas.filter(t => t.estado === 'Completada').length;
                        const totales = misTareas.length;
                        await guardarProgresoEnSupabase(empleado.nombre, completadas, totales, fechaFiltroTareas);
                        await actualizarVistaProductividadEmpleado(empleado.nombre, fechaFiltroTareas);
                        await renderizarSeccionProductividadEmpleado(empleado.nombre, fechaFiltroTareas);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3 py-1 rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Cerrar día de tareas</span>
                    </button>
                  </div>
                </div>

                {misTareas.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200 font-medium">
                    No tienes tareas de operaciones asignadas para la jornada de hoy.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {misTareas.map(t => {
                      const isCompleted = t.estado === 'Completada';
                      return (
                        <div
                          key={t.id}
                          id={`employee-task-${t.id}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, t.id)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, t.id)}
                          className={`p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                            isCompleted
                              ? 'bg-slate-50/90 border-slate-200'
                              : t.estado === 'En proceso'
                              ? 'bg-amber-50/30 border-amber-200'
                              : 'bg-white border-[#E2E8F0] hover:border-[#4B9CD3]/50'
                          } ${draggedTaskId === t.id ? 'opacity-50' : ''}`}
                        >
                          <div className="cursor-grab hover:text-slate-600 text-slate-300 mt-0.5">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          {/* Casilla de verificación (checkbox) táctil para móviles/tablets */}
                          <input
                            type="checkbox"
                            id={`chk-task-${t.id}`}
                            checked={isCompleted}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              if (checked) {
                                if (t.requiere_foto && !t.foto_url) {
                                  handleCompletarConFoto(t.id);
                                } else {
                                  handleToggleTareaEstado(t.id, 'Completada');
                                }
                              } else {
                                handleToggleTareaEstado(t.id, 'Pendiente');
                              }
                            }}
                            className="mt-1 w-5 h-5 accent-[#4B9CD3] cursor-pointer rounded border-slate-300 text-[#4B9CD3] focus:ring-[#4B9CD3] shrink-0"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <label
                                htmlFor={`chk-task-${t.id}`}
                                className={`text-xs font-bold cursor-pointer select-none ${
                                  isCompleted ? 'line-through text-slate-400 decoration-slate-300' : 'text-[#2C3E50]'
                                }`}
                              >
                                {t.titulo}
                              </label>
                              <span className="text-[10px] text-slate-400 font-medium shrink-0 bg-slate-100 px-2 py-0.5 rounded">
                                {t.tiempo_estimado_min} min
                              </span>
                            </div>

                            {t.descripcion && (
                              <p className={`text-[11px] mt-1 ${isCompleted ? 'text-slate-400 line-through decoration-slate-200' : 'text-slate-600'}`}>
                                {t.descripcion}
                              </p>
                            )}

                            {t.foto_url && (
                              <div className="mt-2.5 relative inline-block border border-slate-200 rounded-lg overflow-hidden bg-slate-50 shadow-xs max-w-[200px]">
                                <img src={t.foto_url} alt="Evidencia" className="h-16 w-32 object-cover" />
                                <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center py-0.5 font-bold truncate">
                                  Evidencia Adjunta
                                </span>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 pt-2 border-t border-slate-100 text-[10px]">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {t.area}
                                </span>
                                
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => handleCompletarConFoto(t.id)}
                                    className={`font-bold px-2 py-0.5 rounded-md transition-colors text-[9px] flex items-center gap-1 cursor-pointer ${
                                      t.foto_url
                                        ? 'text-[#4B9CD3] bg-[#EBF5FB]'
                                        : t.requiere_foto
                                        ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                                        : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                                    }`}
                                  >
                                    <ImageIcon className="w-2.5 h-2.5 shrink-0" />
                                    {t.foto_url ? 'Ver Evidencia' : t.requiere_foto ? 'Adjuntar Evidencia (Obligatoria)' : 'Adjuntar Evidencia'}
                                  </button>

                                  <label className="relative overflow-hidden inline-block cursor-pointer">
                                    <span className="text-[9px] bg-white text-slate-700 hover:bg-slate-50 px-2 py-0.5 rounded-md font-semibold border border-slate-200 shadow-3xs transition-colors">
                                      Subir de Galería...
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          try {
                                            const compressed = await compressImage(file);
                                            handleToggleTareaEstado(t.id, t.estado, compressed, t.nota_evidencia || 'Cargado directo de galería');
                                          } catch (err) {
                                            console.error("Error compressing direct upload:", err);
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                              if (typeof reader.result === 'string') {
                                                handleToggleTareaEstado(t.id, t.estado, reader.result, t.nota_evidencia || 'Cargado directo de galería');
                                              }
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }
                                      }}
                                      className="absolute left-0 top-0 opacity-0 cursor-pointer w-full h-full"
                                    />
                                  </label>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5">
                                {t.started_at && (
                                  <span className="text-slate-500 font-bold bg-slate-50 border border-slate-200 px-2 py-0.5 rounded shrink-0 flex items-center gap-1 text-xs">
                                    <Clock className="w-2.5 h-2.5 text-[#4B9CD3]" />
                                    <span>Duración: {calcularTiempoTarea(t.started_at, t.completed_at)}</span>
                                  </span>
                                )}

                                {t.estado === 'En proceso' && (t.hora_inicio || t.started_at) && (
                                  <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 animate-pulse shrink-0">
                                    Iniciado: {t.hora_inicio || (t.started_at ? new Date(t.started_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '')}
                                  </span>
                                )}

                                {isCompleted && (t.hora_fin || t.hora_inicio) && (
                                  <span className="text-slate-400 font-medium shrink-0">
                                    Completado a las {t.hora_fin || t.hora_inicio}
                                  </span>
                                )}

                                {!isCompleted && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleTareaEstado(t.id, t.estado === 'En proceso' ? 'Pendiente' : 'En proceso')}
                                    className={`text-[9px] font-black px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                      t.estado === 'En proceso'
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                                    }`}
                                  >
                                    {t.estado === 'En proceso' ? 'En Proceso' : 'Marcar En Proceso'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Botón destacado al final para cerrar el día de tareas */}
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={async () => {
                      const completadas = misTareas.filter(t => t.estado === 'Completada').length;
                      const totales = misTareas.length;

                      // Guardar progreso en Supabase
                      await guardarProgresoEnSupabase(empleado.nombre, completadas, totales, fechaFiltroTareas);
                      await actualizarVistaProductividadEmpleado(empleado.nombre, fechaFiltroTareas);
                      await renderizarSeccionProductividadEmpleado(empleado.nombre, fechaFiltroTareas);

                      // Redirigir a la vista de progreso
                      const btnProgreso = document.getElementById('btn-tab-progreso');
                      if (btnProgreso) {
                        btnProgreso.click();
                      } else {
                        inicializarSesionProgresoEmpleado(empleado.nombre);
                        setTimeout(() => {
                          const btn = document.getElementById('btn-tab-progreso');
                          if (btn) btn.click();
                        }, 150);
                      }
                    }}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Cerrar día de tareas</span>
                  </button>
                </div>
              </div>
            </div>
          )}


          
          {/* TAB 2: INVENTARIO / CONTROL DE STOCK */}
          {employeeTab === 'inventario' && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4 animate-in fade-in duration-150">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h4 className="font-extrabold text-xs text-[#4B9CD3] uppercase tracking-wider">Control Físico de Inventario</h4>
                  <p className="text-[10px] text-slate-500">Registra el conteo actual de bodega o cocina.</p>
                </div>
              </div>

              <div className="space-y-3">
                {inventario.map(item => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-[#E2E8F0] rounded-lg gap-3">
                    <div>
                      <h5 className="font-bold text-xs text-[#2C3E50]">{item.nombre}</h5>
                      <p className="text-[10px] text-slate-400 font-medium">Categoría: {item.categoria} | Último stock: {item.stock_actual} {item.unidad}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Conteo"
                        className="w-20 text-xs px-2 py-1.5 border border-[#E2E8F0] rounded-md focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3]"
                        value={tempStock[item.id] !== undefined ? tempStock[item.id] : ''}
                        onChange={(e) => setTempStock({ ...tempStock, [item.id]: parseInt(e.target.value) || 0 })}
                      />
                      <span className="text-[10px] text-slate-500 font-bold w-6">{item.unidad}</span>
                      <button
                        onClick={() => {
                          if (tempStock[item.id] !== undefined) {
                            onUpdateStock(item.id, tempStock[item.id], empleado.nombre);
                            const newTemp = { ...tempStock };
                            delete newTemp[item.id];
                            setTempStock(newTemp);
                          }
                        }}
                        className="bg-[#4B9CD3] hover:bg-[#3A82B4] text-white text-[10px] font-bold px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CAJA POS / REGISTRO DE VENTAS */}
          {employeeTab === 'ventas' && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-[#E2E8F0] pb-2">
                <h4 className="font-extrabold text-[#2C3E50] text-sm flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-[#4B9CD3]" />
                  Terminal de Venta y Cuadre
                </h4>
                <p className="text-[10px] text-slate-500">Registra pedidos de clientes y realiza tu corte de caja final.</p>
              </div>

              {/* CONTROLES POS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LISTA DE PRODUCTOS (CATÁLOGO) */}
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Buscar producto..."
                      value={salesSearch}
                      onChange={(e) => setSalesSearch(e.target.value)}
                      className="flex-1 text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3]"
                    />
                  </div>
                  
                  <div className="h-64 overflow-y-auto pr-1 space-y-2">
                    {(() => {
                      const filteredProducts = productosCatalogo.filter(p => 
                        p.nombre.toLowerCase().includes(salesSearch.toLowerCase()) &&
                        (selectedCategory === 'Todos' || p.categoria === selectedCategory)
                      );
                      
                      return (
                        <div className="grid grid-cols-1 gap-2">
                          {filteredProducts.map(prod => {
                            const stockAvailable = inventario.some(i => i.nombre.includes(prod.nombre) && i.stock_actual > 0) || true; // Simplificación de stock

                            return (
                              <div key={prod.id} className="border border-[#E2E8F0] rounded-lg p-2.5 flex justify-between items-center hover:bg-[#FFFDF6] transition-colors">
                                <div>
                                  <h5 className="font-bold text-xs text-[#2C3E50]">{prod.nombre}</h5>
                                  <p className="text-[10px] text-[#4B9CD3] font-black">{formatMoney(prod.precio)}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      const existing = cartItems.find(item => item.producto.id === prod.id);
                                      if (existing) {
                                        setCartItems(cartItems.map(item => item.producto.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item));
                                      } else {
                                        setCartItems([...cartItems, { producto: prod, cantidad: 1 }]);
                                      }
                                    }}
                                    className="h-8 w-8 bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-black rounded-lg flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                                    title="Agregar al ticket"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* MÓDULO DE PRODUCTO A IMPULSAR (VENTAS SUGERIDAS / CROSS-SELLING) */}
                  {(() => {
                    let suggestionsToShow: Array<{ id: string; nombre: string; precio: number; reglaOrigen?: string }> = [];

                    // 1. Incluir primero los productos a impulsar configurados por la administración
                    const campaignProds = localProductos && localProductos.length > 0 ? localProductos : productos;
                    if (campaignProds && campaignProds.length > 0) {
                      campaignProds.forEach(camp => {
                        const catProd = productosCatalogo.find(p => p.nombre.toLowerCase().trim() === camp.nombre_producto.toLowerCase().trim() || p.nombre.toLowerCase().includes(camp.nombre_producto.toLowerCase()));
                        const itemNombre = catProd ? catProd.nombre : camp.nombre_producto;
                        const itemPrecio = catProd ? catProd.precio : (catProd?.valor_bruto || 3.50);
                        const itemId = catProd ? catProd.id : camp.id;

                        if (!suggestionsToShow.some(s => s.nombre.toLowerCase().trim() === itemNombre.toLowerCase().trim())) {
                          suggestionsToShow.push({
                            id: itemId,
                            nombre: itemNombre,
                            precio: itemPrecio,
                            reglaOrigen: `+${camp.puntos_por_unidad} PTS · Meta: ${camp.meta_diaria_unidades} u.`
                          });
                        }
                      });
                    }

                    // 2. Si hay productos en el carrito, buscar reglas de venta cruzada asociadas
                    const activeRules = (upsellRules || DEFAULT_UPSELL_RULES).filter(r => r.activa !== false);
                    if (cartItems.length > 0) {
                      cartItems.forEach(cartItem => {
                        const matched = activeRules.filter(rule => 
                          cartItem.producto.nombre.toLowerCase().includes(rule.producto_base_nombre.toLowerCase()) ||
                          rule.producto_base_nombre.toLowerCase().includes(cartItem.producto.nombre.toLowerCase()) ||
                          (cartItem.producto.categoria && cartItem.producto.categoria.toLowerCase().includes(rule.producto_base_nombre.toLowerCase()))
                        );

                        matched.forEach(m => {
                          const catProd = productosCatalogo.find(p => p.nombre.toLowerCase() === m.producto_sugerido_nombre.toLowerCase() || p.nombre.toLowerCase().includes(m.producto_sugerido_nombre.toLowerCase()));
                          const itemNombre = catProd ? catProd.nombre : m.producto_sugerido_nombre;
                          const itemPrecio = catProd ? catProd.precio : 2.50;
                          const itemId = catProd ? catProd.id : `sug-${m.id}`;

                          if (!suggestionsToShow.some(s => s.nombre.toLowerCase() === itemNombre.toLowerCase())) {
                            suggestionsToShow.push({
                              id: itemId,
                              nombre: itemNombre,
                              precio: itemPrecio,
                              reglaOrigen: `Recomendado para ${cartItem.producto.nombre}`
                            });
                          }
                        });
                      });
                    }

                    // 3. Si aún no hay sugerencias, agregar opciones predeterminadas de impulso
                    if (suggestionsToShow.length === 0) {
                      const defaultImpulseNames = [
                        { nombre: 'Adición Whey Protein Isolate', precio: 3.50, desc: 'Impulso de proteína funcional' },
                        { nombre: 'Topping Extra de Frutas Silvestres', precio: 2.00, desc: 'Acompañamiento popular del día' },
                        { nombre: 'Jugo Prensado en Frío Verde', precio: 4.50, desc: 'Bebida detox más vendida' }
                      ];

                      defaultImpulseNames.forEach(item => {
                        const catProd = productosCatalogo.find(p => p.nombre.toLowerCase().includes(item.nombre.toLowerCase()));
                        suggestionsToShow.push({
                          id: catProd ? catProd.id : `def-${item.nombre}`,
                          nombre: catProd ? catProd.nombre : item.nombre,
                          precio: catProd ? catProd.precio : item.precio,
                          reglaOrigen: item.desc
                        });
                      });
                    }

                    const handleAddSuggestedToCart = (sug: { id: string; nombre: string; precio: number }) => {
                      const catProd = productosCatalogo.find(p => p.id === sug.id || p.nombre.toLowerCase().trim() === sug.nombre.toLowerCase().trim());
                      const prodObj: Producto = catProd || {
                        id: sug.id,
                        codigo: 'IMP-001',
                        nombre: sug.nombre,
                        precio: sug.precio,
                        categoria: 'Producto a impulsar'
                      };

                      const existing = cartItems.find(i => i.producto.id === prodObj.id || i.producto.nombre.toLowerCase().trim() === prodObj.nombre.toLowerCase().trim());
                      if (existing) {
                        setCartItems(cartItems.map(i => (i.producto.id === existing.producto.id ? { ...i, cantidad: i.cantidad + 1 } : i)));
                      } else {
                        setCartItems([...cartItems, { producto: prodObj, cantidad: 1 }]);
                      }
                    };

                    return (
                      <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <h5 className="font-extrabold text-xs text-[#2C3E50] tracking-tight">Producto a impulsar</h5>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {cartItems.length > 0 ? 'Complementos recomendados e impulsos activos del día' : 'Sugerencias de impulso configuradas por administración para la jornada'}
                            </p>
                          </div>
                          <span className="text-[9px] font-bold text-[#4B9CD3] bg-[#EBF5FB] px-2.5 py-0.5 rounded-full">
                            Impulso del Día
                          </span>
                        </div>

                        <div className="space-y-2">
                          {suggestionsToShow.map(sug => (
                            <div key={sug.id} className="p-2.5 bg-[#FFFDF6] border border-[#E2E8F0] rounded-lg flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-xs text-[#2C3E50] block truncate">{sug.nombre}</span>
                                <span className="text-[9px] text-[#4B9CD3] font-semibold block truncate">{sug.reglaOrigen}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-black text-xs text-[#4B9CD3]">{formatMoney(sug.precio)}</span>
                                <button
                                  type="button"
                                  onClick={() => handleAddSuggestedToCart(sug)}
                                  className="px-2.5 py-1 bg-[#4B9CD3] hover:bg-[#3A82B4] text-white text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                                >
                                  Agregar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* CARRITO Y RESUMEN DE COBRO */}
                <div className="bg-[#FFFDF6] border border-[#E2E8F0] rounded-xl p-3 flex flex-col h-full">
                  <h5 className="font-bold text-xs text-[#2C3E50] mb-3 border-b border-[#E2E8F0] pb-2">Ticket Actual</h5>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                    {cartItems.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-medium">
                        Agrega productos al ticket para cobrar
                      </div>
                    ) : (
                      cartItems.map(item => (
                        <div key={item.producto.id} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-1">
                              <button onClick={() => {
                                setCartItems(cartItems.map(i => i.producto.id === item.producto.id ? { ...i, cantidad: i.cantidad + 1 } : i));
                              }} className="w-4 h-4 bg-slate-100 rounded flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer">
                                <PlusCircle className="w-3 h-3" />
                              </button>
                              <button onClick={() => {
                                if (item.cantidad > 1) {
                                  setCartItems(cartItems.map(i => i.producto.id === item.producto.id ? { ...i, cantidad: i.cantidad - 1 } : i));
                                } else {
                                  setCartItems(cartItems.filter(i => i.producto.id !== item.producto.id));
                                }
                              }} className="w-4 h-4 bg-slate-100 rounded flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer">
                                <MinusCircle className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="font-bold text-[#2C3E50] w-4 text-center">{item.cantidad}</span>
                            <span className="text-slate-600 truncate max-w-[100px]">{item.producto.nombre}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-[#4B9CD3]">{formatMoney(item.producto.precio * item.cantidad)}</span>
                            <button onClick={() => setCartItems(cartItems.filter(i => i.producto.id !== item.producto.id))} className="text-red-400 hover:text-red-600 cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#E2E8F0] space-y-3">
                    {/* Campo Teléfono del Cliente */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-extrabold text-[#2C3E50] uppercase tracking-wider">
                          Teléfono del Cliente <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowQrModal(true)}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-[#4B9CD3] bg-[#EBF5FB] hover:bg-[#D4E6F1] px-2 py-0.5 rounded-md border border-[#AED6F1] transition-colors cursor-pointer"
                          title="Mostrar código QR de registro para que el cliente lo escanee con su celular"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          QR de Registro para Clientes
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          value={clienteTelefonoInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setClienteTelefonoInput(val);
                            if (phoneError && val.trim()) {
                              setPhoneError(false);
                            }
                            if (selectedClient && val.trim() !== selectedClient.telefono) {
                              setSelectedClient(null);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSearchClient();
                            }
                          }}
                          placeholder="Ej. 3001234567"
                          className={`flex-1 text-xs px-3 py-2 border rounded-lg focus:outline-none font-medium text-[#2C3E50] bg-white transition-all ${
                            phoneError
                              ? 'border-2 border-red-500 bg-red-50/20 ring-2 ring-red-200'
                              : 'border-[#E2E8F0] focus:ring-1 focus:ring-[#4B9CD3]'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={handleSearchClient}
                          className="px-3.5 py-2 bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          Buscar
                        </button>
                      </div>

                      {phoneError && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-[11px] font-bold leading-tight">
                          Para procesar la venta es obligatorio ingresar el teléfono del cliente.
                        </div>
                      )}

                      {selectedClient && (() => {
                        const sellosActuales = Math.max(Number(selectedClient.stickers_count ?? 1), 1);
                        const sellosActualesCiclo = sellosActuales % 10 === 0 ? 10 : sellosActuales % 10;
                        const sellosProyectados = sellosActuales >= 10 ? 1 : (sellosActuales + 1) % 10 === 0 ? 10 : (sellosActuales + 1) % 10;
                        return (
                          <div className="mt-2 p-2.5 bg-[#EBF5FB] border border-[#AED6F1] rounded-lg space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[9px] font-black uppercase text-slate-400 block">Cliente Fidelizado</span>
                                <span className="font-extrabold text-[#2C3E50]">{selectedClient.nombre}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-black">
                                  Sellos: {sellosActualesCiclo}/10
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedClient(null);
                                    setLoyaltyRedeemConfirmation(null);
                                  }}
                                  className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer underline"
                                >
                                  Quitar
                                </button>
                              </div>
                            </div>

                            {loyaltyRedeemConfirmation && (
                              <div className="p-2 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>{loyaltyRedeemConfirmation}</span>
                              </div>
                            )}

                            {sellosActuales >= 10 ? (
                              <div className="space-y-1.5 pt-0.5">
                                <div className="text-[10px] font-extrabold text-amber-900 bg-amber-100 border border-amber-300 rounded-md px-2 py-1 flex items-center gap-1">
                                  <span>🎉 ¡Meta alcanzada (10/10 sellos)! El cliente tiene un premio disponible.</span>
                                </div>
                                <button
                                  type="button"
                                  disabled={isRedeemingLoyaltyReward}
                                  onClick={handleRedimirPremioFidelizacion}
                                  className="w-full py-2 px-3 bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-black text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <Gift className="w-4 h-4" />
                                  <span>
                                    {isRedeemingLoyaltyReward
                                      ? 'Redimiendo Premio...'
                                      : 'Redimir Premio de Fidelización'}
                                  </span>
                                </button>
                              </div>
                            ) : sellosActuales === 1 ? (
                              <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1 flex items-center gap-1">
                                <span>🎁 Ya cuenta con 1 sello de bienvenida · Con esta 1ra compra subirá a <strong>2/10 sellos</strong>.</span>
                              </div>
                            ) : (
                              <div className="text-[10px] font-semibold text-[#2E6DA4]">
                                Sumará +1 sello en esta visita → pasará a <strong>{sellosProyectados}/10 sellos</strong>.
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-500">Total a Cobrar:</span>
                      <span className="font-black text-[#2C3E50] text-lg">
                        {formatMoney(cartItems.reduce((sum, item) => sum + (item.producto.precio * item.cantidad), 0))}
                      </span>
                    </div>

                    <button
                      onClick={handleProcessPosSale}
                      disabled={cartItems.length === 0}
                      className="w-full bg-[#4B9CD3] hover:bg-[#3A82B4] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Procesar Venta POS
                    </button>
                  </div>
                </div>
              </div>

              {/* MÓDULO DE HISTORIAL TRANSACCIONAL DEL TURNO */}
              <div className="mt-8 pt-6 border-t border-dashed border-[#E2E8F0]">
                <div className="w-full rounded-xl border border-[#E2E8F0] bg-white p-5 mb-6 shadow-xs">
                  {(() => {
                    const todayStr = getLocalDateString();
                    
                    const normalizeDate = (v: any) => {
                      let saleFecha = v?.fecha;
                      if (saleFecha && saleFecha.includes('T')) {
                        saleFecha = saleFecha.split('T')[0];
                      } else if (saleFecha && saleFecha.includes(' ')) {
                        saleFecha = saleFecha.split(' ')[0];
                      }
                      if (!saleFecha && v?.created_at) {
                        try {
                          saleFecha = getLocalDateString(v.created_at);
                        } catch (e) {
                          saleFecha = String(v.created_at).split('T')[0];
                        }
                      }
                      return saleFecha;
                    };

                    // Ventas del día registradas por todos los colaboradores
                    const allTodaySales = (ventasRegistradas || []).filter(v => {
                      if (!v) return false;
                      return normalizeDate(v) === todayStr;
                    });

                    // Ventas del día del empleado actual
                    const myTodaySales = allTodaySales.filter(v => {
                      return (
                        !v.usuario_id || 
                        v.usuario_id === empleado.id || 
                        v.vendedor_id === empleado.id || 
                        (v as any).cajero_id === empleado.id || 
                        v.vendedor_nombre === empleado.nombre
                      );
                    });

                    const activeList = filtroHistorialVentas === 'todas' ? allTodaySales : myTodaySales;
                    const totalVentasDiaTodos = allTodaySales.filter(v => v.estado !== 'Anulada').reduce((sum, v) => sum + (Number(v.total) || 0), 0);
                    const totalVentasMias = myTodaySales.filter(v => v.estado !== 'Anulada').reduce((sum, v) => sum + (Number(v.total) || 0), 0);

                    const sortedSales = [...activeList].sort((a, b) => {
                      const timeA = `${a.fecha || ''} ${a.hora || ''}`;
                      const timeB = `${b.fecha || ''} ${b.hora || ''}`;
                      return timeB.localeCompare(timeA);
                    });

                    return (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-[#F1F5F9] gap-3">
                          <div>
                            <h4 className="text-xs font-black text-[#2C3E50] uppercase tracking-wider">
                              Historial Transaccional del Día ({todayStr})
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              Registro en tiempo real de ventas procesadas durante la jornada activa.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2.5">
                            {/* Filtro: Todas vs Mías */}
                            <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
                              <button
                                type="button"
                                onClick={() => setFiltroHistorialVentas('todas')}
                                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                                  filtroHistorialVentas === 'todas'
                                    ? 'bg-white text-[#2C3E50] shadow-2xs font-black'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                Todas del Día ({allTodaySales.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setFiltroHistorialVentas('mias')}
                                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                                  filtroHistorialVentas === 'mias'
                                    ? 'bg-white text-[#2C3E50] shadow-2xs font-black'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                Mis Ventas ({myTodaySales.length})
                              </button>
                            </div>

                            <div className="text-left sm:text-right bg-[#EBF5FB]/80 border border-[#AED6F1] px-3.5 py-1.5 rounded-lg shadow-2xs">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                                {filtroHistorialVentas === 'todas' ? 'Total Ventas del Día' : 'Mis Ventas de Hoy'}
                              </span>
                              <span className="text-sm font-black text-[#4B9CD3]">
                                {formatMoney(filtroHistorialVentas === 'todas' ? totalVentasDiaTodos : totalVentasMias)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {sortedSales.length === 0 ? (
                          <div className="py-8 text-center bg-[#F8FAFC] rounded-lg border border-dashed border-[#CBD5E1]">
                            <p className="text-xs font-medium text-slate-400 italic">
                              No hay ventas registradas en esta vista para el día de hoy ({todayStr}).
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                                  <th className="py-2.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                    Hora
                                  </th>
                                  <th className="py-2.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                    Colaborador
                                  </th>
                                  <th className="py-2.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                    Cliente
                                  </th>
                                  <th className="py-2.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                    Productos Registrados
                                  </th>
                                  <th className="py-2.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                    Medio de Pago
                                  </th>
                                  <th className="py-2.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">
                                    Monto Total
                                  </th>
                                  <th className="py-2.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 text-center">
                                    Estado
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#F1F5F9]">
                                {sortedSales.map((v) => {
                                  const isAnulada = v.estado === 'Anulada';
                                  
                                  const desgloseVenta = getDesglosePagosVenta(v);
                                  const getBadgeStyleForCat = (cat: string) => {
                                    if (cat === 'tarjeta_regalo') return 'bg-pink-50 text-pink-700 border-pink-200';
                                    if (cat === 'tarjeta') return 'bg-blue-50 text-blue-700 border-blue-200';
                                    if (cat === 'transferencia') return 'bg-purple-50 text-purple-700 border-purple-200';
                                    if (cat === 'rappi') return 'bg-amber-50 text-amber-700 border-amber-200';
                                    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                  };

                                  const colaboradorNombre = v.vendedor_nombre || (v as any).cajero_nombre || 'Colaborador';

                                  return (
                                    <tr key={v.id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                                      <td className="py-3 px-3 text-xs font-bold text-[#2C3E50] whitespace-nowrap">
                                        {v.hora || '12:00'}
                                      </td>
                                      <td className="py-3 px-3 text-xs whitespace-nowrap">
                                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                          {colaboradorNombre}
                                        </span>
                                      </td>
                                      <td className="py-3 px-3 text-xs">
                                        <div className="font-bold text-[#2C3E50]">
                                          {v.cliente_nombre || 'Cliente General'}
                                        </div>
                                        {v.cliente_telefono && (
                                          <div className="text-[10px] text-slate-400 font-medium">
                                            {v.cliente_telefono}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-3 px-3 text-xs">
                                        {v.productos_vendidos && v.productos_vendidos.length > 0 ? (
                                          <div className="space-y-0.5 max-w-xs">
                                            {v.productos_vendidos.map((prod, pIdx) => (
                                              <div key={pIdx} className="text-xs text-[#2C3E50]">
                                                <span className="font-extrabold text-[#4B9CD3]">{prod.cantidad}x</span> {prod.nombre}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 italic text-[11px]">Sin productos</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-3 text-xs">
                                        {desgloseVenta.esMixto ? (
                                          <div className="flex flex-col gap-1 min-w-[140px]">
                                            <span className="inline-block w-fit px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-slate-800 text-white">
                                              Pago Dividido / Mixto
                                            </span>
                                            {desgloseVenta.partes.map((parte, idxP) => (
                                              <span
                                                key={idxP}
                                                className={`inline-flex items-center justify-between gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-md border ${getBadgeStyleForCat(parte.categoria)}`}
                                              >
                                                <span>{parte.label}:</span>
                                                <span className="font-black">{formatMoney(parte.monto)}</span>
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <span
                                            className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-md border whitespace-nowrap ${getBadgeStyleForCat(
                                              desgloseVenta.partes[0]?.categoria || 'efectivo'
                                            )}`}
                                          >
                                            {desgloseVenta.partes[0]?.label || v.metodo_pago || 'Efectivo'}
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-3 px-3 text-xs font-black text-[#2C3E50] text-right whitespace-nowrap">
                                        {formatMoney(v.total)}
                                      </td>
                                      <td className="py-3 px-3 text-xs text-center whitespace-nowrap">
                                        {isAnulada ? (
                                          <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-red-50 text-red-700 border border-red-200">
                                            Anulada por Admin
                                          </span>
                                        ) : (
                                          <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            Registrada
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* FORMULARIO DE CUADRE DE CAJA DIARIO (VENTAS DEL DÍA DE TODOS LOS EMPLEADOS) */}
              <div className="mt-8 pt-6 border-t border-dashed border-[#E2E8F0]">
                {(() => {
                  const todayStr = getLocalDateString();
                  
                  const normalizeDate = (v: any) => {
                    let saleFecha = v?.fecha;
                    if (saleFecha && saleFecha.includes('T')) {
                      saleFecha = saleFecha.split('T')[0];
                    } else if (saleFecha && saleFecha.includes(' ')) {
                      saleFecha = saleFecha.split(' ')[0];
                    }
                    if (!saleFecha && v?.created_at) {
                      try {
                        saleFecha = getLocalDateString(v.created_at);
                      } catch (e) {
                        saleFecha = String(v.created_at).split('T')[0];
                      }
                    }
                    return saleFecha;
                  };

                  // Filtrar únicamente las ventas del DÍA DE HOY registradas por TODOS LOS EMPLEADOS (excluyendo únicamente ventas anuladas)
                  const ventasDelDia = (ventasRegistradas || []).filter(v => {
                    if (!v || v.estado === 'Anulada') return false;
                    return normalizeDate(v) === todayStr;
                  });

                  // Desglose exacto por medio de pago de todos los colaboradores (incluyendo pagos divididos y excedentes de Tarjeta Regalo)
                  const resumenPagosDia = getResumenPagosVentas(ventasDelDia);
                  const totalEfectivo = resumenPagosDia.efectivo;
                  const totalTarjeta = resumenPagosDia.tarjeta;
                  const totalTransferencia = resumenPagosDia.transferencia;
                  const totalRappi = resumenPagosDia.rappi;
                  const totalTarjetaRegalo = resumenPagosDia.tarjeta_regalo;
                  
                  // Total ventas del día registrado por todos los empleados
                  const totalVentasDia = resumenPagosDia.total;

                  const contadoParsed = parseFloat(cuadrePosContadoInput);
                  const hasContadoVal = cuadrePosContadoInput.trim() !== '' && !isNaN(contadoParsed);
                  const diferenciaCalculada = hasContadoVal ? (contadoParsed - totalEfectivo) : 0;

                  return (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div>
                          <h5 className="font-extrabold text-[#2C3E50] text-xs flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-[#4B9CD3]" />
                            Cuadre de Caja Diario / Cierre de Turno
                          </h5>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Total consolidado de ventas del día ({todayStr}) registrado por todos los colaboradores.
                          </p>
                        </div>
                        <div className="text-left sm:text-right bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-lg shadow-2xs">
                          <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block">
                            Total Ventas del Día
                          </span>
                          <span className="text-sm font-black text-emerald-800">
                            {formatMoney(totalVentasDia)}
                          </span>
                        </div>
                      </div>

                      {cuadrePosSuccess && (
                        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in duration-200">
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>¡Corte de caja diario enviado correctamente para revisión del administrador!</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCuadrePosSuccess(false)}
                            className="text-emerald-700 hover:text-emerald-900 text-xs font-black cursor-pointer ml-3 px-1.5 py-0.5 rounded hover:bg-emerald-100"
                          >
                            ×
                          </button>
                        </div>
                      )}

                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          const contadoVal = parseFloat(formData.get('efectivo_contado') as string) || 0;
                          const horaActual = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                          
                          const newCuadre = {
                            fecha: todayStr,
                            hora: horaActual,
                            hora_cierre: horaActual,
                            usuario_id: empleado.id,
                            usuario_nombre: empleado.nombre,
                            empleado_id: empleado.id,
                            empleado_nombre: empleado.nombre,
                            total_ventas_dia: totalVentasDia,
                            efectivo_esperado: totalEfectivo,
                            efectivo_contado: contadoVal,
                            tarjeta_esperado: totalTarjeta,
                            transferencia_esperado: totalTransferencia,
                            rappi_esperado: totalRappi,
                            tarjeta_regalo_esperado: totalTarjetaRegalo,
                            diferencia_total: contadoVal - totalEfectivo,
                            observaciones: (formData.get('observaciones') as string) || '',
                            estado: 'pendiente_revision'
                          };
                          
                          onRegistrarCuadreCaja(newCuadre as any);
                          e.currentTarget.reset();
                          setCuadrePosContadoInput('');
                          setCuadrePosSuccess(true);
                        }}
                        className="bg-[#FFFDF6] p-4 rounded-xl border border-[#E2E8F0] space-y-3.5"
                      >
                        {/* TARJETAS RESUMEN: TOTAL DEL DÍA + MEDIOS DE PAGO */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs">
                          {/* 1. TOTAL GENERAL DE VENTAS DEL DÍA */}
                          <div className="bg-[#EBF5FB] border-2 border-[#4B9CD3]/50 p-3 rounded-xl flex flex-col justify-between col-span-2 sm:col-span-1 lg:col-span-1 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase text-[#2C3E50] tracking-wider">
                                Total Ventas (Día)
                              </span>
                              <span className="text-[8px] font-black bg-[#4B9CD3] text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                Todos
                              </span>
                            </div>
                            <div className="mt-2">
                              <span className="text-base font-black text-[#2C3E50] block">
                                {formatMoney(totalVentasDia)}
                              </span>
                              <span className="text-[9px] text-slate-500 font-semibold block mt-0.5">
                                {ventasDelDia.length} {ventasDelDia.length === 1 ? 'venta hoy' : 'ventas hoy'}
                              </span>
                            </div>
                          </div>

                          {/* 2. EFECTIVO SISTEMA */}
                          <div className="bg-[#FFFDF6]/60 border border-[#E2E8F0] p-3 rounded-xl flex flex-col justify-between shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                Efectivo Sistema
                              </span>
                              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Efectivo en caja" />
                            </div>
                            <div className="mt-2">
                              <span className="text-base font-black text-[#4B9CD3] block">
                                {formatMoney(totalEfectivo)}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                                Base a conciliar
                              </span>
                            </div>
                          </div>

                          {/* 3. TARJETA (DATÁFONO) */}
                          <div className="bg-[#FFFDF6]/60 border border-[#E2E8F0] p-3 rounded-xl flex flex-col justify-between shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                Tarjeta (Datáfono)
                              </span>
                              <span className="w-2 h-2 rounded-full bg-blue-500" title="Datáfono POS" />
                            </div>
                            <div className="mt-2">
                              <span className="text-base font-black text-slate-700 block">
                                {formatMoney(totalTarjeta)}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                                Comprobantes POS
                              </span>
                            </div>
                          </div>

                          {/* 4. TRANSFERENCIA */}
                          <div className="bg-[#FFFDF6]/60 border border-[#E2E8F0] p-3 rounded-xl flex flex-col justify-between shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                Transferencia
                              </span>
                              <span className="w-2 h-2 rounded-full bg-purple-500" title="Nequi / Bancolombia" />
                            </div>
                            <div className="mt-2">
                              <span className="text-base font-black text-slate-700 block">
                                {formatMoney(totalTransferencia)}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                                Nequi / Bancolombia
                              </span>
                            </div>
                          </div>

                          {/* 5. RAPPI */}
                          <div className="bg-[#FFFDF6]/60 border border-[#E2E8F0] p-3 rounded-xl flex flex-col justify-between shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                Rappi
                              </span>
                              <span className="w-2 h-2 rounded-full bg-amber-500" title="Domicilios" />
                            </div>
                            <div className="mt-2">
                              <span className="text-base font-black text-slate-700 block">
                                {formatMoney(totalRappi)}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                                Domicilios Rappi
                              </span>
                            </div>
                          </div>

                          {/* 6. TARJETA REGALO */}
                          <div className="bg-[#FFFDF6]/60 border border-[#E2E8F0] p-3 rounded-xl flex flex-col justify-between shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                Tarjeta Regalo
                              </span>
                              <span className="w-2 h-2 rounded-full bg-pink-500" title="Bonos Redimibles" />
                            </div>
                            <div className="mt-2">
                              <span className="text-base font-black text-slate-700 block">
                                {formatMoney(totalTarjetaRegalo)}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                                Bonos Canjeados
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* INPUTS DE REGISTRO */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                Efectivo Físico Contado
                              </label>
                              {hasContadoVal && (
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                                  Math.abs(diferenciaCalculada) < 0.01
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : diferenciaCalculada < 0
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}>
                                  {Math.abs(diferenciaCalculada) < 0.01
                                    ? '✓ Efectivo conciliado'
                                    : diferenciaCalculada < 0
                                    ? `Faltante: -${formatMoney(Math.abs(diferenciaCalculada))}`
                                    : `Sobrante: +${formatMoney(diferenciaCalculada)}`}
                                </span>
                              )}
                            </div>
                            <input 
                              name="efectivo_contado" 
                              type="number" 
                              step="0.01" 
                              value={cuadrePosContadoInput}
                              onChange={(e) => setCuadrePosContadoInput(e.target.value)}
                              className="w-full text-xs px-2.5 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-white font-bold text-slate-800" 
                              required 
                              placeholder="Ingresa efectivo real en caja" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Notas u Observaciones
                            </label>
                            <input 
                              name="observaciones" 
                              type="text" 
                              placeholder="Faltantes, gastos de caja chica..." 
                              className="w-full text-xs px-2.5 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-white text-slate-800" 
                            />
                          </div>
                        </div>
                        
                        <button 
                          type="submit" 
                          className="w-full bg-[#2C3E50] hover:bg-slate-800 text-white font-black text-xs py-2.5 rounded-lg transition-colors cursor-pointer shadow-xs uppercase tracking-wider"
                        >
                          Enviar Corte de Caja Diario
                        </button>
                      </form>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}


          {/* TAB 3: CONSULTA DE TURNOS (VISTA EMPLEADO) */}
          {employeeTab === 'horarios' && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4 animate-in fade-in duration-150">
              <div className="pb-2 border-b border-slate-100">
                <h4 className="font-extrabold text-xs text-[#4B9CD3] uppercase tracking-wider">Mi Programación Semanal de Turnos</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Consulta de forma transparente tus días de servicio, horarios de entrada/salida y descansos semanales.</p>
              </div>

              {(() => {
                const listaTurnos = localHorarios.length > 0 ? localHorarios : horarios;
                const misTurnos = listaTurnos.filter(t => t.usuario_id === empleado.id || t.usuario_id === empleado.nombre);
                const dias: Array<'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo'> = [
                  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
                ];

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-2">
                    {dias.map(dia => {
                      const shift = misTurnos.find(t => t.dia_semana === dia);
                      return (
                        <div key={dia} className={`p-3 rounded-xl border text-center flex flex-col justify-between min-h-[110px] ${
                          shift 
                            ? 'bg-[#EBF5FB]/60 border-[#AED6F1] text-[#2C3E50]' 
                            : 'bg-slate-50 border-dashed border-slate-200 text-slate-400'
                        }`}>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-wider text-[#4B9CD3]">{dia}</p>
                            {shift ? (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs font-black text-slate-900">{shift.hora_entrada}</p>
                                <p className="text-[9px] text-slate-400 font-semibold uppercase">Hasta</p>
                                <p className="text-xs font-black text-slate-900">{shift.hora_salida}</p>
                              </div>
                            ) : (
                              <p className="text-[10px] font-bold text-slate-400 mt-5 uppercase">Libre </p>
                            )}
                          </div>

                          {shift && shift.nota && (
                            <div className="mt-2 text-[8px] bg-white/80 border border-[#E2E8F0] px-1 py-0.5 rounded-sm leading-tight truncate" title={shift.nota}>
                              {shift.nota}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 5: MI HISTORIAL DE PROGRESO Y PRODUCTIVIDAD (SUPABASE) */}
          {employeeTab === 'progreso' && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-100 gap-3">
                <div>
                  <h4 className="font-extrabold text-xs text-[#4B9CD3] uppercase tracking-wider">Historial de Productividad</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Consulta tu rendimiento diario registrado en la base de datos Supabase.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const todayStr = getLocalDateString();
                      setFechaProgresoHistorial(todayStr);
                      cargarProgresoHistorial(todayStr);
                    }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      fechaProgresoHistorial === getLocalDateString()
                        ? 'bg-[#4B9CD3] text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                    title="Ver mi productividad de la jornada de hoy"
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const sevenDaysAgoStr = getBogotaDateDaysAgo(7);
                      setFechaProgresoHistorial(sevenDaysAgoStr);
                      cargarProgresoHistorial(sevenDaysAgoStr);
                    }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      fechaProgresoHistorial === getBogotaDateDaysAgo(7)
                        ? 'bg-[#4B9CD3] text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                    title="Ver productividad de hace 7 días"
                  >
                    Últimos 7 días
                  </button>
                  <input
                    type="date"
                    value={fechaProgresoHistorial}
                    onChange={(e) => {
                      setFechaProgresoHistorial(e.target.value);
                      cargarProgresoHistorial(e.target.value);
                    }}
                    className="border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3]"
                  />
                  <button
                    type="button"
                    onClick={() => cargarProgresoHistorial(fechaProgresoHistorial)}
                    className="bg-[#4B9CD3] hover:bg-[#3A88BE] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer"
                  >
                    Actualizar
                  </button>
                </div>
              </div>

              {isLoadingProgresoHistorial ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Cargando información de productividad...
                </div>
              ) : historialProgresoData ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jornada</span>
                        <h3 className="text-xs font-black text-slate-800">{fechaProgresoHistorial}</h3>
                      </div>
                      <span className="text-2xl font-black text-[#4B9CD3]">{historialProgresoData.porcentaje}%</span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          historialProgresoData.porcentaje >= 100
                            ? 'bg-emerald-500'
                            : historialProgresoData.porcentaje >= 50
                            ? 'bg-[#4B9CD3]'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${historialProgresoData.porcentaje}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                      <span>Tareas Completadas: <strong className="text-slate-800">{historialProgresoData.completadas} de {historialProgresoData.totales}</strong></span>
                      <span>Ultima actualizacion: <strong className="text-slate-800">{new Date(historialProgresoData.updated_at).toLocaleTimeString()}</strong></span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs">
                  <p className="font-bold">Sin registros de productividad para la fecha seleccionada ({fechaProgresoHistorial})</p>
                  <p className="text-[11px] text-slate-400 mt-1">Completa tareas desde tu checklist para generar el registro diario.</p>
                </div>
              )}
            </div>
          )}

          {employeeTab === 'gastos' && (
            <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
              <GastosModule
                gastos={gastos}
                ventasRegistradas={ventasRegistradas}
                currentUser={empleado}
                onSaveGasto={onSaveGasto}
                onDeleteGasto={onDeleteGasto}
              />
            </div>
          )}
        </div>
      </div>

      {/* MODAL: SUBIR EVIDENCIA DE FOTO */}
      {showPhotoModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-20">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 border border-[#E2E8F0]">
            <div>
              <h4 className="font-extrabold text-[#2C3E50] text-sm">Cargar Evidencia de Calidad</h4>
              <p className="text-[10px] text-slate-500">Esta tarea requiere prueba visual del estándar exigido.</p>
            </div>

             {/* Presets de foto para simulación realista */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Selecciona imagen de prueba o sube tu archivo</label>
              <div className="grid grid-cols-2 gap-2">
                {PHOTO_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setEvidencePhoto(p.url)}
                    className={`p-2 border text-left text-[9px] rounded-lg transition-all truncate font-bold ${
                      evidencePhoto === p.url
                        ? 'border-[#4B9CD3] bg-[#EBF5FB] text-[#2C3E50]'
                        : 'border-[#E2E8F0] hover:bg-[#FFFDF6] text-slate-600'
                    }`}
                  >
                    {p.nombre}
                  </button>
                ))}
              </div>
            </div>

            {/* Subir archivo real en el modal */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Sube una foto real de tu dispositivo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleModalFileChange}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-[#EBF5FB] file:text-[#4B9CD3] hover:file:bg-[#D5EBF9]"
              />
            </div>

            {/* Vista previa de imagen seleccionada */}
            <div className="h-28 bg-[#FFFDF6] rounded-lg overflow-hidden border border-[#E2E8F0] flex items-center justify-center">
              <img src={evidencePhoto} alt="Preview" className="w-full h-full object-cover" />
            </div>

            {/* Comentarios */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Notas operativas (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. Todo listo y sanitizado sin residuos..."
                value={evidenceNote}
                onChange={(e) => setEvidenceNote(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] text-slate-800"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSavePhotoEvidence}
                className="flex-1 bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-bold text-xs py-2 px-4 rounded-lg transition-colors cursor-pointer"
              >
                Subir Evidencia
              </button>
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="bg-[#FFFDF6] hover:bg-[#E2E8F0] text-slate-700 font-bold text-xs py-2 px-4 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REPORTAR INCIDENCIA */}

      {/* MODAL EMERGENTE: CLIENTE NO REGISTRADO */}
      {newClientModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF6] border-2 border-[#4B9CD3] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-[#2C3E50] relative">
            <button
              type="button"
              onClick={() => setNewClientModal({ open: false, phone: '', name: '' })}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-extrabold text-xs w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Cerrar"
            >
              X
            </button>
            <div className="text-center space-y-1.5 border-b border-[#E2E8F0] pb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#4B9CD3] block">
                Fidelización COCCOLE FIT
              </span>
              <h3 className="text-base font-black text-[#2C3E50]">
                Cliente No Registrado
              </h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Ingresa el nombre para sumarlo al programa de fidelización COCCOLE FIT.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-extrabold text-[#2C3E50] uppercase tracking-wider mb-1">
                  Teléfono Móvil
                </label>
                <input
                  type="text"
                  value={newClientModal.phone}
                  disabled
                  className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg bg-slate-100 font-bold text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-[#2C3E50] uppercase tracking-wider mb-1">
                  Nombre Completo del Cliente
                </label>
                <input
                  type="text"
                  value={newClientModal.name}
                  onChange={(e) => setNewClientModal(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej. Ana María Martínez"
                  className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4B9CD3] font-semibold text-[#2C3E50] bg-white"
                  autoFocus
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setNewClientModal({ open: false, phone: '', name: '' })}
                className="flex-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalName = newClientModal.name.trim() || 'Cliente Coccole';
                  // Cliente nuevo inicia con 1 sello de bienvenida (stickers_count: 1)
                  setSelectedClient({
                    nombre: finalName,
                    telefono: newClientModal.phone,
                    stickers_count: 1
                  });
                  setNewClientModal({ open: false, phone: '', name: '' });

                  const items = cartItems.map(item => ({
                    nombre: item.producto.nombre,
                    cantidad: item.cantidad,
                    subtotal: item.producto.precio * item.cantidad
                  }));
                  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

                  setMandatoryPaymentModal({
                    kind: 'pos',
                    articulos: items,
                    total: total
                  });
                }}
                className="flex-1 px-3 py-2.5 bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-black text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Registrar y Continuar Cobro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ÉXITO DE LA VENTA DEL POS (RESUMEN DE SELLOS DE FIDELIZACIÓN) */}
      {posSaleSuccessModal?.open && (
        <div
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPosSaleSuccessModal(null)}
        >
          <div
            className="bg-white border-2 border-emerald-400 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 text-[#2C3E50] relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-emerald-600 shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
                Fidelización COCCOLE FIT
              </span>
              <h3 className="text-lg font-black text-[#2C3E50]">
                ¡Venta Registrada con Éxito!
              </h3>
            </div>

            {/* Resumen claro requerido de sellos acumulados */}
            <div className="p-4 bg-linear-to-br from-[#EBF5FB] to-emerald-50 border border-[#AED6F1] rounded-2xl space-y-2">
              {posSaleSuccessModal.rewardRedeemedNow ? (
                <p className="text-xs sm:text-sm font-extrabold text-emerald-800 leading-relaxed">
                  ¡Premio redimido! El nuevo ciclo del cliente inicia con 1 sello activo
                </p>
              ) : (
                <p className="text-xs sm:text-sm font-extrabold text-[#2C3E50] leading-relaxed">
                  ¡Venta registrada! El cliente sumó 1 sello por su compra y ahora tiene {posSaleSuccessModal.newStickersCycle}/10 sellos acumulados.
                </p>
              )}

              {posSaleSuccessModal.prevStickers === 1 && !posSaleSuccessModal.rewardRedeemedNow && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/90 border border-amber-300 text-amber-900 text-[11px] font-bold">
                  <span>🎁 1 sello de bienvenida + 1 por la compra actual = 2/10 sellos</span>
                </div>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Cliente:</span>
                <span className="font-extrabold text-[#2C3E50]">{posSaleSuccessModal.clienteNombre}</span>
              </div>
              {posSaleSuccessModal.clienteTelefono && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Teléfono:</span>
                  <span className="font-bold text-slate-700">{posSaleSuccessModal.clienteTelefono}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Total Facturado:</span>
                <span className="font-black text-emerald-700">{formatMoney(posSaleSuccessModal.totalVenta)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPosSaleSuccessModal(null)}
              className="w-full py-3 px-4 bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-black text-xs rounded-xl transition-colors cursor-pointer shadow-md"
            >
              Continuar en Caja
            </button>
          </div>
        </div>
      )}

      {/* MODAL EMERGENTE OBLIGATORIO DE COBRO (ALERTA FLOTANTE BACKDROP-BLUR) */}
      {mandatoryPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF6] border-2 border-[#4B9CD3] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 text-[#2C3E50] relative">
            <button
              type="button"
              onClick={handleClosePaymentModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-extrabold text-xs w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Cancelar / Modificar Pedido"
            >
              X
            </button>

            {/* Titular y Descripción */}
            <div className="text-center space-y-1.5 border-b border-[#E2E8F0] pb-4 pr-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#4B9CD3] block">
                Cobro Directo POS
              </span>
              <h3 className="text-base font-black text-[#2C3E50]">
                Seleccionar Medio de Pago
              </h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Indica el canal de cobro utilizado para finalizar esta venta.
              </p>
            </div>

            {/* Resumen de Artículos */}
            {mandatoryPaymentModal.articulos && mandatoryPaymentModal.articulos.length > 0 && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 space-y-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Detalle de la Transacción
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {mandatoryPaymentModal.articulos.map((art, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs font-bold text-[#2C3E50]">
                      <span>{art.cantidad} {art.nombre}</span>
                      <span className="text-[#4B9CD3] font-black">{formatMoney(art.subtotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-black text-slate-500 uppercase">Total a Cobrar</span>
                  <span className="text-base font-black text-[#2C3E50]">{formatMoney(mandatoryPaymentModal.total)}</span>
                </div>
              </div>
            )}

            {/* Contenido según medio seleccionado: Flujo Especial Tarjeta Regalo Supabase o Selección Directa */}
            {isGiftCardPaymentActive ? (
              <div className="space-y-4">
                {/* Cabecera del Flujo Tarjeta Regalo */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsGiftCardPaymentActive(false);
                      setGiftCardError(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4B9CD3] hover:text-[#3A82B4] transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver a medios de pago</span>
                  </button>
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Total a Facturar</span>
                    <span className="text-xs font-black text-[#2C3E50]">{formatMoney(mandatoryPaymentModal.total)}</span>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <div className="w-10 h-10 mx-auto rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600">
                    <Gift className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-black text-[#2C3E50]">Cobro con Tarjeta de Regalo</h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Consulta en vivo de saldo en Supabase y débito en línea.
                  </p>
                </div>

                {/* Input de Búsqueda y Validación */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-600 tracking-wider">
                    Código de la Tarjeta de Regalo
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      disabled={isLoadingGiftCard || isDebitingGiftCard}
                      value={giftCardCodeInput}
                      onChange={(e) => {
                        setGiftCardCodeInput(e.target.value);
                        setGiftCardError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleConsultarSaldoGiftCard();
                        }
                      }}
                      placeholder="Ingresa el código (ej. 84920153)"
                      className="flex-1 text-xs px-3.5 py-2.5 border-2 border-slate-200 focus:border-[#4B9CD3] rounded-xl bg-white font-mono font-bold text-[#2C3E50] outline-hidden uppercase tracking-wider"
                    />
                    <button
                      type="button"
                      disabled={isLoadingGiftCard || isDebitingGiftCard || !giftCardCodeInput.trim()}
                      onClick={handleConsultarSaldoGiftCard}
                      className="px-4 py-2.5 bg-[#4B9CD3] hover:bg-[#3A82B4] disabled:bg-slate-300 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-xs active:scale-98"
                    >
                      {isLoadingGiftCard ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>Consultando...</span>
                        </>
                      ) : (
                        <span>Consultar Saldo</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Feedback de Carga */}
                {isLoadingGiftCard && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-blue-700 animate-pulse">
                    <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                    <span>Consultando saldo en Supabase...</span>
                  </div>
                )}

                {/* Mensaje de Error */}
                {giftCardError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-start gap-2.5 text-xs">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold block">No es posible aplicar la tarjeta</span>
                      <span className="text-red-600 font-medium">{giftCardError}</span>
                    </div>
                  </div>
                )}

                {/* Información de Tarjeta Válida y Desglose */}
                {giftCardVerifiedData && (() => {
                  const totalFactura = mandatoryPaymentModal.total;
                  const saldoActual = Number(giftCardVerifiedData.current_balance || 0);
                  const maxAplicable = Math.min(saldoActual, totalFactura);
                  const parsedCustom = parseFloat(giftCardCustomAmountInput);
                  const montoADescontar =
                    !isNaN(parsedCustom) && parsedCustom > 0
                      ? Math.min(parsedCustom, maxAplicable)
                      : maxAplicable;
                  const isFull = Math.abs(totalFactura - montoADescontar) < 0.01;
                  const saldoRestante = Math.max(0, saldoActual - montoADescontar);
                  const diferenciaPendiente = isFull ? 0 : Math.max(0, Number((totalFactura - montoADescontar).toFixed(2)));

                  return (
                    <div className="space-y-3 pt-1 border-t border-slate-100">
                      {/* Tarjeta y Saldo Actual Visible */}
                      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-extrabold text-emerald-900">Tarjeta Verificada</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-800">
                            {giftCardVerifiedData.code}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between pt-1">
                          <span className="text-xs font-bold text-emerald-800">Saldo Disponible Actual:</span>
                          <span className="text-base font-black text-emerald-700">{formatMoney(saldoActual)}</span>
                        </div>
                      </div>

                      {/* Resumen del Cálculo: Pago Completo o Mixto */}
                      <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 space-y-2 text-xs">
                        <div className="flex justify-between items-center text-slate-600 font-medium">
                          <span>Total de la factura:</span>
                          <span className="font-bold text-[#2C3E50]">{formatMoney(totalFactura)}</span>
                        </div>

                        <div className="space-y-1 pt-1 border-t border-slate-100">
                          <div className="flex justify-between items-center text-pink-700 font-bold">
                            <span>Monto a descontar de Tarjeta Regalo:</span>
                            <span className="font-black">- {formatMoney(montoADescontar)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max={maxAplicable}
                              step="100"
                              value={giftCardCustomAmountInput}
                              onChange={(e) => setGiftCardCustomAmountInput(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 border border-pink-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-pink-400 font-bold text-pink-900 bg-pink-50/40"
                              placeholder={`Máx: ${maxAplicable}`}
                            />
                            <button
                              type="button"
                              onClick={() => setGiftCardCustomAmountInput(String(maxAplicable))}
                              className="px-2.5 py-1.5 text-[10px] font-black bg-pink-100 hover:bg-pink-200 text-pink-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                            >
                              Usar Máx ({formatMoney(maxAplicable)})
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-slate-500 font-semibold pt-1 border-t border-slate-100">
                          <span>Saldo restante proyectado en tarjeta:</span>
                          <span className="font-black text-[#2C3E50]">{formatMoney(saldoRestante)}</span>
                        </div>

                        {isFull ? (
                          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-800 text-[11px] font-bold text-center border border-emerald-200">
                            ¡Pago Completo! En el cuadre de caja se sumarán {formatMoney(montoADescontar)} únicamente a Tarjeta Regalo.
                          </div>
                        ) : (
                          <div className="space-y-2.5 pt-2 border-t border-slate-100">
                            <div className="flex justify-between items-center bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                              <span className="font-extrabold text-amber-900 text-xs">Restante a sumar en otro medio de pago:</span>
                              <span className="font-black text-amber-700 text-sm">{formatMoney(diferenciaPendiente)}</span>
                            </div>

                            <div className="space-y-1.5">
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                                Medio de pago para el restante ({formatMoney(diferenciaPendiente)}):
                              </span>
                              <div className="grid grid-cols-2 gap-2">
                                {['Efectivo', 'Tarjeta (Datáfono)', 'Transferencia (Nequi/Bancolombia)', 'Rappi'].map((met) => {
                                  const isSelected = secondaryPaymentMethod === met;
                                  return (
                                    <button
                                      key={met}
                                      type="button"
                                      onClick={() => setSecondaryPaymentMethod(met)}
                                      className={`py-2 px-2.5 text-xs font-extrabold rounded-lg border-2 transition-all cursor-pointer text-center ${
                                        isSelected
                                          ? 'bg-[#EBF5FB] border-[#4B9CD3] text-[#2C3E50] shadow-xs'
                                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                      }`}
                                    >
                                      {met.split(' ')[0]}
                                      {met.includes('(') && <span className="block text-[9px] font-normal text-slate-400">{met.match(/\((.*?)\)/)?.[1]}</span>}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-600 font-semibold space-y-0.5">
                                <span className="block font-extrabold text-[#2C3E50]">Resumen para el Cuadre de Caja:</span>
                                <div className="flex justify-between">
                                  <span>• Tarjeta Regalo:</span>
                                  <span className="font-black text-pink-700">{formatMoney(montoADescontar)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>• {secondaryPaymentMethod}:</span>
                                  <span className="font-black text-[#4B9CD3]">{formatMoney(diferenciaPendiente)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Botón de Confirmación y Cierre de Factura */}
                      <button
                        type="button"
                        disabled={isDebitingGiftCard || isLoadingGiftCard}
                        onClick={handleConfirmarCobroGiftCard}
                        className="w-full py-3.5 px-4 bg-[#4B9CD3] hover:bg-[#3A82B4] disabled:bg-slate-300 text-white font-black text-xs rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isDebitingGiftCard ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            <span>Debitando en Supabase y facturando...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>
                              {isFull 
                                ? `Confirmar Cobro con Tarjeta Regalo (${formatMoney(totalFactura)})`
                                : `Confirmar Cobro Mixto (${formatMoney(totalFactura)})`
                              }
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })()}

                {/* Botón de Cancelación */}
                <div className="pt-2 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    disabled={isDebitingGiftCard}
                    onClick={handleClosePaymentModal}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Cancelar / Modificar Pedido
                  </button>
                </div>
              </div>
            ) : isSplitPaymentActive ? (
              /* FLUJO DE PAGO MIXTO / VARIOS MÉTODOS DE PAGO */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSplitPaymentActive(false);
                      setSplitPaymentError(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4B9CD3] hover:text-[#3A82B4] transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver a medios de pago</span>
                  </button>
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Total a Dividir</span>
                    <span className="text-xs font-black text-[#2C3E50]">{formatMoney(mandatoryPaymentModal.total)}</span>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <h4 className="text-sm font-black text-[#2C3E50]">Pago con Varios Métodos (Pago Mixto)</h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Divide el total de la compra entre Efectivo, Tarjeta, Transferencia o Rappi. Cada monto se sumará por separado en el Cuadre de Caja y en el panel de Administrador.
                  </p>
                </div>

                {splitPaymentError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl flex items-start gap-2 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{splitPaymentError}</span>
                  </div>
                )}

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {splitPaymentRows.map((row, idx) => {
                    const otherRowsSum = splitPaymentRows.reduce(
                      (acc, r, i) => (i === idx ? acc : acc + (parseFloat(r.monto) || 0)),
                      0
                    );
                    const remainingForThisRow = Math.max(0, Number((mandatoryPaymentModal.total - otherRowsSum).toFixed(2)));

                    return (
                      <div key={row.id} className="bg-white border border-[#E2E8F0] p-3 rounded-xl space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-[#4B9CD3] tracking-wider">
                            Pago #{idx + 1}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSplitPaymentError(null);
                                setSplitPaymentRows(prev =>
                                  prev.map((r, i) => (i === idx ? { ...r, monto: String(remainingForThisRow) } : r))
                                );
                              }}
                              className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#EBF5FB] hover:bg-[#D5EBF9] text-[#2C3E50] border border-[#AED6F1] transition-colors cursor-pointer"
                              title="Asignar saldo restante a este medio de pago"
                            >
                              Asignar resto ({formatMoney(remainingForThisRow)})
                            </button>
                            {splitPaymentRows.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSplitPaymentError(null);
                                  setSplitPaymentRows(prev => prev.filter((_, i) => i !== idx));
                                }}
                                className="text-red-500 hover:text-red-700 font-black text-xs px-1.5 py-0.5 rounded hover:bg-red-50 cursor-pointer"
                                title="Eliminar fila"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Medio de Pago</label>
                            <select
                              value={row.metodo}
                              onChange={(e) => {
                                const newMetodo = e.target.value;
                                setSplitPaymentError(null);
                                setSplitPaymentRows(prev =>
                                  prev.map((r, i) => (i === idx ? { ...r, metodo: newMetodo } : r))
                                );
                              }}
                              className="w-full text-xs px-2.5 py-2 border border-[#E2E8F0] rounded-lg bg-slate-50 font-bold text-[#2C3E50] focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3]"
                            >
                              <option value="Efectivo">Efectivo</option>
                              <option value="Tarjeta (Datáfono)">Tarjeta (Datáfono)</option>
                              <option value="Transferencia (Nequi/Bancolombia)">Transferencia (Nequi/Bancolombia)</option>
                              <option value="Rappi">Rappi</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Monto ($)</label>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={row.monto}
                              onChange={(e) => {
                                const valStr = e.target.value;
                                setSplitPaymentError(null);
                                setSplitPaymentRows(prev => {
                                  const next = prev.map((r, i) => (i === idx ? { ...r, monto: valStr } : r));
                                  // Si son 2 filas y el cajero edita la primera fila, autocompletar la segunda con el restante
                                  if (next.length === 2 && idx === 0) {
                                    const num1 = parseFloat(valStr) || 0;
                                    const rest2 = Math.max(0, Number((mandatoryPaymentModal.total - num1).toFixed(2)));
                                    next[1] = { ...next[1], monto: String(rest2) };
                                  }
                                  return next;
                                });
                              }}
                              placeholder="0.00"
                              className="w-full text-xs px-2.5 py-2 border border-[#E2E8F0] rounded-lg bg-white font-black text-[#2C3E50] focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3]"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {splitPaymentRows.length < 4 && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentSum = splitPaymentRows.reduce((acc, r) => acc + (parseFloat(r.monto) || 0), 0);
                      const rest = Math.max(0, Number((mandatoryPaymentModal.total - currentSum).toFixed(2)));
                      setSplitPaymentRows(prev => [
                        ...prev,
                        { id: `sp-${Date.now()}-${prev.length + 1}`, metodo: 'Transferencia (Nequi/Bancolombia)', monto: rest > 0 ? String(rest) : '' }
                      ]);
                    }}
                    className="w-full py-2 px-3 border border-dashed border-[#4B9CD3] text-[#4B9CD3] hover:bg-[#EBF5FB]/50 font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    + Agregar otro medio de pago
                  </button>
                )}

                {(() => {
                  const totalFactura = mandatoryPaymentModal.total;
                  const sumaActual = Number(
                    splitPaymentRows.reduce((acc, r) => acc + (parseFloat(r.monto) || 0), 0).toFixed(2)
                  );
                  const diff = Number((totalFactura - sumaActual).toFixed(2));
                  const isExact = Math.abs(diff) < 0.01;

                  return (
                    <div className="space-y-3 pt-1 border-t border-slate-100">
                      <div
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          isExact
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : diff > 0
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-red-50 border-red-200 text-red-900'
                        }`}
                      >
                        <div className="flex justify-between font-semibold">
                          <span>Suma de medios asignados:</span>
                          <span className="font-black">{formatMoney(sumaActual)} / {formatMoney(totalFactura)}</span>
                        </div>
                        <div className="flex justify-between font-extrabold">
                          <span>Estado del desglose:</span>
                          <span>
                            {isExact
                              ? '✓ Monto total cubierto exactamente'
                              : diff > 0
                              ? `Falta asignar: ${formatMoney(diff)}`
                              : `Excede por: ${formatMoney(Math.abs(diff))}`}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!isExact}
                        onClick={handleConfirmarPagoMixto}
                        className="w-full py-3.5 px-4 bg-[#4B9CD3] hover:bg-[#3A82B4] disabled:bg-slate-300 text-white font-black text-xs rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>Confirmar Pago Dividido ({formatMoney(totalFactura)})</span>
                      </button>
                    </div>
                  );
                })()}

                <div className="pt-2 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={handleClosePaymentModal}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Cancelar / Modificar Pedido
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Botones de Acción Completa - Opciones de Selección */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-black text-[#2C3E50] uppercase tracking-wider block text-center">
                    Elige el Canal de Pago del Cliente
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleSelectMandatoryPayment('Efectivo')}
                      className="w-full py-3.5 px-4 bg-white hover:bg-[#4B9CD3] hover:text-white border-2 border-[#4B9CD3]/30 hover:border-[#4B9CD3] text-[#2C3E50] font-black text-xs rounded-xl transition-all shadow-xs active:scale-98 cursor-pointer text-center"
                    >
                      Efectivo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectMandatoryPayment('Tarjeta (Datáfono)')}
                      className="w-full py-3.5 px-4 bg-white hover:bg-[#4B9CD3] hover:text-white border-2 border-[#4B9CD3]/30 hover:border-[#4B9CD3] text-[#2C3E50] font-black text-xs rounded-xl transition-all shadow-xs active:scale-98 cursor-pointer text-center"
                    >
                      Tarjeta (Datáfono)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectMandatoryPayment('Transferencia (Nequi/Bancolombia)')}
                      className="w-full py-3.5 px-4 bg-white hover:bg-[#4B9CD3] hover:text-white border-2 border-[#4B9CD3]/30 hover:border-[#4B9CD3] text-[#2C3E50] font-black text-xs rounded-xl transition-all shadow-xs active:scale-98 cursor-pointer text-center"
                    >
                      Transferencia (Nequi/Bancolombia)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectMandatoryPayment('Rappi')}
                      className="w-full py-3.5 px-4 bg-white hover:bg-[#4B9CD3] hover:text-white border-2 border-[#4B9CD3]/30 hover:border-[#4B9CD3] text-[#2C3E50] font-black text-xs rounded-xl transition-all shadow-xs active:scale-98 cursor-pointer text-center"
                    >
                      Rappi
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectMandatoryPayment('Tarjeta Regalo')}
                      className="w-full py-3.5 px-4 bg-white hover:bg-pink-600 hover:text-white border-2 border-pink-300 hover:border-pink-600 text-pink-700 font-black text-xs rounded-xl transition-all shadow-xs active:scale-98 cursor-pointer text-center"
                    >
                      🎁 Tarjeta Regalo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectMandatoryPayment('Pago Mixto')}
                      className="w-full py-3.5 px-4 bg-[#EBF5FB] hover:bg-[#4B9CD3] hover:text-white border-2 border-[#4B9CD3] text-[#2C3E50] font-black text-xs rounded-xl transition-all shadow-xs active:scale-98 cursor-pointer text-center"
                    >
                      💳+💵 Varios Métodos (Pago Mixto)
                    </button>
                  </div>
                </div>

                {/* Botón secundario para Cancelar / Modificar Pedido */}
                <div className="pt-2 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={handleClosePaymentModal}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Cancelar / Modificar Pedido
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* Modal QR de Registro para Clientes */}
      <ModalQrFidelizacion
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
      />
    </div>
  );
}
