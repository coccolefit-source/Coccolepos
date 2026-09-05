/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Usuario, Tarea, ProductoPromocion, RegistroVenta, Fichaje, Incidencia, Anuncio, AreaType, Feedback, InventarioItem, TurnoSemanal, Producto, Venta, CuadreCaja, Cliente, isEfectivo, isTarjeta, isTransferencia, isRappi, RankingWeights, UpsellRule, DEFAULT_UPSELL_RULES } from '../types';

import { calculateLeaderboard } from '../utils/metrics';
import { calcularTiempoTarea } from '../lib/taskUtils';
import { compressImage } from '../utils/imageCompressor';
import { getSupabaseClient } from '../lib/supabaseClient';
import { CheckCircle2, Clock, AlertTriangle, ShieldCheck, Plus, ShoppingCart, Image as ImageIcon, Sparkles, Send, Award, MessageSquare, FileText, Boxes, Calendar, ChevronRight, TrendingUp, Trash2, History, PlusCircle, MinusCircle, DollarSign, Check } from 'lucide-react';

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
  onUpdateTareaEstado: (id: string, estado: 'Pendiente' | 'En proceso' | 'Completada', foto_url?: string, nota_evidencia?: string) => void;

  onAddVentaSugerida: (producto_id: string, usuario_id: string, metodo_pago: string) => void;
  onRegistrarFichaje: (usuario_id: string, tipo: 'entrada' | 'salida', horaPersonalizada?: string) => void;
  onAddIncidencia: (incidencia: Omit<Incidencia, 'id'>) => void;
  onUpdateStock: (id: string, nuevoStock: number, usuario_nombre: string) => void;
  onRegistrarVenta: (venta: Omit<Venta, 'id'>) => void;
  onRegistrarCuadreCaja: (cuadre: Omit<CuadreCaja, 'id'>) => void;
  onConfirmarLecturaAnuncio: (anuncioId: string, usuarioId: string) => void;
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
  onUpdateTareaEstado,
  onAddVentaSugerida,
  onRegistrarFichaje,
  onAddIncidencia,
  onUpdateStock,
  onRegistrarVenta,
  onRegistrarCuadreCaja,
  onConfirmarLecturaAnuncio,
}: EmployeeWorkspaceProps) {
  const [localProductos, setLocalProductos] = useState<ProductoPromocion[]>(productos);

  // Sincronizar localProductos si cambian las props
  useEffect(() => {
    setLocalProductos(productos);
  }, [productos]);

  // Suscripción en Tiempo Real para los productos de campaña (upsell_rules)
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    const fetchUpsellRules = async () => {
      try {
        const { data, error } = await client
          .from('upsell_rules')
          .select('*');

        if (!error && data) {
          const mapped: ProductoPromocion[] = data.map((d: any) => ({
            id: d.id,
            nombre_producto: d.nombre_producto || d.producto_sugerido_nombre || d.name || d.producto_base_nombre || '',
            fecha: d.fecha || d.date || '2026-08-20',
            meta_diaria_unidades: Number(d.meta_diaria_unidades ?? d.meta ?? d.meta_diaria ?? 15),
            puntos_por_unidad: Number(d.puntos_por_unidad ?? d.points ?? d.puntos ?? 10)
          }));
          setLocalProductos(mapped);
        }
      } catch (err) {
        console.error('Error in EmployeeWorkspace fetchUpsellRules:', err);
      }
    };

    const channel = client
      .channel('upsell_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'upsell_rules' },
        (payload) => {
          console.log('Cambio detectado en upsell_rules:', payload);
          fetchUpsellRules();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, []);

  // Filtrar tareas asignadas a este empleado hoy y ordenarlas secuencialmente
  const misTareas = tareas
    .filter(t => t.asignado_a === empleado.id && (t.fecha === '2026-08-20' || !t.fecha))
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const tareasCompletadasCount = misTareas.filter(t => t.estado === 'Completada').length;
  const totalTareasCount = misTareas.length;
  const porcentajeCumplimientoTareas = totalTareasCount > 0 ? Math.round((tareasCompletadasCount / totalTareasCount) * 100) : 100;

  // Buscar fichaje de hoy
  const miFichaje = fichajes.find(f => f.usuario_id === empleado.id && f.fecha === '2026-08-20');

  // Obtener ranking de este empleado en la vista "diario"
  const leaderboardData = calculateLeaderboard(usuarios, tareas, ventas, fichajes, localProductos, 'diario', '2026-08-20', posVentas.length > 0 ? posVentas : ventasRegistradas, rankingWeights);

  const miPosicion = leaderboardData.findIndex(item => item.usuario.id === empleado.id) + 1;
  const misPuntos = leaderboardData.find(item => item.usuario.id === empleado.id)?.puntosTotales || 0;

  // Modales
  const [employeeTab, setEmployeeTab] = useState<'tareas' | 'inventario' | 'horarios' | 'ventas'>('tareas');
  const [tempStock, setTempStock] = useState<Record<string, number>>({});
  const [activePaymentSugerida, setActivePaymentSugerida] = useState<string | null>(null);
  const [posPaymentMethod, setPosPaymentMethod] = useState<string>('Efectivo');

  // Estados Módulo de Fidelización de Clientes POS
  const [clienteTelefonoInput, setClienteTelefonoInput] = useState('');
  const [selectedClient, setSelectedClient] = useState<{ nombre: string; telefono: string } | null>(null);
  const [phoneError, setPhoneError] = useState(false);
  const [newClientModal, setNewClientModal] = useState<{ open: boolean; phone: string; name: string }>({
    open: false,
    phone: '',
    name: ''
  });

  const handleSearchClient = () => {
    const cleanPhone = clienteTelefonoInput.trim();
    if (!cleanPhone) {
      setPhoneError(true);
      setSelectedClient(null);
      return;
    }

    setPhoneError(false);
    const cleanDigits = cleanPhone.replace(/\D/g, '');
    const existingClient = (clientes || []).find(c => {
      const cDigits = c.telefono.replace(/\D/g, '');
      return (cDigits && cDigits === cleanDigits) || c.telefono === cleanPhone;
    });

    if (existingClient) {
      setSelectedClient({ nombre: existingClient.nombre, telefono: existingClient.telefono });
    } else {
      setSelectedClient(null);
      setNewClientModal({
        open: true,
        phone: cleanPhone,
        name: ''
      });
    }
  };

  // Modal obligatorio de cobro previo a registro
  const [mandatoryPaymentModal, setMandatoryPaymentModal] = useState<{
    kind: 'sugerida' | 'pos';
    sugeridaProdId?: string;
    articulos: Array<{ nombre: string; cantidad: number; subtotal: number }>;
    total: number;
  } | null>(null);

  const handleSelectMandatoryPayment = (metodo: string) => {
    if (!mandatoryPaymentModal) return;

    if (mandatoryPaymentModal.kind === 'sugerida' && mandatoryPaymentModal.sugeridaProdId) {
      onAddVentaSugerida(mandatoryPaymentModal.sugeridaProdId, empleado.id, metodo);
    } else if (mandatoryPaymentModal.kind === 'pos') {
      const newVenta = {
        fecha: new Date().toISOString().split('T')[0],
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
        cliente_nombre: selectedClient?.nombre,
        cliente_telefono: selectedClient?.telefono,
        estado: 'completada'
      };

      onRegistrarVenta(newVenta as any);
      setCartItems([]);
      setClienteTelefonoInput('');
      setSelectedClient(null);
      setPhoneError(false);
    }

    setMandatoryPaymentModal(null);
  };

  const handleProcessPosSale = () => {
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
      return (cDigits && cDigits === cleanDigits) || c.telefono === cleanPhone;
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
      setSelectedClient({ nombre: existingClient.nombre, telefono: existingClient.telefono });
      setMandatoryPaymentModal({
        kind: 'pos',
        articulos: items,
        total: total
      });
    } else {
      // Cliente nuevo: Abre modal emergente para solicitar nombre completo
      // NO abre el modal de medio de pago sin registrar al cliente primero
      setNewClientModal({
        open: true,
        phone: cleanPhone,
        name: ''
      });
    }
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

  // Hora de ingreso personalizada
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);
  const [customTime, setCustomTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });

  // Anuncio más reciente
  const anuncioReciente = anuncios[0];

  // --- ESTADOS PARA CIERRE DE TURNO Y CUADRE DE CAJA (CORTE DIARIO) ---
  const [cuadreEfectivo, setCuadreEfectivo] = useState('');
  const [cuadreTarjeta, setCuadreTarjeta] = useState('');
  const [cuadreObs, setCuadreObs] = useState('');

  const yaCuadrado = (cuadresCaja || []).some(
    c => c.usuario_id === empleado.id && c.fecha === '2026-08-20'
  );

  const handleCuadreCajaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuadreEfectivo || !cuadreTarjeta || !cuadreObs.trim()) return;

    onRegistrarCuadreCaja({
      usuario_id: empleado.id,
      usuario_nombre: empleado.nombre,
      fecha: '2026-08-20',
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

  const handleSavePhotoEvidence = () => {
    if (selectedTaskId) {
      onUpdateTareaEstado(selectedTaskId, 'Completada', evidencePhoto, evidenceNote);
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
      fecha: '2026-08-20',
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
      .filter(v => v.producto_id === productId && v.usuario_id === empleado.id && v.fecha === '2026-08-20')
      .reduce((sum, v) => sum + v.unidades_contadas, 0);
  };

  return (
    <div id="employee-workspace" className="relative w-full text-slate-800 space-y-6">
      
      {/* HEADER PRINCIPAL DE LA ESTACIÓN DE TRABAJO (PC VIEW) */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-xs gap-4">
        <div className="flex items-center gap-4">
          <img
            src={empleado.foto_avatar}
            alt={empleado.nombre}
            className="w-16 h-16 rounded-full object-cover border-2 border-[#4B9CD3] shadow-xs"
            referrerPolicy="no-referrer"
          />
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estación de Trabajo Activa</p>
            <h3 className="font-black text-2xl text-[#2C3E50] tracking-tight">{empleado.nombre}</h3>
            <div className="flex gap-2 mt-1">
              <span className="text-[10px] bg-[#EBF5FB] text-[#4B9CD3] border border-[#AED6F1] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wide flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> {empleado.insignia_actual || 'Colaborador Fit'}
              </span>
              <span className="text-[10px] bg-[#FFFDF6] text-slate-600 border border-[#E2E8F0] px-2 py-0.5 rounded-sm font-bold uppercase">
                {empleado.area_preferida}
              </span>
            </div>
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
          <div className="bg-white border border-[#E2E8F0] p-2 px-3.5 rounded-xl flex items-center gap-4">
            <div>
              <p className="text-[9px] text-slate-400 font-bold uppercase">Fichaje del Turno</p>
              <p className="text-[10px] text-slate-600 font-bold mt-0.5 flex flex-wrap items-center gap-1.5">
                {miFichaje?.hora_entrada ? (
                  <>
                    <span>Entrada: <strong>{miFichaje.hora_entrada}</strong></span>
                    {!miFichaje.hora_salida && !showCustomTimePicker && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomTime(miFichaje.hora_entrada);
                          setShowCustomTimePicker(true);
                        }}
                        className="text-[9px] text-[#4B9CD3] hover:text-[#3A82B4] font-black underline cursor-pointer bg-[#EBF5FB] px-1.5 py-0.5 rounded-md"
                        title="Modificar hora de llegada de hoy"
                      >
                        Editar Entrada
                      </button>
                    )}
                  </>
                ) : (
                  <span>Falta fichar hoy</span>
                )}
                {miFichaje?.hora_salida ? ` | Salida: ${miFichaje.hora_salida}` : ''}
              </p>
            </div>

            {showCustomTimePicker ? (
              <div className="flex items-center gap-1.5 border border-[#E2E8F0] p-1 rounded-lg bg-[#FFFDF6]/40">
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="text-[10px] font-bold bg-white px-1.5 py-0.5 rounded-md border border-[#E2E8F0] focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    onRegistrarFichaje(empleado.id, 'entrada', customTime);
                    setShowCustomTimePicker(false);
                  }}
                  className="bg-[#4B9CD3] hover:bg-[#3A82B4] text-white text-[9px] font-bold px-2 py-1 rounded-md transition-colors"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomTimePicker(false)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 font-bold px-1"
                >
                  X
                </button>
              </div>
            ) : miFichaje ? (
              miFichaje.hora_salida ? (
                <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider">
                  Turno Cerrado
                </span>
              ) : (
                <button
                  id="fichaje-out-btn"
                  disabled={!yaCuadrado}
                  onClick={() => {
                    if (yaCuadrado) {
                      onRegistrarFichaje(empleado.id, 'salida');
                    }
                  }}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors shadow-2xs uppercase tracking-wider ${
                    yaCuadrado 
                      ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                  title={!yaCuadrado ? "Primero completa el cuadre de caja obligatorio abajo" : "Registrar Salida de Turno"}
                >
                  Registrar Salida
                </button>
              )
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="fichaje-in-btn"
                  onClick={() => onRegistrarFichaje(empleado.id, 'entrada')}
                  className="bg-[#4B9CD3] hover:bg-[#3A82B4] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors shadow-2xs uppercase tracking-wider cursor-pointer font-black"
                >
                  Registrar Entrada (Ahora)
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomTimePicker(true)}
                  className="text-[10px] text-[#4B9CD3] hover:text-[#3A82B4] font-bold underline px-1"
                  title="Registrar hora manual de ingreso"
                >
                  Manual
                </button>
              </div>
            )}
          </div>
          </div>

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

        {/* TABLERO DE COMUNICADOS E ANUNCIOS */}
        <div className="w-full bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-xs space-y-4">
          <div className="border-b border-[#FFFDF6] pb-2">
            <h4 className="font-extrabold text-xs text-[#2C3E50] uppercase tracking-wider">Tablero de Comunicados</h4>
            <p className="text-[10px] text-slate-500">Mantente al tanto de las novedades publicadas por administración.</p>
          </div>

          {anuncios.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-4">No hay comunicados activos.</p>
          ) : (
            <div className="space-y-3">
              {anuncios.map(an => {
                const yaLeido = (an.lecturas_confirmadas || []).includes(empleado.id);
                return (
                  <div key={an.id} className="bg-[#EBF5FB]/40 border border-[#AED6F1]/80 p-3 rounded-lg relative">
                    <p className="text-[9px] font-bold text-[#4B9CD3] uppercase tracking-wider">De: {an.creador_nombre} | {an.fecha}</p>
                    <h5 className="font-extrabold text-xs text-[#2C3E50] mt-1">{an.titulo}</h5>
                    <p className="text-[10px] text-slate-700 mt-1 whitespace-pre-line leading-relaxed">
                      {an.contenido}
                    </p>
                    
                    <div className="mt-3 pt-2 border-t border-[#AED6F1]/40 flex justify-between items-center">
                      <span className="text-[9px] text-[#4B9CD3] font-semibold">
                        Lectura del Anuncio
                      </span>
                      {yaLeido ? (
                        <span className="text-[10px] font-bold text-[#4B9CD3]">
                          Leído
                        </span>
                      ) : (
                        <button
                          type="button"
                          id={`read-btn-${an.id}`}
                          onClick={() => onConfirmarLecturaAnuncio(an.id, empleado.id)}
                          className="bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-extrabold text-[9px] px-2.5 py-1 rounded-md transition-all cursor-pointer uppercase tracking-wider"
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
            Venta Sugerida del Turno
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(() => {
              const hoyCampanas = localProductos.filter(p => p.fecha === '2026-08-20');
              const displayCampanas = hoyCampanas.length > 0 ? hoyCampanas : localProductos;
              return displayCampanas.slice(0, 2).map(prod => {
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
              <span>Mi Checklist ({misTareas.filter(t => t.estado === 'Completada').length}/{misTareas.length})</span>
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
              <span>Stock</span>
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
          </div>

          {/* TAB 1: MI CHECKLIST DE TAREAS OPERATIVAS Y BARRA DE PROGRESO */}
          {employeeTab === 'tareas' && (
            <div className="w-full rounded-xl border border-[#E2E8F0] bg-white p-5 mb-6 shadow-sm animate-in fade-in duration-150">
              {/* 1. Tarjeta de Resumen y Barra de Progreso Visual */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-black text-[#2C3E50] tracking-tight">Progreso de Tareas del Día</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Monitoreo en tiempo real del porcentaje de avance de tus asignaciones diarias
                  </p>
                </div>
                <div className="flex items-center gap-2.5 self-start sm:self-center">
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                    {tareasCompletadasCount} de {totalTareasCount} tareas completadas
                  </span>
                  <span className="text-sm font-black text-[#4B9CD3] bg-[#EBF5FB] px-3 py-1 rounded-lg">
                    {porcentajeCumplimientoTareas}%
                  </span>
                </div>
              </div>

              {/* Barra de Progreso Dinámica */}
              <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden mb-6 border border-slate-100">
                <div
                  className="bg-[#4B9CD3] h-full transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${porcentajeCumplimientoTareas}%` }}
                />
              </div>

              {/* 2. Lista Interactiva de Tareas del Día */}
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lista Operativa de Tareas de la Jornada</h4>
                  <span className="text-[10px] text-[#4B9CD3] font-bold bg-[#EBF5FB] px-2.5 py-0.5 rounded-full">
                    {empleado.area_preferida || 'Operaciones'}
                  </span>
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
                          className={`p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                            isCompleted
                              ? 'bg-slate-50/90 border-slate-200'
                              : t.estado === 'En proceso'
                              ? 'bg-amber-50/30 border-amber-200'
                              : 'bg-white border-[#E2E8F0] hover:border-[#4B9CD3]/50'
                          }`}
                        >
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
                                  onUpdateTareaEstado(t.id, 'Completada');
                                }
                              } else {
                                onUpdateTareaEstado(t.id, 'Pendiente');
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
                                            onUpdateTareaEstado(t.id, t.estado, compressed, t.nota_evidencia || 'Cargado directo de galería');
                                          } catch (err) {
                                            console.error("Error compressing direct upload:", err);
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                              if (typeof reader.result === 'string') {
                                                onUpdateTareaEstado(t.id, t.estado, reader.result, t.nota_evidencia || 'Cargado directo de galería');
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
                                    onClick={() => onUpdateTareaEstado(t.id, t.estado === 'En proceso' ? 'Pendiente' : 'En proceso')}
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
                                  <p className="text-[10px] text-[#4B9CD3] font-black">${prod.precio.toFixed(2)}</p>
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

                  {/* MÓDULO DE VENTAS SUGERIDAS / VENTA CRUZADA (CROSS-SELLING) */}
                  {(() => {
                    const activeRules = (upsellRules || DEFAULT_UPSELL_RULES).filter(r => r.activa !== false);
                    let suggestionsToShow: Array<{ id: string; nombre: string; precio: number; reglaOrigen?: string }> = [];

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

                    if (suggestionsToShow.length === 0) {
                      const defaultImpulseNames = [
                        { nombre: 'Adición Whey Protein Isolate', precio: 3.50, desc: 'Impulso de proteína funcional' },
                        { nombre: 'Topping Extra de Frutas Silvestres', precio: 2.00, desc: 'Acompañamiento popular del día' },
                        { nombre: 'Jugo Prensado en Frío Verde', precio: 4.50, desc: 'Bebida detox más vendida' },
                        { nombre: 'Barra Energética Artesanal', precio: 2.80, desc: 'Snack complementario fit' }
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
                      const catProd = productosCatalogo.find(p => p.id === sug.id || p.nombre.toLowerCase() === sug.nombre.toLowerCase());
                      const prodObj: Producto = catProd || {
                        id: sug.id,
                        codigo: 'SUG-001',
                        nombre: sug.nombre,
                        precio: sug.precio,
                        categoria: 'Adiciones'
                      };

                      const existing = cartItems.find(i => i.producto.id === prodObj.id || i.producto.nombre.toLowerCase() === prodObj.nombre.toLowerCase());
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
                            <h5 className="font-extrabold text-xs text-[#2C3E50] tracking-tight">Ventas Sugeridas / Venta Cruzada</h5>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {cartItems.length > 0 ? 'Complementos recomendados para los productos en ticket' : 'Sugerencias de impulso más vendidas de la jornada'}
                            </p>
                          </div>
                          <span className="text-[9px] font-bold text-[#4B9CD3] bg-[#EBF5FB] px-2.5 py-0.5 rounded-full">
                            Cross-selling
                          </span>
                        </div>

                        <div className="space-y-2">
                          {suggestionsToShow.map(sug => (
                            <div key={sug.id} className="p-2.5 bg-[#FFFDF6] border border-[#E2E8F0] rounded-lg flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-xs text-[#2C3E50] block truncate">{sug.nombre}</span>
                                <span className="text-[9px] text-slate-400 font-medium block truncate">{sug.reglaOrigen}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-black text-xs text-[#4B9CD3]">${sug.precio.toFixed(2)}</span>
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
                            <span className="font-bold text-[#4B9CD3]">${(item.producto.precio * item.cantidad).toFixed(2)}</span>
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
                      <label className="block text-[11px] font-extrabold text-[#2C3E50] uppercase tracking-wider mb-1">
                        Teléfono del Cliente <span className="text-red-500">*</span>
                      </label>
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

                      {selectedClient && (
                        <div className="mt-2 p-2 bg-[#EBF5FB] border border-[#AED6F1] rounded-lg flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-400 block">Cliente Fidelizado</span>
                            <span className="font-extrabold text-[#2C3E50]">{selectedClient.nombre}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedClient(null)}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer underline"
                          >
                            Quitar
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-500">Total a Cobrar:</span>
                      <span className="font-black text-[#2C3E50] text-lg">
                        ${cartItems.reduce((sum, item) => sum + (item.producto.precio * item.cantidad), 0).toFixed(2)}
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
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1F5F9]">
                    <div>
                      <h4 className="text-xs font-black text-[#2C3E50] uppercase tracking-wider">
                        Historial Transaccional del Turno
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Registro en tiempo real de ventas procesadas durante la jornada activa.
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const shiftSales = (ventasRegistradas || []).filter(v => {
                      if (!v) return false;
                      const matchesEmp = 
                        !v.usuario_id || 
                        v.usuario_id === empleado.id || 
                        v.vendedor_id === empleado.id || 
                        (v as any).cajero_id === empleado.id || 
                        v.vendedor_nombre === empleado.nombre;
                      return matchesEmp;
                    });

                    const sortedSales = [...shiftSales].sort((a, b) => {
                      const timeA = `${a.fecha || ''} ${a.hora || ''}`;
                      const timeB = `${b.fecha || ''} ${b.hora || ''}`;
                      return timeB.localeCompare(timeA);
                    });

                    if (sortedSales.length === 0) {
                      return (
                        <div className="py-8 text-center bg-[#F8FAFC] rounded-lg border border-dashed border-[#CBD5E1]">
                          <p className="text-xs font-medium text-slate-400 italic">
                            No hay ventas registradas en este turno aún.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                              <th className="py-2.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                Hora
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
                              
                              let payLabel = 'Efectivo';
                              let payStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                              if (isTarjeta(v.metodo_pago)) {
                                payLabel = 'Tarjeta';
                                payStyle = 'bg-blue-50 text-blue-700 border-blue-200';
                              } else if (isTransferencia(v.metodo_pago)) {
                                payLabel = 'Transferencia';
                                payStyle = 'bg-purple-50 text-purple-700 border-purple-200';
                              } else if (isRappi(v.metodo_pago)) {
                                payLabel = 'Rappi';
                                payStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                              } else if (isEfectivo(v.metodo_pago)) {
                                payLabel = 'Efectivo';
                                payStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                              } else if (v.metodo_pago) {
                                payLabel = v.metodo_pago;
                              }

                              return (
                                <tr key={v.id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                                  <td className="py-3 px-3 text-xs font-bold text-[#2C3E50] whitespace-nowrap">
                                    {v.hora || '12:00'}
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
                                  <td className="py-3 px-3 text-xs whitespace-nowrap">
                                    <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-md border ${payStyle}`}>
                                      {payLabel}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-xs font-black text-[#2C3E50] text-right whitespace-nowrap">
                                    ${Number(v.total || 0).toFixed(2)}
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
                    );
                  })()}
                </div>
              </div>

              {/* FORMULARIO DE CUADRE DE CAJA */}
              <div className="mt-8 pt-6 border-t border-dashed border-[#E2E8F0]">
                
                <h5 className="font-extrabold text-[#2C3E50] text-xs mb-3 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-[#4B9CD3]" />
                  Cuadre de Caja Diario / Cierre de Turno
                </h5>
                {(() => {
                  const userSales = (ventasRegistradas || []).filter(v => {
                    if (!v || v.estado === 'Anulada') return false;
                    const matchesEmp = 
                      !v.usuario_id || 
                      v.usuario_id === empleado.id || 
                      v.vendedor_id === empleado.id || 
                      (v as any).cajero_id === empleado.id || 
                      v.vendedor_nombre === empleado.nombre;
                    return matchesEmp;
                  });
                  const totalEfectivo = userSales.filter(v => isEfectivo(v.metodo_pago)).reduce((sum, v) => sum + Number(v.total || 0), 0);
                  const totalTarjeta = userSales.filter(v => isTarjeta(v.metodo_pago)).reduce((sum, v) => sum + Number(v.total || 0), 0);
                  const totalTransferencia = userSales.filter(v => isTransferencia(v.metodo_pago)).reduce((sum, v) => sum + Number(v.total || 0), 0);
                  const totalRappi = userSales.filter(v => isRappi(v.metodo_pago)).reduce((sum, v) => sum + Number(v.total || 0), 0);

                  return (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        
                        const newCuadre = {
                          fecha: new Date().toISOString().split('T')[0],
                          hora_cierre: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                          empleado_id: empleado.id,
                          empleado_nombre: empleado.nombre,
                          efectivo_esperado: totalEfectivo,
                          efectivo_contado: parseFloat(formData.get('efectivo_contado') as string) || 0,
                          tarjeta_esperado: totalTarjeta,
                          transferencia_esperado: totalTransferencia,
                          rappi_esperado: totalRappi,
                          diferencia_total: (parseFloat(formData.get('efectivo_contado') as string) || 0) - totalEfectivo,
                          observaciones: formData.get('observaciones') as string,
                          estado: 'pendiente_revision'
                        };
                        
                        onRegistrarCuadreCaja(newCuadre as any);
                        e.currentTarget.reset();
                      }}
                      className="bg-[#FFFDF6] p-4 rounded-xl border border-[#E2E8F0] space-y-3"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-3 rounded border border-slate-100 mb-3">
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Efectivo Sistema</p>
                          <p className="font-black text-[#4B9CD3] text-sm">${totalEfectivo.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Tarjeta (Datáfono)</p>
                          <p className="font-black text-slate-700 text-sm">${totalTarjeta.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Transferencia</p>
                          <p className="font-black text-slate-700 text-sm">${totalTransferencia.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Rappi</p>
                          <p className="font-black text-slate-700 text-sm">${totalRappi.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Efectivo Físico Contado</label>
                          <input name="efectivo_contado" type="number" step="0.01" className="w-full text-xs px-2 py-1.5 border border-[#E2E8F0] rounded focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3]" required placeholder="Ingresa efectivo real en caja" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Notas u Observaciones</label>
                          <input name="observaciones" type="text" placeholder="Faltantes, gastos de caja chica..." className="w-full text-xs px-2 py-1.5 border border-[#E2E8F0] rounded focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3]" />
                        </div>
                      </div>
                      
                      <button type="submit" className="w-full bg-[#2C3E50] hover:bg-slate-800 text-white font-bold text-xs py-2 rounded transition-colors mt-2 cursor-pointer">
                        Enviar Corte de Caja Diario
                      </button>
                    </form>
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
                const misTurnos = horarios.filter(t => t.usuario_id === empleado.id);
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
                  setSelectedClient({ nombre: finalName, telefono: newClientModal.phone });
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

      {/* MODAL EMERGENTE OBLIGATORIO DE COBRO (ALERTA FLOTANTE BACKDROP-BLUR) */}
      {mandatoryPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF6] border-2 border-[#4B9CD3] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 text-[#2C3E50] relative">
            <button
              type="button"
              onClick={() => setMandatoryPaymentModal(null)}
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
                      <span className="text-[#4B9CD3] font-black">${art.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-black text-slate-500 uppercase">Total a Cobrar</span>
                  <span className="text-base font-black text-[#2C3E50]">${mandatoryPaymentModal.total.toFixed(2)}</span>
                </div>
              </div>
            )}

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
              </div>
            </div>

            {/* Botón secundario para Cancelar / Modificar Pedido */}
            <div className="pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setMandatoryPaymentModal(null)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
              >
                Cancelar / Modificar Pedido
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
