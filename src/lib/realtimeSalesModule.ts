// ==========================================
// MODULO DE SINCRONIZACION Y TIEMPO REAL: VENTAS SUGERIDAS (EMPLEADO & ADMIN)
// (Arquitectura Segura e Integracion Supabase)
// ==========================================

import { getSupabaseClient } from './supabaseClient';

(function () {
  'use strict';

  var canalRealtimeVentas: any = null;
  var canalRealtimeAdminSales: any = null;

  function obtenerClienteSupabase() {
    if (typeof (window as any).supabase !== 'undefined' && (window as any).supabase) {
      return (window as any).supabase;
    }
    return getSupabaseClient();
  }

  function obtenerRangoFechaHoy() {
    var ahora = new Date();
    var anio = ahora.getFullYear();
    var mes = String(ahora.getMonth() + 1).padStart(2, '0');
    var dia = String(ahora.getDate()).padStart(2, '0');

    var inicio = anio + '-' + mes + '-' + dia + 'T00:00:00.000Z';
    var fin = anio + '-' + mes + '-' + dia + 'T23:59:59.999Z';
    return { inicio: inicio, fin: fin, fechaCorta: anio + '-' + mes + '-' + dia };
  }

  // Actualiza directamente la tarjeta del resumen operativo en el perfil Admin
  function actualizarTarjetaAdmin(total: number) {
    if (typeof document === 'undefined') return;
    var elementos = document.querySelectorAll('div, p, span');
    elementos.forEach(function (el) {
      if (el.textContent && el.textContent.trim().toUpperCase() === 'VENTAS SUGERIDAS') {
        var tarjetaPadre = el.closest('div.bg-white, div.rounded-2xl, div.p-6, div.p-4, div.bg-orange-50, div.rounded-xl, div.rounded-lg') || el.parentElement;
        if (tarjetaPadre) {
          var contador = tarjetaPadre.querySelector('.text-2xl, .text-3xl, .text-lg, h3, font-bold, span.font-bold');
          if (!contador) {
            var subElementos = tarjetaPadre.querySelectorAll('div, span, p');
            subElementos.forEach(function (sub) {
              if (/^\d+$/.test(sub.textContent ? sub.textContent.trim() : '')) {
                contador = sub;
              }
            });
          }
          if (contador) {
            contador.textContent = String(total);
          }
        }
      }
    });
  }

  // Refresca los elementos visuales de la interfaz de Empleado
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

  // Consulta consolidada de todas las ventas del local en la fecha actual (Admin)
  function consultarTotalVentasSugeridasAdmin() {
    var cliente = obtenerClienteSupabase();
    if (!cliente) return;

    var rango = obtenerRangoFechaHoy();

    // 1. Cargar productos activos desde upsell_rules
    cliente
      .from('upsell_rules')
      .select('suggested_product_name, active')
      .then(function (resRules: any) {
        var productosImpulsados: string[] = [];
        if (resRules.data && resRules.data.length > 0) {
          productosImpulsados = resRules.data
            .filter(function (r: any) { return r.active !== false; })
            .map(function (r: any) {
              return (r.suggested_product_name || '').toLowerCase().trim();
            });
        }

        // 2. Consultar todas las ventas registradas en sales hoy
        cliente
          .from('sales')
          .select('*')
          .gte('created_at', rango.inicio)
          .lte('created_at', rango.fin)
          .then(function (resSales: any) {
            if (resSales.error) {
              console.error('Error al consultar ventas globales para admin:', resSales.error);
              return;
            }

            var totalVentasGlobal = 0;
            var registros = resSales.data || [];

            registros.forEach(function (venta: any) {
              var nombreProducto = (venta.product_name || venta.producto || venta.items || venta.producto_nombre || '').toString().toLowerCase();

              if (productosImpulsados.length > 0) {
                var coincide = productosImpulsados.some(function (pImp) {
                  return pImp && nombreProducto.includes(pImp);
                });

                if (coincide) {
                  totalVentasGlobal += Number(venta.quantity || venta.cantidad || venta.unidades || 1);
                } else if (venta.tipo_venta === 'sugerida' || venta.es_sugerido === true || venta.es_sugerida === true) {
                  totalVentasGlobal += Number(venta.quantity || venta.cantidad || 1);
                } else {
                  // Conteo directo si la tabla almacena registros de la campana
                  totalVentasGlobal += Number(venta.quantity || venta.cantidad || 1);
                }
              } else {
                totalVentasGlobal += Number(venta.quantity || venta.cantidad || 1);
              }
            });

            actualizarTarjetaAdmin(totalVentasGlobal);
          })
          .catch(function (err: any) {
            console.error('Excepcion al calcular total de ventas:', err);
          });
      })
      .catch(function (err: any) {
        console.error('Excepcion al consultar upsell_rules:', err);
      });
  }

  // Consulta y calcula las ventas sugeridas acumuladas del dia para el empleado
  function sincronizarVentasSugeridas() {
    var cliente = obtenerClienteSupabase();
    if (!cliente) return;

    var rango = obtenerRangoFechaHoy();

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

        var sesion = (window as any).sesionActual || {};
        var query = cliente.from('sales').select('*');

        if (sesion.rol === 'empleado' && sesion.nombre) {
          query = query.or('vendedor_nombre.eq.' + sesion.nombre + ',staff_id.eq.' + sesion.nombre + ',usuario_id.eq.' + sesion.nombre);
        }

        query
          .gte('created_at', rango.inicio)
          .lte('created_at', rango.fin)
          .then(function (resSales: any) {
            if (resSales.error) {
              console.error('Error al consultar ventas:', resSales.error);
              return;
            }

            var totalImpulsadosVendidos = 0;
            var ventas = resSales.data || [];

            ventas.forEach(function (venta: any) {
              var nombreProductoVendido = (venta.product_name || venta.producto || venta.items || venta.producto_nombre || '').toString().toLowerCase();

              var esImpulsado = productosImpulsados.some(function (pImp: string) {
                return pImp && nombreProductoVendido.includes(pImp);
              });

              if (esImpulsado) {
                totalImpulsadosVendidos += Number(venta.quantity || venta.cantidad || venta.unidades || 1);
              } else if (venta.tipo_venta === 'sugerida' || venta.es_sugerido === true || venta.es_sugerida === true) {
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

  // Escuchar inserciones en tiempo real en la tabla sales
  function activarRealtimeSales() {
    var cliente = obtenerClienteSupabase();
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

  // Escucha cambios en tiempo real en la tabla sales para el perfil Administrador
  function activarRealtimeAdminSales() {
    var cliente = obtenerClienteSupabase();
    if (!cliente || canalRealtimeAdminSales) return;

    try {
      canalRealtimeAdminSales = cliente
        .channel('canal-admin-sales-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, function () {
          consultarTotalVentasSugeridasAdmin();
        })
        .subscribe();
    } catch (e) {
      console.warn('Error al suscribir canal realtime admin de sales:', e);
    }
  }

  function iniciarModulos() {
    setTimeout(function () {
      sincronizarVentasSugeridas();
      activarRealtimeSales();
      consultarTotalVentasSugeridasAdmin();
      activarRealtimeAdminSales();
    }, 800);
  }

  if (typeof window !== 'undefined') {
    (window as any).sincronizarVentasSugeridas = sincronizarVentasSugeridas;
    (window as any).activarRealtimeSales = activarRealtimeSales;
    (window as any).actualizarUIContadorVentas = actualizarUIContadorVentas;
    (window as any).consultarTotalVentasSugeridasAdmin = consultarTotalVentasSugeridasAdmin;
    (window as any).activarRealtimeAdminSales = activarRealtimeAdminSales;
    (window as any).actualizarTarjetaAdmin = actualizarTarjetaAdmin;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', iniciarModulos);
    } else {
      iniciarModulos();
    }
  }
})();
