import { Type } from '@google/genai';
import {
  GEMINI_TEXT_MODEL,
  ServerlessRequest,
  ServerlessResponse,
  formatGeminiErrorResponse,
  getServerGeminiClient,
  parseRequestBody,
  setJsonSecurityHeaders,
} from './_geminiShared';

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  setJsonSecurityHeaders(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  const body = parseRequestBody(req);
  const worker = body?.worker;
  if (!worker) {
    return res.status(400).json({ error: 'Se requieren los datos del colaborador.' });
  }

  try {
    const ai = getServerGeminiClient();

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        eficienciaPuntualidad: {
          type: Type.OBJECT,
          properties: {
            cumplimientoPct: { type: Type.STRING },
            puntualidadPct: { type: Type.STRING },
            llegadasTardias: { type: Type.INTEGER },
            comentario: { type: Type.STRING },
          },
          required: ['cumplimientoPct', 'puntualidadPct', 'llegadasTardias', 'comentario'],
        },
        patronesVenta: {
          type: Type.OBJECT,
          properties: {
            volumenTotal: { type: Type.STRING },
            picoHorario: { type: Type.STRING },
            comentario: { type: Type.STRING },
          },
          required: ['volumenTotal', 'picoHorario', 'comentario'],
        },
        rendimientoProductos: {
          type: Type.OBJECT,
          properties: {
            productosAltaRotacion: { type: Type.ARRAY, items: { type: Type.STRING } },
            productosBajaRotacion: { type: Type.ARRAY, items: { type: Type.STRING } },
            comentario: { type: Type.STRING },
          },
          required: ['productosAltaRotacion', 'productosBajaRotacion', 'comentario'],
        },
        diagnosticoPlanAccion: {
          type: Type.OBJECT,
          properties: {
            resumenEjecutivo: { type: Type.STRING },
            recomendaciones: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['resumenEjecutivo', 'recomendaciones'],
        },
      },
      required: ['eficienciaPuntualidad', 'patronesVenta', 'rendimientoProductos', 'diagnosticoPlanAccion'],
    };

    const systemInstruction =
      'Eres un sistema experto en análisis de recursos humanos y optimización operativa para Coccole Fit. ' +
      'Redacta el análisis con tono profesional, objetivo y 100% en español. No uses emojis ni adornos tipográficos.';

    const prompt =
      `Analiza el rendimiento de este colaborador:\n` +
      `Nombre: ${worker.nombre || 'Colaborador'}\n` +
      `Área Preferida: ${worker.area_preferida || 'General'}\n` +
      `Tareas Cumplidas: ${worker.tareasCumplidasPct || 'N/A'}\n` +
      `Llegadas Tardías: ${worker.llegadasTardesCount ?? 0}\n` +
      `Ventas Totales: ${worker.ventasTotales || 'N/A'}\n` +
      `Pico Horario: ${worker.picoHorarioVentas || 'N/A'}\n` +
      `Alta Rotación: ${Array.isArray(worker.productosTop) ? worker.productosTop.join(', ') : 'N/A'}\n` +
      `Baja Rotación: ${Array.isArray(worker.productosBajos) ? worker.productosBajos.join(', ') : 'N/A'}`;

    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    const rawText = (response.text || '').trim();
    if (!rawText) {
      return res.status(502).json({ error: 'El servicio de IA no devolvió datos de análisis.' });
    }

    return res.status(200).json(JSON.parse(rawText));
  } catch (err: any) {
    console.error('[api/worker-performance] error:', err?.message || err);
    const { status, error } = formatGeminiErrorResponse(err);
    return res.status(status).json({ error });
  }
}
