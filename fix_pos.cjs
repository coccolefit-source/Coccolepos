const fs = require('fs');

let content = fs.readFileSync('src/components/EmployeeWorkspace.tsx', 'utf8');

const posOld = `<div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-500">Total a Cobrar:</span>
                      <span className="font-black text-[#2C3E50] text-lg">
                        \${cartItems.reduce((sum, item) => sum + (item.producto.precio * item.cantidad), 0).toFixed(2)}
                      </span>
                    </div>
                    
                    <button`;

const posNew = `<div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-500">Total a Cobrar:</span>
                      <span className="font-black text-[#2C3E50] text-lg">
                        \${cartItems.reduce((sum, item) => sum + (item.producto.precio * item.cantidad), 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs mt-2 mb-2">
                      <span className="font-bold text-slate-500">Medio de Pago:</span>
                      <select 
                        value={posPaymentMethod}
                        onChange={(e) => setPosPaymentMethod(e.target.value)}
                        className="text-xs px-2 py-1.5 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#4B9CD3] capitalize"
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta (Datáfono)</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="rappi">Rappi</option>
                      </select>
                    </div>
                    
                    <button`;

content = content.replace(posOld, posNew);

content = content.replace(
  "metodo_pago: 'efectivo',",
  "metodo_pago: posPaymentMethod,"
);

fs.writeFileSync('src/components/EmployeeWorkspace.tsx', content);
