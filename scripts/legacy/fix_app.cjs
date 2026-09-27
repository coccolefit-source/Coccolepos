const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(
  'const handleAddVentaSugerida = (producto_id: string, usuario_id: string) => {',
  'const handleAddVentaSugerida = (producto_id: string, usuario_id: string, metodo_pago: string) => {'
);
content = content.replace(
  /unidades_contadas: updatedVentas\[existingIdx\]\.unidades_contadas \+ 1/g,
  'unidades_contadas: updatedVentas[existingIdx].unidades_contadas + 1,\n          metodo_pago'
);
content = content.replace(
  'unidades_contadas: 1',
  'unidades_contadas: 1,\n          metodo_pago'
);
fs.writeFileSync('src/App.tsx', content);
