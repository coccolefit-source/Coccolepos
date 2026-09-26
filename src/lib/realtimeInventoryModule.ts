// ==========================================
// MODULO DE REGISTRO DIRECTO Y SEGURO DE INVENTARIO
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

  if (typeof document !== 'undefined') {
    document.addEventListener('click', function (e: any) {
      try {
        var elemento = e.target;
        if (!elemento) return;
        var btn = (elemento.closest && elemento.closest('button')) || elemento;
        
        // Verificar que se hizo clic en un boton "Registrar" fuera de formularios gestionados por React
        if (!btn || !btn.textContent || btn.textContent.trim() !== 'Registrar') return;
        if (btn.closest('form')) return; // React form handles this with state and onSubmit

        // Subir en el arbol HTML para encontrar el contenedor de la seccion de inventario
        var contenedor = (btn.closest && (btn.closest('div.bg-white, div.rounded-2xl, div.border') || btn.parentElement?.parentElement)) || btn.parentElement;
        if (!contenedor) return;

        // Extraer todos los campos (inputs y selects) dentro de esa fila
        var inputs = contenedor.querySelectorAll('input, select');

        // Validar que encontramos los campos del formulario (Nombre, Categoria, Stock Actual)
        if (inputs.length < 3) return;

        // Validar si estamos en el formulario de insumos de inventario
        var placeholderNombre = (inputs[0] as HTMLInputElement).placeholder || '';
        var labelTexto = contenedor.textContent || '';
        var esFormInventario = placeholderNombre.toLowerCase().includes('fresa') || 
                                placeholderNombre.toLowerCase().includes('insumo') || 
                                placeholderNombre.toLowerCase().includes('recurso') || 
                                labelTexto.toLowerCase().includes('nombre del recurso') ||
                                labelTexto.toLowerCase().includes('categoría de bodega') ||
                                labelTexto.toLowerCase().includes('categoria de bodega');

        if (!esFormInventario) return;

        var nombreInsumo = (inputs[0] as HTMLInputElement).value.trim();
        var categoriaBodega = (inputs[1] as HTMLSelectElement).value.trim();
        var stockActual = parseInt((inputs[2] as HTMLInputElement).value) || 0;

        if (!nombreInsumo) {
          return;
        }

        var cliente = obtenerSupabase();
        if (!cliente) {
          console.error('No se detecto el cliente de Supabase.');
          return;
        }

        // Cambiar estado del boton para indicar que esta procesando
        var textoOriginal = btn.textContent;
        btn.textContent = 'Guardando...';
        btn.disabled = true;

        // Generar un ID con el mismo formato que ya usa la tabla (ej: inv-1788705146239)
        var nuevoId = 'inv-' + Date.now();

        // Mapear los datos visuales a las columnas de la tabla 'inventory'
        var payload: any = {
          id: nuevoId,
          item_name: nombreInsumo,
          nombre: nombreInsumo,
          categoria: categoriaBodega,
          current_stock: stockActual,
          stock_actual: stockActual,
          updated_at: new Date().toISOString()
        };

        // Si existe input de stock minimo y unidad
        if (inputs.length > 3) {
          var minStock = parseInt((inputs[3] as HTMLInputElement).value) || 0;
          payload.min_stock = minStock;
          payload.stock_minimo = minStock;
        }
        if (inputs.length > 4) {
          var unidad = (inputs[4] as HTMLInputElement).value.trim() || 'Unidades';
          payload.unidad_medida = unidad;
          payload.unidad = unidad;
        }

        // Enviar datos a Supabase
        cliente.from('inventory').insert([payload]).then(function (res: any) {
          if (res.error) {
            console.error('Error en Supabase al registrar inventario:', res.error);
            btn.textContent = textoOriginal;
            btn.disabled = false;
          } else {
            btn.textContent = 'Registrado con exito';

            // Limpiar los campos del formulario tras el exito
            (inputs[0] as HTMLInputElement).value = '';
            if (inputs.length > 2) (inputs[2] as HTMLInputElement).value = '';
            if (inputs.length > 4) (inputs[4] as HTMLInputElement).value = '';

            // Restaurar el boton despues de 2 segundos
            setTimeout(function () {
              btn.textContent = textoOriginal;
              btn.disabled = false;
            }, 2000);
          }
        }).catch(function (err: any) {
          console.error('Excepcion al registrar inventario:', err);
          btn.textContent = textoOriginal;
          btn.disabled = false;
        });
      } catch (error) {
        console.error("Error capturado en módulo de inventario para evitar pantalla en blanco:", error);
      }
    });
  }
})();
