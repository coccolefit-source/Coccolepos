const fs = require('fs');

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const exportOld = `const handleExportVentas = () => {
    const headers = ['ID Venta', 'Fecha', 'Hora', 'Vendedor', 'Productos Vendidos', 'Cantidad Total', 'Total Transaccion ($)'];
    const rows = (ventasRegistradas || []).map(v => {
      const prodsStr = v.productos_vendidos.map(p => \`\${p.nombre} (\${p.cantidad})\`).join('; ');
      const totalQty = v.productos_vendidos.reduce((sum, p) => sum + p.cantidad, 0);
      return [
        v.id,
        v.fecha,
        v.hora,
        v.vendedor_nombre,
        prodsStr,
        totalQty,
        v.total.toFixed(2)
      ];
    });`;
    
const exportNew = `const handleExportVentas = () => {
    const headers = ['ID Venta', 'Fecha', 'Hora', 'Vendedor', 'Productos Vendidos', 'Cantidad Total', 'Total Transaccion ($)', 'Medio de Pago'];
    const rows = (ventasRegistradas || []).map(v => {
      const prodsStr = v.productos_vendidos.map(p => \`\${p.nombre} (\${p.cantidad})\`).join('; ');
      const totalQty = v.productos_vendidos.reduce((sum, p) => sum + p.cantidad, 0);
      return [
        v.id,
        v.fecha,
        v.hora,
        v.vendedor_nombre,
        prodsStr,
        totalQty,
        v.total.toFixed(2),
        v.metodo_pago || 'efectivo'
      ];
    });`;

content = content.replace(exportOld, exportNew);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
