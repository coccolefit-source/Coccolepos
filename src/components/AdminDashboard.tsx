/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Usuario, Tarea, ProductoPromocion, Fichaje, Incidencia, Anuncio, AreaType, TaskStatus, Feedback, InventarioItem, TurnoSemanal, Producto, Venta, CuadreCaja, AlertaPanico, Cliente, isEfectivo, isTarjeta, isTransferencia, isRappi, RankingWeights, DEFAULT_RANKING_WEIGHTS, UpsellRule } from '../types';

import { Plus, Trash2, Edit2, CheckCircle, AlertTriangle, FileText, ClipboardList, Megaphone, CheckSquare, Sparkles, UserCheck, User, MessageSquare, Award, X, Boxes, Calendar, Phone, Mail, Link, Upload, Database, TrendingUp, DollarSign, BarChart3, Filter, CalendarRange, RefreshCw, ShieldCheck, Sliders } from 'lucide-react';
import { auditSupabaseDatabase, DatabaseAuditSummary, TableAuditReport, SUPABASE_SQL_SCHEMA, isSupabaseConfigured } from '../lib/supabaseClient';
import { RankingWeightsConfig } from './RankingWeightsConfig';

export type AdminTab = 'tareas' | 'productos' | 'calidad' | 'anuncios' | 'empleados' | 'inventario' | 'horarios' | 'ventas' | 'supabase';

export interface AdminDashboardProps {
  usuarios: Usuario[];
  tareas: Tarea[];
  productos: ProductoPromocion[];
  fichajes: Fichaje[];
  incidencias: Incidencia[];
  anuncios: Anuncio[];
  feedbacks: Feedback[];
  inventario: InventarioItem[];
  horarios: TurnoSemanal[];
  productosCatalogo: Producto[];
  ventasRegistradas: Venta[];
  cuadresCaja: CuadreCaja[];
  alertasPanico: AlertaPanico[];
  clientes?: Cliente[];
  rankingWeights?: RankingWeights;
  onUpdateRankingWeights?: (weights: RankingWeights) => void;
  upsellRules?: UpsellRule[];
  onUpdateUpsellRules?: (rules: UpsellRule[]) => void;
  onAddTarea: (tarea: Omit<Tarea, 'id'>) => void;

  onEditTarea: (tarea: Tarea) => void;
  onDeleteTarea: (id: string) => void;
  onAddProducto: (producto: Omit<ProductoPromocion, 'id'>) => void;
  onAddAnuncio: (anuncio: Omit<Anuncio, 'id'>) => void;
  onResolveIncidencia: (id: string) => void;
  onAddFeedback: (feedback: Omit<Feedback, 'id' | 'fecha'>) => void;
  onCreateUsuario: (usuario: Omit<Usuario, 'id'>) => Promise<boolean> | boolean | void;
  onEditUsuario: (usuario: Usuario) => Promise<boolean> | boolean | void;
  onDeleteUsuario: (id: string) => void;
  onSaveInventarioItem: (item: Omit<InventarioItem, 'id'> & { id?: string }) => void;
  onDeleteInventarioItem: (id: string) => void;
  onSaveTurno: (turno: Omit<TurnoSemanal, 'id'> & { id?: string }) => void;
  onDeleteTurno: (id: string) => void;
  onDeleteFichaje?: (id: string) => void;
  onSaveProductoCatalogo: (producto: Omit<Producto, 'id'> & { id?: string }) => void;
  onDeleteProductoCatalogo: (id: string) => void;
  onDuplicarHorarios: () => void;
  onUpdateVenta?: (venta: Venta) => void;
  onAnularVenta?: (ventaId: string, motivo: string) => void;
  openTabs?: AdminTab[];
  activeTab?: AdminTab;
  setActiveTab?: (tab: AdminTab) => void;
  onCloseTab?: (tab: AdminTab) => void;
}

export default function AdminDashboard({
  openTabs,
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
  onCloseTab,
  usuarios,
  tareas,
  productos,
  fichajes,
  incidencias,
  anuncios,
  feedbacks,
  inventario,
  horarios,
  productosCatalogo,
  ventasRegistradas,
  cuadresCaja,
  alertasPanico,
  clientes = [],
  rankingWeights = DEFAULT_RANKING_WEIGHTS,
  onUpdateRankingWeights,
  upsellRules,
  onUpdateUpsellRules,
  onAddTarea,

  onEditTarea,
  onDeleteTarea,
  onAddProducto,
  onAddAnuncio,
  onResolveIncidencia,
  onAddFeedback,
  onCreateUsuario,
  onEditUsuario,
  onDeleteUsuario,
  onSaveInventarioItem,
  onDeleteInventarioItem,
  onSaveTurno,
  onDeleteTurno,
  onDeleteFichaje,
  onSaveProductoCatalogo,
  onDeleteProductoCatalogo,
  onDuplicarHorarios,
  onUpdateVenta,
  onAnularVenta,
}: AdminDashboardProps) {
  // Tabs internas con fallback por si no se proveen por props
  const [localActiveTab, setLocalActiveTab] = useState<'tareas' | 'productos' | 'calidad' | 'anuncios' | 'empleados' | 'inventario' | 'horarios' | 'ventas'>('tareas');
  const activeTab = propActiveTab || localActiveTab;
  const setActiveTab = propSetActiveTab || setLocalActiveTab;

  const [selectedPreviewPhoto, setSelectedPreviewPhoto] = useState<string | null>(null);

  // --- EXPORTADOR DE REPORTES CONSOLIDADOS (CSV) ---
  const downloadCSV = (filename: string, headers: string[], rows: any[][]) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(val => {
          const str = String(val === undefined || val === null ? '' : val);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportVentas = () => {
    const headers = ['ID Venta', 'Fecha', 'Hora', 'Vendedor', 'Productos Vendidos', 'Cantidad Total', 'Total Transaccion ($)', 'Medio de Pago'];
    const rows = (ventasRegistradas || []).map(v => {
      const prodsStr = v.productos_vendidos.map(p => `${p.nombre} (${p.cantidad})`).join('; ');
      const totalQty = v.productos_vendidos.reduce((sum, p) => sum + p.cantidad, 0);
      return [
        v.id,
        v.fecha,
        v.hora,
        v.vendedor_nombre,
        prodsStr,
        totalQty,
        v.total.toFixed(2),
        v.metodo_pago || 'efectivo'
      ];
    });
    downloadCSV('reporte_ventas_coccole_fit.csv', headers, rows);
  };

  const handleExportInventario = () => {
    const headers = ['ID Insumo', 'Nombre Insumo', 'Categoria', 'Stock Actual', 'Stock Minimo Alerta', 'Estado Stock'];
    const rows = (inventario || []).map(item => {
      const isCritical = item.stock_actual <= item.stock_minimo_alerta;
      const state = item.stock_actual === 0 ? 'AGOTADO' : isCritical ? 'CRITICO' : 'NORMAL';
      return [
        item.id,
        item.nombre,
        item.categoria,
        item.stock_actual,
        item.stock_minimo_alerta,
        state
      ];
    });
    downloadCSV('reporte_inventario_coccole_fit.csv', headers, rows);
  };

  const handleExportRendimiento = () => {
    const headers = ['ID Colaborador', 'Nombre', 'Area Trabajo', 'Tareas Completadas', 'Tareas Asignadas', 'Eficiencia (%)'];
    const rows = usuarios.filter(u => u.rol === 'empleado').map(emp => {
      const empTareas = tareas.filter(t => t.asignado_a === emp.id);
      const compl = empTareas.filter(t => t.estado === 'Completada').length;
      const totalT = empTareas.length;
      const pct = totalT > 0 ? ((compl / totalT) * 100).toFixed(1) : '100.0';
      return [
        emp.id,
        emp.nombre,
        emp.area_preferida || 'Cocina',
        compl,
        totalT,
        pct
      ];
    });
    downloadCSV('reporte_rendimiento_colaboradores.csv', headers, rows);
  };

  // --- ESTADO GLOBAL DE CATEGORÍAS DINÁMICAS ---
  const [categorias, setCategorias] = useState({
    areasTrabajo: ["Atención/Caja", "Cocina/Preparación", "Empaque/Despacho", "Limpieza"],
    inventario: ["Frutas", "Proteínas y Lácteos", "Empaques", "Toppings"],
    productosFit: ["Parfaits", "Fresas con Crema", "Bebidas", "Adiciones"],
    tareas: ["Apertura", "Sanitización", "Cierre", "Venta Activa"]
  });

  // Estados para Modal de Mantenimiento de Categorías
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [activeCategoryType, setActiveCategoryType] = useState<'areasTrabajo' | 'inventario' | 'productosFit' | 'tareas'>('areasTrabajo');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean;
    type: 'areasTrabajo' | 'inventario' | 'productosFit' | 'tareas';
    category: string;
    elementsCount: number;
  } | null>(null);

  // Formulario de Tarea
  const [tareaTitulo, setTareaTitulo] = useState('');
  const [tareaDesc, setTareaDesc] = useState('');
  const [tareaArea, setTareaArea] = useState<AreaType>('Cocina/Preparación');
  const [tareaTipo, setTareaTipo] = useState<string>('Apertura');
  const [tareaAsignado, setTareaAsignado] = useState(usuarios.find(u => u.rol === 'empleado')?.id || '');
  const [tareaTiempo, setTareaTiempo] = useState(30);
  const [tareaRequiereFoto, setTareaRequiereFoto] = useState(false);
  const [editingTareaId, setEditingTareaId] = useState<string | null>(null);

  // Formulario de Producto Promocion
  const [prodNombre, setProdNombre] = useState('');
  const [prodMeta, setProdMeta] = useState(15);
  const [prodPuntos, setProdPuntos] = useState(10);

  // Formulario de Trabajador (Agregar / Editar)
  const [empNombre, setEmpNombre] = useState('');
  const [empArea, setEmpArea] = useState<AreaType>('Cocina/Preparación');
  const [empMeta, setEmpMeta] = useState(6);
  const [empAvatar, setEmpAvatar] = useState('https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120');
  const [empInsignia, setEmpInsignia] = useState('Colaborador Fit 🥗');
  const [empEmail, setEmpEmail] = useState('');
  const [empTelefono, setEmpTelefono] = useState('');
  const [empPin, setEmpPin] = useState('');
  const [empPinError, setEmpPinError] = useState('');
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);

  const handleGenerateRandomPin = () => {
    const activePins = new Set(
      usuarios
        .filter(u => u.rol === 'empleado' && u.id !== editingEmpId)
        .map(u => u.pin)
        .filter(Boolean)
    );

    let attempts = 0;
    let randomPin = '';
    do {
      randomPin = Math.floor(1000 + Math.random() * 9000).toString();
      attempts++;
    } while (activePins.has(randomPin) && attempts < 100);

    setEmpPin(randomPin);
    setEmpPinError('');
  };

  // Formulario de Inventario (Admin)
  const [invNombre, setInvNombre] = useState('');
  const [invCategoria, setInvCategoria] = useState<string>('Frutas');
  const [invStockActual, setInvStockActual] = useState(10);
  const [invStockMinimo, setInvStockMinimo] = useState(5);
  const [invUnidad, setInvUnidad] = useState('Kg');
  const [editingInvId, setEditingInvId] = useState<string | null>(null);

  // Importador de Google Sheets & Carga Masiva
  const [invFormMode, setInvFormMode] = useState<'individual' | 'bulk'>('individual');
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [sheetLink, setSheetLink] = useState('');
  const [importOption, setImportOption] = useState<'append' | 'replace'>('append');
  const [importStatus, setImportStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

  // Formulario de Turnos / Horarios
  const [schUsuarioId, setSchUsuarioId] = useState(usuarios.find(u => u.rol === 'empleado')?.id || '');
  const [schDia, setSchDia] = useState<'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo'>('Lunes');
  const [schHoraEntrada, setSchHoraEntrada] = useState('08:00');
  const [schHoraSalida, setSchHoraSalida] = useState('16:00');
  const [schNota, setSchNota] = useState('');
  const [editingSchId, setEditingSchId] = useState<string | null>(null);

  // Formulario de Feedback / Conversaciones
  const [fbEmpleadoId, setFbEmpleadoId] = useState('');
  const [fbTitulo, setFbTitulo] = useState('');
  const [fbComentario, setFbComentario] = useState('');
  const [fbEsLlamado, setFbEsLlamado] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Formulario de Anuncio
  const [anuncioTitulo, setAnuncioTitulo] = useState('');
  const [anuncioContenido, setAnuncioContenido] = useState('');

  // --- NUEVOS ESTADOS PARA GESTIÓN DE PRODUCTOS Y REPORTE DE VENTAS ---
  const [catProdCodigo, setCatProdCodigo] = useState('');
  const [catProdNombre, setCatProdNombre] = useState('');
  const [catProdPrecio, setCatProdPrecio] = useState('');
  const [catProdCategoria, setCatProdCategoria] = useState('Parfaits');
  const [editingCatProdId, setEditingCatProdId] = useState<string | null>(null);

  const [salesStartDate, setSalesStartDate] = useState('2026-08-01');
  const [salesEndDate, setSalesEndDate] = useState('2026-08-21');
  const [salesSeller, setSalesSeller] = useState('');
  const [salesSearch, setSalesSearch] = useState('');
  const [salesPaymentMethod, setSalesPaymentMethod] = useState("");
  const [chartView, setChartView] = useState<'7days' | '15days' | 'monthly'>('7days');

  // --- ESTADOS DE AUDITORÍA PARA EDICIÓN Y ANULACIÓN DE VENTAS ---
  const [editingVentaModal, setEditingVentaModal] = useState<{
    open: boolean;
    venta: Venta | null;
    metodo_pago: string;
    cliente_nombre: string;
    cliente_telefono: string;
    items: Array<{
      producto_id: string;
      nombre: string;
      codigo: string;
      precio: number;
      cantidad: number;
    }>;
    selectedProdIdToAdd: string;
  }>({
    open: false,
    venta: null,
    metodo_pago: 'efectivo',
    cliente_nombre: '',
    cliente_telefono: '',
    items: [],
    selectedProdIdToAdd: ''
  });

  const [annullingVentaModal, setAnnullingVentaModal] = useState<{
    open: boolean;
    venta: Venta | null;
    motivo: string;
  }>({
    open: false,
    venta: null,
    motivo: ''
  });

  // Sub-pestaña de Ventas, Fidelización y Auditoría DB
  const [ventasSubTab, setVentasSubTab] = useState<'reportes' | 'fidelizacion' | 'auditoria_db'>('reportes');
  const [clienteSegmentoFilter, setClienteSegmentoFilter] = useState<'todos' | 'frecuentes' | 'inactivos' | 'nuevos'>('todos');
  const [clienteSearch, setClienteSearch] = useState('');

  // Estados para Auditoría y Diagnóstico de Tablas Supabase
  const [dbAuditReport, setDbAuditReport] = useState<DatabaseAuditSummary | null>(null);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [copiedSqlAdmin, setCopiedSqlAdmin] = useState(false);

  const handleRunDatabaseHealthCheck = async () => {
    setIsRunningAudit(true);
    try {
      const summary = await auditSupabaseDatabase();
      setDbAuditReport(summary);
    } catch (err) {
      console.error('Error durante la auditoría de BD:', err);
    } finally {
      setIsRunningAudit(false);
    }
  };

  useEffect(() => {
    if (ventasSubTab === 'auditoria_db' && !dbAuditReport) {
      handleRunDatabaseHealthCheck();
    }
  }, [ventasSubTab]);

  // --- NUEVOS ESTADOS PARA RENDIMIENTO DEL TRABAJADOR CON GEMINI ---
  const [selectedPerformanceWorker, setSelectedPerformanceWorker] = useState<Usuario | null>(null);
  const [performanceData, setPerformanceData] = useState<any | null>(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [performanceError, setPerformanceError] = useState<string | null>(null);

  // Simulador local seguro de Supabase que retorna vacio para probar el fallback
  const supabase: any = {
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: async (field: string, value: any) => {
          return { data: [], error: null };
        }
      })
    })
  };

  const obtenerDatosLocalesDeRespaldo = (trabajador: Usuario) => {
    const cumplimiento = trabajador.tareasCumplidasPct || '88%';
    const tardias = trabajador.llegadasTardesCount !== undefined ? trabajador.llegadasTardesCount : 2;
    const puntualidad = tardias === 0 ? '100%' : tardias === 1 ? '96%' : '92%';
    const ventas = trabajador.ventasTotales || '145';
    const pico = trabajador.picoHorarioVentas || 'Viernes y Sábados de 12:00 PM a 2:00 PM';
    const altaRotacion = trabajador.productosTop && trabajador.productosTop.length > 0 ? trabajador.productosTop : ['Parfait Proteico', 'Fresas Grandes con Crema'];
    const bajaRotacion = trabajador.productosBajos && trabajador.productosBajos.length > 0 ? trabajador.productosBajos : ['Bebida Hidratante', 'Topping de Chía'];

    return {
      eficienciaPuntualidad: {
        cumplimientoPct: cumplimiento,
        puntualidadPct: puntualidad,
        llegadasTardias: tardias,
        comentario: `${cumplimiento} de cumplimiento de tareas asignadas. Tasa de puntualidad del ${puntualidad}. Registro de ${tardias} llegadas tardías en el último mes.`
      },
      patronesVenta: {
        volumenTotal: ventas,
        picoHorario: pico,
        comentario: `${ventas} vendidas este mes. Días y horarios de mayor efectividad comercial: ${pico}.`
      },
      rendimientoProductos: {
        productosAltaRotacion: altaRotacion,
        productosBajaRotacion: bajaRotacion,
        comentario: ''
      },
      desgloseRanking: {
        puntosTotales: 329,
        posicionRanking: 1,
        areasGanancia: '+120 pts por velocidad en preparación y +150 pts por venta cruzada de proteína',
        areasPerdida: '-30 pts por 2 marcas de entrada fuera de horario',
        accionRecuperacion: 'Completar la racha de 5 días seguidos con fichaje puntual para recuperar el bono de +50 pts'
      },
      historialFeedback: {
        felicitaciones: [
          'Excelente atención en caja y recomendación del parfait (Cliente)',
          'Gran apoyo en la sanitización rápida (Compañero)'
        ],
        feedbackRegistrado: 'Reforzar la oferta activa de bebidas antes de cerrar la cuenta.'
      },
      diagnosticoPlanAccion: {
        resumenEjecutivo: 'Enfocar al trabajador en mantener la estrategia de venta cruzada de proteína durante los picos de atención de su turno rotativo y aprovechar las tareas de inicio de jornada para recuperar la bonificación de puntualidad.',
        recomendaciones: [
          'Mantener la estrategia de venta cruzada de proteína durante los picos de atención del turno rotativo.',
          'Aprovechar las tareas de inicio de jornada para recuperar la bonificación de puntualidad.',
          'Ofrecer de forma proactiva toppings de alto valor para elevar el ticket promedio.'
        ]
      }
    };
  };

  const handleAddCategory = (type: 'areasTrabajo' | 'inventario' | 'productosFit' | 'tareas', name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (categorias[type].includes(trimmed)) return;

    setCategorias(prev => ({
      ...prev,
      [type]: [...prev[type], trimmed]
    }));
    setNewCategoryName('');
  };

  const handleDeleteCategory = (type: 'areasTrabajo' | 'inventario' | 'productosFit' | 'tareas', category: string) => {
    let count = 0;
    if (type === 'areasTrabajo') {
      count = tareas.filter(t => t.area === category).length + usuarios.filter(u => u.area_preferida === category).length;
    } else if (type === 'inventario') {
      count = inventario.filter(item => item.categoria === category).length;
    } else if (type === 'productosFit') {
      count = productosCatalogo.filter(p => p.categoria === category).length;
    } else if (type === 'tareas') {
      count = tareas.filter(t => t.tipo_tarea === category).length;
    }

    if (count > 0) {
      setDeleteConfirmation({
        show: true,
        type,
        category,
        elementsCount: count
      });
    } else {
      setCategorias(prev => ({
        ...prev,
        [type]: prev[type].filter(cat => cat !== category)
      }));
    }
  };

  const confirmDeleteCategoryAndReassign = () => {
    if (!deleteConfirmation) return;
    const { type, category } = deleteConfirmation;

    setCategorias(prev => {
      const list = prev[type];
      const hasGeneral = list.includes('General');
      const updatedList = list.filter(cat => cat !== category);
      if (!hasGeneral) {
        updatedList.push('General');
      }
      return {
        ...prev,
        [type]: updatedList
      };
    });

    if (type === 'areasTrabajo') {
      tareas.forEach(t => {
        if (t.area === category) {
          onEditTarea({ ...t, area: 'General' });
        }
      });
      usuarios.forEach(u => {
        if (u.area_preferida === category) {
          onEditUsuario({ ...u, area_preferida: 'General' });
        }
      });
    } else if (type === 'inventario') {
      inventario.forEach(item => {
        if (item.categoria === category) {
          onSaveInventarioItem({ ...item, categoria: 'General' });
        }
      });
    } else if (type === 'productosFit') {
      productosCatalogo.forEach(p => {
        if (p.categoria === category) {
          onSaveProductoCatalogo({ ...p, categoria: 'General' });
        }
      });
    } else if (type === 'tareas') {
      tareas.forEach(t => {
        if (t.tipo_tarea === category) {
          onEditTarea({ ...t, tipo_tarea: 'General' });
        }
      });
    }

    setDeleteConfirmation(null);
  };

  const handleObtenerRendimiento = async (trabajador: Usuario) => {
    setSelectedPerformanceWorker(trabajador);
    setPerformanceData(null);
    setPerformanceError(null);
    setLoadingPerformance(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      let { data, error } = await supabase
        .from('rendimiento_trabajadores')
        .select('*')
        .eq('usuario_id', trabajador.id);

      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        data = obtenerDatosLocalesDeRespaldo(trabajador);
      }

      setPerformanceData(data);
    } catch (err: any) {
      setPerformanceData(obtenerDatosLocalesDeRespaldo(trabajador));
    } finally {
      setLoadingPerformance(false);
    }
  };

  // Empleados únicamente
  const empleados = usuarios.filter(u => u.rol === 'empleado');

  const handleTareaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tareaTitulo.trim()) return;

    if (editingTareaId) {
      const existing = tareas.find(t => t.id === editingTareaId);
      if (existing) {
        onEditTarea({
          ...existing,
          titulo: tareaTitulo,
          descripcion: tareaDesc,
          area: tareaArea,
          asignado_a: tareaAsignado,
          tiempo_estimado_min: Number(tareaTiempo),
          requiere_foto: tareaRequiereFoto,
          tipo_tarea: tareaTipo,
        });
      }
      setEditingTareaId(null);
    } else {
      onAddTarea({
        titulo: tareaTitulo,
        descripcion: tareaDesc,
        area: tareaArea,
        fecha: '2026-08-20',
        estado: 'Pendiente',
        asignado_a: tareaAsignado,
        tiempo_estimado_min: Number(tareaTiempo),
        requiere_foto: tareaRequiereFoto,
        tipo_tarea: tareaTipo,
      });
    }

    // Reset
    setTareaTitulo('');
    setTareaDesc('');
    setTareaArea(categorias.areasTrabajo[0] || 'Cocina/Preparación');
    setTareaTipo(categorias.tareas[0] || 'Apertura');
    setTareaTiempo(30);
    setTareaRequiereFoto(false);
  };

  const handleEditClick = (t: Tarea) => {
    setEditingTareaId(t.id);
    setTareaTitulo(t.titulo);
    setTareaDesc(t.descripcion);
    setTareaArea(t.area);
    setTareaTipo(t.tipo_tarea || (categorias.tareas[0] || 'Apertura'));
    setTareaAsignado(t.asignado_a);
    setTareaTiempo(t.tiempo_estimado_min);
    setTareaRequiereFoto(t.requiere_foto);
    setActiveTab('tareas');
  };

  const handleCancelEdit = () => {
    setEditingTareaId(null);
    setTareaTitulo('');
    setTareaDesc('');
    setTareaArea(categorias.areasTrabajo[0] || 'Cocina/Preparación');
    setTareaTipo(categorias.tareas[0] || 'Apertura');
    setTareaTiempo(30);
    setTareaRequiereFoto(false);
  };

  const handleProdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodNombre.trim()) return;

    onAddProducto({
      nombre_producto: prodNombre,
      fecha: '2026-08-20',
      meta_diaria_unidades: Number(prodMeta),
      puntos_por_unidad: Number(prodPuntos),
    });

    setProdNombre('');
    setProdMeta(15);
    setProdPuntos(10);
  };

  const handleAnuncioSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!anuncioTitulo.trim() || !anuncioContenido.trim()) return;

    onAddAnuncio({
      titulo: anuncioTitulo,
      contenido: anuncioContenido,
      fecha: '2026-08-20',
      creador_nombre: 'Mariana Silva (Admin)',
    });

    setAnuncioTitulo('');
    setAnuncioContenido('');
  };

  const handleEmpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empNombre.trim()) return;

    // Validar PIN de 4 dígitos exactos y unicidad
    const cleanPin = empPin.trim();
    if (!cleanPin) {
      setEmpPinError('El PIN de acceso es obligatorio (4 dígitos).');
      return;
    }
    if (!/^\d{4}$/.test(cleanPin)) {
      setEmpPinError('El PIN debe tener exactamente 4 dígitos numéricos.');
      return;
    }
    const pinInUse = usuarios.some(u => u.id !== editingEmpId && u.pin === cleanPin);
    if (pinInUse) {
      setEmpPinError('Este PIN ya está asignado a otro colaborador activo.');
      return;
    }

    const resetForm = () => {
      setEmpNombre('');
      setEmpArea(categorias.areasTrabajo[0] || 'Cocina/Preparación');
      setEmpMeta(6);
      setEmpInsignia('Colaborador Fit 🥗');
      setEmpEmail('');
      setEmpTelefono('');
      setEmpPin('');
      setEmpPinError('');
    };

    try {
      if (editingEmpId) {
        const existing = usuarios.find(u => u.id === editingEmpId);
        if (existing) {
          const result = await onEditUsuario({
            ...existing,
            nombre: empNombre,
            area_preferida: empArea,
            meta_tareas_diarias: Number(empMeta),
            foto_avatar: empAvatar,
            insignia_actual: empInsignia,
            email: empEmail,
            telefono: empTelefono,
            pin: cleanPin
          });
          if (result !== false) {
            setEditingEmpId(null);
            resetForm();
          }
        }
      } else {
        const result = await onCreateUsuario({
          nombre: empNombre,
          rol: 'empleado',
          area_preferida: empArea,
          meta_tareas_diarias: Number(empMeta),
          foto_avatar: empAvatar,
          insignia_actual: empInsignia,
          email: empEmail,
          telefono: empTelefono,
          pin: cleanPin
        });
        if (result !== false) {
          resetForm();
        }
      }
    } catch (err) {
      console.error('Error al guardar perfil:', err);
    }
  };

  const handleEditEmpClick = (u: Usuario) => {
    setEditingEmpId(u.id);
    setEmpNombre(u.nombre);
    setEmpArea(u.area_preferida || (categorias.areasTrabajo[0] || 'Cocina/Preparación'));
    setEmpMeta(u.meta_tareas_diarias || 6);
    setEmpAvatar(u.foto_avatar);
    setEmpInsignia(u.insignia_actual || 'Colaborador Fit 🥗');
    setEmpEmail(u.email || '');
    setEmpTelefono(u.telefono || '');
    setEmpPin(u.pin || '');
    setEmpPinError('');
  };

  const handleInvSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invNombre.trim()) return;

    onSaveInventarioItem({
      id: editingInvId || undefined,
      nombre: invNombre,
      categoria: invCategoria,
      stock_actual: Number(invStockActual),
      stock_minimo_alerta: Number(invStockMinimo),
      unidad: invUnidad,
    });

    setInvNombre('');
    setInvCategoria('insumos');
    setInvStockActual(10);
    setInvStockMinimo(5);
    setInvUnidad('Kg');
    setEditingInvId(null);
  };

  const handleEditInvClick = (item: InventarioItem) => {
    setEditingInvId(item.id);
    setInvNombre(item.nombre);
    setInvCategoria(item.categoria);
    setInvStockActual(item.stock_actual);
    setInvStockMinimo(item.stock_minimo_alerta);
    setInvUnidad(item.unidad);
  };

  const parseAndImportRows = (text: string) => {
    if (!text || !text.trim()) {
      setImportStatus({ type: 'error', message: 'Por favor pegue filas de Google Sheets o texto en el campo.' });
      return;
    }

    try {
      const lines = text.split(/\r?\n/);
      let count = 0;
      let ignored = 0;

      if (importOption === 'replace') {
        inventario.forEach(item => {
          onDeleteInventarioItem(item.id);
        });
      }

      lines.forEach((line) => {
        if (!line || !line.trim()) return;

        let parts: string[] = [];
        if (line.includes('\t')) {
          parts = line.split('\t');
        } else if (line.includes(';')) {
          parts = line.split(';');
        } else if (line.includes(',')) {
          parts = line.split(',');
        } else {
          parts = [line];
        }

        const rawNombre = parts[0]?.trim();
        if (!rawNombre || rawNombre.toLowerCase() === 'nombre' || rawNombre.toLowerCase() === 'producto' || rawNombre.toLowerCase() === 'insumo' || rawNombre.toLowerCase() === 'recurso') {
          ignored++;
          return;
        }

        const nombre = rawNombre;
        
        let categoria: 'insumos' | 'empaques' | 'preparados' = 'insumos';
        const rawCat = parts[1]?.trim().toLowerCase() || '';
        if (rawCat.includes('empaque') || rawCat.includes('vaso') || rawCat.includes('bolsa') || rawCat === 'empaques') {
          categoria = 'empaques';
        } else if (rawCat.includes('prepara') || rawCat.includes('base') || rawCat.includes('barra') || rawCat === 'preparados') {
          categoria = 'preparados';
        }

        let stock_actual = 10;
        const rawStock = parts[2]?.trim();
        if (rawStock && !isNaN(Number(rawStock))) {
          stock_actual = Number(rawStock);
        }

        let stock_minimo_alerta = 5;
        const rawMin = parts[3]?.trim();
        if (rawMin && !isNaN(Number(rawMin))) {
          stock_minimo_alerta = Number(rawMin);
        }

        const unidad = parts[4]?.trim() || 'Kg';

        onSaveInventarioItem({
          nombre,
          categoria,
          stock_actual,
          stock_minimo_alerta,
          unidad
        });
        count++;
      });

      setImportStatus({ 
        type: 'success', 
        message: `¡Importación exitosa! Se han agregado ${count} productos al inventario. (Filas de encabezado omitidas: ${ignored})` 
      });
      setBulkPasteText('');
    } catch (err: any) {
      setImportStatus({ type: 'error', message: `Error de importación: ${err.message || err}` });
    }
  };

  const handleFetchSheetLink = async () => {
    if (!sheetLink || !sheetLink.trim()) {
      setImportStatus({ type: 'error', message: 'Por favor ingrese un enlace de Google Sheets válido.' });
      return;
    }

    setImportStatus({ type: 'idle', message: 'Conectando con Google Sheets...' });

    try {
      let url = sheetLink.trim();
      const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        const docId = match[1];
        url = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv`;
      } else {
        setImportStatus({ type: 'error', message: 'El enlace de Google Sheets ingresado no tiene un ID de documento válido.' });
        return;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('No se pudo descargar la hoja. Asegúrese de que la hoja de Google Sheets está compartida como "Pública" (Cualquier persona con el enlace puede leer).');
      }

      const csvText = await response.text();
      parseAndImportRows(csvText);
    } catch (err: any) {
      setImportStatus({ 
        type: 'error', 
        message: `Error al conectar con Google Sheets: ${err.message || 'Verifique que la hoja sea pública para lectura y tenga el enlace correcto.'}` 
      });
    }
  };

  const handleSchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schUsuarioId) return;

    onSaveTurno({
      id: editingSchId || undefined,
      usuario_id: schUsuarioId,
      dia_semana: schDia,
      hora_entrada: schHoraEntrada,
      hora_salida: schHoraSalida,
      nota: schNota || undefined
    });

    setSchNota('');
    setEditingSchId(null);
  };

  const handleEditSchClick = (t: TurnoSemanal) => {
    setEditingSchId(t.id);
    setSchUsuarioId(t.usuario_id);
    setSchDia(t.dia_semana);
    setSchHoraEntrada(t.hora_entrada);
    setSchHoraSalida(t.hora_salida);
    setSchNota(t.nota || '');
  };

  // --- HANDLER PARA EL CATÁLOGO DE PRODUCTOS (ADMINISTRADOR) ---
  const handleCatProdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catProdCodigo.trim() || !catProdNombre.trim() || !catProdPrecio) return;

    onSaveProductoCatalogo({
      id: editingCatProdId || undefined,
      codigo: catProdCodigo.toUpperCase().trim(),
      nombre: catProdNombre.trim(),
      precio: parseFloat(catProdPrecio as string),
      categoria: catProdCategoria,
    });

    // Reset Form
    setCatProdCodigo('');
    setCatProdNombre('');
    setCatProdPrecio('');
    setCatProdCategoria('Parfaits');
    setEditingCatProdId(null);
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbEmpleadoId || !fbTitulo.trim() || !fbComentario.trim()) return;

    onAddFeedback({
      usuario_id: fbEmpleadoId,
      titulo: fbTitulo,
      comentario: fbComentario,
      es_llamado_atencion: fbEsLlamado,
      creado_por_nombre: 'Mariana Silva (Admin)'
    });

    setFbTitulo('');
    setFbComentario('');
    setFbEsLlamado(false);
    setShowFeedbackModal(false);
  };

  // Obtener nombre de empleado
  const getEmpleadoNombre = (id: string) => {
    return usuarios.find(u => u.id === id)?.nombre || 'Sin asignar';
  };

  // Obtener badge de área
  const getAreaBadge = (area: AreaType) => {
    const styles: Record<AreaType, string> = {
      'Cocina/Preparación': 'bg-[#EBF5FB] text-[#4B9CD3] border-[#AED6F1]',
      'Empaque/Despacho': 'bg-blue-50 text-blue-800 border-blue-200',
      'Atención/Caja': 'bg-purple-50 text-purple-800 border-purple-200',
      'Limpieza': 'bg-[#FFFDF6] text-slate-800 border-[#E2E8F0]',
    };
    return (
      <span className={`px-2 py-0.5 rounded-sm border text-[10px] font-bold ${styles[area] || styles['Limpieza']}`}>
        {area}
      </span>
    );
  };

  // Obtener badge de estado de tarea
  const getEstadoBadge = (estado: TaskStatus) => {
    const styles: Record<TaskStatus, string> = {
      'Completada': 'bg-[#4B9CD3] text-white',
      'En proceso': 'bg-[#85C1E9] text-white',
      'Pendiente': 'bg-[#E2E8F0] text-slate-800',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${styles[estado]}`}>
        {estado}
      </span>
    );
  };

  const isTabOpen = (t: AdminTab) => openTabs ? openTabs.includes(t) : activeTab === t;

  return (
    <div id="admin-dashboard" className="space-y-6 w-full">

      {/* Banderola Superior de Pestañas Interiores (Multi-Tab Admin) */}
      {openTabs && openTabs.length > 0 && (
        <div className="w-full bg-[#FFFDF6] p-2 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-wrap items-center gap-1.5 mb-2">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-2 border-r border-slate-200 mr-1">
            Pestañas Activas:
          </div>
          {openTabs.map((t) => {
            const isActive = activeTab === t;
            const labelMap: Record<AdminTab, string> = {
              tareas: 'Tareas Diarias',
              productos: 'Ventas Sugeridas',
              inventario: 'Inventario',
              horarios: 'Horarios',
              calidad: 'Fichajes',
              anuncios: 'Comunicados',
              empleados: 'Trabajadores',
              ventas: 'POS y Reportes',
              supabase: 'Auditoría Supabase'
            };
            return (
              <div
                key={t}
                onClick={() => setActiveTab && setActiveTab(t)}
                className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-[#4B9CD3] text-white shadow-xs'
                    : 'bg-white text-[#2C3E50] border border-[#E2E8F0] hover:bg-[#EBF5FB] hover:text-[#4B9CD3]'
                }`}
              >
                <span>{labelMap[t] || t}</span>
                {openTabs.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onCloseTab) onCloseTab(t);
                    }}
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                      isActive
                        ? 'bg-white/20 hover:bg-white/40 text-white'
                        : 'bg-slate-100 hover:bg-red-100 hover:text-red-700 text-slate-500'
                    }`}
                    title="Cerrar pestaña"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CONTENIDO DE TABS */}
      <div className="w-full space-y-6">

      {/* 1. GESTOR DE TAREAS */}
      {isTabOpen('tareas') && (
        <div className={activeTab === 'tareas' ? 'flex flex-col gap-6 w-full' : 'hidden'}>
          {/* Formulario de Tarea */}
          <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#2C3E50] mb-4 flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <Plus className="w-4 h-4 text-[#4B9CD3]" />
              {editingTareaId ? 'Modificar Tarea' : 'Crear Tarea Diaria'}
            </h3>
            
            <form onSubmit={handleTareaSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Título de Tarea</label>
                  <input
                    type="text"
                    placeholder="Ej. Sanitizar extractores de jugos"
                    value={tareaTitulo}
                    onChange={(e) => setTareaTitulo(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Instrucciones / Descripción</label>
                  <input
                    type="text"
                    placeholder="Detalles específicos para asegurar el estándar..."
                    value={tareaDesc}
                    onChange={(e) => setTareaDesc(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Área de Trabajo</label>
                  <select
                    value={tareaArea}
                    onChange={(e) => {
                      if (e.target.value === '___MANAGE___') {
                        setActiveCategoryType('areasTrabajo');
                        setShowCategoryModal(true);
                      } else {
                        setTareaArea(e.target.value);
                      }
                    }}
                    className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-white"
                  >
                    {categorias.areasTrabajo.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="___MANAGE___" className="font-bold text-[#4B9CD3] bg-[#EBF5FB]">+ Gestionar / Agregar Categoría</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tipo / Checklist</label>
                  <select
                    value={tareaTipo}
                    onChange={(e) => {
                      if (e.target.value === '___MANAGE___') {
                        setActiveCategoryType('tareas');
                        setShowCategoryModal(true);
                      } else {
                        setTareaTipo(e.target.value);
                      }
                    }}
                    className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-white"
                  >
                    {categorias.tareas.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="___MANAGE___" className="font-bold text-[#4B9CD3] bg-[#EBF5FB]">+ Gestionar / Agregar Categoría</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Asignado A</label>
                  <select
                    value={tareaAsignado}
                    onChange={(e) => setTareaAsignado(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30"
                  >
                    {empleados.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Duración Estimada (Minutos)</label>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    value={tareaTiempo}
                    onChange={(e) => setTareaTiempo(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30"
                  />
                </div>

                <div className="flex gap-3 items-center">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="checkbox"
                      id="requiere_foto"
                      checked={tareaRequiereFoto}
                      onChange={(e) => setTareaRequiereFoto(e.target.checked)}
                      className="w-4 h-4 rounded-sm border-[#E2E8F0] text-[#4B9CD3] focus:ring-[#4B9CD3]"
                    />
                    <label htmlFor="requiere_foto" className="text-xs font-semibold text-slate-600 select-none cursor-pointer">
                      ¿Evidencia de foto?
                    </label>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      type="submit"
                      className="bg-[#4B9CD3] text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-[#3A82B4] transition-colors shadow-xs h-9 cursor-pointer"
                    >
                      {editingTareaId ? 'Actualizar' : 'Asignar'}
                    </button>
                    {editingTareaId && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold py-2 px-3 rounded-lg transition-colors h-9"
                      >
                        X
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Tabla de tareas del día */}
          <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#2C3E50] mb-4 flex items-center gap-1.5">
              <ClipboardList className="w-4.5 h-4.5 text-[#4B9CD3]" />
              Bitácora de Tareas Diarias
            </h3>

            {tareas.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No hay tareas creadas para el día de hoy. Usa el formulario de la izquierda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                      <th className="py-2 px-3">Tarea</th>
                      <th className="py-2 px-3 text-center">Área</th>
                      <th className="py-2 px-3">Asignado</th>
                      <th className="py-2 px-3 text-center">Tiempo Est.</th>
                      <th className="py-2 px-3 text-center">Foto</th>
                      <th className="py-2 px-3 text-center">Estado</th>
                      <th className="py-2 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAE4] text-xs">
                    {tareas.map(t => (
                      <tr key={t.id} className="hover:bg-[#FFFDF6]/50">
                        <td className="py-3 px-3 max-w-[180px]">
                          <p className="font-bold text-[#2C3E50] truncate" title={t.titulo}>
                            {t.titulo}
                          </p>
                          <p className="text-[10px] text-slate-400 line-clamp-1" title={t.descripcion}>
                            {t.descripcion || 'Sin instrucciones adicionales'}
                          </p>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {getAreaBadge(t.area)}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-600">
                          {getEmpleadoNombre(t.asignado_a)}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">
                          {t.tiempo_estimado_min} min
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className={t.requiere_foto ? 'text-[#4B9CD3] font-bold text-[10px]' : 'text-slate-400 text-[10px]'}>
                              {t.requiere_foto ? 'Requerida' : 'Opcional'}
                            </span>
                            {t.foto_url ? (
                              <button
                                type="button"
                                onClick={() => setSelectedPreviewPhoto(t.foto_url || null)}
                                className="mt-1 group relative focus:outline-hidden transition-transform hover:scale-105"
                              >
                                <img 
                                  src={t.foto_url} 
                                  alt="Evidencia" 
                                  className="w-10 h-10 object-cover rounded-md border border-slate-200 cursor-pointer shadow-2xs" 
                                  title="Click para ampliar foto de evidencia"
                                />
                                {t.nota_evidencia && (
                                  <span className="absolute -bottom-1 -right-1 bg-emerald-500 w-2.5 h-2.5 rounded-full border-2 border-white" title={t.nota_evidencia} />
                                )}
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Sin evidencia</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {getEstadoBadge(t.estado)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleEditClick(t)}
                              className="p-1 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-all"
                              title="Editar tarea"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteTarea(t.id)}
                              className="p-1 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-all"
                              title="Eliminar tarea"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. GESTOR DE PRODUCTOS A PROMOCIONAR */}
      {isTabOpen('productos') && (
        <div className={activeTab === 'productos' ? 'flex flex-col gap-6 w-full' : 'hidden'}>
          {/* Formulario de Producto */}
          <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#2C3E50] mb-4 flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <Sparkles className="w-4 h-4 text-[#4B9CD3]" />
              Impulsar Producto Fit
            </h3>
            
            <form onSubmit={handleProdSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  placeholder="Ej. Parfait Berry Slim"
                  value={prodNombre}
                  onChange={(e) => setProdNombre(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30 h-9"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Meta Diaria (u.)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={prodMeta}
                  onChange={(e) => setProdMeta(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30 h-9"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Puntos / Unidad</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={prodPuntos}
                  onChange={(e) => setProdPuntos(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30 h-9"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#4B9CD3] text-white text-xs font-bold py-2.5 px-4 rounded-lg hover:bg-[#3A82B4] transition-colors shadow-xs h-9 cursor-pointer"
              >
                Configurar Impulso
              </button>
            </form>
          </div>

          {/* Listado de Productos en Campaña */}
          <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#2C3E50] mb-4 flex items-center gap-1.5">
              <CheckSquare className="w-4.5 h-4.5 text-[#4B9CD3]" />
              Campaña de Ventas Sugeridas del Turno
            </h3>

            {productos.length === 0 ? (
              <p className="text-center py-12 text-slate-400 text-xs">No hay productos promocionales configurados.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {productos.map(p => (
                  <div key={p.id} className="border border-[#AED6F1] bg-[#EBF5FB]/25 p-4 rounded-xl flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-extrabold text-[#4B9CD3] bg-[#EBF5FB] px-2 py-0.5 rounded-md">
                          +{p.puntos_por_unidad} PTS / VENTA
                        </span>
                        <span className="text-[10px] text-slate-400">Hoy</span>
                      </div>
                      <h4 className="font-extrabold text-[#2C3E50] text-sm mt-2.5">{p.nombre_producto}</h4>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#AED6F1]/50 flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Meta por Turno:</span>
                      <span className="font-extrabold text-slate-800">{p.meta_diaria_unidades}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. CONTROL DE CALIDAD Y INGRESO / ASISTENCIA */}
      {isTabOpen('calidad') && (
        <div className={activeTab === 'calidad' ? 'space-y-6 w-full' : 'hidden'}>
          {/* Fichajes de hoy */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#2C3E50] mb-4 flex items-center gap-1.5">
              <UserCheck className="w-4.5 h-4.5 text-[#4B9CD3]" />
              Asistencia y Fichaje del Turno (Hoy)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {empleados.map(emp => {
                const fichaje = fichajes.find(f => f.usuario_id === emp.id && f.fecha === '2026-08-20');
                return (
                  <div key={emp.id} className="border border-[#E2E8F0] p-3.5 rounded-xl flex items-center gap-3 bg-[#FFFDF6]/40">
                    <img
                      src={emp.foto_avatar}
                      alt={emp.nombre}
                      className="w-10 h-10 rounded-full object-cover border border-[#E2E8F0]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#2C3E50] text-xs truncate">{emp.nombre}</p>
                      {fichaje ? (
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            fichaje.puntual ? 'bg-[#EBF5FB] text-[#4B9CD3]' : 'bg-red-100 text-red-800'
                          }`}>
                            {fichaje.puntual ? 'Puntual' : 'Retraso'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            In: {fichaje.hora_entrada || '--:--'} {fichaje.hora_salida ? `| Out: ${fichaje.hora_salida}` : ''}
                          </span>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-1">Sin registrar ingreso hoy</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Registro Completo de Ingresos y Salidas al Administrador */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#2C3E50] flex items-center gap-1.5">
                  <UserCheck className="w-4.5 h-4.5 text-[#4B9CD3]" />
                  Registro de Ingresos y Salidas al Administrador
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Lista histórica y en tiempo real de todas las asistencias, horas de entrada y de salida reportadas por el personal de barra.
                </p>
              </div>
              <span className="text-xs bg-[#EBF5FB] text-[#4B9CD3] px-2.5 py-1 rounded-md font-bold self-start sm:self-auto">
                Total Registros: {fichajes.length}
              </span>
            </div>

            <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FFFDF6] border-b border-[#E2E8F0] text-slate-600 font-bold">
                    <th className="p-3">Empleado</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Hora de Ingreso</th>
                    <th className="p-3">Hora de Salida</th>
                    <th className="p-3">Puntualidad</th>
                    <th className="p-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]/40">
                  {fichajes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                        No hay registros de asistencia en este momento. Los ingresos registrados se mostrarán aquí inmediatamente.
                      </td>
                    </tr>
                  ) : (
                    [...fichajes]
                      .sort((a, b) => {
                        const dDiff = b.fecha.localeCompare(a.fecha);
                        if (dDiff !== 0) return dDiff;
                        return (b.hora_entrada || '').localeCompare(a.hora_entrada || '');
                      })
                      .map(f => {
                        const emp = usuarios.find(u => u.id === f.usuario_id);
                        return (
                          <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 flex items-center gap-2.5">
                              <img
                                src={emp?.foto_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'}
                                alt={emp?.nombre}
                                className="w-7 h-7 rounded-full object-cover border border-[#E2E8F0]"
                                referrerPolicy="no-referrer"
                              />
                              <span className="font-extrabold text-[#2C3E50]">{emp?.nombre || 'Empleado'}</span>
                            </td>
                            <td className="p-3 text-slate-600 font-bold">{f.fecha}</td>
                            <td className="p-3">
                              <span className="font-black text-slate-800 bg-sky-50 text-sky-800 px-2.5 py-1 rounded-md border border-sky-200/50">
                                {f.hora_entrada || 'Sin registrar'}
                              </span>
                            </td>
                            <td className="p-3">
                              {f.hora_salida ? (
                                <span className="font-black text-slate-800 bg-red-50 text-red-800 px-2.5 py-1 rounded-md border border-red-200/50">
                                  {f.hora_salida}
                                </span>
                              ) : (
                                <span className="text-[10px] text-orange-600 font-extrabold bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/50 animate-pulse">
                                  En servicio...
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                f.puntual ? 'bg-[#EBF5FB] text-[#4B9CD3] border border-[#AED6F1]/50' : 'bg-red-50 text-red-600 border border-red-200/50'
                              }`}>
                                {f.puntual ? 'Puntual' : 'Retraso'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('¿Desea eliminar este registro de asistencia?')) {
                                    onDeleteFichaje?.(f.id);
                                  }
                                }}
                                className="text-red-500 hover:text-red-700 text-[10px] font-bold underline cursor-pointer font-black"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calidad de Evidencias */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#2C3E50] mb-4 flex items-center gap-1.5">
              <CheckCircle className="w-4.5 h-4.5 text-[#4B9CD3]" />
              Mesa de Control y Calidad (Fotos de Evidencia)
            </h3>

            {tareas.filter(t => t.requiere_foto && t.estado === 'Completada').length === 0 ? (
              <p className="text-center py-10 text-slate-400 text-xs">
                No se han registrado evidencias fotográficas completadas hoy.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {tareas.filter(t => t.requiere_foto && t.estado === 'Completada').map(t => (
                  <div key={t.id} className="border border-[#E2E8F0] rounded-xl overflow-hidden flex flex-col justify-between bg-white">
                    <div className="relative h-40 bg-[#FFFDF6] flex items-center justify-center overflow-hidden">
                      {t.foto_url ? (
                        <button
                          type="button"
                          onClick={() => setSelectedPreviewPhoto(t.foto_url || null)}
                          className="w-full h-full cursor-pointer hover:opacity-90 transition-opacity focus:outline-hidden"
                          title="Click para ver en tamaño completo"
                        >
                          <img
                            src={t.foto_url}
                            alt={t.titulo}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </button>
                      ) : (
                        <div className="p-4 text-center text-slate-400 text-xs flex flex-col items-center">
                          <FileText className="w-8 h-8 text-slate-300 mb-1" />
                          <span>Sin foto cargada (Solo notas registradas)</span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-[#2C3E50]/80 backdrop-blur-xs text-white px-2.5 py-1 text-[9px] font-bold rounded-md">
                        {t.area}
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] text-slate-400">Evidencia de {getEmpleadoNombre(t.asignado_a)}</p>
                        <h4 className="font-extrabold text-[#2C3E50] text-xs mt-1">{t.titulo}</h4>
                        <p className="text-[10px] text-slate-600 italic mt-2 border-l-2 border-[#4B9CD3] pl-2 bg-[#EBF5FB]/30 py-1">
                          "{t.nota_evidencia || 'Sin comentarios adicionales'}"
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-semibold">Completada a las {t.hora_fin || '--:--'}</span>
                        <span className="text-[10px] bg-[#EBF5FB] text-[#4B9CD3] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                          ✓ Aprobado
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. ANUNCIOS DEL TABLERO */}
      {isTabOpen('anuncios') && (
        <div className={activeTab === 'anuncios' ? 'flex flex-col gap-6 w-full' : 'hidden'}>
          {/* Formulario de Anuncio */}
          <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#2C3E50] mb-4 flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <Megaphone className="w-4 h-4 text-[#4B9CD3]" />
              Publicar Anuncio del Día
            </h3>
            
            <form onSubmit={handleAnuncioSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4">
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Título del Comunicado</label>
                <input
                  type="text"
                  placeholder="Ej. ¡Hoy priorizamos parfaits!"
                  value={anuncioTitulo}
                  onChange={(e) => setAnuncioTitulo(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30 h-9"
                  required
                />
              </div>

              <div className="md:col-span-6">
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mensaje Directo</label>
                <input
                  type="text"
                  placeholder="Escribe la directriz o motivación para el equipo..."
                  value={anuncioContenido}
                  onChange={(e) => setAnuncioContenido(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30 h-9"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full bg-[#4B9CD3] text-white text-xs font-bold py-2.5 px-4 rounded-lg hover:bg-[#3A82B4] transition-colors shadow-xs h-9 cursor-pointer"
                >
                  Publicar Anuncio
                </button>
              </div>
            </form>
          </div>

          {/* Listado de Anuncios Publicados */}
          <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#2C3E50] mb-4 flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <Megaphone className="w-4.5 h-4.5 text-[#4B9CD3]" />
              Tablero de Anuncios
            </h3>

            {anuncios.length === 0 ? (
              <p className="text-center py-12 text-slate-400 text-xs">No hay anuncios publicados.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {anuncios.map(an => (
                  <div key={an.id} className="border border-[#E2E8F0] hover:border-[#4B9CD3] p-4 rounded-xl bg-[#FFFDF6]/30 relative flex flex-col justify-between">
                    <div>
                      <h4 className="font-extrabold text-[#2C3E50] text-xs pr-14">{an.titulo}</h4>
                      <p className="text-[11px] text-slate-600 mt-2 whitespace-pre-line">{an.contenido}</p>
                    </div>
                    
                    <div className="mt-3.5 pt-2 border-t border-[#E2E8F0]/50 flex justify-between text-[10px] text-slate-400">
                      <span>Por {an.creador_nombre}</span>
                      <span>{an.fecha}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. SECCIÓN DE PERSONAL Y CONFIGURACIÓN DE PONDERACIÓN DEL RANKING */}
      {isTabOpen('empleados') && (
        <div className={activeTab === 'empleados' ? 'flex flex-col gap-6 w-full animate-in fade-in duration-200' : 'hidden'}>
          {/* Configuración de Ponderación del Ranking de Colaboradores & Ventas Sugeridas */}
          <RankingWeightsConfig
            currentWeights={rankingWeights}
            onUpdateWeights={(newWeights) => {
              if (onUpdateRankingWeights) {
                onUpdateRankingWeights(newWeights);
              }
            }}
            upsellRules={upsellRules}
            onUpdateUpsellRules={onUpdateUpsellRules}
          />

          {/* Fila A (Formulario - Registrar Nuevo Colaborador) */}

          <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#2C3E50] mb-4 flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <User className="w-4 h-4 text-[#4B9CD3]" />
              {editingEmpId ? 'Editar Colaborador' : 'Registrar Nuevo Colaborador'}
            </h3>

            <form onSubmit={handleEmpSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Nombre Completo */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    placeholder="Ej. Carlos Mendoza"
                    value={empNombre}
                    onChange={(e) => setEmpNombre(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30 h-9"
                    required
                  />
                </div>

                {/* Correo Electrónico */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="carlos@coccolefit.com"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30 h-9"
                    required
                  />
                </div>

                {/* Teléfono Móvil */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Teléfono Móvil</label>
                  <input
                    type="text"
                    placeholder="+54 9 11 1234-5678"
                    value={empTelefono}
                    onChange={(e) => setEmpTelefono(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30 h-9"
                    required
                  />
                </div>

                {/* Área de Trabajo Preferida */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Área de Trabajo</label>
                  <select
                    value={empArea}
                    onChange={(e) => {
                      if (e.target.value === '___MANAGE___') {
                        setActiveCategoryType('areasTrabajo');
                        setShowCategoryModal(true);
                      } else {
                        setEmpArea(e.target.value);
                      }
                    }}
                    className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-white h-9"
                  >
                    {categorias.areasTrabajo.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="___MANAGE___" className="font-bold text-[#4B9CD3] bg-[#EBF5FB]">+ Gestionar / Agregar Categoría</option>
                  </select>
                </div>

                {/* PIN de Acceso (4 dígitos) + Generar PIN Aleatorio */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    PIN de Acceso (4 dígitos)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="1234"
                      value={empPin}
                      onChange={(e) => {
                        setEmpPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                        setEmpPinError('');
                      }}
                      className="w-20 text-center font-mono font-bold text-xs px-2.5 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-white h-9"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleGenerateRandomPin}
                      className="flex-1 bg-[#EBF5FB] text-[#4B9CD3] hover:bg-[#D6EAF8] border border-[#AED6F1] font-bold text-[11px] px-2.5 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap h-9 text-center"
                    >
                      Generar PIN Aleatorio
                    </button>
                  </div>
                  {empPinError && (
                    <p className="text-[10px] font-bold text-red-500 mt-1">{empPinError}</p>
                  )}
                </div>

                {/* Meta de Tareas Diarias + Botón */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Meta Diaria</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={empMeta}
                      onChange={(e) => setEmpMeta(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30 h-9"
                      required
                    />
                  </div>

                  <div className="flex gap-1">
                    <button
                      type="submit"
                      className="bg-[#4B9CD3] text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-[#3A82B4] transition-colors shadow-xs h-9 cursor-pointer whitespace-nowrap"
                    >
                      {editingEmpId ? 'Guardar' : 'Registrar'}
                    </button>
                    {editingEmpId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEmpId(null);
                          setEmpNombre('');
                          setEmpArea(categorias.areasTrabajo[0] || 'Cocina/Preparación');
                          setEmpMeta(6);
                          setEmpInsignia('Colaborador Fit 🥗');
                          setEmpEmail('');
                          setEmpTelefono('');
                          setEmpPin('');
                          setEmpPinError('');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-2.5 rounded-lg transition-colors h-9"
                      >
                        X
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Fila B (Nómina de Trabajadores Activos) */}
          <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-2">
              <h3 className="text-base font-bold text-[#2C3E50] flex items-center gap-1.5">
                <UserCheck className="w-4.5 h-4.5 text-[#4B9CD3]" />
                Nómina de Trabajadores Activos
              </h3>
              <span className="text-xs bg-[#EBF5FB] text-[#4B9CD3] font-bold px-2 py-0.5 rounded-full">
                {empleados.length} Registrados
              </span>
            </div>

            {empleados.length === 0 ? (
              <p className="text-center py-12 text-slate-400 text-xs">No hay trabajadores registrados en este local.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {empleados.map(emp => (
                  <div key={emp.id} className="border border-[#E2E8F0] rounded-xl p-4 bg-[#FFFDF6]/20 flex flex-col justify-between hover:border-[#4B9CD3] transition-all">
                    <div className="flex items-start gap-3">
                      <img
                        src={emp.foto_avatar}
                        alt={emp.nombre}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-full object-cover border border-[#E2E8F0] shrink-0"
                      />
                      <div className="space-y-1 min-w-0">
                        <h4 className="font-bold text-xs text-[#2C3E50] truncate">{emp.nombre}</h4>
                        <p className="text-[10px] text-[#4B9CD3] font-semibold flex items-center gap-1 truncate">
                          <Award className="w-3 h-3 shrink-0" />
                          {emp.insignia_actual || 'Colaborador Fit 🥗'}
                        </p>
                        <div className="text-[10px] text-slate-500 space-y-0.5 pt-1 min-w-0">
                          {emp.email && (
                            <p className="flex items-center gap-1.5 truncate">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              {emp.email}
                            </p>
                          )}
                          {emp.telefono && (
                            <p className="flex items-center gap-1.5 truncate">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              {emp.telefono}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1.5">
                          {getAreaBadge(emp.area_preferida || 'Limpieza')}
                          <span className="px-1.5 py-0.5 rounded-sm border border-slate-200 bg-white text-[9px] font-semibold text-slate-500">
                            Meta: {emp.meta_tareas_diarias || 6} t/d
                          </span>
                          <span className="px-1.5 py-0.5 rounded-sm border border-[#AED6F1] bg-[#EBF5FB] text-[9px] font-extrabold text-[#2C3E50] font-mono">
                            PIN: {emp.pin || 'Sin PIN'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E2E8F0]/40 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditEmpClick(emp)}
                            className="p-1.5 text-slate-600 hover:text-[#4B9CD3] hover:bg-[#EBF5FB]/50 rounded-lg transition-all cursor-pointer"
                            title="Editar Datos"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteUsuario(emp.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                            title="Eliminar del Sistema"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            setFbEmpleadoId(emp.id);
                            setShowFeedbackModal(true);
                          }}
                          className="text-[10px] font-bold bg-[#4B9CD3] hover:bg-[#3A82B4] text-white px-2.5 py-1.5 rounded-md flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <MessageSquare className="w-3 h-3" />
                          Feedback
                        </button>
                      </div>

                       <button
                        onClick={() => handleObtenerRendimiento(emp)}
                        className="w-full text-[10px] font-bold border border-[#4B9CD3] text-[#4B9CD3] hover:bg-[#4B9CD3] hover:text-white py-1.5 rounded-md transition-all text-center cursor-pointer uppercase tracking-wider"
                      >
                        Rendimiento del Trabajador
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fila C (Bitácora de Conversaciones, Compromisos y Feedback) */}
          <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#2C3E50] mb-4 flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <FileText className="w-4.5 h-4.5 text-[#4B9CD3]" />
              Bitácora de Conversaciones, Compromisos y Feedback
            </h3>

            {feedbacks.length === 0 ? (
              <p className="text-center py-12 text-slate-400 text-xs">No se han registrado conversaciones o feedback aún.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-1">
                {feedbacks.map(fb => {
                  const empObj = usuarios.find(u => u.id === fb.usuario_id);
                  return (
                    <div key={fb.id} className={`p-4 rounded-xl border text-xs leading-relaxed flex flex-col justify-between hover:border-slate-350 transition-all ${
                      fb.es_llamado_atencion ? 'bg-amber-50/70 border-amber-200 text-amber-950' : 'bg-slate-50/70 border-slate-200 text-slate-800'
                    }`}>
                      <div>
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                              fb.es_llamado_atencion ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {fb.es_llamado_atencion ? 'Llamado' : 'Feedback'}
                            </span>
                            <span className="font-bold text-slate-900 truncate max-w-[120px]">
                              Para: {empObj?.nombre || 'Empleado'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold">{fb.fecha}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 mt-2 text-xs">{fb.titulo}</h4>
                        <p className="text-[11px] text-slate-600 mt-1 whitespace-pre-line leading-normal">{fb.comentario}</p>
                      </div>
                      <div className="mt-3.5 pt-2 border-t border-slate-100/50 flex justify-between items-center text-[10px] text-slate-400">
                        <span>Registrado por: <strong>{fb.creado_por_nombre}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. MÓDULO DE INVENTARIO INTEGRADO (VISTA ADMIN) */}
      {isTabOpen('inventario') && (
        <div className={activeTab === 'inventario' ? 'flex flex-col gap-6 w-full animate-in fade-in duration-200' : 'hidden'}>
          {/* Formulario de Inventario */}
          <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <div className="flex border-b border-[#FFFDF6] pb-3 justify-between items-center flex-wrap gap-2 mb-4">
              <h3 className="text-base font-bold text-[#2C3E50] flex items-center gap-1.5">
                <Boxes className="w-4.5 h-4.5 text-[#4B9CD3]" />
                {editingInvId ? 'Editar Insumo de Bodega' : 'Gestión de Insumos y Bodega'}
              </h3>
              {!editingInvId && (
                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-[9px]">
                  <button
                    type="button"
                    onClick={() => setInvFormMode('individual')}
                    className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      invFormMode === 'individual' ? 'bg-[#4B9CD3] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Carga Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInvFormMode('bulk');
                      setImportStatus({ type: 'idle', message: '' });
                    }}
                    className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-0.5 ${
                      invFormMode === 'bulk' ? 'bg-[#4B9CD3] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Google Sheets / Masivo
                  </button>
                </div>
              )}
            </div>

            {invFormMode === 'individual' || editingInvId ? (
              <form onSubmit={handleInvSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nombre del Recurso / Insumo</label>
                    <input
                      type="text"
                      placeholder="Ej. Fresas Orgánicas..."
                      value={invNombre}
                      onChange={(e) => setInvNombre(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30 h-9"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Categoría de Bodega</label>
                    <select
                      value={invCategoria}
                      onChange={(e) => {
                        if (e.target.value === '___MANAGE___') {
                          setActiveCategoryType('inventario');
                          setShowCategoryModal(true);
                        } else {
                          setInvCategoria(e.target.value);
                        }
                      }}
                      className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-white h-9"
                    >
                      {categorias.inventario.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="___MANAGE___" className="font-bold text-[#4B9CD3] bg-[#EBF5FB]">+ Gestionar / Agregar Categoría</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Stock Actual</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={invStockActual}
                      onChange={(e) => setInvStockActual(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30 h-9"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Stock Mínimo</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={invStockMinimo}
                      onChange={(e) => setInvStockMinimo(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30 h-9"
                      required
                    />
                  </div>

                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Unidad</label>
                      <input
                        type="text"
                        placeholder="Ej. Kg, Unidades"
                        value={invUnidad}
                        onChange={(e) => setInvUnidad(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30 h-9"
                        required
                      />
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <button
                        type="submit"
                        className="bg-[#4B9CD3] text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-[#3A82B4] transition-colors shadow-xs h-9 cursor-pointer whitespace-nowrap"
                      >
                        {editingInvId ? 'Guardar' : 'Registrar'}
                      </button>
                      {editingInvId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingInvId(null);
                            setInvNombre('');
                            setInvCategoria('insumos');
                            setInvStockActual(10);
                            setInvStockMinimo(5);
                            setInvUnidad('Kg');
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-2.5 rounded-lg transition-colors h-9 cursor-pointer"
                        >
                          X
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start text-xs animate-in fade-in duration-150">
                <div className="md:col-span-4 bg-[#EBF5FB] text-[#4B9CD3] p-4 rounded-lg border border-[#AED6F1]/40">
                  <p className="font-extrabold text-[10px] uppercase tracking-wide flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#4B9CD3]" />
                    ¿Cómo importar de Google Sheets?
                  </p>
                  <ol className="list-decimal pl-4 mt-1.5 text-[10.5px] space-y-1 text-[#2C3E50] font-semibold leading-relaxed">
                    <li>Abre tu documento en <strong>Google Sheets</strong>.</li>
                    <li>
                      Copia tus columnas. Formato de izquierda a derecha:
                      <br />
                      <code className="bg-white/70 px-1 py-0.5 rounded-md font-mono text-[9px] border border-[#AED6F1]/60 block mt-0.5 font-bold">
                        Nombre | Categoría | Stock | Mínimo | Unidad
                      </code>
                    </li>
                    <li>Pega en la caja de la derecha o ingresa el enlace de tu hoja.</li>
                  </ol>
                </div>

                <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estrategia de Carga</label>
                      <div className="flex gap-2">
                        <label className="flex-1 flex items-center gap-2 border border-[#E2E8F0] p-2 rounded-lg bg-[#FFFDF6]/20 cursor-pointer hover:bg-slate-50 transition-colors">
                          <input
                            type="radio"
                            name="importOption"
                            value="append"
                            checked={importOption === 'append'}
                            onChange={() => setImportOption('append')}
                            className="accent-[#4B9CD3]"
                          />
                          <div className="text-[10px]">
                            <p className="font-bold text-[#2C3E50]">Adicionar</p>
                            <p className="text-[8px] text-slate-400">Suma a la lista actual</p>
                          </div>
                        </label>
                        <label className="flex-1 flex items-center gap-2 border border-[#E2E8F0] p-2 rounded-lg bg-[#FFFDF6]/20 cursor-pointer hover:bg-slate-50 transition-colors">
                          <input
                            type="radio"
                            name="importOption"
                            value="replace"
                            checked={importOption === 'replace'}
                            onChange={() => setImportOption('replace')}
                            className="accent-[#4B9CD3]"
                          />
                          <div className="text-[10px]">
                            <p className="font-bold text-[#2C3E50]">Reemplazar</p>
                            <p className="text-[8px] text-slate-400">Borra lista y carga nuevo</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <Link className="w-3.5 h-3.5 text-[#4B9CD3]" />
                        Opción A: Enlace de Google Sheets (Público)
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="url"
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          value={sheetLink}
                          onChange={(e) => setSheetLink(e.target.value)}
                          className="flex-1 text-xs px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30 h-9"
                        />
                        <button
                          type="button"
                          onClick={handleFetchSheetLink}
                          className="bg-[#4B9CD3] hover:bg-[#3A82B4] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer h-9"
                        >
                          <Database className="w-3 h-3" />
                          Importar
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5 text-[#4B9CD3]" />
                      Opción B: Pegar Celdas Directamente
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Fresas de Huerto	insumos	20	5	Kg&#10;Vasos Eco 12oz	empaques	150	30	Unidades"
                      value={bulkPasteText}
                      onChange={(e) => setBulkPasteText(e.target.value)}
                      className="w-full text-[10px] font-mono p-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30 resize-none"
                    />
                    <button
                      type="button"
                      onClick={() => parseAndImportRows(bulkPasteText)}
                      className="w-full bg-slate-950 hover:bg-slate-900 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                    >
                      Cargar Filas Pegadas
                    </button>
                  </div>
                </div>

                {importStatus.message && (
                  <div className={`col-span-1 md:col-span-12 p-2.5 rounded-lg text-[10.5px] font-bold ${
                    importStatus.type === 'success' ? 'bg-sky-50 text-sky-800 border border-sky-200' :
                    importStatus.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                    'bg-sky-50 text-sky-800 border border-sky-200 animate-pulse'
                  }`}>
                    {importStatus.message}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Listado del Inventario en Tiempo Real */}
          <div className="w-full space-y-4">
            {/* Alertas Rápidas de Stock Bajo */}
            {inventario.filter(item => item.stock_actual <= item.stock_minimo_alerta).length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-900 rounded-xl p-4 shadow-2xs">
                <p className="font-extrabold text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 animate-bounce" />
                  ALERTA DE SEGURIDAD ALIMENTARIA: {inventario.filter(item => item.stock_actual <= item.stock_minimo_alerta).length} recursos están en niveles críticos de stock.
                </p>
                <p className="text-[11px] text-red-700 mt-1">
                  El personal de cocina y atención requiere reabastecimiento para mantener las metas diarias de ventas fit.
                </p>
              </div>
            )}

            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4 pb-2 border-b border-[#FFFDF6]">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#4B9CD3]">Control en Tiempo Real de Almacén</h4>
                  <p className="text-xs text-slate-500">Refleja automáticamente los conteos diarios ingresados por tu personal en las terminales.</p>
                </div>
                <div className="flex gap-1 bg-slate-50 p-1 border border-slate-200 rounded-lg text-[10px] font-bold">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">Total: {inventario.length} items</span>
                  <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800">Alertas: {inventario.filter(item => item.stock_actual <= item.stock_minimo_alerta).length}</span>
                </div>
              </div>

              {inventario.length === 0 ? (
                <p className="text-center py-12 text-slate-400 text-xs">No hay recursos agregados en el inventario.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2E8F0]/60 text-[10px] text-slate-400 uppercase font-black tracking-wider">
                        <th className="py-2.5 px-3">Recurso</th>
                        <th className="py-2.5 px-3">Categoría</th>
                        <th className="py-2.5 px-3 text-center">Stock Actual</th>
                        <th className="py-2.5 px-3 text-center">Límite Mínimo</th>
                        <th className="py-2.5 px-3">Última Actualización</th>
                        <th className="py-2.5 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#FFFDF6] text-xs">
                      {inventario.map(item => {
                        const esCritico = item.stock_actual <= item.stock_minimo_alerta;
                        return (
                          <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${esCritico ? 'bg-red-50/20' : ''}`}>
                            <td className="py-3 px-3 font-extrabold text-[#2C3E50]">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${esCritico ? 'bg-red-500 animate-pulse' : 'bg-sky-500'}`} />
                                {item.nombre}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                                item.categoria === 'insumos' ? 'bg-orange-50 text-orange-800 border border-orange-100' :
                                item.categoria === 'empaques' ? 'bg-sky-50 text-sky-800 border border-sky-100' :
                                'bg-sky-50 text-sky-800 border border-sky-100'
                              }`}>
                                {item.categoria}
                              </span>
                            </td>
                            <td className={`py-3 px-3 text-center font-black ${esCritico ? 'text-red-700 text-sm' : 'text-slate-800'}`}>
                              {item.stock_actual} <span className="text-[9px] font-medium text-slate-400">{item.unidad}</span>
                            </td>
                            <td className="py-3 px-3 text-center text-slate-400 font-bold">
                              {item.stock_minimo_alerta} {item.unidad}
                            </td>
                            <td className="py-3 px-3">
                              {item.ultima_actualizacion_fecha ? (
                                <div className="space-y-0.5">
                                  <p className="text-[10px] text-slate-700 font-bold">{item.ultima_actualizacion_por || 'Sistema'}</p>
                                  <p className="text-[9px] text-slate-400 font-semibold">{item.ultima_actualizacion_fecha}</p>
                                </div>
                              ) : (
                                <span className="text-slate-300 text-[10px]">Sin cambios registrados</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex gap-1 justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleEditInvClick(item)}
                                  className="p-1.5 text-slate-600 hover:text-[#4B9CD3] hover:bg-[#EBF5FB]/60 rounded-lg transition-all"
                                  title="Editar recurso"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteInventarioItem(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Eliminar del inventario"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. GESTIÓN DE HORARIOS Y TURNOS (VISTA ADMIN) */}
      {isTabOpen('horarios') && (
        <div className={activeTab === 'horarios' ? 'flex flex-col gap-6 w-full animate-in fade-in duration-200' : 'hidden'}>
          {/* Carga de Horarios */}
          <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#2C3E50] mb-4 flex items-center gap-1.5 border-b border-[#FFFDF6] pb-2">
              <Calendar className="w-4.5 h-4.5 text-[#4B9CD3]" />
              {editingSchId ? 'Modificar Turno de Personal' : 'Programar Turno Semanal'}
            </h3>

            <form onSubmit={handleSchSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                {/* Seleccionar Colaborador */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Colaborador</label>
                  <select
                    value={schUsuarioId}
                    onChange={(e) => setSchUsuarioId(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-white h-9"
                    required
                  >
                    <option value="" disabled>Selecciona un empleado...</option>
                    {empleados.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Día del Turno */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Día del Turno</label>
                  <select
                    value={schDia}
                    onChange={(e) => setSchDia(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-white h-9"
                  >
                    <option value="Lunes">Lunes</option>
                    <option value="Martes">Martes</option>
                    <option value="Miércoles">Miércoles</option>
                    <option value="Jueves">Jueves</option>
                    <option value="Viernes">Viernes</option>
                    <option value="Sábado">Sábado</option>
                    <option value="Domingo">Domingo</option>
                  </select>
                </div>

                {/* Hora de Entrada */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Hora de Entrada</label>
                  <input
                    type="time"
                    value={schHoraEntrada}
                    onChange={(e) => setSchHoraEntrada(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-white h-9"
                    required
                  />
                </div>

                {/* Hora de Salida */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Hora de Salida</label>
                  <input
                    type="time"
                    value={schHoraSalida}
                    onChange={(e) => setSchHoraSalida(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-white h-9"
                    required
                  />
                </div>

                {/* Nota del Turno / Tarea Especial */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nota del Turno / Especialidad</label>
                  <input
                    type="text"
                    placeholder="Ej. Apertura, Cierre, etc."
                    value={schNota}
                    onChange={(e) => setSchNota(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30 h-9"
                  />
                </div>

                {/* Botón de Carga */}
                <div className="flex gap-1.5">
                  <button
                    type="submit"
                    className="flex-1 bg-[#4B9CD3] text-white text-xs font-bold py-2.5 px-4 rounded-lg hover:bg-[#3A82B4] transition-colors shadow-xs h-9 cursor-pointer whitespace-nowrap"
                  >
                    {editingSchId ? 'Actualizar' : 'Cargar Turno'}
                  </button>
                  {editingSchId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSchId(null);
                        setSchNota('');
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-3 rounded-lg transition-colors h-9 cursor-pointer"
                    >
                      X
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Calendario Semanal de Turnos */}
          <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-[#FFFDF6] mb-4 gap-2">
              <div>
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#4B9CD3]">Matriz Semanal de Trabajo</h4>
                <p className="text-xs text-slate-500">Programación detallada de turnos semanales por colaborador.</p>
              </div>
              <button
                type="button"
                id="duplicate-schedules-btn"
                onClick={onDuplicarHorarios}
                className="w-full sm:w-auto bg-[#4B9CD3] hover:bg-[#3A82B4] text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
              >
                Duplicar Horarios de la Semana Anterior
              </button>
            </div>

            {empleados.length === 0 ? (
              <p className="text-center py-12 text-slate-400 text-xs">Registra colaboradores en el gestor para asignarles horarios.</p>
            ) : (
              <div className="space-y-6">
                {empleados.map(emp => {
                  const turnosEmp = horarios.filter(t => t.usuario_id === emp.id);
                  const dias: Array<'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo'> = [
                    'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
                  ];

                  return (
                    <div key={emp.id} className="border border-[#E2E8F0] rounded-xl p-4 bg-slate-50/50">
                      <div className="flex items-center gap-3 mb-3 border-b border-slate-100 pb-2">
                        <img
                          src={emp.foto_avatar}
                          alt={emp.nombre}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover border border-[#E2E8F0]"
                        />
                        <div>
                          <h5 className="font-extrabold text-xs text-[#2C3E50]">{emp.nombre}</h5>
                          <p className="text-[10px] text-[#4B9CD3] font-semibold">{emp.area_preferida || 'Cocina'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-7 gap-2.5">
                        {dias.map(dia => {
                          const shift = turnosEmp.find(t => t.dia_semana === dia);
                          return (
                            <div key={dia} className={`p-2.5 rounded-lg border text-center flex flex-col justify-between min-h-[90px] ${
                              shift 
                                ? 'bg-[#EBF5FB]/60 border-[#AED6F1] text-[#2C3E50]' 
                                : 'bg-white border-dashed border-slate-200 text-slate-300'
                            }`}>
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-wider text-[#4B9CD3]/80">{dia}</p>
                                {shift ? (
                                  <div className="mt-1.5 space-y-1">
                                    <p className="text-[11px] font-extrabold text-slate-900">{shift.hora_entrada} - {shift.hora_salida}</p>
                                    {shift.nota && (
                                      <p className="text-[9px] font-semibold text-[#4B9CD3] leading-tight bg-white border border-[#E2E8F0] px-1 py-0.5 rounded-sm truncate" title={shift.nota}>
                                        {shift.nota}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-[10px] italic font-medium mt-3">Libre</p>
                                )}
                              </div>

                              {shift && (
                                <div className="mt-2 pt-1 border-t border-slate-100/50 flex justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleEditSchClick(shift)}
                                    className="p-1 hover:text-[#4B9CD3] hover:bg-[#EBF5FB] rounded-md transition-colors animate-none"
                                    title="Modificar turno"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteTurno(shift.id)}
                                    className="p-1 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    title="Eliminar turno"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. REPORTE Y REGISTRO DE VENTAS & FIDELIZACIÓN (ADMINISTRADOR) */}
      {isTabOpen('ventas') && (
        <div className={activeTab === 'ventas' ? 'w-full space-y-6' : 'hidden'}>
          {(() => {
        // --- CÁLCULOS PARA LA PESTAÑA DE FIDELIZACIÓN ---
        const allClientes = clientes || [];
        const todayStr = '2026-08-22';
        const monthStartStr = '2026-08';

        const filteredClientes = allClientes.filter(c => {
          if (clienteSearch.trim()) {
            const q = clienteSearch.toLowerCase();
            const matchName = c.nombre.toLowerCase().includes(q);
            const matchPhone = c.telefono.includes(q);
            if (!matchName && !matchPhone) return false;
          }

          if (clienteSegmentoFilter === 'frecuentes') {
            return c.total_compras_count > 3;
          }
          if (clienteSegmentoFilter === 'inactivos') {
            if (!c.ultima_fecha_compra) return true;
            const lastDate = new Date(c.ultima_fecha_compra).getTime();
            const now = new Date(todayStr).getTime();
            const diffDays = (now - lastDate) / (1000 * 3600 * 24);
            return diffDays > 30;
          }
          if (clienteSegmentoFilter === 'nuevos') {
            return c.fecha_registro.startsWith(monthStartStr);
          }
          return true;
        });

        const totalClientesCount = allClientes.length;
        const recurrentesCount = allClientes.filter(c => c.total_compras_count > 3).length;
        const totalMontoComprado = allClientes.reduce((sum, c) => sum + c.total_compras_monto, 0);
        const ticketPromedioCliente = totalClientesCount > 0 ? totalMontoComprado / totalClientesCount : 0;

        const handleExportClientesCSV = () => {
          const headers = ['Nombre del Cliente', 'Teléfono Móvil', 'Fecha de Registro', 'Total Compras ($)', 'Frecuencia de Visita', 'Última Fecha de Compra'];
          const rows = filteredClientes.map(c => [
            c.nombre,
            c.telefono,
            c.fecha_registro,
            c.total_compras_monto.toFixed(2),
            c.total_compras_count,
            c.ultima_fecha_compra
          ]);
          downloadCSV('fidelizacion_clientes_coccolefit.csv', headers, rows);
        };

        // --- CALCULOS DE FILTROS PARA EL REPORTE DE VENTAS ---
        const filteredSales = (ventasRegistradas || []).filter(v => {
          const saleDate = v.fecha; // 'YYYY-MM-DD'
          const matchesStartDate = !salesStartDate || saleDate >= salesStartDate;
          const matchesEndDate = !salesEndDate || saleDate <= salesEndDate;
          const matchesSeller = !salesSeller || v.usuario_id === salesSeller;
          
          // Buscar en productos de la venta, cliente o nombre del vendedor
          const q = salesSearch.toLowerCase();
          const matchesSearch = !salesSearch.trim() || 
            v.vendedor_nombre.toLowerCase().includes(q) ||
            (v.cliente_nombre && v.cliente_nombre.toLowerCase().includes(q)) ||
            (v.cliente_telefono && v.cliente_telefono.includes(q)) ||
            v.productos_vendidos.some(p => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q));
          
          const matchesPaymentMethod = !salesPaymentMethod || 
            (salesPaymentMethod === 'efectivo' ? isEfectivo(v.metodo_pago) :
             salesPaymentMethod === 'tarjeta' ? isTarjeta(v.metodo_pago) :
             salesPaymentMethod === 'transferencia' ? isTransferencia(v.metodo_pago) :
             salesPaymentMethod === 'rappi' ? isRappi(v.metodo_pago) :
             v.metodo_pago === salesPaymentMethod);
            
          return matchesStartDate && matchesEndDate && matchesSeller && matchesSearch && matchesPaymentMethod;
        });

        // Ventas activas (excluye las anuladas para los totales financieros de caja)
        const activeFilteredSales = filteredSales.filter(v => v.estado !== 'Anulada');
        
        const totalEfectivoFiltered = activeFilteredSales.filter(v => isEfectivo(v.metodo_pago)).reduce((acc, curr) => acc + curr.total, 0);
        const totalTarjetaFiltered = activeFilteredSales.filter(v => isTarjeta(v.metodo_pago)).reduce((acc, curr) => acc + curr.total, 0);
        const totalTransferenciaFiltered = activeFilteredSales.filter(v => isTransferencia(v.metodo_pago)).reduce((acc, curr) => acc + curr.total, 0);
        const totalRappiFiltered = activeFilteredSales.filter(v => isRappi(v.metodo_pago)).reduce((acc, curr) => acc + curr.total, 0);

        const totalFilteredAmount = activeFilteredSales.reduce((acc, curr) => acc + curr.total, 0);
        const ticketPromedio = activeFilteredSales.length > 0 ? totalFilteredAmount / activeFilteredSales.length : 0;

        // Encontrar el vendedor estrella en los registros filtrados activos
        const sellerTotals: Record<string, number> = {};
        activeFilteredSales.forEach(s => {
          sellerTotals[s.vendedor_nombre] = (sellerTotals[s.vendedor_nombre] || 0) + s.total;
        });
        let starSellerName = 'Ninguno';
        let starSellerTotal = 0;
        Object.entries(sellerTotals).forEach(([name, tot]) => {
          if (tot > starSellerTotal) {
            starSellerTotal = tot;
            starSellerName = name;
          }
        });

        // --- CÁLCULO DE DATOS PARA LAS GRÁFICAS DE TENDENCIA ---
        let chartData: Array<{ label: string; value: number }> = [];
        
        if (chartView === '7days') {
          const days = ['2026-08-15', '2026-08-16', '2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21'];
          chartData = days.map(d => {
            const daySales = (ventasRegistradas || []).filter(v => v.fecha === d && v.estado !== 'Anulada');
            const total = daySales.reduce((sum, s) => sum + s.total, 0);
            const parts = d.split('-');
            const label = `${parts[2]}/${parts[1]}`;
            return { label, value: total };
          });
        } else if (chartView === '15days') {
          const days = [
            '2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10', '2026-08-11', 
            '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15', '2026-08-16', 
            '2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21'
          ];
          chartData = days.map(d => {
            const daySales = (ventasRegistradas || []).filter(v => v.fecha === d && v.estado !== 'Anulada');
            const total = daySales.reduce((sum, s) => sum + s.total, 0);
            const parts = d.split('-');
            const label = `${parts[2]}/${parts[1]}`;
            return { label, value: total };
          });
        } else {
          const months = [
            { key: '2026-06', name: 'Junio' },
            { key: '2026-07', name: 'Julio' },
            { key: '2026-08', name: 'Agosto' }
          ];
          chartData = months.map(m => {
            const monthSales = (ventasRegistradas || []).filter(v => v.fecha.startsWith(m.key) && v.estado !== 'Anulada');
            const total = monthSales.reduce((sum, s) => sum + s.total, 0);
            return { label: m.name, value: total };
          });
        }

        const maxVal = Math.max(...chartData.map(d => d.value), 100);

        return (
          <div className="space-y-6 w-full" id="ventas-dashboard-tab-panel">
            
            {/* BARRA DE NAVEGACIÓN SUB-PESTAÑAS (VENTAS VS FIDELIZACIÓN VS AUDITORÍA DB) */}
            <div className="flex bg-[#EBF5FB] p-1.5 rounded-xl gap-2 border border-[#AED6F1] w-full">
              <button
                type="button"
                onClick={() => setVentasSubTab('reportes')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                  ventasSubTab === 'reportes'
                    ? 'bg-[#4B9CD3] text-white shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                Resumen de Ventas & Catálogo POS
              </button>
              <button
                type="button"
                onClick={() => setVentasSubTab('fidelizacion')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                  ventasSubTab === 'fidelizacion'
                    ? 'bg-[#4B9CD3] text-white shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                Programa de Fidelización
              </button>
              <button
                type="button"
                onClick={() => setVentasSubTab('auditoria_db')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                  ventasSubTab === 'auditoria_db'
                    ? 'bg-[#4B9CD3] text-white shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Auditoría DB Supabase
              </button>
            </div>

            {ventasSubTab === 'fidelizacion' ? (
              /* VISTA DE PROGRAMA DE FIDELIZACIÓN DE CLIENTES */
              <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-6">
                
                {/* Encabezado y Acción de Exportación */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-[#2C3E50]">
                      Programa de Fidelización de Clientes
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Monitoreo de consumos, frecuencia y métricas de recurrencia de la comunidad COCCOLE FIT.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportClientesCSV}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-2xs"
                  >
                    Exportar Base de Datos (CSV)
                  </button>
                </div>

                {/* Métricas Clave */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                  <div className="bg-[#FFFDF6] border border-[#E2E8F0] p-4 rounded-xl space-y-1">
                    <span className="text-[10px] font-black uppercase text-[#4B9CD3] tracking-wider block">
                      Total de Clientes
                    </span>
                    <p className="text-2xl font-black text-[#2C3E50]">{totalClientesCount}</p>
                    <p className="text-[11px] text-slate-500 font-medium">Clientes registrados en base de datos</p>
                  </div>

                  <div className="bg-[#FFFDF6] border border-[#E2E8F0] p-4 rounded-xl space-y-1">
                    <span className="text-[10px] font-black uppercase text-[#4B9CD3] tracking-wider block">
                      Clientes Recurrentes
                    </span>
                    <p className="text-2xl font-black text-[#2C3E50]">{recurrentesCount}</p>
                    <p className="text-[11px] text-slate-500 font-medium">Clientes con más de 3 compras acumuladas</p>
                  </div>

                  <div className="bg-[#FFFDF6] border border-[#E2E8F0] p-4 rounded-xl space-y-1">
                    <span className="text-[10px] font-black uppercase text-[#4B9CD3] tracking-wider block">
                      Ticket Promedio por Cliente
                    </span>
                    <p className="text-2xl font-black text-[#4B9CD3]">${ticketPromedioCliente.toFixed(2)}</p>
                    <p className="text-[11px] text-slate-500 font-medium">Consumo acumulado promedio por usuario</p>
                  </div>
                </div>

                {/* Filtros de Segmentación y Búsqueda */}
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 pt-2 w-full">
                  <div className="flex flex-wrap bg-[#EBF5FB] p-1 rounded-lg gap-1 border border-[#AED6F1]">
                    <button
                      type="button"
                      onClick={() => setClienteSegmentoFilter('todos')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                        clienteSegmentoFilter === 'todos' ? 'bg-[#4B9CD3] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Todos ({allClientes.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setClienteSegmentoFilter('frecuentes')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                        clienteSegmentoFilter === 'frecuentes' ? 'bg-[#4B9CD3] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Top / Frecuentes
                    </button>
                    <button
                      type="button"
                      onClick={() => setClienteSegmentoFilter('inactivos')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                        clienteSegmentoFilter === 'inactivos' ? 'bg-[#4B9CD3] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Inactivos (&gt;30 días)
                    </button>
                    <button
                      type="button"
                      onClick={() => setClienteSegmentoFilter('nuevos')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                        clienteSegmentoFilter === 'nuevos' ? 'bg-[#4B9CD3] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Nuevos del Mes
                    </button>
                  </div>

                  <div className="w-full md:w-72">
                    <input
                      type="text"
                      value={clienteSearch}
                      onChange={(e) => setClienteSearch(e.target.value)}
                      placeholder="Buscar por nombre o teléfono..."
                      className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4B9CD3] font-medium text-[#2C3E50] bg-white"
                    />
                  </div>
                </div>

                {/* Tabla de Clientes Registrados */}
                <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl w-full">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#FFFDF6] border-b border-[#E2E8F0] text-[#2C3E50] uppercase font-black tracking-wider text-[10px]">
                        <th className="p-3">Nombre del Cliente</th>
                        <th className="p-3">Teléfono Móvil</th>
                        <th className="p-3">Total Compras ($)</th>
                        <th className="p-3">Frecuencia de Visita</th>
                        <th className="p-3">Última Fecha de Compra</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredClientes.length > 0 ? (
                        filteredClientes.map((cli) => (
                          <tr key={cli.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-[#2C3E50]">{cli.nombre}</td>
                            <td className="p-3 text-slate-600">{cli.telefono}</td>
                            <td className="p-3 font-bold text-[#4B9CD3]">${cli.total_compras_monto.toFixed(2)}</td>
                            <td className="p-3">
                              <span className="inline-block px-2 py-0.5 bg-[#EBF5FB] text-[#4B9CD3] border border-[#AED6F1] font-bold rounded-md text-[11px]">
                                {cli.total_compras_count} compras
                              </span>
                            </td>
                            <td className="p-3 text-slate-500">{cli.ultima_fecha_compra || 'N/A'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">
                            No se encontraron clientes registrados para esta búsqueda o filtro.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            ) : ventasSubTab === 'auditoria_db' ? (
              /* VISTA DE AUDITORÍA Y DIAGNÓSTICO DE BASE DE DATOS SUPABASE */
              <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-6">
                
                {/* Cabecera y Botón de Prueba de Salud */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase text-[#4B9CD3] tracking-widest block">
                        Control de Salud e Integridad del Backend
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${dbAuditReport?.allOk ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {dbAuditReport?.allOk ? '✅ 100% Integra (5/5 Tablas OK)' : '⚠️ Revisión Recomendada'}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-[#2C3E50]">
                      Auditoría de Base de Datos & Verificación de Tablas Supabase
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Diagnóstico interactivo para validar las 5 tablas principales (<span className="font-mono font-bold">profiles, customers, sales, inventory, time_entries</span>) y su estructura de columnas.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleRunDatabaseHealthCheck}
                      disabled={isRunningAudit}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRunningAudit ? 'animate-spin' : ''}`} />
                      {isRunningAudit ? 'Ejecutando Health Check...' : 'Ejecutar Prueba de Salud'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                        setCopiedSqlAdmin(true);
                        setTimeout(() => setCopiedSqlAdmin(false), 2500);
                      }}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {copiedSqlAdmin ? '¡Script Copiado!' : 'Copiar Script SQL'}
                    </button>
                  </div>
                </div>

                {/* RESUMEN DE LA AUDITORÍA DE SALUD */}
                {dbAuditReport && (
                  <div className="p-4 bg-[#EBF5FB]/60 border border-[#AED6F1] rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#2C3E50] uppercase tracking-wider">
                        Resultado del Diagnóstico en Tiempo Real
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Verificado: {new Date(dbAuditReport.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[#2C3E50]">
                      {dbAuditReport.summaryText}
                    </p>
                  </div>
                )}

                {/* TARJETAS DE LAS 5 TABLAS AUDITADAS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dbAuditReport && (Object.entries(dbAuditReport.tables) as [string, TableAuditReport][]).map(([tableName, report]) => {
                    const isOk = report.status === 'OK';
                    const isWarn = report.status === 'WARNING';
                    
                    return (
                      <div 
                        key={tableName} 
                        className={`p-4 rounded-xl border space-y-3 bg-white transition-all shadow-2xs ${
                          isOk ? 'border-emerald-200 hover:border-emerald-300' : isWarn ? 'border-amber-300 bg-amber-50/10' : 'border-rose-300 bg-rose-50/10'
                        }`}
                      >
                        <div className="flex justify-between items-start border-b border-slate-100 pb-2.5">
                          <div>
                            <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider block">
                              Tabla Supabase
                            </span>
                            <h4 className="font-mono font-extrabold text-sm text-[#2C3E50]">
                              {tableName}
                            </h4>
                          </div>

                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                            isOk ? 'bg-emerald-100 text-emerald-800' : isWarn ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isOk ? 'ESTRUCTURA OK' : isWarn ? 'ADVERTENCIA' : 'TABLA FALTANTE'}
                          </span>
                        </div>

                        {/* Métrica y Estado */}
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-semibold">Registros Almacenados:</span>
                          <span className="font-mono font-black text-[#4B9CD3] text-sm">
                            {report.count}
                          </span>
                        </div>

                        {/* Chequeo de Columnas Requeridas */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Verificación de Columnas:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {report.columnsChecked.map(col => (
                              <span 
                                key={col.name} 
                                className={`font-mono text-[9px] px-2 py-0.5 rounded-md font-bold ${
                                  col.present 
                                    ? 'bg-slate-100 text-slate-700' 
                                    : 'bg-rose-100 text-rose-700 border border-rose-300'
                                }`}
                              >
                                {col.present ? `✓ ${col.name}` : `✗ ${col.name}`}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Mensaje Informativo */}
                        <p className="text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-100">
                          {report.message}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* CONSOLE DIAGNOSTIC NOTICE */}
                <div className="p-3 bg-slate-900 text-slate-300 rounded-xl text-xs flex justify-between items-center font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Los logs de auditoría detallados han sido registrados en la consola del navegador (<span className="text-emerald-400 font-bold">console.group</span>).</span>
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Consola F12</span>
                </div>

                {/* SCRIPT SQL COMPLETO PARA REPARACIÓN / INSTALACIÓN */}
                <div className="pt-2 border-t border-[#E2E8F0] space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-extrabold text-[#2C3E50] uppercase tracking-wider">
                        Script SQL Completo de Tablas y Publicaciones Realtime
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Copia y ejecuta este script en el <span className="font-bold text-[#4B9CD3]">SQL Editor de Supabase</span> para garantizar la creación e integridad de las 5 tablas.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                        setCopiedSqlAdmin(true);
                        setTimeout(() => setCopiedSqlAdmin(false), 2500);
                      }}
                      className="px-3 py-1.5 bg-[#EBF5FB] hover:bg-[#D4E6F1] text-[#4B9CD3] font-extrabold text-xs rounded-lg transition-colors cursor-pointer border border-[#AED6F1]"
                    >
                      {copiedSqlAdmin ? '¡Script Copiado!' : 'Copiar SQL'}
                    </button>
                  </div>

                  <textarea
                    rows={8}
                    readOnly
                    value={SUPABASE_SQL_SCHEMA}
                    className="w-full text-[11px] font-mono p-3 bg-slate-900 text-emerald-400 rounded-xl border border-slate-700 focus:outline-none select-all"
                  />
                </div>

              </div>
            ) : (
              /* VISTA DE REPORTES DE VENTAS & CATÁLOGO POS ORIGINAL */
              <>
            {/* GRÁFICAS DE TENDENCIAS */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#2C3E50] flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#4B9CD3]" />
                    Panel de Tendencias de Ventas
                  </h3>
                  <p className="text-xs text-slate-500">Visualiza el comportamiento de ventas por rango temporal o comparativas mensuales.</p>
                </div>

                <div className="flex bg-[#EBF5FB] p-1 rounded-lg gap-1 border border-[#AED6F1] self-stretch md:self-auto">
                  <button
                    type="button"
                    onClick={() => setChartView('7days')}
                    className={`flex-1 md:flex-initial text-xs font-bold px-3 py-1.5 rounded-md transition-all ${
                      chartView === '7days' ? 'bg-[#4B9CD3] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Últimos 7 Días
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView('15days')}
                    className={`flex-1 md:flex-initial text-xs font-bold px-3 py-1.5 rounded-md transition-all ${
                      chartView === '15days' ? 'bg-[#4B9CD3] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Últimos 15 Días
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView('monthly')}
                    className={`flex-1 md:flex-initial text-xs font-bold px-3 py-1.5 rounded-md transition-all ${
                      chartView === 'monthly' ? 'bg-[#4B9CD3] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Mes tras Mes
                  </button>
                </div>
              </div>

              {/* Renderizado de Gráfico de Barras y Líneas Dinámico en SVG */}
              <div className="h-64 w-full bg-slate-50/50 rounded-xl border border-dashed border-slate-200/80 p-4 relative flex flex-col justify-between">
                <div className="flex-1 flex items-end justify-between gap-2.5 pt-4 px-2">
                  {chartData.map((d, index) => {
                    const pct = (d.value / maxVal) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        {/* Tooltip flotante */}
                        <div className="absolute -top-6 bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 font-bold shadow-sm whitespace-nowrap">
                          ${d.value.toFixed(2)}
                        </div>

                        {/* Columna de la barra */}
                        <div 
                          style={{ height: `${Math.max(pct, 4)}%` }}
                          className="w-full max-w-[48px] bg-gradient-to-t from-[#4B9CD3] to-[#4c8f44] rounded-t-md hover:brightness-110 transition-all duration-300 relative flex items-start justify-center shadow-xs"
                        >
                          <span className="text-[9px] text-white font-extrabold mt-1 select-none opacity-0 group-hover:opacity-100 transition-opacity">
                            ${Math.round(d.value)}
                          </span>
                        </div>

                        {/* Label de fecha */}
                        <span className="text-[10px] text-slate-500 font-bold mt-2 truncate max-w-full">
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Eje horizontal */}
                <div className="w-full h-px bg-slate-200 mt-1"></div>

                {/* Gridlines indicativos de fondo */}
                <div className="absolute left-4 right-4 top-1/4 h-px border-t border-slate-100 pointer-events-none"></div>
                <div className="absolute left-4 right-4 top-2/4 h-px border-t border-slate-100 pointer-events-none"></div>
                <div className="absolute left-4 right-4 top-3/4 h-px border-t border-slate-100 pointer-events-none"></div>
              </div>
            </div>

            {/* SECCIÓN DOBLE REORGANIZADA A FILAS 100% HORIZONTALES */}
            <div className="flex flex-col gap-6 w-full">
              
              {/* FILA A: REGISTRO Y EDICIÓN DE PRODUCTOS DEL CATÁLOGO (ANCHO COMPLETO) */}
              <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-[#2C3E50] flex items-center gap-1.5 uppercase tracking-wide text-[#4B9CD3]">
                    <Plus className="w-4.5 h-4.5" />
                    {editingCatProdId ? 'Editar Producto del Catálogo' : 'Registrar Nuevo Producto'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Define los productos que los empleados podrán vender en la tienda.</p>
                </div>

                <form onSubmit={handleCatProdSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Código</label>
                      <div className="flex gap-1.5 font-mono">
                        <input
                          type="text"
                          placeholder="Ej. JUIC-05"
                          value={catProdCodigo}
                          onChange={(e) => setCatProdCodigo(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30 uppercase font-bold h-9"
                          required
                        />
                        {!editingCatProdId && (
                          <button
                            type="button"
                            onClick={() => {
                              const rand = Math.floor(10 + Math.random() * 90);
                              setCatProdCodigo(`PROD-${rand}`);
                            }}
                            className="bg-[#EBF5FB] hover:bg-[#cbe2ca] border border-[#AED6F1] text-[#4B9CD3] text-[10px] font-extrabold px-2 rounded-lg transition-colors whitespace-nowrap h-9 cursor-pointer"
                            title="Generar código aleatorio"
                          >
                            Auto
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre Comercial</label>
                      <input
                        type="text"
                        placeholder="Ej. Parfait Berry Chía Slim"
                        value={catProdNombre}
                        onChange={(e) => setCatProdNombre(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30 h-9"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Precio ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ej. 110.00"
                        value={catProdPrecio}
                        onChange={(e) => setCatProdPrecio(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30 h-9"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Categoría</label>
                      <select
                        value={catProdCategoria}
                        onChange={(e) => {
                          if (e.target.value === '___MANAGE___') {
                            setActiveCategoryType('productosFit');
                            setShowCategoryModal(true);
                          } else {
                            setCatProdCategoria(e.target.value);
                          }
                        }}
                        className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30 h-9"
                      >
                        {categorias.productosFit.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="___MANAGE___" className="font-bold text-[#4B9CD3] bg-[#EBF5FB]">+ Gestionar / Agregar Categoría</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      {editingCatProdId && (
                        <button
                          type="button"
                          onClick={() => {
                            setCatProdCodigo('');
                            setCatProdNombre('');
                            setCatProdPrecio('');
                            setCatProdCategoria('Parfaits');
                            setEditingCatProdId(null);
                          }}
                          className="flex-1 border border-[#E2E8F0] text-slate-600 text-xs font-bold py-2 rounded-lg hover:bg-slate-50 transition-colors h-9 cursor-pointer"
                        >
                          X
                        </button>
                      )}
                      <button
                        type="submit"
                        className="flex-1 bg-[#4B9CD3] hover:bg-[#3A82B4] text-white text-xs font-bold py-2 rounded-lg transition-colors shadow-xs h-9 cursor-pointer"
                      >
                        {editingCatProdId ? 'Guardar' : 'Registrar'}
                      </button>
                    </div>
                  </div>
                </form>

                {/* LISTADO DE PRODUCTOS EXISTENTES EN EL CATÁLOGO (GRID HORIZONTAL DE 3 COLUMNAS) */}
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-slate-400" />
                    Productos Registrados ({productosCatalogo.length})
                  </h4>

                  {productosCatalogo.length === 0 ? (
                    <p className="text-center py-6 text-slate-400 text-xs">No hay productos en el catálogo de ventas.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                      {productosCatalogo.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50/60 transition-colors text-xs bg-[#FFFDF6]/25">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md font-semibold">
                                {p.codigo}
                              </span>
                              <span className="font-bold text-slate-800">{p.nombre}</span>
                            </div>
                            <div className="flex gap-2 text-[10px] text-slate-400 font-medium">
                              <span>Cat: {p.categoria}</span>
                              <span>•</span>
                              <span className="text-[#4B9CD3] font-semibold">${p.precio.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCatProdId(p.id);
                                setCatProdCodigo(p.codigo);
                                setCatProdNombre(p.nombre);
                                setCatProdPrecio(p.precio.toString());
                                setCatProdCategoria(p.categoria);
                              }}
                              className="p-1.5 hover:text-[#4B9CD3] hover:bg-[#EBF5FB] rounded-md transition-colors border border-transparent hover:border-slate-100"
                              title="Editar producto"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Seguro que deseas eliminar el producto "${p.nombre}"?`)) {
                                  onDeleteProductoCatalogo(p.id);
                                }
                              }}
                              className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-100"
                              title="Eliminar producto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* FILA B: FILTROS + REPORTE GENERAL DE VENTAS REALIZADAS (ANCHO COMPLETO) */}
              <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-5 flex flex-col">
                
                {/* FILTROS DE CONSULTA */}
                <div className="space-y-3 bg-[#FFFDF6]/45 p-4 rounded-xl border border-[#E2E8F0]/60">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-[#4B9CD3]" />
                    Filtros de Reporte por Fecha, Vendedor o Ítems
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha de Inicio</label>
                      <input
                        type="date"
                        value={salesStartDate}
                        onChange={(e) => setSalesStartDate(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha de Término</label>
                      <input
                        type="date"
                        value={salesEndDate}
                        onChange={(e) => setSalesEndDate(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filtrar Vendedor</label>
                      <select
                        value={salesSeller}
                        onChange={(e) => setSalesSeller(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-[#E2E8F0] rounded-lg bg-white"
                      >
                        <option value="">-- Todos los Staffs --</option>
                        {usuarios.map(u => (
                          <option key={u.id} value={u.id}>{u.nombre} ({u.rol === 'admin' ? 'Admin' : 'Staff'})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Medio Pago</label>
                      <select
                        value={salesPaymentMethod}
                        onChange={(e) => setSalesPaymentMethod(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-[#E2E8F0] rounded-lg bg-white capitalize"
                      >
                        <option value="">-- Todos --</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta (Datáfono)</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="rappi">Rappi</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Buscar por vendedor, nombre de producto, o código..."
                        value={salesSearch}
                        onChange={(e) => setSalesSearch(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 border border-[#E2E8F0] rounded-lg bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSalesStartDate('2026-08-01');
                        setSalesEndDate('2026-08-21');
                        setSalesSeller('');
                        setSalesSearch('');
                        setSalesPaymentMethod('');
                      }}
                      className="border border-[#E2E8F0] text-slate-600 px-3 text-xs font-bold rounded-lg hover:bg-slate-50 bg-white transition-colors"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                {/* KPI DESGLOSE MEDIOS DE PAGO */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-4">
                  <div className="bg-white border border-[#E2E8F0] p-3 rounded-lg text-center shadow-xs">
                    <span className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Efectivo</span>
                    <span className="text-sm font-black text-[#4B9CD3] mt-0.5 block">${totalEfectivoFiltered.toFixed(2)}</span>
                  </div>
                  <div className="bg-white border border-[#E2E8F0] p-3 rounded-lg text-center shadow-xs">
                    <span className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Tarjeta</span>
                    <span className="text-sm font-black text-[#2C3E50] mt-0.5 block">${totalTarjetaFiltered.toFixed(2)}</span>
                  </div>
                  <div className="bg-white border border-[#E2E8F0] p-3 rounded-lg text-center shadow-xs">
                    <span className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Transferencia</span>
                    <span className="text-sm font-black text-[#2C3E50] mt-0.5 block">${totalTransferenciaFiltered.toFixed(2)}</span>
                  </div>
                  <div className="bg-white border border-[#E2E8F0] p-3 rounded-lg text-center shadow-xs">
                    <span className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Rappi</span>
                    <span className="text-sm font-black text-[#2C3E50] mt-0.5 block">${totalRappiFiltered.toFixed(2)}</span>
                  </div>
                </div>

                {/* KPIs DEL RANGO FILTRADO */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="bg-[#EBF5FB]/60 border border-[#AED6F1] p-3 rounded-lg text-center">
                    <span className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Total Vendido</span>
                    <span className="text-base font-black text-[#4B9CD3] mt-0.5 block">${totalFilteredAmount.toFixed(2)}</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
                    <span className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Tickets Emitidos</span>
                    <span className="text-base font-black text-slate-800 mt-0.5 block">{filteredSales.length} trans.</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
                    <span className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Ticket Promedio</span>
                    <span className="text-base font-black text-slate-800 mt-0.5 block">${ticketPromedio.toFixed(2)}</span>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-center">
                    <span className="block text-[9px] font-extrabold text-amber-800 uppercase tracking-widest">Vendedor Estrella</span>
                    <span className="text-xs font-black text-amber-950 mt-1 block truncate" title={starSellerName}>
                      {starSellerName}
                    </span>
                  </div>
                </div>

                {/* TABLA / LOG DE TRANSACCIONES AUDITABLES */}
                <div className="w-full border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                  <div className="p-3 bg-[#FFFDF6] border-b border-slate-200 flex justify-between items-center">
                    <h4 className="font-extrabold text-xs text-[#2C3E50] uppercase tracking-wider">
                      Historial de Transacciones del Día (Vista de Auditoría Administrador)
                    </h4>
                    <span className="text-[10px] font-bold bg-[#EBF5FB] text-[#4B9CD3] px-2.5 py-1 rounded-full border border-[#AED6F1]">
                      {filteredSales.length} Registro(s)
                    </span>
                  </div>
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-xs text-left text-slate-600">
                      <thead className="bg-[#FFFDF6] text-slate-700 uppercase text-[9px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Hora y Fecha</th>
                          <th className="px-4 py-3">Colaborador</th>
                          <th className="px-4 py-3">Cliente (Teléfono/Nombre)</th>
                          <th className="px-4 py-3">Productos Vendidos</th>
                          <th className="px-4 py-3 text-center">Medio de Pago</th>
                          <th className="px-4 py-3 text-right">Monto Total</th>
                          <th className="px-4 py-3 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSales.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                              Ninguna venta coincide con los criterios de filtrado.
                            </td>
                          </tr>
                        ) : (
                          filteredSales.map(v => {
                            const isAnulada = v.estado === 'Anulada';
                            return (
                              <tr key={v.id} className={`transition-colors ${isAnulada ? 'bg-red-50/30' : 'hover:bg-slate-50/60 bg-white'}`}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="font-bold text-slate-800 block">{v.hora}</span>
                                  <span className="block text-[10px] text-slate-400">{v.fecha}</span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">
                                  {v.vendedor_nombre}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="font-extrabold text-[#2C3E50] block">{v.cliente_nombre || 'Cliente General'}</span>
                                  <span className="block text-[10px] font-semibold text-[#4B9CD3]">{v.cliente_telefono || 'Sin teléfono'}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="space-y-1 max-w-[280px]">
                                    {v.productos_vendidos.map((prod, pIdx) => (
                                      <div key={pIdx} className="text-[11px] text-slate-700 font-semibold flex justify-between gap-2">
                                        <span className="truncate">{prod.nombre} x{prod.cantidad}</span>
                                        <span className="text-slate-400 font-mono text-[10px] shrink-0">${(prod.precio * prod.cantidad).toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                  <span className="inline-block px-2.5 py-1 text-[10px] font-extrabold rounded-md uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                                    {v.metodo_pago || 'Efectivo'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap font-extrabold">
                                  {isAnulada ? (
                                    <div className="text-right">
                                      <span className="text-slate-400 line-through block font-medium">${v.total.toFixed(2)}</span>
                                      <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-100 border border-red-200 px-2 py-0.5 rounded-md inline-block">
                                        Anulada
                                      </span>
                                      {v.motivo_anulacion && (
                                        <span className="block text-[9px] text-slate-500 font-normal max-w-[130px] text-right truncate" title={v.motivo_anulacion}>
                                          Motivo: {v.motivo_anulacion}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[#4B9CD3] text-sm">${v.total.toFixed(2)}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                  {!isAnulada ? (
                                    <div className="flex gap-1.5 justify-center">
                                      <button
                                        type="button"
                                        onClick={() => setEditingVentaModal({
                                          open: true,
                                          venta: v,
                                          metodo_pago: v.metodo_pago || 'efectivo',
                                          cliente_nombre: v.cliente_nombre || '',
                                          cliente_telefono: v.cliente_telefono || '',
                                          items: (v.productos_vendidos || []).map(p => ({ ...p })),
                                          selectedProdIdToAdd: ''
                                        })}
                                        className="px-2.5 py-1.5 bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer shrink-0"
                                      >
                                        Editar Venta
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setAnnullingVentaModal({
                                          open: true,
                                          venta: v,
                                          motivo: ''
                                        })}
                                        className="px-2.5 py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer shrink-0"
                                      >
                                        Anular / Eliminar Venta
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-400 italic">
                                      Transacción Anulada
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* EXPORTADOR DE REPORTES CONSOLIDADOS (CSV) */}
                <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
                  <div className="border-b border-[#FFFDF6] pb-2">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#4B9CD3]">Exportador de Reportes Operativos Consolidados</h4>
                    <p className="text-xs text-slate-500">Descarga de reportes en formato CSV con valores numéricos puros para el análisis de rendimiento, inventario o ventas.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      id="export-sales-btn"
                      onClick={handleExportVentas}
                      className="bg-white border border-[#E2E8F0] hover:border-[#4B9CD3] text-[#2C3E50] text-xs font-bold py-2.5 px-4 rounded-lg transition-colors cursor-pointer text-center"
                    >
                      Descargar Métricas de Ventas (CSV)
                    </button>
                    <button
                      type="button"
                      id="export-inventory-btn"
                      onClick={handleExportInventario}
                      className="bg-white border border-[#E2E8F0] hover:border-[#4B9CD3] text-[#2C3E50] text-xs font-bold py-2.5 px-4 rounded-lg transition-colors cursor-pointer text-center"
                    >
                      Descargar Historial de Inventario (CSV)
                    </button>
                    <button
                      type="button"
                      id="export-performance-btn"
                      onClick={handleExportRendimiento}
                      className="bg-white border border-[#E2E8F0] hover:border-[#4B9CD3] text-[#2C3E50] text-xs font-bold py-2.5 px-4 rounded-lg transition-colors cursor-pointer text-center"
                    >
                      Descargar Rendimiento de Personal (CSV)
                    </button>
                  </div>
                </div>

                {/* HISTORIAL DE CUADRES DE CAJA / CORTES DIARIOS */}
                <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
                  <div className="border-b border-[#FFFDF6] pb-2">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#4B9CD3]">Cortes de Caja de la Jornada (Cuadre Diario)</h4>
                    <p className="text-xs text-slate-500">Historial de rendición de caja y observaciones de entrega de turno reportados por el staff.</p>
                  </div>

                  {cuadresCaja.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-6">No se han registrado cortes de caja en esta jornada.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left text-slate-600">
                        <thead className="bg-[#FFFDF6] text-slate-700 uppercase text-[9px] tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3">Fecha y Hora</th>
                            <th className="px-4 py-3">Colaborador</th>
                            <th className="px-4 py-3 text-right">Efectivo Contado</th>
                            <th className="px-4 py-3 text-right">Datáfono / Transf.</th>
                            <th className="px-4 py-3">Observaciones de Entrega</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {cuadresCaja.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50 bg-white transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="font-bold text-slate-800">{c.fecha}</span>
                                <span className="block text-[10px] text-slate-400">{c.hora}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">{c.usuario_nombre}</td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-sky-700">${c.efectivo_contado.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">${(c.tarjeta_esperado || 0).toFixed(2)}</td>
                              <td className="px-4 py-3 text-slate-600 font-medium max-w-[250px] truncate" title={c.observaciones}>{c.observaciones}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

            </div>
            </>
            )}

          </div>
        );
      })()}
      </div>
      )}

      {/* 9. DIAGNÓSTICO Y AUDITORÍA DE BASE DE DATOS SUPABASE */}
      {isTabOpen('supabase') && (
        <div className={activeTab === 'supabase' ? 'w-full space-y-6' : 'hidden'}>
          <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase text-[#4B9CD3] tracking-widest block">
                    Control de Salud e Integridad del Backend
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${dbAuditReport?.allOk ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {dbAuditReport?.allOk ? '100% Integra (5/5 Tablas OK)' : 'Revisión Recomendada'}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-[#2C3E50]">
                  Auditoría de Base de Datos & Verificación de Tablas Supabase
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Diagnóstico interactivo para validar las 5 tablas principales (<span className="font-mono font-bold">profiles, customers, sales, inventory, time_entries</span>) y su estructura de columnas.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleRunDatabaseHealthCheck}
                  disabled={isRunningAudit}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRunningAudit ? 'animate-spin' : ''}`} />
                  {isRunningAudit ? 'Ejecutando Health Check...' : 'Ejecutar Prueba de Salud'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                    setCopiedSqlAdmin(true);
                    setTimeout(() => setCopiedSqlAdmin(false), 2500);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {copiedSqlAdmin ? '¡Script Copiado!' : 'Copiar Script SQL'}
                </button>
              </div>
            </div>

            {dbAuditReport && (
              <div className="p-4 bg-[#EBF5FB]/60 border border-[#AED6F1] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#2C3E50] uppercase tracking-wider">
                    Resultado del Diagnóstico en Tiempo Real
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Verificado: {new Date(dbAuditReport.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs font-medium text-[#2C3E50]">
                  {dbAuditReport.summaryText}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dbAuditReport && (Object.entries(dbAuditReport.tables) as [string, TableAuditReport][]).map(([tableName, report]) => {
                const isOk = report.status === 'OK';
                return (
                  <div key={tableName} className="p-4 rounded-xl border space-y-3 bg-white shadow-2xs">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-xs text-[#2C3E50]">{tableName}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isOk ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {report.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">{report.message}</p>
                    {report.missingColumns && report.missingColumns.length > 0 && (
                      <div className="text-[10px] text-amber-700 font-mono">
                        Faltan columnas: {report.missingColumns.join(', ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal para Agregar Feedback */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-md p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setShowFeedbackModal(false);
                setFbTitulo('');
                setFbComentario('');
                setFbEsLlamado(false);
              }}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-[#2C3E50] mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#4B9CD3]" />
              Registrar Feedback de Proceso
            </h3>

            <p className="text-xs text-slate-500 mb-4">
              Registra una conversación, felicitación o llamado de atención formal para <strong>{usuarios.find(u => u.id === fbEmpleadoId)?.nombre}</strong>. Quedará grabado en su historial y el trabajador tendrá acceso inmediato para consulta y mejora continua.
            </p>

            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Título de la Conversación / Tema</label>
                <input
                  type="text"
                  placeholder="Ej. Cumplimiento de BPM en licuadoras"
                  value={fbTitulo}
                  onChange={(e) => setFbTitulo(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Comentarios y Compromisos Acordados</label>
                <textarea
                  placeholder="Detalla los puntos clave hablados y compromisos del colaborador..."
                  value={fbComentario}
                  onChange={(e) => setFbComentario(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-[#FFFDF6]/30 h-28 resize-none"
                  required
                />
              </div>

              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                <input
                  type="checkbox"
                  id="es_llamado"
                  checked={fbEsLlamado}
                  onChange={(e) => setFbEsLlamado(e.target.checked)}
                  className="rounded-sm border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <label htmlFor="es_llamado" className="text-[11px] font-bold text-amber-800 select-none">
                  ¿Es un Llamado de Atención / Proceso de Mejora Formal?
                </label>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowFeedbackModal(false);
                    setFbTitulo('');
                    setFbComentario('');
                    setFbEsLlamado(false);
                  }}
                  className="flex-1 border border-[#E2E8F0] text-slate-700 text-xs font-bold py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#4B9CD3] hover:bg-[#3A82B4] text-white text-xs font-bold py-2.5 rounded-lg transition-colors shadow-xs"
                >
                  Guardar Bitácora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE RENDIMIENTO DEL TRABAJADOR POWERED BY GEMINI */}
      {selectedPerformanceWorker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-7xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-[#FFFDF6] border-b border-[#E2E8F0] px-6 py-4 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-bold text-[#2C3E50] uppercase tracking-wide">
                  Analisis de Rendimiento - {selectedPerformanceWorker.nombre}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Metricas de productividad y sugerencias operativas
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-extrabold text-[#4B9CD3] bg-[#EBF5FB] px-2.5 py-1 rounded-full uppercase tracking-wider">
                  POWERED BY GEMINI AI
                </span>
                <button
                  onClick={() => {
                    setSelectedPerformanceWorker(null);
                    setPerformanceData(null);
                    setPerformanceError(null);
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-400 px-3 py-1.5 rounded-lg bg-white transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#F9FAF9]">
              {loadingPerformance ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-12 h-12 border-4 border-[#4B9CD3]/25 border-t-[#4B9CD3] rounded-full animate-spin"></div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-700">Generando análisis...</p>
                    <p className="text-[10px] text-slate-500 mt-1">Gemini AI procesa metricas de asistencia, tareas y patrones de venta.</p>
                  </div>
                </div>
              ) : performanceError ? (
                <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs text-center max-w-md mx-auto">
                  <p className="font-bold">No se pudo generar el análisis de rendimiento</p>
                  <p className="mt-1 text-red-600">{performanceError}</p>
                  <button
                    onClick={() => handleObtenerRendimiento(selectedPerformanceWorker)}
                    className="mt-4 bg-white border border-red-200 text-red-800 hover:bg-red-50 font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    Reintentar
                  </button>
                </div>
              ) : performanceData ? (
                <div className="space-y-6 w-full">
                  {/* Tarjeta de evaluacion horizontal de ancho completo (w-full) */}
                  <div className="w-full rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm space-y-6">
                    {/* Header interno */}
                    <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-bold text-[#2C3E50] uppercase tracking-wider">
                          Evaluacion Integral y Metricas de Productividad
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Datos consolidados y sugerencias de optimizacion operativa sin modificacion de turnos rotativos
                        </p>
                      </div>
                    </div>

                    {/* Fila 1: Metricas Operativas (3 columnas) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Bloque 1: Eficiencia y Puntualidad */}
                      <div className="bg-[#F9FAF9] border border-slate-100 rounded-lg p-4 space-y-3">
                        <h5 className="text-[11px] font-extrabold text-[#4B9CD3] uppercase tracking-wider">
                          Eficiencia y Puntualidad
                        </h5>
                        <div className="space-y-2">
                          <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Cumplimiento de Tareas</p>
                            <p className="text-xl font-black text-[#2C3E50]">
                              {performanceData.eficienciaPuntualidad?.cumplimientoPct || '88%'}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                            <div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">Tasa Puntualidad</p>
                              <p className="text-xs font-bold text-slate-700">
                                {performanceData.eficienciaPuntualidad?.puntualidadPct || '92%'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">Llegadas Tardes</p>
                              <p className="text-xs font-bold text-slate-700">
                                {performanceData.eficienciaPuntualidad?.llegadasTardias !== undefined ? performanceData.eficienciaPuntualidad.llegadasTardias : 2} en el ultimo mes
                              </p>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-600 italic leading-relaxed pt-2 border-t border-slate-200/40">
                          {performanceData.eficienciaPuntualidad?.comentario}
                        </p>
                      </div>

                      {/* Bloque 2: Patrones de Venta */}
                      <div className="bg-[#F9FAF9] border border-slate-100 rounded-lg p-4 space-y-3">
                        <h5 className="text-[11px] font-extrabold text-[#4B9CD3] uppercase tracking-wider">
                          Patrones de Venta
                        </h5>
                        <div className="space-y-2">
                          <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Volumen Vendido este Mes</p>
                            <p className="text-xl font-black text-[#2C3E50]">
                              {performanceData.patronesVenta?.volumenTotal || '145 unidades'}
                            </p>
                          </div>
                          <div className="pt-1 border-t border-slate-200/60">
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Pico Horario de Mayor Efectividad</p>
                            <p className="text-xs font-bold text-slate-700 leading-tight mt-0.5">
                              {performanceData.patronesVenta?.picoHorario || 'Viernes y Sabados de 12:00 PM a 2:00 PM'}
                            </p>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-600 italic leading-relaxed pt-2 border-t border-slate-200/40">
                          {performanceData.patronesVenta?.comentario}
                        </p>
                      </div>

                      {/* Bloque 3: Rendimiento de Productos */}
                      <div className="bg-[#F9FAF9] border border-slate-100 rounded-lg p-4 space-y-3">
                        <h5 className="text-[11px] font-extrabold text-[#4B9CD3] uppercase tracking-wider">
                          Rendimiento de Productos de la Carta
                        </h5>
                        <div className="space-y-3">
                          <div>
                            <p className="text-[9px] text-[#4B9CD3] font-bold uppercase">Alta Rotacion</p>
                            <ul className="text-xs font-semibold text-slate-700 mt-1 space-y-1 list-disc list-inside">
                              {(performanceData.rendimientoProductos?.productosAltaRotacion || ['Parfait Proteico', 'Fresas Grandes con Crema']).map((p: string, idx: number) => (
                                <li key={idx}>{p}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="pt-2 border-t border-slate-200/40">
                            <p className="text-[9px] text-red-600 font-bold uppercase">Baja Rotacion</p>
                            <ul className="text-xs font-semibold text-slate-700 mt-1 space-y-1 list-disc list-inside">
                              {(performanceData.rendimientoProductos?.productosBajaRotacion || ['Bebida Hidratante', 'Topping de Chia']).map((p: string, idx: number) => (
                                <li key={idx}>{p}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Fila 2: Desglose de Ranking y Historial de Feedback (2 columnas) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      {/* Bloque 4: Desglose de Puntos en el Ranking */}
                      <div className="bg-[#F9FAF9] border border-slate-100 rounded-lg p-4 space-y-3">
                        <h5 className="text-[11px] font-extrabold text-[#4B9CD3] uppercase tracking-wider">
                          Desglose de Puntos en el Ranking
                        </h5>
                        <div className="space-y-3 text-xs">
                          <div className="flex justify-between items-center bg-white p-2.5 rounded-md border border-slate-100">
                            <div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">Puntualidad y Estado</p>
                              <p className="text-sm font-black text-slate-800">
                                {performanceData.desgloseRanking?.puntosTotales || 329} puntos totales
                              </p>
                            </div>
                            <span className="text-[10px] font-bold text-[#4B9CD3] bg-[#EBF5FB] px-2 py-0.5 rounded-md">
                              Posicion {performanceData.desgloseRanking?.posicionRanking || 1} en el ranking actual
                            </span>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Donde suma mas puntos</p>
                            <p className="text-xs font-medium text-[#4B9CD3] mt-0.5">
                              {performanceData.desgloseRanking?.areasGanancia || '+120 pts por velocidad en preparacion y +150 pts por venta cruzada de proteina'}
                            </p>
                          </div>
                          <div className="pt-2 border-t border-slate-200/40">
                            <p className="text-[9px] text-red-500 font-bold uppercase">Fuga de puntos (Oportunidad de recuperacion)</p>
                            <p className="text-xs font-semibold text-red-700 mt-0.5">
                              {performanceData.desgloseRanking?.areasPerdida || '-30 pts por 2 marcas de entrada fuera de horario'}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1">
                              Accion de recuperacion: {performanceData.desgloseRanking?.accionRecuperacion || 'Completar la racha de 5 dias seguidos con fichaje puntual para recuperar el bono de +50 pts'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Bloque 5: Historial de Felicitaciones y Feedback */}
                      <div className="bg-[#F9FAF9] border border-slate-100 rounded-lg p-4 space-y-3">
                        <h5 className="text-[11px] font-extrabold text-[#4B9CD3] uppercase tracking-wider">
                          Historial de Felicitaciones y Feedback
                        </h5>
                        <div className="space-y-3 text-xs">
                          <div>
                            <p className="text-[9px] text-[#4B9CD3] font-bold uppercase">Felicitaciones</p>
                            <ul className="text-xs text-slate-700 mt-1 space-y-1.5">
                              {(performanceData.historialFeedback?.felicitaciones || [
                                'Excelente atencion en caja y recomendacion del parfait (Cliente)',
                                'Gran apoyo en la sanitizacion rapida (Compañero)'
                              ]).map((fel: string, idx: number) => (
                                <li key={idx} className="bg-white p-1.5 rounded-sm border border-slate-100/60">
                                  {fel}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="pt-2 border-t border-slate-200/40">
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Feedback Registrado</p>
                            <p className="text-xs text-slate-700 font-medium italic mt-1 bg-white p-1.5 rounded-sm border border-slate-100/60 leading-relaxed">
                              {performanceData.historialFeedback?.feedbackRegistrado || 'Reforzar la oferta activa de bebidas antes de cerrar la cuenta.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bloque 6: Diagnostico y Plan de Accion (Sin cambios de horario) */}
                    <div className="bg-[#FFFDF6] border border-[#E2E8F0]/60 rounded-lg p-5 mt-2 space-y-3">
                      <h5 className="text-[11px] font-extrabold text-[#4B9CD3] uppercase tracking-wider">
                        Diagnostico y Plan de Accion (Optimizacion de Turno)
                      </h5>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Enfoque Operativo Sugerido</p>
                          <p className="text-xs text-[#2C3E50] leading-relaxed font-bold mt-1">
                            {performanceData.diagnosticoPlanAccion?.resumenEjecutivo || 'Enfocar al trabajador en mantener la estrategia de venta cruzada de proteina durante los picos de atencion de su turno rotativo y aprovechar las tareas de inicio de jornada para recuperar la bonificacion de puntualidad.'}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-[#E2E8F0]/40">
                          <p className="text-[10px] text-[#4B9CD3] font-bold uppercase mb-1.5">Recomendaciones Tacticas para el Administrador</p>
                          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {(performanceData.diagnosticoPlanAccion?.recomendaciones || [
                              'Mantener la estrategia de venta cruzada de proteina durante los picos de atencion del turno rotativo.',
                              'Aprovechar las tareas de inicio de jornada para recuperar la bonificacion de puntualidad.',
                              'Ofrecer de forma proactiva toppings de alto valor para elevar el ticket promedio.'
                            ]).map((rec: string, idx: number) => (
                              <li key={idx} className="bg-white p-2.5 rounded border border-slate-100 text-xs text-slate-700 leading-normal">
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GESTIÓN DE CATEGORÍAS */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-lg border border-[#E2E8F0] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Cabecera */}
            <div className="px-5 py-4 border-b border-[#FFFDF6] flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-sm font-black text-[#2C3E50] uppercase tracking-wide text-[#4B9CD3]">
                  Mantenimiento de Categorías Dinámicas
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  Gestiona las clasificaciones del sistema en tiempo real.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setDeleteConfirmation(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            {/* Contenido */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Selector de Tipo (Tabs) */}
              <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-lg text-[10px] font-bold text-center">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategoryType('areasTrabajo');
                    setDeleteConfirmation(null);
                  }}
                  className={`py-1.5 px-1 rounded-md transition-all cursor-pointer ${
                    activeCategoryType === 'areasTrabajo'
                      ? 'bg-white text-[#4B9CD3] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Áreas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategoryType('inventario');
                    setDeleteConfirmation(null);
                  }}
                  className={`py-1.5 px-1 rounded-md transition-all cursor-pointer ${
                    activeCategoryType === 'inventario'
                      ? 'bg-white text-[#4B9CD3] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Insumos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategoryType('productosFit');
                    setDeleteConfirmation(null);
                  }}
                  className={`py-1.5 px-1 rounded-md transition-all cursor-pointer ${
                    activeCategoryType === 'productosFit'
                      ? 'bg-white text-[#4B9CD3] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Productos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategoryType('tareas');
                    setDeleteConfirmation(null);
                  }}
                  className={`py-1.5 px-1 rounded-md transition-all cursor-pointer ${
                    activeCategoryType === 'tareas'
                      ? 'bg-white text-[#4B9CD3] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tipos Checklist
                </button>
              </div>

              {/* Formulario Agregar */}
              <div className="bg-[#FFFDF6] p-3 rounded-lg border border-[#E2E8F0]/60 space-y-2">
                <label className="block text-[10px] font-bold text-[#4B9CD3] uppercase tracking-wider">
                  Nueva Categoría ({activeCategoryType === 'areasTrabajo' ? 'Áreas de Trabajo' : activeCategoryType === 'inventario' ? 'Insumos de Inventario' : activeCategoryType === 'productosFit' ? 'Productos de la Carta' : 'Clasificaciones de Checklists'})
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Escribe el nombre de la nueva categoría..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCategory(activeCategoryType, newCategoryName);
                      }
                    }}
                    className="flex-1 text-xs px-3 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3] bg-white h-8"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCategory(activeCategoryType, newCategoryName)}
                    className="bg-[#4B9CD3] hover:bg-[#3A82B4] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors h-8 cursor-pointer"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              {/* Advertencia / Confirmación de Eliminación */}
              {deleteConfirmation && (
                <div className="bg-red-50 border border-red-200 p-3.5 rounded-lg space-y-2.5 animate-in slide-in-from-top duration-200">
                  <p className="text-red-800 text-xs font-bold leading-normal">
                    Aviso de Asociación Operativa: La categoría <span className="font-extrabold underline">"{deleteConfirmation.category}"</span> tiene {deleteConfirmation.elementsCount} elementos o tareas activas asignadas.
                  </p>
                  <p className="text-slate-600 text-[10px] leading-relaxed">
                    Si confirmas la eliminación, el sistema reasignará automáticamente todos estos registros a la categoría por defecto <span className="font-bold text-[#4B9CD3]">"General"</span> para mantener la consistencia histórica.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={confirmDeleteCategoryAndReassign}
                      className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                    >
                      Confirmar Reasignación y Eliminar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmation(null)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-extrabold px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Listado de Categorías Existentes */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Categorías Registradas ({categorias[activeCategoryType].length})
                </h4>
                {categorias[activeCategoryType].length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay categorías registradas en esta sección.</p>
                ) : (
                  <div className="divide-y divide-[#FFFDF6] border border-slate-100 rounded-lg overflow-hidden">
                    {categorias[activeCategoryType].map(cat => (
                      <div key={cat} className="flex justify-between items-center px-3 py-2 bg-white text-xs text-slate-700 font-bold hover:bg-slate-50">
                        <span>{cat}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(activeCategoryType, cat)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-md text-[10px] font-extrabold transition-all cursor-pointer px-2"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pie de modal */}
            <div className="px-5 py-3 border-t border-[#FFFDF6] bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowCategoryModal(false);
                  setDeleteConfirmation(null);
                }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW DE EVIDENCIA FOTOGRÁFICA */}
      {selectedPreviewPhoto && (
        <div 
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
          onClick={() => setSelectedPreviewPhoto(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                  Vista Ampliada de Evidencia
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  Inspección visual de la tarea cargada por el colaborador.
                </p>
              </div>
              <button
                onClick={() => setSelectedPreviewPhoto(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold bg-slate-200/50 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Contenido / Imagen */}
            <div className="p-4 bg-slate-950 flex justify-center items-center overflow-hidden max-h-[70vh]">
              <img 
                src={selectedPreviewPhoto} 
                alt="Evidencia Ampliada" 
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-md animate-in fade-in zoom-in-90 duration-300"
              />
            </div>

            {/* Pie */}
            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <a 
                href={selectedPreviewPhoto} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs text-[#4B9CD3] hover:text-[#3A82B4] font-bold flex items-center gap-1 cursor-pointer"
              >
                Abrir en nueva pestaña ↗
              </a>
              <button
                type="button"
                onClick={() => setSelectedPreviewPhoto(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Cerrar Vista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AUDITORÍA: EDITAR VENTA */}
      {editingVentaModal.open && editingVentaModal.venta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF6] border-2 border-[#4B9CD3] rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 text-[#2C3E50] relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setEditingVentaModal(prev => ({ ...prev, open: false, venta: null }))}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-extrabold text-xs w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Cerrar"
            >
              X
            </button>

            <div className="border-b border-[#E2E8F0] pb-3 pr-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#4B9CD3] block">
                Control de Auditoría Administrador
              </span>
              <h3 className="text-base font-extrabold text-[#2C3E50]">
                Editar Registro de Venta #{editingVentaModal.venta.id}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Modifica el medio de pago, los datos del cliente o la cantidad de ítems del ticket.
              </p>
            </div>

            {/* Formulario de Modificación */}
            <div className="space-y-4">
              {/* Cliente y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-[#2C3E50] uppercase tracking-wider mb-1">
                    Nombre del Cliente
                  </label>
                  <input
                    type="text"
                    value={editingVentaModal.cliente_nombre}
                    onChange={(e) => setEditingVentaModal(prev => ({ ...prev, cliente_nombre: e.target.value }))}
                    placeholder="Ej. María Gómez"
                    className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4B9CD3] font-medium text-[#2C3E50] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#2C3E50] uppercase tracking-wider mb-1">
                    Teléfono del Cliente
                  </label>
                  <input
                    type="tel"
                    value={editingVentaModal.cliente_telefono}
                    onChange={(e) => setEditingVentaModal(prev => ({ ...prev, cliente_telefono: e.target.value }))}
                    placeholder="Ej. 3001234567"
                    className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4B9CD3] font-medium text-[#2C3E50] bg-white"
                  />
                </div>
              </div>

              {/* Medio de Pago */}
              <div>
                <label className="block text-[11px] font-extrabold text-[#2C3E50] uppercase tracking-wider mb-1">
                  Medio de Pago Asignado
                </label>
                <select
                  value={editingVentaModal.metodo_pago}
                  onChange={(e) => setEditingVentaModal(prev => ({ ...prev, metodo_pago: e.target.value }))}
                  className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4B9CD3] font-medium text-[#2C3E50] bg-white capitalize"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta (Datáfono)</option>
                  <option value="transferencia">Transferencia Nequi / Bancolombia</option>
                  <option value="rappi">Rappi</option>
                </select>
              </div>

              {/* Modificación de Productos en el Ticket */}
              <div>
                <label className="block text-[11px] font-extrabold text-[#2C3E50] uppercase tracking-wider mb-2">
                  Ítems y Cantidades del Ticket
                </label>
                <div className="space-y-2 border border-[#E2E8F0] rounded-xl p-3 bg-white max-h-[180px] overflow-y-auto">
                  {editingVentaModal.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-[#2C3E50] block truncate">{item.nombre}</span>
                        <span className="text-[10px] text-slate-400 font-mono">${item.precio.toFixed(2)} c/u</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-slate-500">Cant:</span>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={item.cantidad}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            const updatedItems = [...editingVentaModal.items];
                            updatedItems[idx] = { ...updatedItems[idx], cantidad: val };
                            setEditingVentaModal(prev => ({ ...prev, items: updatedItems }));
                          }}
                          className="w-14 text-center px-2 py-1 border border-[#E2E8F0] rounded-md font-bold text-xs"
                        />
                        <span className="font-extrabold text-[#2C3E50] w-16 text-right">
                          ${(item.precio * item.cantidad).toFixed(2)}
                        </span>
                        {editingVentaModal.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updatedItems = editingVentaModal.items.filter((_, i) => i !== idx);
                              setEditingVentaModal(prev => ({ ...prev, items: updatedItems }));
                            }}
                            className="text-red-500 hover:text-red-700 text-xs font-bold px-1.5 py-0.5 rounded-md hover:bg-red-50 cursor-pointer"
                            title="Eliminar ítem"
                          >
                            X
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Agregar producto del catálogo al ticket */}
                <div className="mt-2 flex gap-2">
                  <select
                    value={editingVentaModal.selectedProdIdToAdd}
                    onChange={(e) => setEditingVentaModal(prev => ({ ...prev, selectedProdIdToAdd: e.target.value }))}
                    className="flex-1 text-xs px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg bg-white"
                  >
                    <option value="">-- Agregar producto del catálogo --</option>
                    {productosCatalogo.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} (${p.precio.toFixed(2)})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editingVentaModal.selectedProdIdToAdd) return;
                      const prodToAdd = productosCatalogo.find(p => p.id === editingVentaModal.selectedProdIdToAdd);
                      if (!prodToAdd) return;
                      
                      const existingIdx = editingVentaModal.items.findIndex(i => i.producto_id === prodToAdd.id || i.nombre === prodToAdd.nombre);
                      if (existingIdx >= 0) {
                        const updatedItems = [...editingVentaModal.items];
                        updatedItems[existingIdx].cantidad += 1;
                        setEditingVentaModal(prev => ({ ...prev, items: updatedItems, selectedProdIdToAdd: '' }));
                      } else {
                        setEditingVentaModal(prev => ({
                          ...prev,
                          items: [
                            ...prev.items,
                            {
                              producto_id: prodToAdd.id,
                              nombre: prodToAdd.nombre,
                              codigo: prodToAdd.codigo,
                              precio: prodToAdd.precio,
                              cantidad: 1
                            }
                          ],
                          selectedProdIdToAdd: ''
                        }));
                      }
                    }}
                    className="px-3 py-1.5 bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Agregar Ítem
                  </button>
                </div>
              </div>

              {/* Resumen Total Recalculado */}
              {(() => {
                const totalCalculado = editingVentaModal.items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
                return (
                  <div className="p-3 bg-[#EBF5FB] border border-[#AED6F1] rounded-xl flex items-center justify-between text-xs">
                    <span className="font-extrabold uppercase text-slate-600 text-[11px]">
                      Monto Total Recalculado
                    </span>
                    <span className="text-base font-black text-[#4B9CD3]">
                      ${totalCalculado.toFixed(2)}
                    </span>
                  </div>
                );
              })()}

              {/* Botones de Acción */}
              <div className="flex gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setEditingVentaModal(prev => ({ ...prev, open: false, venta: null }))}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!editingVentaModal.venta) return;
                    const recalculatedTotal = editingVentaModal.items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
                    const updatedVenta: Venta = {
                      ...editingVentaModal.venta,
                      cliente_nombre: editingVentaModal.cliente_nombre.trim(),
                      cliente_telefono: editingVentaModal.cliente_telefono.trim(),
                      metodo_pago: editingVentaModal.metodo_pago,
                      productos_vendidos: editingVentaModal.items,
                      total: recalculatedTotal
                    };
                    if (onUpdateVenta) {
                      onUpdateVenta(updatedVenta);
                    }
                    setEditingVentaModal({ open: false, venta: null, metodo_pago: 'efectivo', cliente_nombre: '', cliente_telefono: '', items: [], selectedProdIdToAdd: '' });
                  }}
                  className="flex-1 py-2.5 px-4 bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer text-center"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AUDITORÍA: ANULAR / ELIMINAR VENTA */}
      {annullingVentaModal.open && annullingVentaModal.venta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF6] border-2 border-red-500 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-[#2C3E50] relative">
            <button
              type="button"
              onClick={() => setAnnullingVentaModal(prev => ({ ...prev, open: false, venta: null }))}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-extrabold text-xs w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Cerrar"
            >
              X
            </button>

            <div className="text-center space-y-1.5 border-b border-[#E2E8F0] pb-4 pr-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-red-600 block">
                Auditoría - Anulación de Transacción
              </span>
              <h3 className="text-base font-extrabold text-[#2C3E50]">
                ¿Confirmas la anulación de esta venta?
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Los montos se descontarán del reporte de caja y los puntos del colaborador.
              </p>
            </div>

            {/* Resumen de la Venta a Anular */}
            <div className="p-3 bg-red-50/50 border border-red-200 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between font-bold text-slate-700">
                <span>Vendedor: {annullingVentaModal.venta.vendedor_nombre}</span>
                <span>${annullingVentaModal.venta.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Fecha: {annullingVentaModal.venta.fecha} {annullingVentaModal.venta.hora}</span>
                <span className="capitalize">Pago: {annullingVentaModal.venta.metodo_pago || 'Efectivo'}</span>
              </div>
              <div className="text-[11px] text-slate-600 font-medium pt-1 border-t border-red-100">
                Cliente: {annullingVentaModal.venta.cliente_nombre || 'Cliente General'} ({annullingVentaModal.venta.cliente_telefono || 'Sin teléfono'})
              </div>
            </div>

            {/* Campo Obligatorio de Motivo */}
            <div>
              <label className="block text-[11px] font-extrabold text-[#2C3E50] uppercase tracking-wider mb-1">
                Motivo de la anulación <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={annullingVentaModal.motivo}
                onChange={(e) => setAnnullingVentaModal(prev => ({ ...prev, motivo: e.target.value }))}
                placeholder="Ej. Error de digitación, Cliente canceló pedido..."
                className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400 font-medium text-[#2C3E50] bg-white"
                required
              />
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-2 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setAnnullingVentaModal(prev => ({ ...prev, open: false, venta: null }))}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!annullingVentaModal.motivo.trim()}
                onClick={() => {
                  if (!annullingVentaModal.venta || !annullingVentaModal.motivo.trim()) return;
                  if (onAnularVenta) {
                    onAnularVenta(annullingVentaModal.venta.id, annullingVentaModal.motivo.trim());
                  }
                  setAnnullingVentaModal({ open: false, venta: null, motivo: '' });
                }}
                className={`flex-1 py-2.5 px-4 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer text-center ${
                  !annullingVentaModal.motivo.trim()
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 shadow-sm'
                }`}
              >
                Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
