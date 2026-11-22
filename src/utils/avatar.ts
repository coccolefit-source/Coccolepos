/**
 * Generador local de avatares SVG con iniciales y miniaturas de respaldo
 * para evitar dependencias externas (como Unsplash) que fallan sin conexión.
 */

const PALETTE = [
  { bg: '#4B9CD3', fg: '#FFFFFF' },
  { bg: '#2C3E50', fg: '#FFFFFF' },
  { bg: '#4C8F44', fg: '#FFFFFF' },
  { bg: '#2E86AB', fg: '#FFFFFF' },
  { bg: '#1B4F72', fg: '#FFFFFF' },
  { bg: '#5D6D7E', fg: '#FFFFFF' },
];

function getInitials(name?: string): string {
  const cleaned = (name || 'CF').trim();
  if (!cleaned) return 'CF';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function pickPalette(seed: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Devuelve un data-URI SVG liviano con las iniciales del usuario.
 */
export function getInitialsAvatar(name?: string, role?: string): string {
  const initials = escapeXml(getInitials(name));
  const palette = role === 'admin'
    ? { bg: '#2C3E50', fg: '#FFFDF6' }
    : pickPalette(name || 'Coccole Fit');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">` +
    `<rect width="128" height="128" rx="64" fill="${palette.bg}"/>` +
    `<circle cx="64" cy="64" r="58" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3"/>` +
    `<text x="64" y="68" text-anchor="middle" dominant-baseline="central" ` +
    `font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="44" font-weight="800" fill="${palette.fg}">${initials}</text>` +
    `</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Resuelve la URL de avatar evitando enlaces externos rotos de Unsplash.
 */
export function resolveSafeAvatar(avatarUrl?: string | null, name?: string, role?: string): string {
  if (!avatarUrl || avatarUrl.includes('unsplash.com')) {
    return getInitialsAvatar(name, role);
  }
  return avatarUrl;
}

/**
 * Genera una imagen SVG local de evidencia operativa sin depender de internet.
 */
export function getLocalEvidenceSvg(label: string, accent: string = '#4B9CD3'): string {
  const safeLabel = escapeXml(label.trim() || 'Evidencia Operativa');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260">` +
    `<rect width="400" height="260" rx="18" fill="#FFFDF6"/>` +
    `<rect x="12" y="12" width="376" height="236" rx="12" fill="#EBF5FB" stroke="${accent}" stroke-width="2" stroke-dasharray="6 4"/>` +
    `<circle cx="200" cy="100" r="34" fill="${accent}"/>` +
    `<path d="M186 100 l10 10 l20 -22" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<text x="200" y="166" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="18" font-weight="800" fill="#2C3E50">${safeLabel}</text>` +
    `<text x="200" y="192" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="12" font-weight="600" fill="#64748B">COCCOLE FIT · Registro verificado</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
