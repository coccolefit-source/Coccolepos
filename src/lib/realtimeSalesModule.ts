// ==========================================
// MODULO DE SINCRONIZACION Y TIEMPO REAL: VENTAS SUGERIDAS
// (Arquitectura Segura e Integracion Supabase)
// ==========================================

import { getSupabaseClient } from './supabaseClient';

(function () {
  'use strict';

  var canalRealtimeVentas: any = null;

  function obtenerCliente() {
    if (typeof (window as any).supabase !== 'undefined' && (window as any).supabase) {
      return (window as any).supabase;
    }
    return getSupabaseClient();
  }

  function obtenerFechaHoy() {
    var d = new Date();
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
  }

  // Consulta y calcula las ventas sugeridas acumuladas del dia
  function sincronizarVentasSugeridas() {
    var cliente = obtenerCliente();
    if (!cliente) return;

    var hoy = obtenerFechaHoy();
    var inicioDia = hoy + 'T00:00:00.000Z';
    var finDia = hoy + 'T23:59:59.999Z';

    // 1. Obtener reglas/productos activos de la tabla upsell_rules
    cliente
      .from('upsell_rules')
      .select('suggested_product_name, active')
      .then(function (resRules: any) {
        if (resRules.error || !resRules.data) {
          console.error('Error al cargar reglas de impulsados:', resRules.error);
          return;
        }

        var reglasFiltradas = resRules.data.filter(function (r: any) {
          return r.active !== false;
        });

        var productosImpulsados = reglasFiltradas.map(function (r: any) {
          return r.suggested_product_name ? r.suggested_product_name.toLowerCase().trim() : '';
        });

        if (productosImpulsados.length === 0) {
          actualizarUIContadorVentas(0);
          return;
        }

        // 2. Obtener ventas del dia desde la tabla sales
        var sesion = (window as any).sesionActual || {};
        var query = cliente.from('sales').select('*');

        // Si es consulta de empleado, se filtra por su id o nombre
        if (sesion.rol === 'empleado' && sesion.nombre) {
          query = query.or('vendedor_nombre.eq.' + sesion.nombre + ',staff_id.eq.' + sesion.nombre + ',usuario_id.eq.' + sesion.nombre);
        }

        query
          .gte('created_at', inicioDia)
          .lte('created_at', finDia)
          .then(function (resSales: any) {
            if (resSales.error) {
              console.error('Error al consultar ventas:', resSales.error);
              return;
            }

            var totalImpulsadosVendidos = 0;
            var ventas = resSales.data || [];

            ventas.forEach(function (venta: any) {
              // Validar coincidencia de producto en la venta
              var nombreProductoVendido = (venta.product_name || venta.producto || venta.items || venta.producto_nombre || '').toString().toLowerCase();
              
              var esImpulsado = productosImpulsados.some(function (pImp: string) {
                return pImp && nombreProductoVendido.includes(pImp);
              });

              if (esImpulsado) {
                totalImpulsadosVendidos += Number(venta.quantity || venta.cantidad || venta.unidades || 1);
              } else if (venta.tipo_venta === 'sugerida' || venta.es_sugerido === true || venta.es_sugerida === true) {
                // Si la venta esta categorizada explicitamente como sugerida
                totalImpulsadosVendidos += Number(venta.quantity || venta.cantidad || 1);
              }
            });

            actualizarUIContadorVentas(totalImpulsadosVendidos);
          })
          .catch(function (err: any) {
            console.error('Excepcion al procesar ventas sugeridas:', err);
          });
      })
      .catch(function (err: any) {
        console.error('Excepcion al consultar upsell_rules:', err);
      });
  }

  // Refresca los elementos visuales de la interfaz
  function actualizarUIContadorVentas(cantidad: number) {
    if (typeof document === 'undefined') return;

    // Actualizar tarjeta resumen (VENTAS SUGERIDAS)
    var tarjetas = document.querySelectorAll('div, span, p');
    tarjetas.forEach(function (el) {
      if (el.textContent && el.textContent.trim().toUpperCase() === 'VENTAS SUGERIDAS') {
        var contenedorPadre = el.closest('div');
        if (contenedorPadre) {
          var numeroElem = contenedorPadre.querySelector('.text-2xl, .text-3xl, .text-lg, h3, span.font-bold');
          if (!numeroElem) {
            var elementosValor = contenedorPadre.querySelectorAll('div, span, p');
            elementosValor.forEach(function (subEl) {
              if (/^\d+$/.test(subEl.textContent ? subEl.textContent.trim() : '')) {
                numeroElem = subEl;
              }
            });
          }
          if (numeroElem) {
            numeroElem.textContent = String(cantidad);
          }
        }
      }
    });

    // Actualizar barra de progreso si existe en la vista del empleado
    var barraProgreso = document.getElementById('barra-progreso-ventas-sugeridas') || document.querySelector('.barra-ventas-sugeridas');
    var textoProgreso = document.getElementById('texto-progreso-ventas') || document.querySelector('.texto-ventas-sugeridas');

    if (barraProgreso) {
      var meta = 15;
      var porcentaje = Math.min(Math.round((cantidad / meta) * 100), 100);
      (barraProgreso as HTMLElement).style.width = porcentaje + '%';
    }

    if (textoProgreso) {
      textoProgreso.textContent = cantidad + ' de 15 logradas';
    }
  }

  // Escuchar inserciones en tiempo real en la tabla sales
  function activarRealtimeSales() {
    var cliente = obtenerCliente();
    if (!cliente || canalRealtimeVentas) return;

    try {
      canalRealtimeVentas = cliente
        .channel('canal-sales-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, function () {
          sincronizarVentasSugeridas();
        })
        .subscribe();
    } catch (e) {
      console.warn('Error al suscribir canal realtime de sales:', e);
    }
  }

  function iniciar() {
    setTimeout(function () {
      sincronizarVentasSugeridas();
      activarRealtimeSales();
    }, 600);
  }

  if (typeof window !== 'undefined') {
    (window as any).sincronizarVentasSugeridas = sincronizarVentasSugeridas;
    (window as any).activarRealtimeSales = activarRealtimeSales;
    (window as any).actualizarUIContadorVentas = actualizarUIContadorVentas;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', iniciar);
    } else {
      iniciar();
    }
  }
})();
