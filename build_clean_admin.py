import re

with open('src/components/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Marker for start of reportes tab content
idx_reportes_start = content.find('/* VISTA DE REPORTES DE VENTAS & CATÁLOGO POS ORIGINAL */')
idx_feedback_modal = content.find('/* Modal para Agregar Feedback */')

# Find the end of activeTab === 'ventas' container
# Before feedback modal, there is:
# </div> )} })()} </div> )}
idx_reportes_end = content.rfind('</div>', 0, idx_feedback_modal)

# Let's locate each section using unique landmark comments:

# Landmark 1: Tendencias
s1_start = content.find('{/* GRÁFICAS DE TENDENCIAS */}', idx_reportes_start)

# Landmark 2: Filtros de consulta
s2_start = content.find('{/* FILTROS DE CONSULTA */}', idx_reportes_start)

# Landmark 3: Medios de pago KPIs
s_medios_pago = content.find('{/* KPI DESGLOSE MEDIOS DE PAGO */}', s2_start)

# Landmark 4: KPIs del rango
s_kpi_rango = content.find('{/* KPIs DEL RANGO FILTRADO */}', s_medios_pago)

# Landmark 5: Tabla de transacciones auditables
s3_start = content.find('{/* TABLA / LOG DE TRANSACCIONES AUDITABLES */}', s_kpi_rango)

# Landmark 6: Exportador de reportes consolidados
s4_start = content.find('{/* EXPORTADOR DE REPORTES CONSOLIDADOS (CSV) */}', s3_start)

# Landmark 7: Cortes de caja
s_cortes = content.find('{/* HISTORIAL DE CUADRES DE CAJA / CORTES DIARIOS */}', s4_start)

# Landmark 8: Registrar nuevo producto (Fila A)
s5_start = content.find('{/* FILA A: REGISTRO Y EDICIÓN DE PRODUCTOS DEL CATÁLOGO (ESTRUCTURA FINANCIERA COMPLETA) */}', idx_reportes_start)
if s5_start == -1:
    s5_start = content.find('{/* SECCIÓN DOBLE REORGANIZADA A FILAS 100% HORIZONTALES */}', idx_reportes_start)

# Landmark 9: Modal CSV
s_csv_modal = content.find('{/* MODAL DE CARGA MASIVA CSV DE PRODUCTOS */}', idx_reportes_start)

print("s1_start:", s1_start)
print("s2_start:", s2_start)
print("s3_start:", s3_start)
print("s4_start:", s4_start)
print("s5_start:", s5_start)
print("s_csv_modal:", s_csv_modal)
