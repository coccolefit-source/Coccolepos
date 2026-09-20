// ==========================================
// MODULO UNIFICADO DE VENTAS SUGERIDAS (EMPLEADO & ADMIN)
// ==========================================

import { getSupabaseClient } from './supabaseClient';

(function () {
  'use strict';

  function obtenerSupabase() {
    if (typeof (window as any).supabase !== 'undefined' && (window as any).supabase) {
      return (window as any).supabase;
    }
    return getSupabaseClient();
  }

  function esHoy(fechaString: any) {
    if (!fechaString) return false;
    var f = new Date(fechaString);
    if (isNaN(f.getTime())) return false;
    var h = new Date();
    return f.getDate() === h.getDate() && f.getMonth() === h.getMonth() && f.getFullYear() === h.getFullYear();
  }

  // ==========================================
  // 1. LOGICA DEL EMPLEADO: Interceptar el boton "+1"
  // ==========================================
  if (typeof document !== 'undefined') {
    document.addEventListener('click', function (e: any) {
      var elemento = e.target;
      if (!elemento) return;
      var boton = (elemento.closest && (elemento.closest('button') || elemento.closest('.bg-blue-500'))) || elemento;

      // Verificar si se hizo clic exactamente en el boton de sumar venta sugerida
      var esBotonSugerida = (boton && boton.textContent && boton.textContent.trim() === '+1') ||
                            (elemento && elemento.textContent && elemento.textContent.trim() === '+1');

      if (esBotonSugerida) {
        // Ubicar la tarjeta que contiene el producto para extraer el nombre
        var contenedor = (boton.closest && (boton.closest('div.border, div.bg-white') || boton.parentElement?.parentElement)) || boton.parentElement;
        var nombreProducto = 'Producto Sugerido Desconocido';

        if (contenedor) {
          var textos = contenedor.querySelectorAll('p, span, h2, h3, h4, div');
          for (var i = 0; i < textos.length; i++) {
            var txt = textos[i].textContent ? textos[i].textContent.trim() : '';
            // Descartar textos genericos de la tarjeta para capturar solo el nombre real
            if (txt && txt.length > 2 && !txt.includes('+10 PTS') && !txt.includes('+1') && !txt.includes('/15') && !txt.includes('UNIDAD') && !txt.includes('Cruzada') && !txt.includes('Cross-selling')) {
              nombreProducto = txt;
              break;
            }
          }
        }

        var cliente = obtenerSupabase();
        if (cliente) {
          // Enviar el clic a la tabla 'sales' con etiqueta especial
          cliente.from('sales').insert([{
            product_name: '[SUGERIDA] ' + nombreProducto,
            quantity: 1,
            created_at: new Date().toISOString()
          }]).then(function (res: any) {
            if (!res.error) {
              console.log('Venta sugerida registrada con exito:', nombreProducto);
            }
          }).catch(function (err: any) {
            console.warn('Advertencia al registrar venta sugerida:', err);
          });
        }
      }
    });
  }

  // ==========================================
  // 2. LOGICA DEL ADMINISTRADOR: Actualizar el contador UI
  // ==========================================
  function forzarActualizacionUI(total: number) {
    if (typeof document === 'undefined') return;
    var textos = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
    var tarjeta: HTMLElement | null = null;

    // Ubicar la tarjeta especifica del panel admin
    for (var i = 0; i < textos.length; i++) {
      if (textos[i].textContent && textos[i].textContent.trim().toUpperCase() === 'VENTAS SUGERIDAS') {
        tarjeta = (textos[i].closest('div.bg-orange-50, div.rounded-2xl, div.p-6, div.p-3, div') || textos[i].parentElement?.parentElement) as HTMLElement;
        break;
      }
    }

    // Reemplazar el numero principal
    if (tarjeta) {
      var elementosHijos = tarjeta.querySelectorAll('*');
      for (var j = 0; j < elementosHijos.length; j++) {
        var hijo = elementosHijos[j];
        if (/^\d+$/.test(hijo.textContent ? hijo.textContent.trim() : '') && hijo.children.length === 0) {
          hijo.textContent = String(total);
          break;
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

  function sincronizarPanelAdmin() {
    var cliente = obtenerSupabase();
    if (!cliente) return;

    // Obtener transacciones recientes
    cliente.from('sales').select('created_at, product_name, items, producto, quantity, cantidad, producto_nombre, tipo_venta')
      .order('created_at', { ascending: false }).limit(1000)
      .then(function (resVentas: any) {
        if (resVentas.error) return;

        // Cruzar con los nombres activos en upsell_rules
        cliente.from('upsell_rules').select('suggested_product_name, active').then(function (resReglas: any) {
          var catalogoValido: string[] = [];
          if (resReglas.data && resReglas.data.length > 0) {
            catalogoValido = resReglas.data
              .filter(function (r: any) { return r.active !== false; })
              .map(function (r: any) { return (r.suggested_product_name || '').toLowerCase().trim(); });
          }

          var totalHoy = 0;
          var ventas = resVentas.data || [];

          ventas.forEach(function (venta: any) {
            if (esHoy(venta.created_at) || esHoy(venta.fecha)) {
              var desc = (venta.product_name || venta.producto || venta.items || venta.producto_nombre || '').toString().toLowerCase();

              // Sumar si tiene la marca de script OR si coincide con el catalogo
              var esImpulsado = desc.includes('[sugerida]') || venta.tipo_venta === 'sugerida' || venta.es_sugerido === true;
              if (!esImpulsado && catalogoValido.length > 0) {
                esImpulsado = catalogoValido.some(function (p: string) { return p && desc.includes(p); });
              } else if (!esImpulsado && catalogoValido.length === 0) {
                // Si no hay reglas configuradas, contar registros
                esImpulsado = true;
              }

              if (esImpulsado) {
                totalHoy += Number(venta.quantity || venta.cantidad || 1);
              }
            }
          });
          forzarActualizacionUI(totalHoy);
        });
      }).catch(function (err: any) {
        console.warn('Advertencia al sincronizar panel admin:', err);
      });
  }

  // ==========================================
  // 3. INICIO Y SUSCRIPCION EN TIEMPO REAL
  // ==========================================
  var canalVentas: any = null;
  function iniciarSistemaUnificado() {
    setTimeout(sincronizarPanelAdmin, 1200);

    var cliente = obtenerSupabase();
    if (cliente && !canalVentas) {
      try {
        canalVentas = cliente.channel('sync-ventas-global')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, function () {
            sincronizarPanelAdmin();
          }).subscribe();
      } catch (err) {
        console.warn('Error al suscribir canal sync-ventas-global:', err);
      }
    }
  }

  // Reconocer clics en el boton de actualizacion manual
  if (typeof document !== 'undefined') {
    document.addEventListener('click', function (e: any) {
      if (e.target && e.target.textContent && e.target.textContent.includes('Actualizar Datos')) {
        setTimeout(sincronizarPanelAdmin, 400);
      }
    });
  }

  if (typeof window !== 'undefined') {
    (window as any).obtenerSupabase = obtenerSupabase;
    (window as any).esHoy = esHoy;
    (window as any).forzarActualizacionUI = forzarActualizacionUI;
    (window as any).sincronizarPanelAdmin = sincronizarPanelAdmin;
    (window as any).sincronizarVentasAdminSeguro = sincronizarPanelAdmin;
    (window as any).iniciarSistemaUnificado = iniciarSistemaUnificado;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', iniciarSistemaUnificado);
    } else {
      iniciarSistemaUnificado();
    }
  }
})();
