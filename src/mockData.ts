/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Usuario, Tarea, ProductoPromocion, RegistroVenta, Fichaje, Incidencia, Anuncio, InventarioItem, TurnoSemanal, Producto, Venta, AlertaPanico, CuadreCaja, Cliente } from './types';

export const INITIAL_CLIENTES: Cliente[] = [
  {
    id: 'cli-1',
    nombre: 'Valentina Mendoza',
    telefono: '3001234567',
    fecha_registro: '2026-07-10',
    total_compras_monto: 185.00,
    total_compras_count: 5,
    ultima_fecha_compra: '2026-08-20'
  },
  {
    id: 'cli-2',
    nombre: 'Carlos Andrés Gómez',
    telefono: '3119876543',
    fecha_registro: '2026-08-01',
    total_compras_monto: 120.50,
    total_compras_count: 4,
    ultima_fecha_compra: '2026-08-19'
  },
  {
    id: 'cli-3',
    nombre: 'Lucía Fernández',
    telefono: '3205558822',
    fecha_registro: '2026-06-15',
    total_compras_monto: 45.00,
    total_compras_count: 1,
    ultima_fecha_compra: '2026-06-15'
  },
  {
    id: 'cli-4',
    nombre: 'Martín Benítez',
    telefono: '3154443322',
    fecha_registro: '2026-08-15',
    total_compras_monto: 95.00,
    total_compras_count: 3,
    ultima_fecha_compra: '2026-08-21'
  }
];

export const INITIAL_USUARIOS: Usuario[] = [
  {
    id: 'usr-admin',
    nombre: 'Mariana Silva',
    rol: 'admin',
    foto_avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120',
    email: 'mariana.silva@coccolefit.com',
    password: 'admin123',
    clave_maestra: 'COCCOLE2026',
    telefono: '+54 9 11 4321-8765'
  },
  {
    id: 'usr-1',
    nombre: 'Camila Vega',
    rol: 'empleado',
    pin: '1234',
    area_preferida: 'Atención/Caja',
    meta_tareas_diarias: 6,
    foto_avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120',
    insignia_actual: 'Campeona de Ventas ✨',
    email: 'camila.vega@coccolefit.com',
    telefono: '+54 9 11 5500-1234',
    tareasCumplidasPct: '94%',
    llegadasTardesCount: 1,
    ventasTotales: '185',
    picoHorarioVentas: 'Viernes y Sábados de 12:00 PM a 2:00 PM',
    productosTop: ['Parfait Berry Chía Slim', 'Smoothie Verde Detox'],
    productosBajos: ['Bebida Hidratante', 'Topping de Chía']
  },
  {
    id: 'usr-2',
    nombre: 'Diego Torres',
    rol: 'empleado',
    pin: '5582',
    area_preferida: 'Cocina/Preparación',
    meta_tareas_diarias: 8,
    foto_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
    insignia_actual: 'Máster Chef Fit 🥗',
    email: 'diego.torres@coccolefit.com',
    telefono: '+54 9 11 5500-5678',
    tareasCumplidasPct: '88%',
    llegadasTardesCount: 2,
    ventasTotales: '45',
    picoHorarioVentas: 'Miércoles y Jueves de 1:00 PM a 3:00 PM',
    productosTop: ['Adición Whey Protein Isolate', 'Sándwich Pavita y Hummus Fit'],
    productosBajos: ['Açai Bowl Antioxidante', 'Jugo Naranja Cúrcuma Cold Press']
  },
  {
    id: 'usr-3',
    nombre: 'Sofía Castro',
    rol: 'empleado',
    pin: '2468',
    area_preferida: 'Empaque/Despacho',
    meta_tareas_diarias: 5,
    foto_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120',
    insignia_actual: 'Puntualidad Estrella ',
    email: 'sofia.castro@coccolefit.com',
    telefono: '+54 9 11 5500-9012',
    tareasCumplidasPct: '91%',
    llegadasTardesCount: 0,
    ventasTotales: '98',
    picoHorarioVentas: 'Jueves y Sábados de 11:30 AM a 1:30 PM',
    productosTop: ['Açai Bowl Antioxidante', 'Parfait Berry Chía Slim'],
    productosBajos: ['Sándwich Pavita y Hummus Fit', 'Smoothie Verde Detox']
  },
  {
    id: 'usr-4',
    nombre: 'Mateo Ruiz',
    rol: 'empleado',
    pin: '1357',
    area_preferida: 'Limpieza',
    meta_tareas_diarias: 5,
    foto_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120',
    insignia_actual: 'Héroe del Orden 🧹',
    email: 'mateo.ruiz@coccolefit.com',
    telefono: '+54 9 11 5500-3456',
    tareasCumplidasPct: '96%',
    llegadasTardesCount: 1,
    ventasTotales: '12',
    picoHorarioVentas: 'Lunes de 12:00 PM a 2:00 PM',
    productosTop: ['Adición Whey Protein Isolate', 'Smoothie Verde Detox'],
    productosBajos: ['Parfait Berry Chía Slim', 'Açai Bowl Antioxidante']
  }
];

export const INITIAL_PRODUCTOS: ProductoPromocion[] = [
  {
    id: 'prod-1',
    nombre_producto: 'Parfait Berry Chía Slim',
    fecha: '2026-08-20',
    meta_diaria_unidades: 20,
    puntos_por_unidad: 10
  },
  {
    id: 'prod-2',
    nombre_producto: 'Adición de Proteína Isolate Whey',
    fecha: '2026-08-20',
    meta_diaria_unidades: 25,
    puntos_por_unidad: 5
  },
  {
    id: 'prod-3',
    nombre_producto: 'Smoothie Verde Detox (Prensa en Frío)',
    fecha: '2026-08-20',
    meta_diaria_unidades: 15,
    puntos_por_unidad: 8
  }
];

export const INITIAL_ANUNCIOS: Anuncio[] = [
  {
    id: 'an-1',
    titulo: '¡Impulso en Desayuno Saludable!',
    contenido: 'Hoy priorizamos ofrecer la adición de chía hidratada y proteína aislada en cada tazón o parfait. ¡Recuerden mencionar los beneficios antioxidantes a los clientes!',
    fecha: '2026-08-20',
    creador_nombre: 'Mariana Silva (Admin)'
  },
  {
    id: 'an-2',
    titulo: 'Nueva meta del mes lograda',
    contenido: 'Gracias a todos por mantener la cocina en óptimas condiciones de higiene. ¡La auditoría del lunes fue un éxito de 100%!',
    fecha: '2026-08-19',
    creador_nombre: 'Mariana Silva (Admin)'
  }
];

const generateDefaultTareas = (): Tarea[] => {
  const tareasList: Tarea[] = [];
  const employees = ['usr-1', 'usr-2', 'usr-3', 'usr-4'];
  
  const templates = [
    {
      titulo: 'Revisar caja y verificar la base predeterminada',
      descripcion: 'Contar fondo inicial y asegurar la base de efectivo antes de la apertura.',
      area: 'Atención/Caja',
      tiempo_estimado_min: 15,
      requiere_foto: false,
      tipo_tarea: 'Apertura'
    },
    {
      titulo: 'Revisar neveras',
      descripcion: 'Verificar temperaturas y correcto funcionamiento de todos los refrigeradores.',
      area: 'Cocina/Preparación',
      tiempo_estimado_min: 10,
      requiere_foto: true,
      tipo_tarea: 'Apertura'
    },
    {
      titulo: 'Limpiar vitrinas',
      descripcion: 'Limpiar vidrios y superficies de vitrinas de exhibición.',
      area: 'Limpieza',
      tiempo_estimado_min: 15,
      requiere_foto: false,
      tipo_tarea: 'Sanitización'
    },
    {
      titulo: 'Limpiar la pantalla del televisor',
      descripcion: 'Quitar polvo y huellas de la pantalla principal del salón.',
      area: 'Limpieza',
      tiempo_estimado_min: 10,
      requiere_foto: false,
      tipo_tarea: 'Sanitización'
    },
    {
      titulo: 'Hacer inventario en la nevera',
      descripcion: 'Contar ingredientes y materias primas refrigeradas.',
      area: 'Cocina/Preparación',
      tiempo_estimado_min: 20,
      requiere_foto: false,
      tipo_tarea: 'Apertura'
    },
    {
      titulo: 'Hacer inventario de lo que está afuera',
      descripcion: 'Revisar stock de toppings, servilletas y barras en mostrador.',
      area: 'Atención/Caja',
      tiempo_estimado_min: 15,
      requiere_foto: false,
      tipo_tarea: 'Apertura'
    },
    {
      titulo: 'Cambiar el papel de las fresas',
      descripcion: 'Renovar el papel absorbente en recipientes de fresas para mantener frescura.',
      area: 'Cocina/Preparación',
      tiempo_estimado_min: 15,
      requiere_foto: false,
      tipo_tarea: 'Apertura'
    },
    {
      titulo: 'Hacer inventario de faltantes',
      descripcion: 'Anotar productos con bajo stock para pedido del día.',
      area: 'Atención/Caja',
      tiempo_estimado_min: 15,
      requiere_foto: false,
      tipo_tarea: 'Apertura'
    },
    {
      titulo: 'Pegar stickers en empaques',
      descripcion: 'Rotular bolsas y envases eco-friendly con etiquetas de la marca.',
      area: 'Empaque/Despacho',
      tiempo_estimado_min: 30,
      requiere_foto: false,
      tipo_tarea: 'Sanitización'
    },
    {
      titulo: 'Revisar y contar desechables.',
      descripcion: 'Validar stock de cucharas, servilletas, pitillos y vasos.',
      area: 'Empaque/Despacho',
      tiempo_estimado_min: 15,
      requiere_foto: false,
      tipo_tarea: 'Sanitización'
    },
    {
      titulo: 'Preparar y repartir degustaciones en la entrada (atraer clientes)',
      descripcion: 'Ofrecer muestras de parfait y smoothies a los transeúntes.',
      area: 'Atención/Caja',
      tiempo_estimado_min: 30,
      requiere_foto: true,
      tipo_tarea: 'Venta Activa'
    },
    {
      titulo: 'Ofrecer topping y botella de agua',
      descripcion: 'Impulsar venta sugestiva ofreciendo adiciones y bebidas a cada orden.',
      area: 'Atención/Caja',
      tiempo_estimado_min: 120,
      requiere_foto: false,
      tipo_tarea: 'Venta Activa'
    },
    {
      titulo: 'Invitar al cliente a su próxima visita o recordarle productos del mes',
      descripcion: 'Fidelizar clientes comunicando promociones y lanzamientos.',
      area: 'Atención/Caja',
      tiempo_estimado_min: 120,
      requiere_foto: false,
      tipo_tarea: 'Venta Activa'
    },
    {
      titulo: 'Limpiar cafetera',
      descripcion: 'Realizar retrolavado y limpieza de lanceta de vapor.',
      area: 'Cocina/Preparación',
      tiempo_estimado_min: 15,
      requiere_foto: false,
      tipo_tarea: 'Sanitización'
    },
    {
      titulo: 'Limpiar licuadora',
      descripcion: 'Desarmar, lavar y desinfectar vaso y cuchillas de licuadoras.',
      area: 'Cocina/Preparación',
      tiempo_estimado_min: 15,
      requiere_foto: false,
      tipo_tarea: 'Sanitización'
    },
    {
      titulo: 'Limpiar freidora (air fryer)',
      descripcion: 'Retirar grasa y limpiar canastilla de la freidora de aire.',
      area: 'Cocina/Preparación',
      tiempo_estimado_min: 15,
      requiere_foto: false,
      tipo_tarea: 'Sanitización'
    },
    {
      titulo: 'Limpiar nevera por dentro y por fuera',
      descripcion: 'Desinfectar repisas y manijas exteriores de refrigeradores.',
      area: 'Limpieza',
      tiempo_estimado_min: 30,
      requiere_foto: true,
      tipo_tarea: 'Cierre'
    },
    {
      titulo: 'Rodar el enfriador y limpiar su espacio',
      descripcion: 'Mover el enfriador vertical para barrer y trapar detrás/debajo del equipo.',
      area: 'Limpieza',
      tiempo_estimado_min: 20,
      requiere_foto: false,
      tipo_tarea: 'Cierre'
    },
    {
      titulo: 'Lavar zona de picado y preparación',
      descripcion: 'Higienizar tablas de picar, cuchillos y mesada de acero inoxidable.',
      area: 'Cocina/Preparación',
      tiempo_estimado_min: 25,
      requiere_foto: true,
      tipo_tarea: 'Cierre'
    },
    {
      titulo: 'Mantener la zona de trabajo limpia',
      descripcion: 'Limpiar derrames inmediatamente y organizar utensilios continuamente.',
      area: 'Limpieza',
      tiempo_estimado_min: 180,
      requiere_foto: false,
      tipo_tarea: 'Sanitización'
    },
    {
      titulo: 'Barrer adentro',
      descripcion: 'Eliminar suciedad y polvo del piso interior del local.',
      area: 'Limpieza',
      tiempo_estimado_min: 15,
      requiere_foto: false,
      tipo_tarea: 'Cierre'
    },
    {
      titulo: 'Trapear afuera',
      descripcion: 'Limpiar piso de la entrada exterior con desinfectante.',
      area: 'Limpieza',
      tiempo_estimado_min: 15,
      requiere_foto: false,
      tipo_tarea: 'Cierre'
    },
    {
      titulo: 'Lavar el trapero',
      descripcion: 'Lavar, desinfectar y colgar el trapero al final de la jornada.',
      area: 'Limpieza',
      tiempo_estimado_min: 10,
      requiere_foto: false,
      tipo_tarea: 'Cierre'
    },
    {
      titulo: 'Botar la basura',
      descripcion: 'Retirar bolsas de residuos, amarrar y llevar al punto de recolección.',
      area: 'Limpieza',
      tiempo_estimado_min: 10,
      requiere_foto: true,
      tipo_tarea: 'Cierre'
    }
  ];

  let taskIdCounter = 1;
  for (const empId of employees) {
    templates.forEach((t, index) => {
      // Simular un estado de jornada inicial realista para cada trabajador
      // - Las primeras 4 tareas completadas para simular progreso activo en el dashboard
      // - Las siguientes 2 en proceso
      // - Las restantes pendientes
      let estado: 'Pendiente' | 'En proceso' | 'Completada' = 'Pendiente';
      let hora_inicio: string | undefined;
      let hora_fin: string | undefined;
      let foto_url: string | undefined;
      let nota_evidencia: string | undefined;

      if (index < 4) {
        estado = 'Completada';
        hora_inicio = '07:00';
        hora_fin = '07:30';
        if (t.requiere_foto) {
          foto_url = 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=200';
          nota_evidencia = 'Apertura e inspección inicial completada con éxito.';
        }
      } else if (index >= 4 && index < 6) {
        estado = 'En proceso';
        hora_inicio = '08:00';
      }

      tareasList.push({
        id: `tsk-${empId}-${taskIdCounter++}`,
        titulo: t.titulo,
        descripcion: t.descripcion,
        area: t.area as any,
        fecha: '2026-08-20',
        estado,
        asignado_a: empId,
        tiempo_estimado_min: t.tiempo_estimado_min,
        hora_inicio,
        hora_fin,
        requiere_foto: t.requiere_foto,
        foto_url,
        nota_evidencia,
        tipo_tarea: t.tipo_tarea
      });
    });
  }

  return tareasList;
};

export const INITIAL_TAREAS: Tarea[] = generateDefaultTareas();

// Registro de ventas de hoy y previos
export const INITIAL_REGISTRO_VENTAS: RegistroVenta[] = [
  // Ventas de hoy
  { id: 'v-1', producto_id: 'prod-1', usuario_id: 'usr-1', fecha: '2026-08-20', unidades_contadas: 14 },
  { id: 'v-2', producto_id: 'prod-2', usuario_id: 'usr-1', fecha: '2026-08-20', unidades_contadas: 18 },
  { id: 'v-3', producto_id: 'prod-3', usuario_id: 'usr-1', fecha: '2026-08-20', unidades_contadas: 8 },
  { id: 'v-4', producto_id: 'prod-1', usuario_id: 'usr-3', fecha: '2026-08-20', unidades_contadas: 3 },
  { id: 'v-5', producto_id: 'prod-2', usuario_id: 'usr-2', fecha: '2026-08-20', unidades_contadas: 2 },

  // Ventas pasadas de Camila (usr-1) para alimentar métricas semanales y mensuales
  { id: 'v-101', producto_id: 'prod-1', usuario_id: 'usr-1', fecha: '2026-08-19', unidades_contadas: 15 },
  { id: 'v-102', producto_id: 'prod-2', usuario_id: 'usr-1', fecha: '2026-08-19', unidades_contadas: 22 },
  { id: 'v-103', producto_id: 'prod-1', usuario_id: 'usr-1', fecha: '2026-08-18', unidades_contadas: 18 },
  { id: 'v-104', producto_id: 'prod-2', usuario_id: 'usr-1', fecha: '2026-08-17', unidades_contadas: 25 },
  { id: 'v-105', producto_id: 'prod-1', usuario_id: 'usr-1', fecha: '2026-08-15', unidades_contadas: 20 },

  // Ventas pasadas de Diego (usr-2)
  { id: 'v-201', producto_id: 'prod-2', usuario_id: 'usr-2', fecha: '2026-08-19', unidades_contadas: 4 },
  { id: 'v-202', producto_id: 'prod-2', usuario_id: 'usr-2', fecha: '2026-08-18', unidades_contadas: 6 },

  // Ventas pasadas de Sofía (usr-3)
  { id: 'v-301', producto_id: 'prod-1', usuario_id: 'usr-3', fecha: '2026-08-19', unidades_contadas: 5 },
  { id: 'v-302', producto_id: 'prod-1', usuario_id: 'usr-3', fecha: '2026-08-18', unidades_contadas: 4 }
];

export const INITIAL_FICHAJES: Fichaje[] = [
  // No preloaded check-ins for today, so employees can clock in manually
  
  // Historial de puntualidad
  { id: 'f-101', usuario_id: 'usr-1', fecha: '2026-08-19', hora_entrada: '07:50', hora_salida: '16:00', puntual: true, activo: false },
  { id: 'f-102', usuario_id: 'usr-2', fecha: '2026-08-19', hora_entrada: '06:55', hora_salida: '15:00', puntual: true, activo: false },
  { id: 'f-103', usuario_id: 'usr-3', fecha: '2026-08-19', hora_entrada: '07:58', hora_salida: '16:00', puntual: true, activo: false },
  { id: 'f-104', usuario_id: 'usr-4', fecha: '2026-08-19', hora_entrada: '08:00', hora_salida: '17:00', puntual: true, activo: false },

  { id: 'f-111', usuario_id: 'usr-1', fecha: '2026-08-18', hora_entrada: '07:52', hora_salida: '16:00', puntual: true, activo: false },
  { id: 'f-112', usuario_id: 'usr-2', fecha: '2026-08-18', hora_entrada: '06:50', hora_salida: '15:00', puntual: true, activo: false },
  { id: 'f-113', usuario_id: 'usr-3', fecha: '2026-08-18', hora_entrada: '08:05', hora_salida: '16:00', puntual: false, activo: false },
  { id: 'f-114', usuario_id: 'usr-4', fecha: '2026-08-18', hora_entrada: '07:58', hora_salida: '17:00', puntual: true, activo: false },
];

export const INITIAL_INCIDENCIAS: Incidencia[] = [
  {
    id: 'inc-1',
    usuario_id: 'usr-2',
    fecha: '2026-08-20',
    titulo: 'Faltante de fresas orgánicas',
    descripcion: 'Quedan menos de 2 kg en bodega y la proyección para parfaits de la tarde es de 6 kg.',
    tipo: 'insumo',
    estado: 'Pendiente'
  },
  {
    id: 'inc-2',
    usuario_id: 'usr-1',
    fecha: '2026-08-20',
    titulo: 'Fallo en dispensador de agua purificada',
    descripcion: 'El grifo del dispensador de la barra gotea constantemente, requiere ajuste de válvula.',
    tipo: 'equipo',
    estado: 'Pendiente'
  },
  {
    id: 'inc-3',
    usuario_id: 'usr-4',
    fecha: '2026-08-19',
    titulo: 'Manguera de lavado rota',
    descripcion: 'Se cambió por repuesto nuevo de bodega. Solucionado.',
    tipo: 'equipo',
    estado: 'Resuelta'
  }
];

export const INITIAL_FEEDBACK = [
  {
    id: 'fb-1',
    usuario_id: 'usr-1',
    fecha: '2026-08-20 10:15',
    titulo: 'Excelente iniciativa de venta sugerida',
    comentario: 'Camila ha mostrado una gran empatía con los clientes en la hora pico de hoy, sugiriendo con éxito los parfaits. ¡Gran actitud!',
    es_llamado_atencion: false,
    creado_por_nombre: 'Mariana Silva (Admin)'
  },
  {
    id: 'fb-2',
    usuario_id: 'usr-2',
    fecha: '2026-08-19 18:30',
    titulo: 'Limpieza de licuadoras post-proteína',
    comentario: 'Por favor Diego, asegúrate de enjuagar las licuadoras inmediatamente después de usar polvos de proteína para evitar residuos secos y alérgenos.',
    es_llamado_atencion: true,
    creado_por_nombre: 'Mariana Silva (Admin)'
  }
];

export const INITIAL_INVENTARIO: InventarioItem[] = [
  {
    id: 'inv-1',
    nombre: 'Fresas Orgánicas Silvestres',
    categoria: 'insumos',
    stock_actual: 1.8,
    stock_minimo_alerta: 3.0,
    unidad: 'Kg',
    ultima_actualizacion_fecha: '2026-08-20 09:30',
    ultima_actualizacion_por: 'Diego Torres'
  },
  {
    id: 'inv-2',
    nombre: 'Whey Protein Vainilla Organizada',
    categoria: 'insumos',
    stock_actual: 5.0,
    stock_minimo_alerta: 2.0,
    unidad: 'Frascos 1Kg',
    ultima_actualizacion_fecha: '2026-08-20 08:15',
    ultima_actualizacion_por: 'Camila Vega'
  },
  {
    id: 'inv-3',
    nombre: 'Vasos Biodegradables Coccole Fit 16oz',
    categoria: 'empaques',
    stock_actual: 120,
    stock_minimo_alerta: 150,
    unidad: 'Unidades',
    ultima_actualizacion_fecha: '2026-08-19 17:00',
    ultima_actualizacion_por: 'Sofía Castro'
  },
  {
    id: 'inv-4',
    nombre: 'Bolsas Kraft de Despacho Ecológico',
    categoria: 'empaques',
    stock_actual: 420,
    stock_minimo_alerta: 100,
    unidad: 'Unidades',
    ultima_actualizacion_fecha: '2026-08-20 10:00',
    ultima_actualizacion_por: 'Camila Vega'
  },
  {
    id: 'inv-5',
    nombre: 'Yogurt Griego Descremado Base',
    categoria: 'preparados',
    stock_actual: 12.0,
    stock_minimo_alerta: 5.0,
    unidad: 'Litros',
    ultima_actualizacion_fecha: '2026-08-20 07:45',
    ultima_actualizacion_por: 'Diego Torres'
  },
  {
    id: 'inv-6',
    nombre: 'Pasta de Maní Premium Crunchy',
    categoria: 'preparados',
    stock_actual: 1.5,
    stock_minimo_alerta: 2.5,
    unidad: 'Kg',
    ultima_actualizacion_fecha: '2026-08-20 08:30',
    ultima_actualizacion_por: 'Diego Torres'
  }
];

export const INITIAL_HORARIOS: TurnoSemanal[] = [
  // Camila Vega
  { id: 't-1', usuario_id: 'usr-1', dia_semana: 'Lunes', hora_entrada: '08:00', hora_salida: '16:00', nota: 'Turno Mañana + Caja' },
  { id: 't-2', usuario_id: 'usr-1', dia_semana: 'Martes', hora_entrada: '08:00', hora_salida: '16:00', nota: 'Caja Principal' },
  { id: 't-3', usuario_id: 'usr-1', dia_semana: 'Miércoles', hora_entrada: '08:00', hora_salida: '16:00' },
  { id: 't-4', usuario_id: 'usr-1', dia_semana: 'Jueves', hora_entrada: '08:00', hora_salida: '16:00' },
  { id: 't-5', usuario_id: 'usr-1', dia_semana: 'Viernes', hora_entrada: '08:00', hora_salida: '16:00', nota: 'Cierre de Caja Semanal' },
  // Diego Torres
  { id: 't-6', usuario_id: 'usr-2', dia_semana: 'Lunes', hora_entrada: '08:00', hora_salida: '16:00', nota: 'Encargado Cocina' },
  { id: 't-7', usuario_id: 'usr-2', dia_semana: 'Miércoles', hora_entrada: '08:00', hora_salida: '16:00' },
  { id: 't-8', usuario_id: 'usr-2', dia_semana: 'Jueves', hora_entrada: '12:00', hora_salida: '20:00', nota: 'Turno Tarde/Cierre' },
  { id: 't-9', usuario_id: 'usr-2', dia_semana: 'Sábado', hora_entrada: '09:00', hora_salida: '17:00', nota: 'Preparaciones especiales' },
  // Sofía Castro
  { id: 't-10', usuario_id: 'usr-3', dia_semana: 'Martes', hora_entrada: '08:00', hora_salida: '16:00' },
  { id: 't-11', usuario_id: 'usr-3', dia_semana: 'Jueves', hora_entrada: '08:00', hora_salida: '16:00' },
  { id: 't-12', usuario_id: 'usr-3', dia_semana: 'Viernes', hora_entrada: '08:00', hora_salida: '16:00' },
  { id: 't-13', usuario_id: 'usr-3', dia_semana: 'Sábado', hora_entrada: '09:00', hora_salida: '17:00', nota: 'Despacho ráfaga de fin de semana' },
  // Mateo Ruiz
  { id: 't-14', usuario_id: 'usr-4', dia_semana: 'Lunes', hora_entrada: '12:00', hora_salida: '20:00', nota: 'Mantenimiento preventivo' },
  { id: 't-15', usuario_id: 'usr-4', dia_semana: 'Martes', hora_entrada: '12:00', hora_salida: '20:00' },
  { id: 't-16', usuario_id: 'usr-4', dia_semana: 'Miércoles', hora_entrada: '12:00', hora_salida: '20:00' },
  { id: 't-17', usuario_id: 'usr-4', dia_semana: 'Viernes', hora_entrada: '12:00', hora_salida: '20:00' },
  { id: 't-18', usuario_id: 'usr-4', dia_semana: 'Domingo', hora_entrada: '09:00', hora_salida: '17:00', nota: 'Limpieza profunda de campanas y neveras' }
];

export const INITIAL_PRODUCTOS_CATALOGO: Producto[] = [
  { id: 'cat-1', codigo: 'PARF-01', nombre: 'Parfait Berry Chía Slim', precio: 120.00, categoria: 'Parfaits' },
  { id: 'cat-2', codigo: 'SMOT-02', nombre: 'Smoothie Verde Detox', precio: 95.00, categoria: 'Smoothies' },
  { id: 'cat-3', codigo: 'PROT-03', nombre: 'Adición Whey Protein Isolate', precio: 45.00, categoria: 'Toppings' },
  { id: 'cat-4', codigo: 'BOWL-04', nombre: 'Açai Bowl Antioxidante', precio: 150.00, categoria: 'Bowls' },
  { id: 'cat-5', codigo: 'JUIC-05', nombre: 'Jugo Naranja Cúrcuma Cold Press', precio: 80.00, categoria: 'Jugos' },
  { id: 'cat-6', codigo: 'SAND-06', nombre: 'Sándwich Pavita y Hummus Fit', precio: 110.00, categoria: 'Snacks' }
];

export const INITIAL_VENTAS_REGISTRADAS: Venta[] = [
  // Ventas del día (hoy es 2026-08-21 según local time)
  {
    id: 'vreg-1',
    fecha: '2026-08-21',
    hora: '09:15',
    usuario_id: 'usr-1',
    vendedor_nombre: 'Camila Vega',
    productos_vendidos: [
      { producto_id: 'cat-1', nombre: 'Parfait Berry Chía Slim', codigo: 'PARF-01', precio: 120, cantidad: 2 },
      { producto_id: 'cat-3', nombre: 'Adición Whey Protein Isolate', codigo: 'PROT-03', precio: 45, cantidad: 2 }
    ],
    total: 330
  },
  {
    id: 'vreg-2',
    fecha: '2026-08-21',
    hora: '11:45',
    usuario_id: 'usr-3',
    vendedor_nombre: 'Sofía Castro',
    productos_vendidos: [
      { producto_id: 'cat-4', nombre: 'Açai Bowl Antioxidante', codigo: 'BOWL-04', precio: 150, cantidad: 1 },
      { producto_id: 'cat-5', nombre: 'Jugo Naranja Cúrcuma Cold Press', codigo: 'JUIC-05', precio: 80, cantidad: 1 }
    ],
    total: 230
  },
  {
    id: 'vreg-3',
    fecha: '2026-08-21',
    hora: '14:30',
    usuario_id: 'usr-1',
    vendedor_nombre: 'Camila Vega',
    productos_vendidos: [
      { producto_id: 'cat-2', nombre: 'Smoothie Verde Detox', codigo: 'SMOT-02', precio: 95, cantidad: 3 },
      { producto_id: 'cat-6', text: '', nombre: 'Sándwich Pavita y Hummus Fit', codigo: 'SAND-06', precio: 110, cantidad: 2 } as any
    ],
    total: 505
  },

  // Ventas de ayer (2026-08-20)
  {
    id: 'vreg-4',
    fecha: '2026-08-20',
    hora: '10:00',
    usuario_id: 'usr-1',
    vendedor_nombre: 'Camila Vega',
    productos_vendidos: [
      { producto_id: 'cat-1', nombre: 'Parfait Berry Chía Slim', codigo: 'PARF-01', precio: 120, cantidad: 4 }
    ],
    total: 480
  },
  {
    id: 'vreg-5',
    fecha: '2026-08-20',
    hora: '15:20',
    usuario_id: 'usr-2',
    vendedor_nombre: 'Diego Torres',
    productos_vendidos: [
      { producto_id: 'cat-6', nombre: 'Sándwich Pavita y Hummus Fit', codigo: 'SAND-06', precio: 110, cantidad: 2 },
      { producto_id: 'cat-5', nombre: 'Jugo Naranja Cúrcuma Cold Press', codigo: 'JUIC-05', precio: 80, cantidad: 2 }
    ],
    total: 380
  },

  // Ventas históricas para simular tendencia
  {
    id: 'vreg-h1',
    fecha: '2026-08-19',
    hora: '12:30',
    usuario_id: 'usr-1',
    vendedor_nombre: 'Camila Vega',
    productos_vendidos: [{ producto_id: 'cat-1', nombre: 'Parfait Berry Chía Slim', codigo: 'PARF-01', precio: 120, cantidad: 3 }],
    total: 360
  },
  {
    id: 'vreg-h2',
    fecha: '2026-08-18',
    hora: '13:00',
    usuario_id: 'usr-3',
    vendedor_nombre: 'Sofía Castro',
    productos_vendidos: [{ producto_id: 'cat-4', nombre: 'Açai Bowl Antioxidante', codigo: 'BOWL-04', precio: 150, cantidad: 4 }],
    total: 600
  },
  {
    id: 'vreg-h3',
    fecha: '2026-08-17',
    hora: '16:15',
    usuario_id: 'usr-2',
    vendedor_nombre: 'Diego Torres',
    productos_vendidos: [{ producto_id: 'cat-2', nombre: 'Smoothie Verde Detox', codigo: 'SMOT-02', precio: 95, cantidad: 5 }],
    total: 475
  },
  {
    id: 'vreg-h4',
    fecha: '2026-08-16',
    hora: '11:10',
    usuario_id: 'usr-1',
    vendedor_nombre: 'Camila Vega',
    productos_vendidos: [
      { producto_id: 'cat-6', nombre: 'Sándwich Pavita y Hummus Fit', codigo: 'SAND-06', precio: 110, cantidad: 3 },
      { producto_id: 'cat-5', nombre: 'Jugo Naranja Cúrcuma Cold Press', codigo: 'JUIC-05', precio: 80, cantidad: 3 }
    ],
    total: 570
  },
  {
    id: 'vreg-h5',
    fecha: '2026-08-15',
    hora: '09:40',
    usuario_id: 'usr-3',
    vendedor_nombre: 'Sofía Castro',
    productos_vendidos: [{ producto_id: 'cat-1', nombre: 'Parfait Berry Chía Slim', codigo: 'PARF-01', precio: 120, cantidad: 5 }],
    total: 600
  },
  {
    id: 'vreg-h6',
    fecha: '2026-08-14',
    hora: '15:15',
    usuario_id: 'usr-2',
    vendedor_nombre: 'Diego Torres',
    productos_vendidos: [{ producto_id: 'cat-4', nombre: 'Açai Bowl Antioxidante', codigo: 'BOWL-04', precio: 150, cantidad: 3 }],
    total: 450
  },
  {
    id: 'vreg-h7',
    fecha: '2026-08-12',
    hora: '10:30',
    usuario_id: 'usr-1',
    vendedor_nombre: 'Camila Vega',
    productos_vendidos: [{ producto_id: 'cat-1', nombre: 'Parfait Berry Chía Slim', codigo: 'PARF-01', precio: 120, cantidad: 4 }],
    total: 480
  },
  {
    id: 'vreg-h8',
    fecha: '2026-08-10',
    hora: '14:20',
    usuario_id: 'usr-3',
    vendedor_nombre: 'Sofía Castro',
    productos_vendidos: [{ producto_id: 'cat-2', nombre: 'Smoothie Verde Detox', codigo: 'SMOT-02', precio: 95, cantidad: 6 }],
    total: 570
  },
  {
    id: 'vreg-h9',
    fecha: '2026-08-08',
    hora: '12:00',
    usuario_id: 'usr-1',
    vendedor_nombre: 'Camila Vega',
    productos_vendidos: [{ producto_id: 'cat-6', nombre: 'Sándwich Pavita y Hummus Fit', codigo: 'SAND-06', precio: 110, cantidad: 4 }],
    total: 440
  },
  {
    id: 'vreg-h10',
    fecha: '2026-08-06',
    hora: '11:15',
    usuario_id: 'usr-2',
    vendedor_nombre: 'Diego Torres',
    productos_vendidos: [{ producto_id: 'cat-4', nombre: 'Açai Bowl Antioxidante', codigo: 'BOWL-04', precio: 150, cantidad: 3 }],
    total: 450
  },

  // Julio 2026
  {
    id: 'vreg-h11',
    fecha: '2026-07-28',
    hora: '14:00',
    usuario_id: 'usr-1',
    vendedor_nombre: 'Camila Vega',
    productos_vendidos: [{ producto_id: 'cat-1', nombre: 'Parfait Berry Chía Slim', codigo: 'PARF-01', precio: 120, cantidad: 5 }],
    total: 600
  },
  {
    id: 'vreg-h12',
    fecha: '2026-07-20',
    hora: '11:00',
    usuario_id: 'usr-3',
    vendedor_nombre: 'Sofía Castro',
    productos_vendidos: [{ producto_id: 'cat-2', nombre: 'Smoothie Verde Detox', codigo: 'SMOT-02', precio: 95, cantidad: 8 }],
    total: 760
  },
  {
    id: 'vreg-h13',
    fecha: '2026-07-15',
    hora: '15:30',
    usuario_id: 'usr-2',
    vendedor_nombre: 'Diego Torres',
    productos_vendidos: [{ producto_id: 'cat-4', nombre: 'Açai Bowl Antioxidante', codigo: 'BOWL-04', precio: 150, cantidad: 5 }],
    total: 750
  },
  {
    id: 'vreg-h14',
    fecha: '2026-07-02',
    hora: '10:00',
    usuario_id: 'usr-1',
    vendedor_nombre: 'Camila Vega',
    productos_vendidos: [{ producto_id: 'cat-6', nombre: 'Sándwich Pavita y Hummus Fit', codigo: 'SAND-06', precio: 110, cantidad: 6 }],
    total: 660
  },

  // Junio 2026
  {
    id: 'vreg-h15',
    fecha: '2026-06-25',
    hora: '12:00',
    usuario_id: 'usr-1',
    vendedor_nombre: 'Camila Vega',
    productos_vendidos: [{ producto_id: 'cat-1', nombre: 'Parfait Berry Chía Slim', codigo: 'PARF-01', precio: 120, cantidad: 7 }],
    total: 840
  },
  {
    id: 'vreg-h16',
    fecha: '2026-06-12',
    hora: '13:10',
    usuario_id: 'usr-3',
    vendedor_nombre: 'Sofía Castro',
    productos_vendidos: [{ producto_id: 'cat-2', nombre: 'Smoothie Verde Detox', codigo: 'SMOT-02', precio: 95, cantidad: 10 }],
    total: 950
  }
];

// Helper functions for LocalStorage management
export const loadAppState = () => {
  try {
    // Clean up legacy local storage credentials key if present
    if (typeof window !== 'undefined') {
      localStorage.removeItem('coccolefit_usuarios');
      localStorage.removeItem('user_pin');
      localStorage.removeItem('users');
    }

    const tareas = localStorage.getItem('coccolefit_tareas');
    const productos = localStorage.getItem('coccolefit_productos');
    const ventas = localStorage.getItem('coccolefit_ventas');
    const fichajes = localStorage.getItem('coccolefit_fichajes');
    const incidencias = localStorage.getItem('coccolefit_incidencias');
    const anuncios = localStorage.getItem('coccolefit_anuncios');
    const feedbacks = localStorage.getItem('coccolefit_feedbacks');
    const inventario = localStorage.getItem('coccolefit_inventario');
    const horarios = localStorage.getItem('coccolefit_horarios');
    const productosCatalogo = localStorage.getItem('coccolefit_productos_catalogo');
    const ventasRegistradas = localStorage.getItem('coccolefit_ventas_registradas');
    const alertasPanico = localStorage.getItem('coccolefit_alertas_panico');
    const cuadresCaja = localStorage.getItem('coccolefit_cuadres_caja');
    const clientes = localStorage.getItem('coccolefit_clientes');

    const parsedTareas = tareas ? JSON.parse(tareas) : null;
    const finalTareas = (parsedTareas && parsedTareas.length >= 96) ? parsedTareas : INITIAL_TAREAS;

    return {
      usuarios: INITIAL_USUARIOS,
      tareas: finalTareas,
      productos: productos ? JSON.parse(productos) : INITIAL_PRODUCTOS,
      ventas: ventas ? JSON.parse(ventas) : INITIAL_REGISTRO_VENTAS,
      fichajes: fichajes ? JSON.parse(fichajes) : INITIAL_FICHAJES,
      incidencias: incidencias ? JSON.parse(incidencias) : INITIAL_INCIDENCIAS,
      anuncios: anuncios ? JSON.parse(anuncios) : INITIAL_ANUNCIOS,
      feedbacks: feedbacks ? JSON.parse(feedbacks) : INITIAL_FEEDBACK,
      inventario: inventario ? JSON.parse(inventario) : INITIAL_INVENTARIO,
      horarios: horarios ? JSON.parse(horarios) : INITIAL_HORARIOS,
      productosCatalogo: productosCatalogo ? JSON.parse(productosCatalogo) : INITIAL_PRODUCTOS_CATALOGO,
      ventasRegistradas: ventasRegistradas ? JSON.parse(ventasRegistradas) : INITIAL_VENTAS_REGISTRADAS,
      alertasPanico: alertasPanico ? JSON.parse(alertasPanico) : [] as AlertaPanico[],
      cuadresCaja: cuadresCaja ? JSON.parse(cuadresCaja) : [] as CuadreCaja[],
      clientes: clientes ? JSON.parse(clientes) : INITIAL_CLIENTES,
    };
  } catch (error) {
    console.error('Error loading app state from localStorage:', error);
    return {
      usuarios: INITIAL_USUARIOS,
      tareas: INITIAL_TAREAS,
      productos: INITIAL_PRODUCTOS,
      ventas: INITIAL_REGISTRO_VENTAS,
      fichajes: INITIAL_FICHAJES,
      incidencias: INITIAL_INCIDENCIAS,
      anuncios: INITIAL_ANUNCIOS,
      feedbacks: INITIAL_FEEDBACK,
      inventario: INITIAL_INVENTARIO,
      horarios: INITIAL_HORARIOS,
      productosCatalogo: INITIAL_PRODUCTOS_CATALOGO,
      ventasRegistradas: INITIAL_VENTAS_REGISTRADAS,
      alertasPanico: [] as AlertaPanico[],
      cuadresCaja: [] as CuadreCaja[],
      clientes: INITIAL_CLIENTES,
    };
  }
};

export const saveAppState = (state: {
  usuarios: Usuario[];
  tareas: Tarea[];
  productos: ProductoPromocion[];
  ventas: RegistroVenta[];
  fichajes: Fichaje[];
  incidencias: Incidencia[];
  anuncios: Anuncio[];
  feedbacks: any[];
  inventario?: InventarioItem[];
  horarios?: TurnoSemanal[];
  productosCatalogo?: Producto[];
  ventasRegistradas?: Venta[];
  alertasPanico?: AlertaPanico[];
  cuadresCaja?: CuadreCaja[];
  clientes?: Cliente[];
}) => {
  const trySave = (targetState: typeof state): boolean => {
    try {
      localStorage.setItem('coccolefit_tareas', JSON.stringify(targetState.tareas));
      localStorage.setItem('coccolefit_productos', JSON.stringify(targetState.productos));
      localStorage.setItem('coccolefit_ventas', JSON.stringify(targetState.ventas));
      localStorage.setItem('coccolefit_fichajes', JSON.stringify(targetState.fichajes));
      localStorage.setItem('coccolefit_incidencias', JSON.stringify(targetState.incidencias));
      localStorage.setItem('coccolefit_anuncios', JSON.stringify(targetState.anuncios));
      localStorage.setItem('coccolefit_feedbacks', JSON.stringify(targetState.feedbacks));
      if (targetState.inventario) {
        localStorage.setItem('coccolefit_inventario', JSON.stringify(targetState.inventario));
      }
      if (targetState.horarios) {
        localStorage.setItem('coccolefit_horarios', JSON.stringify(targetState.horarios));
      }
      if (targetState.productosCatalogo) {
        localStorage.setItem('coccolefit_productos_catalogo', JSON.stringify(targetState.productosCatalogo));
      }
      if (targetState.ventasRegistradas) {
        localStorage.setItem('coccolefit_ventas_registradas', JSON.stringify(targetState.ventasRegistradas));
      }
      if (targetState.alertasPanico) {
        localStorage.setItem('coccolefit_alertas_panico', JSON.stringify(targetState.alertasPanico));
      }
      if (targetState.cuadresCaja) {
        localStorage.setItem('coccolefit_cuadres_caja', JSON.stringify(targetState.cuadresCaja));
      }
      if (targetState.clientes) {
        localStorage.setItem('coccolefit_clientes', JSON.stringify(targetState.clientes));
      }
      return true;
    } catch (e) {
      return false;
    }
  };

  // Intentar guardar el estado original primero
  if (trySave(state)) {
    return;
  }

  console.warn('Límite de cuota de localStorage excedido. Iniciando mitigación automática de peso de imágenes...');

  // Mitigación 1: Eliminar o reemplazar imágenes pesadas base64 de tareas ya completadas antiguas
  const cleanedTareas = state.tareas.map(t => {
    if (t.estado === 'Completada' && t.foto_url && t.foto_url.startsWith('data:image/')) {
      return {
        ...t,
        foto_url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=200', // Placeholder liviano
        nota_evidencia: (t.nota_evidencia || '') + ' (Imagen optimizada para liberar espacio local)'
      };
    }
    return t;
  });

  if (trySave({ ...state, tareas: cleanedTareas })) {
    console.log('¡Estado guardado exitosamente en localStorage tras limpiar imágenes pesadas!');
    return;
  }

  // Mitigación 2: Si aún falla, truncar históricos de ventas antiguas para evitar bloqueos
  console.warn('La cuota sigue excedida. Truncando históricos de ventas para asegurar persistencia...');
  const truncatedVentas = state.ventasRegistradas ? state.ventasRegistradas.slice(-50) : state.ventasRegistradas;
  const truncatedVentasViejas = state.ventas ? state.ventas.slice(-50) : state.ventas;

  if (trySave({
    ...state,
    tareas: cleanedTareas,
    ventasRegistradas: truncatedVentas,
    ventas: truncatedVentasViejas
  })) {
    console.log('¡Estado guardado exitosamente tras optimizar imágenes e históricos!');
    return;
  }

  console.error('No se pudo guardar el estado en localStorage incluso tras aplicar todas las estrategias de mitigación de espacio.');
};
