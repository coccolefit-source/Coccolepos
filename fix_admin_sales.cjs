const fs = require('fs');

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const filterOld = `const matchesSearch = !salesSearch.trim() || 
            v.vendedor_nombre.toLowerCase().includes(salesSearch.toLowerCase()) ||
            v.productos_vendidos.some(p => p.nombre.toLowerCase().includes(salesSearch.toLowerCase()) || p.codigo.toLowerCase().includes(salesSearch.toLowerCase()));
            
          return matchesStartDate && matchesEndDate && matchesSeller && matchesSearch;
        });`;

const filterNew = `const matchesSearch = !salesSearch.trim() || 
            v.vendedor_nombre.toLowerCase().includes(salesSearch.toLowerCase()) ||
            v.productos_vendidos.some(p => p.nombre.toLowerCase().includes(salesSearch.toLowerCase()) || p.codigo.toLowerCase().includes(salesSearch.toLowerCase()));
          
          const matchesPaymentMethod = !salesPaymentMethod || v.metodo_pago === salesPaymentMethod;
            
          return matchesStartDate && matchesEndDate && matchesSeller && matchesSearch && matchesPaymentMethod;
        });
        
        const totalEfectivoFiltered = filteredSales.filter(v => v.metodo_pago === 'efectivo').reduce((acc, curr) => acc + curr.total, 0);
        const totalTarjetaFiltered = filteredSales.filter(v => v.metodo_pago === 'tarjeta').reduce((acc, curr) => acc + curr.total, 0);
        const totalTransferenciaFiltered = filteredSales.filter(v => v.metodo_pago === 'transferencia').reduce((acc, curr) => acc + curr.total, 0);
        const totalRappiFiltered = filteredSales.filter(v => v.metodo_pago === 'rappi').reduce((acc, curr) => acc + curr.total, 0);
        `;

content = content.replace(filterOld, filterNew);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
