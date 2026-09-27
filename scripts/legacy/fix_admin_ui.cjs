const fs = require('fs');

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const filterHtmlOld = `<div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filtrar Vendedor</label>
                      <select
                        value={salesSeller}
                        onChange={(e) => setSalesSeller(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-[#E2E8F0] rounded-lg bg-white"
                      >
                        <option value="">-- Todos los Staffs --</option>
                        {usuarios.map(u => (
                          <option key={u.id} value={u.id}>{u.nombre} ({u.rol === 'admin' ? 'Admin' : 'Staff'})</option>
                        ))}
                      </select>
                    </div>
                  </div>`;

const filterHtmlNew = `<div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filtrar Vendedor</label>
                      <select
                        value={salesSeller}
                        onChange={(e) => setSalesSeller(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-[#E2E8F0] rounded-lg bg-white"
                      >
                        <option value="">-- Todos los Staffs --</option>
                        {usuarios.map(u => (
                          <option key={u.id} value={u.id}>{u.nombre} ({u.rol === 'admin' ? 'Admin' : 'Staff'})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Medio Pago</label>
                      <select
                        value={salesPaymentMethod}
                        onChange={(e) => setSalesPaymentMethod(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-[#E2E8F0] rounded-lg bg-white capitalize"
                      >
                        <option value="">-- Todos --</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta (Datáfono)</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="rappi">Rappi</option>
                      </select>
                    </div>
                  </div>`;

content = content.replace(filterHtmlOld, filterHtmlNew);

const cleanOld = `setSalesSearch('');
                      }}`;
                      
const cleanNew = `setSalesSearch('');
                        setSalesPaymentMethod('');
                      }}`;
                      
content = content.replace(cleanOld, cleanNew);

const kpisOld = `</div>

                {/* KPIs DEL RANGO FILTRADO */}`;
                
const kpisNew = `</div>

                {/* KPI DESGLOSE MEDIOS DE PAGO */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-4">
                  <div className="bg-white border border-[#E2E8F0] p-3 rounded-lg text-center shadow-xs">
                    <span className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Efectivo</span>
                    <span className="text-sm font-black text-[#4B9CD3] mt-0.5 block">\${totalEfectivoFiltered.toFixed(2)}</span>
                  </div>
                  <div className="bg-white border border-[#E2E8F0] p-3 rounded-lg text-center shadow-xs">
                    <span className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Tarjeta</span>
                    <span className="text-sm font-black text-[#2C3E50] mt-0.5 block">\${totalTarjetaFiltered.toFixed(2)}</span>
                  </div>
                  <div className="bg-white border border-[#E2E8F0] p-3 rounded-lg text-center shadow-xs">
                    <span className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Transferencia</span>
                    <span className="text-sm font-black text-[#2C3E50] mt-0.5 block">\${totalTransferenciaFiltered.toFixed(2)}</span>
                  </div>
                  <div className="bg-white border border-[#E2E8F0] p-3 rounded-lg text-center shadow-xs">
                    <span className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Rappi</span>
                    <span className="text-sm font-black text-[#2C3E50] mt-0.5 block">\${totalRappiFiltered.toFixed(2)}</span>
                  </div>
                </div>

                {/* KPIs DEL RANGO FILTRADO */}`;

content = content.replace(kpisOld, kpisNew);

// Add metodo de pago to the grid of sales list
const listHeaderOld = `<th className="text-left font-extrabold text-[10px] text-slate-500 p-2.5">Vendedor</th>`;
const listHeaderNew = `<th className="text-left font-extrabold text-[10px] text-slate-500 p-2.5">Vendedor</th>
                            <th className="text-left font-extrabold text-[10px] text-slate-500 p-2.5">Medio</th>`;
content = content.replace(listHeaderOld, listHeaderNew);

const listBodyOld = `<td className="p-2.5">
                                <span className="font-bold text-[#4B9CD3] bg-[#EBF5FB] px-2 py-0.5 rounded-full text-[10px]">{s.vendedor_nombre}</span>
                              </td>`;
const listBodyNew = `<td className="p-2.5">
                                <span className="font-bold text-[#4B9CD3] bg-[#EBF5FB] px-2 py-0.5 rounded-full text-[10px]">{s.vendedor_nombre}</span>
                              </td>
                              <td className="p-2.5 font-bold text-[#2C3E50] text-[10px] capitalize">{s.metodo_pago || 'efectivo'}</td>`;
content = content.replace(listBodyOld, listBodyNew);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
