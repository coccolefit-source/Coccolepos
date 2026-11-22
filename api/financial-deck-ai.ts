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

  const financialContext = parseRequestBody(req);
  if (!financialContext || typeof financialContext !== 'object' || Object.keys(financialContext).length === 0) {
    return res.status(400).json({ error: 'Se requiere el contexto financiero del periodo para generar el deck.' });
  }

  try {
    const ai = getServerGeminiClient();

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        tituloDeck: { type: Type.STRING },
        resumenEjecutivo: { type: Type.STRING },
        topProductosVentas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              producto: { type: Type.STRING },
              unidades: { type: Type.STRING },
              totalVendido: { type: Type.STRING },
            },
            required: ['producto', 'unidades', 'totalVendido'],
          },
        },
        topProductosUtilidad: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              producto: { type: Type.STRING },
              utilidadGenerada: { type: Type.STRING },
              margen: { type: Type.STRING },
            },
            required: ['producto', 'utilidadGenerada', 'margen'],
          },
        },
        productosNoRotaron: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        productosMenosRotaron: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              producto: { type: Type.STRING },
              unidades: { type: Type.STRING },
              totalVendido: { type: Type.STRING },
            },
            required: ['producto', 'unidades', 'totalVendido'],
          },
        },
        vendedoraEstrella: {
          type: Type.OBJECT,
          properties: {
            nombre: { type: Type.STRING },
            totalVendido: { type: Type.STRING },
            productosTop: { type: Type.STRING },
            comentario: { type: Type.STRING },
          },
          required: ['nombre', 'totalVendido', 'productosTop', 'comentario'],
        },
        horasMasVentas: { type: Type.STRING },
        trabajadorMenosVentas: {
          type: Type.OBJECT,
          properties: {
            nombre: { type: Type.STRING },
            totalVendido: { type: Type.STRING },
            comentario: { type: Type.STRING },
          },
          required: ['nombre', 'totalVendido', 'comentario'],
        },
        momentosMasVentas: { type: Type.STRING },
        horasMenosVentas: { type: Type.STRING },
        diasMenosVentas: { type: Type.STRING },
        allWorkersSales: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              nombre: { type: Type.STRING },
              totalVendido: { type: Type.STRING },
              transacciones: { type: Type.INTEGER },
              productosVendidos: { type: Type.STRING },
            },
            required: ['nombre', 'totalVendido', 'transacciones', 'productosVendidos'],
          },
        },
        recomendacionesEstrategicas: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        analisisProductosEstrella: {
          type: Type.OBJECT,
          properties: {
            fresasConCrema: { type: Type.STRING },
            batidosProteina: { type: Type.STRING },
            sandwiches: { type: Type.STRING },
            ensaladasDeFrutas: { type: Type.STRING },
            conclusionEstrellas: { type: Type.STRING },
          },
        },
        analisisDiasSemana: { type: Type.STRING },
      },
      required: [
        'tituloDeck',
        'resumenEjecutivo',
        'topProductosVentas',
        'topProductosUtilidad',
        'productosNoRotaron',
        'productosMenosRotaron',
        'vendedoraEstrella',
        'horasMasVentas',
        'trabajadorMenosVentas',
        'momentosMasVentas',
        'horasMenosVentas',
        'diasMenosVentas',
        'allWorkersSales',
        'recomendacionesEstrategicas',
      ],
    };

    const systemInstruction =
      'Eres un sistema experto en auditoría financiera, inteligencia comercial y presentación de decks gerenciales ' +
      'para la cadena de alimentos saludables Coccole Fit. Estructura una presentación ejecutiva clara, formal y 100% en español. ' +
      'No utilices emojis ni adornos informales.';

    const prompt =
      `Analiza los siguientes datos financieros y transaccionales del periodo filtrado para generar el deck gerencial:\n` +
      `${JSON.stringify(financialContext, null, 2)}\n\n` +
      'Responde estrictamente con el JSON estructurado usando cifras reales del contexto provisto.';

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
      return res.status(502).json({ error: 'El servicio de IA no devolvió datos para el deck financiero.' });
    }

    const parsed = JSON.parse(rawText);
    return res.status(200).json(parsed);
  } catch (err: any) {
    console.error('[api/financial-deck-ai] error:', err?.message || err);
    const { status, error } = formatGeminiErrorResponse(err);
    return res.status(status).json({ error });
  }
}
