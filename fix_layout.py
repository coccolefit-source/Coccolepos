import sys

with open('src/components/EmployeeWorkspace.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# find "CUERPO DEL PANEL DE TRABAJO"
start_idx = -1
for i, line in enumerate(lines):
    if "CUERPO DEL PANEL DE TRABAJO" in line:
        start_idx = i
        break

if start_idx != -1:
    lines[start_idx+1] = '      <div className="flex flex-col gap-6 items-start w-full">\n'
    
# find "COLUMNA LATERAL IZQUIERDA" and "COLUMNA CENTRAL DERECHA"
for i in range(start_idx, len(lines)):
    if "COLUMNA LATERAL IZQUIERDA" in lines[i]:
        lines[i+1] = '        <div className="w-full space-y-6">\n'
    if "COLUMNA CENTRAL DERECHA" in lines[i]:
        lines[i+1] = '        <div className="w-full space-y-4">\n'

with open('src/components/EmployeeWorkspace.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
