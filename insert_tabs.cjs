const fs = require('fs');

const content = fs.readFileSync('src/components/EmployeeWorkspace.tsx', 'utf8');

const inventarioTab = `
          {/* TAB 2: INVENTARIO / CONTROL DE STOCK */}
          {employeeTab === 'inventario' && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4 animate-in fade-in duration-150">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h4 className="font-extrabold text-xs text-[#4B9CD3] uppercase tracking-wider">Control Físico de Inventario</h4>
                  <p className="text-[10px] text-slate-500">Registra el conteo actual de bodega o cocina.</p>
                </div>
              </div>

              <div className="space-y-3">
                {inventario.map(item => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-[#E2E8F0] rounded-lg gap-3">
                    <div>
                      <h5 className="font-bold text-xs text-[#2C3E50]">{item.nombre_insumo}</h5>
                      <p className="text-[10px] text-slate-400 font-medium">Categoría: {item.categoria} | Último stock: {item.cantidad_actual} {item.unidad_medida}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Conteo"
                        className="w-20 text-xs px-2 py-1.5 border border-[#E2E8F0] rounded-md focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3]"
                        value={tempStock[item.id] !== undefined ? tempStock[item.id] : ''}
                        onChange={(e) => setTempStock({ ...tempStock, [item.id]: parseInt(e.target.value) || 0 })}
                      />
                      <span className="text-[10px] text-slate-500 font-bold w-6">{item.unidad_medida}</span>
                      <button
                        onClick={() => {
                          if (tempStock[item.id] !== undefined) {
                            onUpdateStock(item.id, tempStock[item.id], empleado.nombre);
                            const newTemp = { ...tempStock };
                            delete newTemp[item.id];
                            setTempStock(newTemp);
                          }
                        }}
                        className="bg-[#4B9CD3] hover:bg-[#3A82B4] text-white text-[10px] font-bold px-3 py-1.5 rounded-md transition-colors"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CAJA POS / REGISTRO DE VENTAS */}
          {employeeTab === 'ventas' && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-[#E2E8F0] pb-2">
                <h4 className="font-extrabold text-[#2C3E50] text-sm flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-[#4B9CD3]" />
                  Terminal de Venta y Cuadre
                </h4>
                <p className="text-[10px] text-slate-500">Registra pedidos de clientes y realiza tu corte de caja final.</p>
              </div>

              {/* CONTROLES POS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LISTA DE PRODUCTOS (CATÁLOGO) */}
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Buscar producto..."
                      value={salesSearch}
                      onChange={(e) => setSalesSearch(e.target.value)}
                      className="flex-1 text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3]"
                    />
                  </div>
                  
                  <div className="h-64 overflow-y-auto pr-1 space-y-2">
                    {(() => {
                      const filteredProducts = productosCatalogo.filter(p => 
                        p.nombre.toLowerCase().includes(salesSearch.toLowerCase()) &&
                        (selectedCategory === 'Todos' || p.categoria === selectedCategory)
                      );
                      
                      return (
                        <div className="grid grid-cols-1 gap-2">
                          {filteredProducts.map(prod => {
                            const stockAvailable = inventario.some(i => i.nombre_insumo.includes(prod.nombre) && i.cantidad_actual > 0) || true; // Simplificación de stock

                            return (
                              <div key={prod.id} className="border border-[#E2E8F0] rounded-lg p-2.5 flex justify-between items-center hover:bg-[#FFFDF6] transition-colors">
                                <div>
                                  <h5 className="font-bold text-xs text-[#2C3E50]">{prod.nombre}</h5>
                                  <p className="text-[10px] text-[#4B9CD3] font-black">\\${prod.precio.toFixed(2)}</p>
                                </div>
                                <button
                                  onClick={() => {
                                    const existing = cartItems.find(item => item.producto.id === prod.id);
                                    if (existing) {
                                      setCartItems(cartItems.map(item => item.producto.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item));
                                    } else {
                                      setCartItems([...cartItems, { producto: prod, cantidad: 1 }]);
                                    }
                                  }}
                                  className="h-8 w-8 bg-[#4B9CD3]/10 hover:bg-[#4B9CD3] hover:text-white text-[#4B9CD3] rounded-md flex items-center justify-center transition-colors"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* CARRITO Y RESUMEN DE COBRO */}
                <div className="bg-[#FFFDF6] border border-[#E2E8F0] rounded-xl p-3 flex flex-col h-full">
                  <h5 className="font-bold text-xs text-[#2C3E50] mb-3 border-b border-[#E2E8F0] pb-2">Ticket Actual</h5>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                    {cartItems.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-medium">
                        Agrega productos al ticket para cobrar
                      </div>
                    ) : (
                      cartItems.map(item => (
                        <div key={item.producto.id} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-1">
                              <button onClick={() => {
                                setCartItems(cartItems.map(i => i.producto.id === item.producto.id ? { ...i, cantidad: i.cantidad + 1 } : i));
                              }} className="w-4 h-4 bg-slate-100 rounded flex items-center justify-center text-slate-600 hover:bg-slate-200">
                                <PlusCircle className="w-3 h-3" />
                              </button>
                              <button onClick={() => {
                                if (item.cantidad > 1) {
                                  setCartItems(cartItems.map(i => i.producto.id === item.producto.id ? { ...i, cantidad: i.cantidad - 1 } : i));
                                } else {
                                  setCartItems(cartItems.filter(i => i.producto.id !== item.producto.id));
                                }
                              }} className="w-4 h-4 bg-slate-100 rounded flex items-center justify-center text-slate-600 hover:bg-slate-200">
                                <MinusCircle className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="font-bold text-[#2C3E50] w-4 text-center">{item.cantidad}</span>
                            <span className="text-slate-600 truncate max-w-[100px]">{item.producto.nombre}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-[#4B9CD3]">\\${(item.producto.precio * item.cantidad).toFixed(2)}</span>
                            <button onClick={() => setCartItems(cartItems.filter(i => i.producto.id !== item.producto.id))} className="text-red-400 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-500">Total a Cobrar:</span>
                      <span className="font-black text-[#2C3E50] text-lg">
                        \\${cartItems.reduce((sum, item) => sum + (item.producto.precio * item.cantidad), 0).toFixed(2)}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => {
                        if (cartItems.length === 0) return;
                        
                        const newVenta = {
                          fecha: '2026-08-20',
                          hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                          cajero_id: empleado.id,
                          cajero_nombre: empleado.nombre,
                          productos: cartItems.map(item => ({
                            producto_id: item.producto.id,
                            nombre: item.producto.nombre,
                            cantidad: item.cantidad,
                            precio_unitario: item.producto.precio,
                            subtotal: item.producto.precio * item.cantidad
                          })),
                          total: cartItems.reduce((sum, item) => sum + (item.producto.precio * item.cantidad), 0),
                          metodo_pago: 'efectivo',
                          estado: 'completada'
                        };
                        
                        onRegistrarVenta(newVenta);
                        setCartItems([]);
                        alert("Venta registrada exitosamente");
                      }}
                      disabled={cartItems.length === 0}
                      className="w-full bg-[#4B9CD3] hover:bg-[#3A82B4] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Procesar Venta POS
                    </button>
                  </div>
                </div>
              </div>

              {/* FORMULARIO DE CUADRE DE CAJA */}
              <div className="mt-8 pt-6 border-t border-dashed border-[#E2E8F0]">
                <h5 className="font-extrabold text-[#2C3E50] text-xs mb-3 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-[#4B9CD3]" />
                  Cuadre de Caja Diario / Cierre de Turno
                </h5>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    
                    const newCuadre = {
                      fecha: '2026-08-20',
                      hora_cierre: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                      empleado_id: empleado.id,
                      empleado_nombre: empleado.nombre,
                      efectivo_esperado: parseFloat(formData.get('efectivo_esperado')) || 0,
                      efectivo_contado: parseFloat(formData.get('efectivo_contado')) || 0,
                      tarjeta_esperado: parseFloat(formData.get('tarjeta_esperado')) || 0,
                      tarjeta_contado: parseFloat(formData.get('tarjeta_contado')) || 0,
                      diferencia_total: (parseFloat(formData.get('efectivo_contado')) || 0) - (parseFloat(formData.get('efectivo_esperado')) || 0),
                      observaciones: formData.get('observaciones'),
                      estado: 'pendiente_revision'
                    };
                    
                    onRegistrarCuadreCaja(newCuadre);
                    e.currentTarget.reset();
                    alert("Cuadre de caja enviado a revisión.");
                  }}
                  className="bg-[#FFFDF6] p-4 rounded-xl border border-[#E2E8F0] space-y-3"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Efectivo en Sistema</label>
                      <input name="efectivo_esperado" type="number" step="0.01" className="w-full text-xs px-2 py-1.5 border border-[#E2E8F0] rounded focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3]" required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Efectivo Físico Contado</label>
                      <input name="efectivo_contado" type="number" step="0.01" className="w-full text-xs px-2 py-1.5 border border-[#E2E8F0] rounded focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3]" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Notas u Observaciones del Cierre</label>
                    <input name="observaciones" type="text" placeholder="Faltantes, sobrantes, gastos de caja chica..." className="w-full text-xs px-2 py-1.5 border border-[#E2E8F0] rounded focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3]" />
                  </div>
                  <button type="submit" className="w-full bg-[#2C3E50] hover:bg-slate-800 text-white font-bold text-xs py-2 rounded transition-colors mt-2">
                    Enviar Corte de Caja Diario
                  </button>
                </form>
              </div>
            </div>
          )}
`;

const updatedContent = content.replace(
  "{/* TAB 3: CONSULTA DE TURNOS (VISTA EMPLEADO) */}",
  inventarioTab + "\n\n          {/* TAB 3: CONSULTA DE TURNOS (VISTA EMPLEADO) */}"
);

fs.writeFileSync('src/components/EmployeeWorkspace.tsx', updatedContent);
