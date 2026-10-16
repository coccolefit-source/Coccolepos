// ==========================================
// MODULO ADITIVO DE PRODUCTIVIDAD Y TIEMPO REAL
// (Arquitectura Segura y Aislada para Coccole Fit)
// ==========================================

import { getSupabaseClient, DEFAULT_TASKS_24_TEMPLATES, generarLoteTareasPredeterminadasAutonomas, getLocalDateString, fetchDailyTasksFromSupabase } from './supabaseClient';

(function () {
  'use strict';

  // Variable de referencia interna para el singleton de canal Realtime
  let _canalProgresoSingleton: any = null;

  // Asegurar estructura de sesión segura en memoria
  if (typeof window !== 'undefined') {
    if (!(window as any).sesionActual) {
      (window as any).sesionActual = { rol: null, nombre: null };
    }
  }

  // ==========================================
  // 1. GENERACION AUTONOMA DE TAREAS DIARIAS (24 TAREAS)
  // ==========================================
  const verificarYGenerarTareasDiarias = async () => {
    try {
      const supabase = (window as any).supabase || getSupabaseClient();
      if (!supabase) return;

      const hoyStr = getLocalDateString();
      const { data, error } = await supabase
        .from('daily_tasks')
        .select('id')
        .or(`date.eq.${hoyStr},fecha.eq.${hoyStr}`)
        .limit(1);

      if (!error && (!data || data.length === 0)) {
        console.log('Verificacion de inicio: Generando lote de 24 tareas predeterminadas para ' + hoyStr);
        await generarLoteTareasPredeterminadasAutonomas(supabase, hoyStr);
      }
    } catch (err) {
      console.warn('Advertencia al verificar tareas diarias:', err);
    }
  };

  // ==========================================
  // 2. CONSULTA Y RENDERIZADO DE PROGRESO DE EMPLEADO
  // ==========================================
  const cargarProgresoEmpleadoDesdeSupabase = async (nombreEmpleado: string, fecha: string) => {
    const container = document.getElementById('resultado-progreso-supabase');
    if (!container) return;

    container.innerHTML = '<p class="text-xs text-gray-400 py-4">Buscando registros para el ' + fecha + '...</p>';

    const supabase = (window as any).supabase || getSupabaseClient();
    if (!supabase) {
      container.innerHTML = '<p class="text-xs text-red-500 py-4">Error de conexion con Supabase.</p>';
      return;
    }

    try {
      const { data, error } = await supabase
        .from('task_progress')
        .select('*')
        .eq('employee_name', nombreEmpleado)
        .eq('fecha', fecha)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        container.innerHTML = '<p class="text-xs text-red-500 py-4">Error al consultar registros.</p>';
        return;
      }

      if (!data) {
        container.innerHTML = '<div class="py-8"><p class="text-sm font-bold text-gray-700">Sin actividad registrada el ' + fecha + '</p><p class="text-xs text-gray-400 mt-1">Completa tareas en tu checklist para actualizar tu progreso.</p></div>';
        return;
      }

      const completadas = Number(data.completadas) || 0;
      const totales = Number(data.totales) || 0;
      const porcentaje = Number(data.porcentaje) || 0;
      const updatedAtStr = data.updated_at ? new Date(data.updated_at).toLocaleTimeString() : 'Reciente';
      const colorBarra = porcentaje >= 100 ? 'bg-green-500' : porcentaje >= 50 ? 'bg-blue-600' : 'bg-amber-500';

      container.innerHTML = 
        '<div class="space-y-4 text-left">' +
          '<div class="flex justify-between items-center">' +
            '<div>' +
              '<span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha Seleccionada</span>' +
              '<h3 class="text-sm font-bold text-gray-800">' + fecha + '</h3>' +
            '</div>' +
            '<span class="text-2xl font-black text-gray-800">' + porcentaje + '%</span>' +
          '</div>' +
          '<div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">' +
            '<div class="' + colorBarra + ' h-3 rounded-full transition-all duration-500" style="width: ' + porcentaje + '%;"></div>' +
          '</div>' +
          '<div class="flex justify-between text-xs text-gray-500 pt-3 border-t border-gray-200 gap-1">' +
            '<span>Completadas: <strong class="text-gray-700">' + completadas + ' de ' + totales + '</strong></span>' +
            '<span>Actualizado: <strong class="text-gray-700">' + updatedAtStr + '</strong></span>' +
          '</div>' +
        '</div>';
    } catch (err) {
      container.innerHTML = '<p class="text-xs text-red-500 py-4">Error al procesar la informacion.</p>';
    }
  };

  // ==========================================
  // 3. INYECCION DE LA 5ª PESTAÑA DE PROGRESO (EMPLEADO)
  // ==========================================
  const inicializarSesionProgresoEmpleadoSeguro = (_nombreEmpleado = 'Shelsy') => {
    if (typeof document === 'undefined') return;
    try {
      const btn = document.getElementById('btn-tab-progreso');
      if (btn) btn.remove();
      const vista = document.getElementById('vista-progreso-empleado');
      if (vista) vista.remove();
    } catch (err) {
      console.warn('Error al limpiar sesión de progreso del empleado:', err);
    }
  };

  // ==========================================
  // 4. PANEL DE PRODUCTIVIDAD (ADMINISTRADOR)
  // ==========================================
  const cargarProductividadAdminPorFecha = async (fecha: string) => {
    const listaContainer = document.getElementById('admin-lista-productividad');
    if (!listaContainer) return;

    const supabase = (window as any).supabase || getSupabaseClient();
    if (!supabase) {
      listaContainer.innerHTML = '<p class="text-xs text-red-500 text-center py-4">Error de conexion con Supabase.</p>';
      return;
    }

    try {
      const { data, error } = await supabase.from('task_progress').select('*').eq('fecha', fecha);
      if (error || !data || data.length === 0) {
        listaContainer.innerHTML = '<p class="text-xs text-gray-500 text-center py-4">Sin registros para esta fecha.</p>';
        return;
      }

      let html = '';
      data.forEach((item: any) => {
        const colorBarra = item.porcentaje >= 100 ? 'bg-green-500' : item.porcentaje >= 50 ? 'bg-blue-600' : 'bg-amber-500';
        const actualizadoStr = item.updated_at ? new Date(item.updated_at).toLocaleTimeString() : 'Hoy';
        html += 
          '<div class="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col gap-2">' +
            '<div class="flex justify-between items-center">' +
              '<span class="text-sm font-bold text-gray-800">' + (item.employee_name || 'Colaborador') + '</span>' +
              '<span class="text-sm font-extrabold text-gray-700">' + (item.porcentaje || 0) + '%</span>' +
            '</div>' +
            '<div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">' +
              '<div class="' + colorBarra + ' h-2.5 rounded-full transition-all duration-500" style="width: ' + (item.porcentaje || 0) + '%;"></div>' +
            '</div>' +
            '<div class="flex justify-between text-xs text-gray-500 pt-1">' +
              '<span>' + (item.completadas || 0) + ' de ' + (item.totales || 0) + ' tareas</span>' +
              '<span>' + actualizadoStr + '</span>' +
            '</div>' +
          '</div>';
      });
      listaContainer.innerHTML = html;
    } catch (err) {
      listaContainer.innerHTML = '<p class="text-xs text-red-500 text-center py-4">Error al cargar productividad.</p>';
    }
  };

  const renderizarSeccionProductividadAdminSeguro = () => {
    if (typeof document === 'undefined') return;

    try {
      const existing = document.getElementById('admin-productividad-panel');
      if (existing) {
        existing.remove();
      }
    } catch (err) {
      console.warn('Error al limpiar seccion de productividad en admin:', err);
    }
  };

  // ==========================================
  // 5. TIEMPO REAL OPTIMIZADO (SINGLETON PATTERN)
  // ==========================================
  const activarSuscripcionTiempoRealSegura = () => {
    const supabase = (window as any).supabase || getSupabaseClient();
    if (!supabase) return;

    // Si ya existe un canal previo, no duplicar la conexion
    if (_canalProgresoSingleton) {
      return;
    }

    try {
      _canalProgresoSingleton = supabase
        .channel('canal-progreso-seguro')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'task_progress' }, () => {
          const inputEmpleado = document.getElementById('input-fecha-progreso') as HTMLInputElement;
          const inputAdmin = document.getElementById('admin-input-fecha') as HTMLInputElement;
          const fechaConsulta = (inputEmpleado && inputEmpleado.value) || (inputAdmin && inputAdmin.value) || getLocalDateString();

          const vistaEmpleado = document.getElementById('vista-progreso-empleado');
          if (vistaEmpleado && vistaEmpleado.style.display !== 'none') {
            cargarProgresoEmpleadoDesdeSupabase((window as any).sesionActual?.nombre || 'Shelsy', fechaConsulta);
          }

          const panelAdmin = document.getElementById('admin-productividad-panel');
          if (panelAdmin && panelAdmin.style.display !== 'none') {
            cargarProductividadAdminPorFecha(fechaConsulta);
          }
        })
        .subscribe();
    } catch (e) {
      console.warn('Error en la suscripcion de tiempo real para task_progress:', e);
    }
  };

  // ==========================================
  // 6. GESTION DE SESIONES Y CERRAR SESION
  // ==========================================
  const cerrarSesion = () => {
    try {
      // Limpiar canal de tiempo real si estaba abierto
      if (_canalProgresoSingleton) {
        try {
          const supabase = (window as any).supabase || getSupabaseClient();
          if (supabase && typeof supabase.removeChannel === 'function') {
            supabase.removeChannel(_canalProgresoSingleton);
          }
        } catch (e) {
          // Ignorar error al desuscribir
        }
        _canalProgresoSingleton = null;
      }

      // Resetear sesion en memoria
      if (typeof window !== 'undefined') {
        (window as any).sesionActual = { rol: null, nombre: null };
      }

      // Limpiar almacenamiento local de sesión sin borrar configuración ni catálogos
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('coccole_sesion');
        localStorage.removeItem('coccole_active_user_role');
      }

      // Forzar reinicio limpio
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (err) {
      console.error('Error al cerrar sesion:', err);
      if (typeof window !== 'undefined') {
        window.location.href = window.location.pathname;
      }
    }
  };

  // ==========================================
  // 6. CARGA UNIFICADA Y SINCRONIZACIÓN VISUAL DE CONTADORES
  // ==========================================
  const actualizarContadoresUI = (tareas: any[]) => {
    if (typeof document === 'undefined' || !tareas) return;

    // Deduplicar tareas por título para evitar contar duplicados o lotes múltiples del mismo día
    const tareasMap = new Map<string, any>();
    tareas.forEach((t: any) => {
      const title = (t.title || t.titulo || t.task_name || '').trim().toLowerCase();
      const isComp = Boolean(t.completada || t.completed || t.estado === 'Completada' || t.status === 'Completada');
      const existing = tareasMap.get(title);
      if (!existing) {
        tareasMap.set(title, { ...t, isComp });
      } else if (isComp && !existing.isComp) {
        tareasMap.set(title, { ...t, isComp: true });
      }
    });

    const tareasFiltradas = (tareas.length > 24 && tareasMap.size <= 24 && tareasMap.size > 0)
      ? Array.from(tareasMap.values())
      : (tareasMap.size > 0 ? Array.from(tareasMap.values()) : tareas);

    // En Coccole Fit la jornada diaria de checklist consta oficialmente de 24 tareas
    const total = tareasFiltradas.length > 24 && (tareasFiltradas.length % 24 === 0 || tareasFiltradas.length === 48)
      ? 24 
      : (tareasFiltradas.length > 0 ? Math.min(tareasFiltradas.length, 24) : 24);

    const completadas = Math.min(
      tareasFiltradas.filter(function (t: any) {
        return t.isComp !== undefined ? t.isComp : Boolean(t.completada || t.completed || t.estado === 'Completada' || t.status === 'Completada');
      }).length,
      total
    );
    const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;

    // Actualizar el botón del tab: "Mis Tareas (X/Y)" y textos de resumen sin destruir contenedores React
    const tabSpan = document.getElementById('tab-mis-tareas-label');
    if (tabSpan) {
      tabSpan.textContent = `Mis Tareas (${completadas}/${total})`;
    } else {
      const botones = document.querySelectorAll('button span');
      botones.forEach(function (el) {
        if (el.textContent && (el.textContent.includes('Mis Tareas') || el.textContent.includes('Checklist de Tareas'))) {
          if (el.children.length === 0) {
            el.textContent = 'Mis Tareas (' + completadas + '/' + total + ')';
          }
        }
      });
    }

    // Actualizar porcentaje de progreso diario
    const elemProgreso = document.getElementById('label-porcentaje-prod') || document.querySelector('.text-xl.font-bold, .text-blue-600');
    if (elemProgreso && elemProgreso.textContent && elemProgreso.textContent.includes('%')) {
      elemProgreso.textContent = porcentaje + '%';
    }

    const barraProgreso = document.getElementById('barra-progreso-prod');
    if (barraProgreso) {
      barraProgreso.style.width = porcentaje + '%';
    }

    const labelDetalle = document.getElementById('label-detalle-prod');
    if (labelDetalle) {
      labelDetalle.textContent = completadas + ' de ' + total + ' tareas completadas hoy';
    }
  };

  const cargarYRenderizarTareasGlobal = async () => {
    const cliente = (window as any).supabase || getSupabaseClient();
    if (!cliente) return;

    const fechaHoy = getLocalDateString();

    try {
      const { data, error } = await cliente
        .from('daily_tasks')
        .select('*')
        .or(`date.eq.${fechaHoy},fecha.eq.${fechaHoy}`);

      if (error) {
        console.error('Error al obtener tareas globales:', error);
        return;
      }

      let tareas = (data || []).sort((a: any, b: any) => (Number(a.orden ?? a.order_index) || 0) - (Number(b.orden ?? b.order_index) || 0));
      
      const sesion = (window as any).sesionActual;
      if (sesion?.rol === 'empleado' && (sesion?.nombre || sesion?.id)) {
        const empNombre = sesion.nombre?.toLowerCase();
        const empId = sesion.id;
        const tareasEmpleado = tareas.filter((t: any) => {
          const asig = (t.assigned_to || t.asignado_a || t.staff_id || t.staff_name || '').toLowerCase();
          return asig === empNombre || asig === empId || (!asig && !tareas.some((x: any) => (x.assigned_to === empNombre || x.asignado_a === empNombre)));
        });
        if (tareasEmpleado.length > 0) {
          tareas = tareasEmpleado;
        }
      }

      if (tareas.length > 0) {
        actualizarContadoresUI(tareas);
      }
    } catch (e) {
      console.warn('Advertencia en carga unificada de tareas:', e);
    }
  };

  // ==========================================
  // 7. INICIADOR AUTOMATICO DEL MODULO
  // ==========================================
  const iniciarModuloProductividadTiempoReal = () => {
    if (typeof window === 'undefined') return;

    setTimeout(() => {
      try {
        // Verificar y generar tareas si es necesario
        verificarYGenerarTareasDiarias();
        cargarYRenderizarTareasGlobal();

        const sesionGuardada = localStorage.getItem('coccole_sesion');
        if (sesionGuardada) {
          (window as any).sesionActual = JSON.parse(sesionGuardada);
        }
      } catch (e) {
        // Ignorar errores de parsing
      }

      const esAdmin = document.body.textContent?.includes('ADMINISTRADOR') || document.querySelector('nav')?.textContent?.includes('Auditoría');
      const esEmpleado = Array.from(document.querySelectorAll('button')).some(b => b.textContent?.includes('Checklist') || b.textContent?.includes('Mis Tareas') || b.textContent?.includes('Stock'));

      if (esAdmin || (window as any).sesionActual?.rol === 'admin') {
        renderizarSeccionProductividadAdminSeguro();
        activarSuscripcionTiempoRealSegura();
      } else if (esEmpleado || (window as any).sesionActual?.rol === 'empleado') {
        inicializarSesionProgresoEmpleadoSeguro((window as any).sesionActual?.nombre || 'Shelsy');
        activarSuscripcionTiempoRealSegura();
      }
    }, 800);
  };

  // Exponer API publica en window
  if (typeof window !== 'undefined') {
    (window as any).obtenerSupabase = () => (window as any).supabase || getSupabaseClient();
    (window as any).obtenerFechaHoyISO = getLocalDateString;
    (window as any).verificarYGenerarTareasAuto = verificarYGenerarTareasDiarias;
    (window as any).verificarYGenerarTareasDiarias = verificarYGenerarTareasDiarias;
    (window as any).cargarYRenderizarTareasGlobal = cargarYRenderizarTareasGlobal;
    (window as any).actualizarContadoresUI = actualizarContadoresUI;
    (window as any).cargarTareasDiarias = () => {
      const hoy = getLocalDateString();
      fetchDailyTasksFromSupabase(hoy);
      cargarYRenderizarTareasGlobal();
    };
    (window as any).cerrarSesion = cerrarSesion;
    (window as any).inicializarSesionProgresoEmpleadoSeguro = inicializarSesionProgresoEmpleadoSeguro;
    (window as any).inicializarSesionProgresoEmpleado = inicializarSesionProgresoEmpleadoSeguro;
    (window as any).cargarProgresoEmpleadoDesdeSupabase = cargarProgresoEmpleadoDesdeSupabase;
    (window as any).cargarProgresoEmpleado = cargarProgresoEmpleadoDesdeSupabase;
    (window as any).renderizarSeccionProductividadAdminSeguro = renderizarSeccionProductividadAdminSeguro;
    (window as any).renderizarAdminProductividad = renderizarSeccionProductividadAdminSeguro;
    (window as any).cargarProductividadAdminPorFecha = cargarProductividadAdminPorFecha;
    (window as any).cargarAdminProductividad = cargarProductividadAdminPorFecha;
    (window as any).activarSuscripcionTiempoRealSegura = activarSuscripcionTiempoRealSegura;
    (window as any).activarTiempoReal = activarSuscripcionTiempoRealSegura;
    (window as any).iniciarModuloProductividadTiempoReal = iniciarModuloProductividadTiempoReal;
    (window as any).ejecutarModulo = iniciarModuloProductividadTiempoReal;

    // Escuchador global únicamente para el botón específico de cierre de sesión
    if (typeof document !== 'undefined') {
      document.addEventListener('click', function (evento: any) {
        try {
          const target = evento.target;
          if (!target) return;
          const logoutBtn = target.closest ? target.closest('button#btn-cerrar-sesion, button#logout-btn') : null;

          if (logoutBtn) {
            evento.preventDefault();
            cerrarSesion();
            return;
          }

          const syncBtn = target.closest ? target.closest('button#sync-data-button') : null;
          if (syncBtn) {
            setTimeout(cargarYRenderizarTareasGlobal, 300);
          }
        } catch (error) {
          console.error("Error capturado en listener de productividad:", error);
        }
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        try {
          iniciarModuloProductividadTiempoReal();
        } catch (error) {
          console.error("Error crítico capturado para evitar pantalla en blanco en tareas/productividad:", error);
        }
      });
    } else {
      try {
        iniciarModuloProductividadTiempoReal();
      } catch (error) {
        console.error("Error crítico capturado para evitar pantalla en blanco en tareas/productividad:", error);
      }
    }
  }
})();

export const inicializarSesionProgresoEmpleadoSeguro = (nombreEmpleado?: string) => {
  if (typeof window !== 'undefined' && (window as any).inicializarSesionProgresoEmpleadoSeguro) {
    return (window as any).inicializarSesionProgresoEmpleadoSeguro(nombreEmpleado);
  }
};

export const renderizarSeccionProductividadAdminSeguro = () => {
  if (typeof window !== 'undefined' && (window as any).renderizarSeccionProductividadAdminSeguro) {
    return (window as any).renderizarSeccionProductividadAdminSeguro();
  }
};

export const activarSuscripcionTiempoRealSegura = () => {
  if (typeof window !== 'undefined' && (window as any).activarSuscripcionTiempoRealSegura) {
    return (window as any).activarSuscripcionTiempoRealSegura();
  }
};

export const cerrarSesion = () => {
  if (typeof window !== 'undefined' && (window as any).cerrarSesion) {
    return (window as any).cerrarSesion();
  }
};

