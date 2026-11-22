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
  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  const context = body?.context && typeof body.context === 'object' ? body.context : null;

  if (!question) {
    return res.status(400).json({ error: 'Debes escribir una consulta financiera para analizar.' });
  }

  try {
    const ai = getServerGeminiClient();
    const systemInstruction =
      'Eres el asistente de inteligencia comercial y financiera experto en Coccole Fit. ' +
      'Respondes de forma clara, profesional, concisa y directa en español a las consultas sobre datos financieros, ' +
      'transacciones, rotación de productos y rendimiento de colaboradores capturados bajo el filtro actual. ' +
      'Horario de operación: 10:00 AM a 9:00 PM (hora Colombia). No uses emojis ni lenguaje informal.';

    const prompt =
      `Contexto financiero capturado en el filtro:\n${JSON.stringify(context || {}, null, 2)}\n\n` +
      `Consulta del administrador:\n${question}\n\n` +
      'Responde en español con cifras concretas basadas únicamente en el contexto anterior.';

    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: { systemInstruction },
    });

    const answer = (response.text || '').trim();
    if (!answer) {
      return res.status(502).json({ error: 'El servicio de IA no devolvió texto de respuesta.' });
    }

    return res.status(200).json({ answer });
  } catch (err: any) {
    console.error('[api/financial-filter-chat] error:', err?.message || err);
    const { status, error } = formatGeminiErrorResponse(err);
    return res.status(status).json({ error });
  }
}
