const fs = require('fs');

let content = fs.readFileSync('src/types.ts', 'utf8');

// Modify RegistroVenta
content = content.replace(
  'unidades_contadas: number;',
  'unidades_contadas: number;\n  metodo_pago?: string;'
);

// Modify Venta
content = content.replace(
  'total: number;\n}',
  'total: number;\n  metodo_pago?: string;\n}'
);

// Modify CuadreCaja
content = content.replace(
  'export interface CuadreCaja {\n  id: string;\n  usuario_id: string;\n  usuario_nombre: string;\n  fecha: string; // YYYY-MM-DD\n  hora: string; // HH:MM\n  efectivo_contado: number;\n  tarjeta_transferencia: number;\n  observaciones: string;\n}',
  `export interface CuadreCaja {
  id: string;
  empleado_id?: string;
  empleado_nombre?: string;
  usuario_id?: string;
  usuario_nombre?: string;
  fecha: string;
  hora?: string;
  hora_cierre?: string;
  efectivo_esperado?: number;
  efectivo_contado: number;
  tarjeta_esperado?: number;
  transferencia_esperado?: number;
  rappi_esperado?: number;
  diferencia_total?: number;
  observaciones: string;
  estado?: string;
}`
);

fs.writeFileSync('src/types.ts', content);
