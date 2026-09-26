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
  const inicializarSesionProgresoEmpleadoSeguro = (nombreEmpleado = 'Shelsy') => {
    if (typeof document === 'undefined') return;

    try {
      const botonesTabs = document.querySelectorAll('button');
      let contenedorTabsNav: HTMLElement | null = null;

      botonesTabs.forEach(btn => {
        const txt = btn.textContent || '';
        if (txt.includes('Mi Checklist') || txt.includes('Mis Tareas') || txt.includes('Stock') || txt.includes('Caja / Ventas')) {
          contenedorTabsNav = btn.parentElement as HTMLElement;
        }
      });

      if (!contenedorTabsNav) return;

      // Insertar solo si no existe
      if (!document.getElementById('btn-tab-progreso')) {
        const btnProgreso = document.createElement('button');
        btnProgreso.id = 'btn-tab-progreso';
        btnProgreso.type = 'button';
        btnProgreso.className = 'flex-1 py-2.5 px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-[120px] text-slate-600 hover:bg-[#EBF5FB]/40 hover:text-[#2C3E50] cursor-pointer';
        btnProgreso.innerHTML = 
          '<svg class="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>' +
          '<span>Progreso</span>';

        btnProgreso.onclick = (e) => {
          e.preventDefault();

          const vistaProgreso = document.getElementById('vista-progreso-empleado');
          if (vistaProgreso) vistaProgreso.style.display = 'block';

          // Resaltar boton
          contenedorTabsNav?.querySelectorAll('button').forEach(b => {
            if (b.id === 'btn-tab-progreso') {
              b.className = 'flex-1 py-2.5 px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-[120px] bg-[#4B9CD3] text-white shadow-2xs cursor-pointer';
            } else {
              b.className = 'flex-1 py-2.5 px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-[120px] text-slate-600 hover:bg-[#EBF5FB]/40 hover:text-[#2C3E50] cursor-pointer';
            }
          });

          const hoy = getLocalDateString();
          const inputFecha = document.getElementById('input-fecha-progreso') as HTMLInputElement;
          if (inputFecha) inputFecha.value = hoy;

          const nombreActual = (window as any).sesionActual?.nombre || nombreEmpleado;
          cargarProgresoEmpleadoDesdeSupabase(nombreActual, hoy);
        };

        // Al hacer clic en los otros botones del tab, ocultar la vista de progreso si estaba activa
        contenedorTabsNav.querySelectorAll('button').forEach(btn => {
          if (btn.id !== 'btn-tab-progreso') {
            btn.addEventListener('click', () => {
              const vistaProgreso = document.getElementById('vista-progreso-empleado');
              if (vistaProgreso) vistaProgreso.style.display = 'none';
              const btnProg = document.getElementById('btn-tab-progreso');
              if (btnProg) {
                btnProg.className = 'flex-1 py-2.5 px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-[120px] text-slate-600 hover:bg-[#EBF5FB]/40 hover:text-[#2C3E50] cursor-pointer';
              }
            });
          }
        });

        contenedorTabsNav.appendChild(btnProgreso);
      }

      // Inyectar la vista de progreso sin borrar el contenido actual
      if (!document.getElementById('vista-progreso-empleado')) {
        const vistaDiv = document.createElement('div');
        vistaDiv.id = 'vista-progreso-empleado';
        vistaDiv.style.display = 'none';
        vistaDiv.className = 'mt-4 space-y-4 max-w-4xl mx-auto';

        const hoy = getLocalDateString();

        vistaDiv.innerHTML = 
          '<div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">' +
            '<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-gray-100 pb-4">' +
              '<div>' +
                '<h2 class="text-base font-bold text-gray-800">Mi Historial de Productividad</h2>' +
                '<p class="text-xs text-gray-400 mt-0.5">Consulta tu rendimiento diario almacenado directamente en Supabase.</p>' +
              '</div>' +
              '<div class="flex items-center gap-2 w-full sm:w-auto">' +
                '<input type="date" id="input-fecha-progreso" value="' + hoy + '" class="border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 flex-1 sm:flex-none" />' +
                '<button id="btn-consultar-fecha" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-blue-700 transition shadow-sm cursor-pointer">' +
                  'Ver Fecha' +
                '</button>' +
              '</div>' +
            '</div>' +
            '<div id="resultado-progreso-supabase" class="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center">' +
              '<p class="text-xs text-gray-500">Selecciona una fecha y haz clic en Ver Fecha para consultar el registro.</p>' +
            '</div>' +
          '</div>';

        if (contenedorTabsNav.parentNode) {
          contenedorTabsNav.parentNode.insertBefore(vistaDiv, contenedorTabsNav.nextSibling);
        }

        const btnConsultar = document.getElementById('btn-consultar-fecha');
        if (btnConsultar) {
          btnConsultar.onclick = () => {
            const inputFecha = document.getElementById('input-fecha-progreso') as HTMLInputElement;
            const fechaSeleccionada = inputFecha?.value;
            const nombreActual = (window as any).sesionActual?.nombre || nombreEmpleado;
            if (fechaSeleccionada) cargarProgresoEmpleadoDesdeSupabase(nombreActual, fechaSeleccionada);
          };
        }

        const inputFecha = document.getElementById('input-fecha-progreso');
        if (inputFecha) {
          inputFecha.onchange = (e: any) => {
            const nombreActual = (window as any).sesionActual?.nombre || nombreEmpleado;
            if (e.target?.value) cargarProgresoEmpleadoDesdeSupabase(nombreActual, e.target.value);
          };
        }
      }
    } catch (err) {
      console.warn('Error al inicializar sesión de progreso del empleado:', err);
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
        existing.style.display = 'block';
        const input = document.getElementById('admin-input-fecha') as HTMLInputElement;
        cargarProductividadAdminPorFecha(input?.value || getLocalDateString());
        return;
      }

      const adminContainer = document.createElement('div');
      adminContainer.id = 'admin-productividad-panel';
      adminContainer.className = 'bg-white p-6 rounded-2xl shadow-sm border border-gray-100 my-6 max-w-5xl mx-auto';

      const hoy = getLocalDateString();

      adminContainer.innerHTML = 
        '<div class="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 border-b border-gray-100 pb-4">' +
          '<div><h2 class="text-base font-bold text-gray-800">Monitoreo de Productividad</h2></div>' +
          '<div class="flex items-center gap-2">' +
            '<input type="date" id="admin-input-fecha" value="' + hoy + '" class="border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 outline-none bg-gray-50" />' +
            '<button id="admin-btn-consultar" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-blue-700 cursor-pointer">Ver</button>' +
          '</div>' +
        '</div>' +
        '<div id="admin-lista-productividad" class="space-y-4"><p class="text-xs text-gray-500 text-center py-4">Cargando...</p></div>';

      const mainContent = document.querySelector('main') || document.querySelector('#root > div') || document.getElementById('root') || document.body;
      mainContent.appendChild(adminContainer);

      const btnConsultar = document.getElementById('admin-btn-consultar');
      if (btnConsultar) {
        btnConsultar.onclick = () => {
          const input = document.getElementById('admin-input-fecha') as HTMLInputElement;
          cargarProductividadAdminPorFecha(input?.value || hoy);
        };
      }

      const inputFecha = document.getElementById('admin-input-fecha');
      if (inputFecha) {
        inputFecha.onchange = (e: any) => cargarProductividadAdminPorFecha(e.target.value);
      }

      cargarProductividadAdminPorFecha(hoy);
    } catch (err) {
      console.warn('Error al renderizar seccion de productividad admin:', err);
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

      // Limpiar almacenamiento local
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('coccole_sesion');
        localStorage.clear();
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

    const total = tareas.length;
    const completadas = tareas.filter(function (t: any) {
      return t.completada || t.completed || t.estado === 'Completada' || t.status === 'Completada';
    }).length;
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

      const tareas = (data || []).sort((a: any, b: any) => (Number(a.orden ?? a.order_index) || 0) - (Number(b.orden ?? b.order_index) || 0));
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

    // Escuchador global para cualquier boton o enlace de cierre de sesion o actualizacion de datos
    if (typeof document !== 'undefined') {
      document.addEventListener('click', function (evento: any) {
        try {
          const target = evento.target;
          const elemento = target?.closest ? (target.closest('button, a, div') || target) : target;

          if (
            elemento &&
            (
              elemento.textContent?.trim().toLowerCase().includes('cerrar sesión') ||
              elemento.textContent?.trim().toLowerCase().includes('cerrar sesion') ||
              elemento.id === 'btn-cerrar-sesion' ||
              elemento.id === 'logout-btn'
            )
          ) {
            evento.preventDefault();
            cerrarSesion();
          }

          if (elemento && elemento.textContent && elemento.textContent.includes('Actualizar Datos')) {
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

