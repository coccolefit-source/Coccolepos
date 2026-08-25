const fs = require('fs');

let content = fs.readFileSync('src/components/EmployeeWorkspace.tsx', 'utf8');

const cuadreFormOld = `<h5 className="font-extrabold text-[#2C3E50] text-xs mb-3 flex items-center gap-1.5">
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
                      efectivo_esperado: parseFloat(formData.get('efectivo_esperado') as string) || 0,
                      efectivo_contado: parseFloat(formData.get('efectivo_contado') as string) || 0,
                      tarjeta_esperado: parseFloat(formData.get('tarjeta_esperado') as string) || 0,
                      tarjeta_contado: parseFloat(formData.get('tarjeta_contado') as string) || 0,
                      diferencia_total: (parseFloat(formData.get('efectivo_contado') as string) || 0) - (parseFloat(formData.get('efectivo_esperado') as string) || 0),
                      observaciones: formData.get('observaciones') as string,
                      estado: 'pendiente_revision'
                    };
                    
                    onRegistrarCuadreCaja(newCuadre as any);
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
                  <button type="submit" className="w-full bg-[#2C3E50] hover:bg-slate-800 text-white font-bold text-xs py-2 rounded transition-colors mt-2 cursor-pointer">
                    Enviar Corte de Caja Diario
                  </button>
                </form>`;

const computedTotals = `
  const todayForTotals = new Date().toISOString().split('T')[0];
  // Calculate totals from ventasRegistradas for the current user
  const userSales = ventasRegistradas.filter(v => v.usuario_id === empleado.id || v.vendedor_nombre === empleado.nombre);
  
  const totalEfectivo = userSales.filter(v => v.metodo_pago === 'efectivo').reduce((sum, v) => sum + v.total, 0);
  const totalTarjeta = userSales.filter(v => v.metodo_pago === 'tarjeta').reduce((sum, v) => sum + v.total, 0);
  const totalTransferencia = userSales.filter(v => v.metodo_pago === 'transferencia').reduce((sum, v) => sum + v.total, 0);
  const totalRappi = userSales.filter(v => v.metodo_pago === 'rappi').reduce((sum, v) => sum + v.total, 0);
`;

const cuadreFormNew = `
                <h5 className="font-extrabold text-[#2C3E50] text-xs mb-3 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-[#4B9CD3]" />
                  Cuadre de Caja Diario / Cierre de Turno
                </h5>
                {(() => {
                  const userSales = ventasRegistradas.filter(v => v.usuario_id === empleado.id || (v as any).cajero_id === empleado.id);
                  const totalEfectivo = userSales.filter(v => v.metodo_pago === 'efectivo').reduce((sum, v) => sum + v.total, 0);
                  const totalTarjeta = userSales.filter(v => v.metodo_pago === 'tarjeta').reduce((sum, v) => sum + v.total, 0);
                  const totalTransferencia = userSales.filter(v => v.metodo_pago === 'transferencia').reduce((sum, v) => sum + v.total, 0);
                  const totalRappi = userSales.filter(v => v.metodo_pago === 'rappi').reduce((sum, v) => sum + v.total, 0);

                  return (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        
                        const newCuadre = {
                          fecha: new Date().toISOString().split('T')[0],
                          hora_cierre: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                          empleado_id: empleado.id,
                          empleado_nombre: empleado.nombre,
                          efectivo_esperado: totalEfectivo,
                          efectivo_contado: parseFloat(formData.get('efectivo_contado') as string) || 0,
                          tarjeta_esperado: totalTarjeta,
                          transferencia_esperado: totalTransferencia,
                          rappi_esperado: totalRappi,
                          diferencia_total: (parseFloat(formData.get('efectivo_contado') as string) || 0) - totalEfectivo,
                          observaciones: formData.get('observaciones') as string,
                          estado: 'pendiente_revision'
                        };
                        
                        onRegistrarCuadreCaja(newCuadre as any);
                        e.currentTarget.reset();
                        alert("Cuadre de caja enviado a revisión.");
                      }}
                      className="bg-[#FFFDF6] p-4 rounded-xl border border-[#E2E8F0] space-y-3"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-3 rounded border border-slate-100 mb-3">
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Efectivo Sistema</p>
                          <p className="font-black text-[#4B9CD3] text-sm">\${totalEfectivo.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Tarjeta (Datáfono)</p>
                          <p className="font-black text-slate-700 text-sm">\${totalTarjeta.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Transferencia</p>
                          <p className="font-black text-slate-700 text-sm">\${totalTransferencia.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Rappi</p>
                          <p className="font-black text-slate-700 text-sm">\${totalRappi.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Efectivo Físico Contado</label>
                          <input name="efectivo_contado" type="number" step="0.01" className="w-full text-xs px-2 py-1.5 border border-[#E2E8F0] rounded focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3]" required placeholder="Ingresa efectivo real en caja" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Notas u Observaciones</label>
                          <input name="observaciones" type="text" placeholder="Faltantes, gastos de caja chica..." className="w-full text-xs px-2 py-1.5 border border-[#E2E8F0] rounded focus:outline-hidden focus:ring-1 focus:ring-[#4B9CD3]" />
                        </div>
                      </div>
                      
                      <button type="submit" className="w-full bg-[#2C3E50] hover:bg-slate-800 text-white font-bold text-xs py-2 rounded transition-colors mt-2 cursor-pointer">
                        Enviar Corte de Caja Diario
                      </button>
                    </form>
                  );
                })()}`;

content = content.replace(cuadreFormOld, cuadreFormNew);

fs.writeFileSync('src/components/EmployeeWorkspace.tsx', content);
