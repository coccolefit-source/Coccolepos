import re

with open('src/components/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

idx_reportes_start = content.find('/* VISTA DE REPORTES DE VENTAS & CATÁLOGO POS ORIGINAL */')
idx_feedback = content.find('/* Modal para Agregar Feedback */')

# Locate markers
s1_mark = content.find('{/* GRÁFICAS DE TENDENCIAS */}', idx_reportes_start)
s2_mark = content.find('{/* FILTROS DE CONSULTA */}', idx_reportes_start)
# Search start of section 2 wrapper before s2_mark
s2_wrapper_start = content.rfind('<div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-5 flex flex-col">', 0, s2_mark)

s3_mark = content.find('{/* TABLA / LOG DE TRANSACCIONES AUDITABLES */}', idx_reportes_start)
s4_mark = content.find('{/* EXPORTADOR DE REPORTES CONSOLIDADOS (CSV) */}', idx_reportes_start)
s5_mark = content.find('{/* FILA A: REGISTRO Y EDICIÓN DE PRODUCTOS DEL CATÁLOGO (ESTRUCTURA FINANCIERA COMPLETA) */}', idx_reportes_start)

print("s1_mark:", s1_mark)
print("s2_wrapper_start:", s2_wrapper_start)
print("s3_mark:", s3_mark)
print("s4_mark:", s4_mark)
print("s5_mark:", s5_mark)
