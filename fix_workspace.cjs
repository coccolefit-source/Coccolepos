const fs = require('fs');

let content = fs.readFileSync('src/components/EmployeeWorkspace.tsx', 'utf8');

// 1. Add payment states at the top of EmployeeWorkspace
content = content.replace(
  'const [tempStock, setTempStock] = useState<Record<string, number>>({});',
  `const [tempStock, setTempStock] = useState<Record<string, number>>({});
  const [activePaymentSugerida, setActivePaymentSugerida] = useState<string | null>(null);
  const [posPaymentMethod, setPosPaymentMethod] = useState<string>('efectivo');`
);

// 2. Change Venta Sugerida block
const sugeridaBlockOld = `<button
                    id={\`increment-btn-\${prod.id}\`}
                    onClick={() => onAddVentaSugerida(prod.id, empleado.id)}
                    className="h-10 w-10 bg-[#4B9CD3] hover:bg-[#3A82B4] active:scale-95 text-white rounded-lg flex items-center justify-center font-black text-lg transition-all shadow-2xs"
                    title="Vender 1 unidad"
                  >
                    +1
                  </button>`;

const sugeridaBlockNew = `{activePaymentSugerida === prod.id ? (
                    <div className="flex flex-col gap-1 z-10 absolute right-0 top-0 bg-white shadow-md border border-[#E2E8F0] p-2 rounded-xl">
                      <p className="text-[9px] font-bold text-slate-500 text-center mb-1 uppercase">Medio de Pago</p>
                      {['efectivo', 'tarjeta', 'transferencia', 'rappi'].map(method => (
                        <button
                          key={method}
                          onClick={() => {
                            onAddVentaSugerida(prod.id, empleado.id, method);
                            setActivePaymentSugerida(null);
                          }}
                          className="text-[10px] py-1.5 px-3 bg-slate-50 hover:bg-[#4B9CD3] hover:text-white rounded text-slate-700 font-medium capitalize transition-colors"
                        >
                          {method}
                        </button>
                      ))}
                      <button 
                        onClick={() => setActivePaymentSugerida(null)}
                        className="text-[9px] mt-1 text-red-400 hover:text-red-600 font-bold"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      id={\`increment-btn-\${prod.id}\`}
                      onClick={() => setActivePaymentSugerida(prod.id)}
                      className="h-10 w-10 bg-[#4B9CD3] hover:bg-[#3A82B4] active:scale-95 text-white rounded-lg flex items-center justify-center font-black text-lg transition-all shadow-2xs relative"
                      title="Vender 1 unidad"
                    >
                      +1
                    </button>
                  )}`;

content = content.replace(sugeridaBlockOld, sugeridaBlockNew);

// Make relative to the parent of the +1 button so absolute positioning works
content = content.replace(
  '<div key={prod.id} className="bg-white border border-[#E2E8F0] p-3.5 rounded-xl shadow-3xs flex items-center justify-between gap-3">',
  '<div key={prod.id} className="bg-white border border-[#E2E8F0] p-3.5 rounded-xl shadow-3xs flex items-center justify-between gap-3 relative">'
);

fs.writeFileSync('src/components/EmployeeWorkspace.tsx', content);
