import re

with open('/app/applet/src/lib/supabaseClient.ts', 'r', encoding='utf-8') as f:
    content = f.read()

bogota_helpers = '''
export function getBogotaDateDaysAgo(daysAgo: number): string {
  try {
    const nowStr = getLocalDateString();
    const [year, month, day] = nowStr.split('-').map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day - daysAgo, 12, 0, 0));
    const y = utcDate.getUTCFullYear();
    const m = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(utcDate.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return getLocalDateString(d);
  }
}

export function getBogotaFirstDayOfMonth(): string {
  const nowStr = getLocalDateString();
  const parts = nowStr.split('-');
  return `${parts[0]}-${parts[1]}-01`;
}
'''

if 'export function getBogotaDateDaysAgo' not in content:
    target = "return formatter.format(d);\n  } catch (err) {"
    idx = content.find("export function calcularHorasTurno")
    if idx != -1:
        content = content[:idx] + bogota_helpers + "\n\n" + content[idx:]

content = content.replace("new Date().toISOString().split('T')[0]", "getLocalDateString()")

with open('/app/applet/src/lib/supabaseClient.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated supabaseClient.ts successfully!")
