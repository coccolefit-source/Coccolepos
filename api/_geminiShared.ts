import { GoogleGenAI } from '@google/genai';

export interface ServerlessRequest {
  method?: string;
  body?: any;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, any>;
}

export interface ServerlessResponse {
  status: (code: number) => ServerlessResponse;
  setHeader: (name: string, value: string) => void;
  json: (payload: any) => void;
  end?: (chunk?: any) => void;
}

export const GEMINI_TEXT_MODEL = 'gemini-4-hydrogen';

let cachedAi: GoogleGenAI | null = null;

export function getServerGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  if (!cachedAi) {
    cachedAi = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedAi;
}

export function setJsonSecurityHeaders(res: ServerlessResponse): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

export function parseRequestBody(req: ServerlessRequest): any {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export function formatGeminiErrorResponse(err: any): { status: number; error: string } {
  const msg = String(err?.message || err || '');
  if (msg.includes('GEMINI_API_KEY_MISSING')) {
    return {
      status: 503,
      error: 'El servicio de análisis IA no tiene configurada la variable GEMINI_API_KEY en el servidor.',
    };
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      error: 'Se alcanzó temporalmente el límite de consultas de IA. Intenta de nuevo en unos segundos.',
    };
  }
  if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      error: 'La clave de IA configurada en el servidor no es válida o no tiene permisos activos.',
    };
  }
  return {
    status: 502,
    error: 'No se pudo completar el análisis con el servicio de IA en este momento.',
  };
}
