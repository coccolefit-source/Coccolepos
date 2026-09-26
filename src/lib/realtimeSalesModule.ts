// ==========================================
// MODULO ULTRA-LIGERO Y DEBOUNCED DE VENTAS SUGERIDAS
// (Arquitectura Realtime Optimizada para Coccole Fit)
// ==========================================

import { getSupabaseClient, getLocalDateString } from './supabaseClient';

(function () {
  'use strict';

  var clienteSupabase: any = null;
  var temporizadorDebounce: any = null;
  var canalRealtimeVentas: any = null;

  function obtenerCliente() {
    if (!clienteSupabase) {
      if (typeof (window as any).supabase !== 'undefined' && (window as any).supabase) {
        clienteSupabase = (window as any).supabase;
      } else {
        clienteSupabase = getSupabaseClient();
      }
    }
    return clienteSupabase;
  }

  function esHoy(fechaString: any) {
    if (!fechaString) return false;
    var f = new Date(fechaString);
    if (isNaN(f.getTime())) return false;
    var h = new Date();
    return f.getDate() === h.getDate() && f.getMonth() === h.getMonth() && f.getFullYear() === h.getFullYear();
  }

  // Cachear y actualizar selector del número para no recorrer el DOM innecesariamente
  function actualizarNumeroSugeridas(valor: number) {
    if (typeof document === 'undefined') return;

    var elementos = document.querySelectorAll('div, p, span, h1, h2, h3, h4, h5, h6');
    var tarjetaSugeridas: HTMLElement | null = null;

    for (var i = 0; i < elementos.length; i++) {
      var el = elementos[i];
      if (el.textContent && el.textContent.trim().toUpperCase() === 'VENTAS SUGERIDAS') {
        tarjetaSugeridas = (el.closest('div.bg-orange-50, div.rounded-2xl, div.p-6, div.p-4, div.border, div') || el.parentElement?.parentElement) as HTMLElement;
        break;
      }
    }

    if (tarjetaSugeridas) {
      var elementosHijos = tarjetaSugeridas.querySelectorAll('*');
      for (var j = 0; j < elementosHijos.length; j++) {
        var hijo = elementosHijos[j];
        if (/^\d+$/.test(hijo.textContent ? hijo.textContent.trim() : '') && hijo.children.length === 0) {
          hijo.textContent = String(valor);
          break;
        }
      }
    }

    // Actualizar barra de progreso de ventas sugeridas si existe
    var barraProgreso = document.getElementById('barra-progreso-ventas-sugeridas') || document.querySelector('.barra-ventas-sugeridas');
    var textoProgreso = document.getElementById('texto-progreso-ventas') || document.querySelector('.texto-ventas-sugeridas');

    if (barraProgreso) {
      var meta = 15;
      var porcentaje = Math.min(Math.round((valor / meta) * 100), 100);
      (barraProgreso as HTMLElement).style.width = porcentaje + '%';
    }

    if (textoProgreso) {
      textoProgreso.textContent = valor + ' de 15 logradas';
    }
  }

  // Consulta optimizada a Supabase
  function ejecutarSincronizacionLigera() {
    var cliente = obtenerCliente();
    if (!cliente) return;

    var hoyLocal = getLocalDateString();
    var hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);

    // 1. Obtener reglas activas de upsell
    cliente
      .from('upsell_rules')
      .select('suggested_product_name, active')
      .then(function (resRules: any) {
        var catalogoValido: string[] = [];
        if (resRules.data && resRules.data.length > 0) {
          catalogoValido = resRules.data
            .filter(function (r: any) { return r.active !== false; })
            .map(function (r: any) { return (r.suggested_product_name || '').toLowerCase().trim(); });
        }

        // 2. Consultar ventas de la jornada
        cliente
          .from('sales')
          .select('quantity, cantidad, product_name, producto, items, producto_nombre, tipo_venta, created_at, date, fecha')
          .order('created_at', { ascending: false })
          .limit(1000)
          .then(function (resSales: any) {
            if (resSales.error || !resSales.data) return;

            var total = 0;
            resSales.data.forEach(function (fila: any) {
              var fStr = fila.created_at || fila.date || fila.fecha;
              var matchFecha = esHoy(fStr) || (fila.fecha && fila.fecha === hoyLocal) || (fila.date && fila.date === hoyLocal);

              if (matchFecha) {
                var desc = (fila.product_name || fila.producto || fila.items || fila.producto_nombre || '').toString().toLowerCase();
                var esImpulsado = desc.includes('[sugerida]') || fila.tipo_venta === 'sugerida' || fila.es_sugerido === true;

                if (!esImpulsado && catalogoValido.length > 0) {
                  esImpulsado = catalogoValido.some(function (p: string) { return p && desc.includes(p); });
                } else if (!esImpulsado && catalogoValido.length === 0) {
                  esImpulsado = desc.includes('[sugerida]') || fila.tipo_venta === 'sugerida';
                }

                if (esImpulsado) {
                  total += Number(fila.quantity || fila.cantidad || 1);
                }
              }
            });

            actualizarNumeroSugeridas(total);
          })
          .catch(function (err: any) {
            console.error('Error en sincronización liviana de ventas:', err);
          });
      })
      .catch(function (err: any) {
        console.error('Error al consultar reglas de venta:', err);
      });
  }

  // Debounce: evita sobrecargar peticiones si se registran varios clics consecutivos
  function sincronizarConDebounce() {
    clearTimeout(temporizadorDebounce);
    temporizadorDebounce = setTimeout(ejecutarSincronizacionLigera, 300);
  }

  // Interceptar clic en botón "+1" de Venta Sugerida
  if (typeof document !== 'undefined') {
    document.addEventListener('click', function (e: any) {
      try {
        var elemento = e.target;
        if (!elemento) return;
        var boton = (elemento.closest && (elemento.closest('button') || elemento.closest('.bg-blue-500'))) || elemento;

        var esBotonSugerida = (boton && boton.textContent && boton.textContent.trim() === '+1') ||
                              (elemento && elemento.textContent && elemento.textContent.trim() === '+1');

        if (esBotonSugerida) {
          // Si el botón ya está gestionado por el modal de cobro obligatorio de React, no duplicar la inserción
          if (boton && boton.id && boton.id.startsWith('increment-btn-')) {
            return;
          }

          var contenedor = (boton.closest && (boton.closest('div.border, div.bg-white') || boton.parentElement?.parentElement)) || boton.parentElement;
          var nombreProducto = 'Producto Sugerido Desconocido';

          if (contenedor) {
            var textos = contenedor.querySelectorAll('p, span, h2, h3, h4, div');
            for (var i = 0; i < textos.length; i++) {
              var txt = textos[i].textContent ? textos[i].textContent.trim() : '';
              if (txt && txt.length > 2 && !txt.includes('+10 PTS') && !txt.includes('+1') && !txt.includes('/15') && !txt.includes('UNIDAD') && !txt.includes('Cruzada') && !txt.includes('Cross-selling')) {
                nombreProducto = txt;
                break;
              }
            }
          }

          var cliente = obtenerCliente();
          if (cliente) {
            cliente.from('sales').insert([{
              product_name: '[SUGERIDA] ' + nombreProducto,
              quantity: 1,
              created_at: new Date().toISOString(),
              date: getLocalDateString(),
              fecha: getLocalDateString(),
              tipo_venta: 'sugerida'
            }]).then(function (res: any) {
              if (!res.error) {
                sincronizarConDebounce();
              }
            }).catch(function (err: any) {
              console.warn('Advertencia al registrar venta sugerida:', err);
            });
          }
        }
      } catch (error) {
        console.error("Error capturado en módulo de ventas sugeridas:", error);
      }
    });
  }

  // Inicialización y Suscripción Realtime
  function iniciar() {
    try {
      setTimeout(ejecutarSincronizacionLigera, 500);

      var cliente = obtenerCliente();
      if (cliente && !canalRealtimeVentas) {
        canalRealtimeVentas = cliente
          .channel('canal-optimizado-sales')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, sincronizarConDebounce)
          .subscribe();
      }
    } catch (e) {
      console.warn('Error capturado al iniciar canal Realtime de ventas:', e);
    }
  }

  if (typeof window !== 'undefined') {
    (window as any).obtenerSupabase = obtenerCliente;
    (window as any).actualizarNumeroSugeridas = actualizarNumeroSugeridas;
    (window as any).forzarActualizacionUI = actualizarNumeroSugeridas;
    (window as any).ejecutarSincronizacionLigera = ejecutarSincronizacionLigera;
    (window as any).sincronizarPanelAdmin = ejecutarSincronizacionLigera;
    (window as any).sincronizarVentasAdminSeguro = ejecutarSincronizacionLigera;
    (window as any).sincronizarConDebounce = sincronizarConDebounce;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        try {
          iniciar();
        } catch (error) {
          console.error("Error crítico capturado para evitar pantalla en blanco en ventas:", error);
        }
      });
    } else {
      try {
        iniciar();
      } catch (error) {
        console.error("Error crítico capturado para evitar pantalla en blanco en ventas:", error);
      }
    }
  }
})();
