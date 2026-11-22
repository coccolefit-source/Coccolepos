export interface SafeJsonResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

/**
 * Ejecuta una petición fetch y valida estrictamente que el servidor responda con JSON
 * antes de llamar a response.json(), evitando SyntaxError cuando un rewrite SPA devuelve HTML.
 */
export async function safeFetchJson<T = any>(
  url: string,
  init?: RequestInit
): Promise<SafeJsonResult<T>> {
  try {
    const response = await fetch(url, init);
    const contentType = (response.headers.get('content-type') || '').toLowerCase();

    if (!contentType.includes('application/json')) {
      return {
        ok: false,
        status: response.status,
        data: null,
        error:
          response.status === 404
            ? 'El servicio de IA no está disponible en esta ruta (404). Verifica el despliegue de /api/*.'
            : `El servidor respondió en un formato inesperado (${contentType || 'sin Content-Type'}, HTTP ${response.status}). Verifica la configuración del endpoint.`
      };
    }

    const parsed = (await response.json()) as T & { error?: string; message?: string };

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: parsed,
        error:
          parsed?.error ||
          parsed?.message ||
          `Error del servidor al procesar la solicitud (HTTP ${response.status}).`
      };
    }

    return {
      ok: true,
      status: response.status,
      data: parsed
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err?.message
        ? `Error de conexión con el servidor: ${err.message}`
        : 'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
    };
  }
}
