/**
 * Módulo centralizado de fechas y horas configurado estrictamente
 * en la zona horaria oficial de Colombia: America/Bogota (UTC-5).
 *
 * Evita que los registros creados después de las 7:00 PM COT
 * salten al día siguiente por conversión a UTC (toISOString).
 */

export const COLOMBIA_TIMEZONE = 'America/Bogota';

function toValidDate(input?: Date | string | number | null): Date {
  if (input === undefined || input === null || input === '') {
    return new Date();
  }
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? new Date() : input;
  }
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  const trimmed = String(input).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T12:00:00-05:00`);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function getBogotaParts(input?: Date | string | number | null): {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
} {
  const date = toValidDate(input);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes, fallback: string) =>
    parts.find((p) => p.type === type)?.value || fallback;

  const rawHour = pick('hour', '00');
  const hour = rawHour === '24' ? '00' : rawHour;

  return {
    year: pick('year', '2026'),
    month: pick('month', '01'),
    day: pick('day', '01'),
    hour,
    minute: pick('minute', '00'),
    second: pick('second', '00'),
  };
}

/**
 * Retorna la fecha en formato YYYY-MM-DD en hora de Bogotá (America/Bogota).
 */
export function getColombiaDateString(dateInput?: Date | string | number | null): string {
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }
  const { year, month, day } = getBogotaParts(dateInput);
  return `${year}-${month}-${day}`;
}

/**
 * Retorna la hora en formato 24h HH:mm en hora de Bogotá (America/Bogota).
 */
export function getColombiaTimeString(dateInput?: Date | string | number | null): string {
  const { hour, minute } = getBogotaParts(dateInput);
  return `${hour}:${minute}`;
}

/**
 * Retorna fecha y hora legible YYYY-MM-DD HH:mm en hora de Bogotá (America/Bogota).
 * Reemplazo seguro de `toISOString().substring(0, 16).replace('T', ' ')`.
 */
export function getColombiaDateTimeString(dateInput?: Date | string | number | null): string {
  const { year, month, day, hour, minute } = getBogotaParts(dateInput);
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * Retorna un timestamp ISO 8601 con zona horaria explícita de Colombia (-05:00).
 * Compatible con columnas timestamptz de PostgreSQL/Supabase y mantiene el día exacto COT.
 */
export function getColombiaIsoTimestamp(dateInput?: Date | string | number | null): string {
  const { year, month, day, hour, minute, second } = getBogotaParts(dateInput);
  return `${year}-${month}-${day}T${hour}:${minute}:${second}-05:00`;
}

/**
 * Retorna la fecha YYYY-MM-DD de hace `daysAgo` días en hora de Bogotá.
 */
export function getColombiaDateDaysAgo(daysAgo: number): string {
  const nowColombia = new Date(`${getColombiaDateString()}T12:00:00-05:00`);
  nowColombia.setDate(nowColombia.getDate() - daysAgo);
  return getColombiaDateString(nowColombia);
}

/**
 * Retorna el primer día del mes actual en formato YYYY-MM-01 en hora de Bogotá.
 */
export function getColombiaFirstDayOfMonth(dateInput?: Date | string | number | null): string {
  const { year, month } = getBogotaParts(dateInput);
  return `${year}-${month}-01`;
}
