// ==========================================
// MODULO DE SINCRONIZACION Y TIEMPO REAL: VENTAS SUGERIDAS
// (Arquitectura Segura y Sincronizacion de Horario Local)
// ==========================================

import { getSupabaseClient } from './supabaseClient';

(function () {
  'use strict';

  var canalSyncGlobal: any = null;
  var canalRealtimeVentas: any = null;

  function obtenerSupabase() {
    if (typeof (window as any).supabase !== 'undefined' && (window as any).supabase) {
      return (window as any).supabase;
    }
    return getSupabaseClient();
  }

  // Verificacion de fecha local (Resuelve el desfase de zona horaria UTC vs Local)
  function esHoy(fechaString: any) {
    if (!fechaString) return false;
    var fecha = new Date(fechaString);
    if (isNaN(fecha.getTime())) return false;
    var hoy = new Date();
    return fecha.getDate() === hoy.getDate() &&
           fecha.getMonth() === hoy.getMonth() &&
           fecha.getFullYear() === hoy.getFullYear();
  }

  // Localizador exacto para la tarjeta visual del Administrador
  function forzarActualizacionUI(total: number) {
    if (typeof document === 'undefined') return;
    var textos = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, div');
    var tarjeta: HTMLElement | null = null;

    // 1. Ubicar el contenedor de "VENTAS SUGERIDAS"
    for (var i = 0; i < textos.length; i++) {
      if (textos[i].textContent && textos[i].textContent.trim().toUpperCase() === 'VENTAS SUGERIDAS') {
        tarjeta = (textos[i].closest('div.bg-orange-50, div.rounded-2xl, div.p-6, div.p-3, div') || textos[i].parentElement?.parentElement) as HTMLElement;
        break;
      }
    }

    // 2. Reemplazar exclusivamente el numero principal
    if (tarjeta) {
      var elementosHijos = tarjeta.querySelectorAll('*');
      for (var j = 0; j < elementosHijos.length; j++) {
        var hijo = elementosHijos[j];
        // Valida que sea un nodo que contenga unicamente digitos numericos
        if (/^\d+$/.test(hijo.textContent ? hijo.textContent.trim() : '') && hijo.children.length === 0) {
          hijo.textContent = String(total);
          break; // Detiene el ciclo tras actualizar el numero principal
        }
      }
    }

    // Actualizar barra de progreso si existe en la vista del empleado
    var barraProgreso = document.getElementById('barra-progreso-ventas-sugeridas') || document.querySelector('.barra-ventas-sugeridas');
    var textoProgreso = document.getElementById('texto-progreso-ventas') || document.querySelector('.texto-ventas-sugeridas');

    if (barraProgreso) {
      var meta = 15;
      var porcentaje = Math.min(Math.round((total / meta) * 100), 100);
      (barraProgreso as HTMLElement).style.width = porcentaje + '%';
    }

    if (textoProgreso) {
      textoProgreso.textContent = total + ' de 15 logradas';
    }
  }

  function sincronizarVentasAdminSeguro() {
    var cliente = obtenerSupabase();
    if (!cliente) return;

    // 1. Consultamos los productos configurados en la campana
    cliente
      .from('upsell_rules')
      .select('suggested_product_name, active')
      .then(function (resReglas: any) {
        var reglas: string[] = [];
        if (resReglas.data && resReglas.data.length > 0) {
          reglas = resReglas.data
            .filter(function (r: any) { return r.active !== false; })
            .map(function (r: any) {
              return (r.suggested_product_name || '').toLowerCase().trim();
            });
        }

        // 2. Consultamos ventas recientes (Evitamos filtros rigidos de base de datos para no cruzar zonas horarias)
        cliente
          .from('sales')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000)
          .then(function (resVentas: any) {
            if (resVentas.error) return;

            var totalHoy = 0;
            var ventas = resVentas.data || [];

            ventas.forEach(function (venta: any) {
              // Validar si la venta ocurrio estrictamente HOY segun el reloj del dispositivo local
              if (esHoy(venta.created_at) || esHoy(venta.fecha)) {
                var descripcion = (venta.product_name || venta.producto || venta.items || venta.producto_nombre || '').toString().toLowerCase();

                if (reglas.length > 0) {
                  var impulsado = reglas.some(function (r: string) { return r && descripcion.includes(r); });
                  if (impulsado) {
                    totalHoy += Number(venta.quantity || venta.cantidad || venta.unidades || 1);
                  } else if (venta.tipo_venta === 'sugerida' || venta.es_sugerido === true || venta.es_sugerida === true) {
                    totalHoy += Number(venta.quantity || venta.cantidad || 1);
                  }
                } else {
                  // Si no hay reglas especificas, conteo de registros
                  totalHoy += Number(venta.quantity || venta.cantidad || 1);
                }
              }
            });

            forzarActualizacionUI(totalHoy);
          })
          .catch(function (err: any) {
            console.warn('Advertencia al consultar ventas recientes:', err);
          });
      })
      .catch(function (err: any) {
        console.warn('Advertencia al consultar upsell_rules:', err);
      });
  }

  // Interceptar el clic en el boton superior azul (Actualizar Datos)
  if (typeof document !== 'undefined') {
    document.addEventListener('click', function (e: any) {
      if (e.target && e.target.textContent && e.target.textContent.includes('Actualizar Datos')) {
        // Retardo milimetrico para permitir que la app re-dibuje el HTML antes de inyectar el numero
        setTimeout(sincronizarVentasAdminSeguro, 300);
      }
    });
  }

  // Suscripcion al canal de Supabase y arranque automatico
  function iniciarAdminGlobal() {
    setTimeout(sincronizarVentasAdminSeguro, 1200);

    var cliente = obtenerSupabase();
    if (cliente && !canalSyncGlobal) {
      try {
        canalSyncGlobal = cliente
          .channel('admin-force-sales-sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, function () {
            sincronizarVentasAdminSeguro();
          })
          .subscribe();
      } catch (err) {
        console.warn('Error al suscribir canal admin-force-sales-sync:', err);
      }
    }
  }

  if (typeof window !== 'undefined') {
    (window as any).obtenerSupabase = obtenerSupabase;
    (window as any).esHoy = esHoy;
    (window as any).forzarActualizacionUI = forzarActualizacionUI;
    (window as any).sincronizarVentasAdminSeguro = sincronizarVentasAdminSeguro;
    (window as any).sincronizarVentasSugeridas = sincronizarVentasAdminSeguro;
    (window as any).iniciarAdminGlobal = iniciarAdminGlobal;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', iniciarAdminGlobal);
    } else {
      iniciarAdminGlobal();
    }
  }
})();
