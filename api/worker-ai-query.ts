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
  const performanceContext = body?.performanceContext || {};
  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  const chatHistory = Array.isArray(body?.chatHistory) ? body.chatHistory : [];

  if (!worker || !question) {
    return res.status(400).json({ error: 'Se requieren los datos del colaborador y la pregunta.' });
  }

  try {
    const ai = getServerGeminiClient();

    const altaRotacionDetalle = (performanceContext?.rendimientoProductos?.productosAltaRotacionDetalle || [])
      .map(
        (p: any) =>
          `- ${p.nombre}: ${p.unidadesVendidas ?? p.cantidad ?? 1} unidades vendidas ($${Number(p.totalVentas ?? p.total ?? 0).toLocaleString('es-CO')})`
      )
      .join('\n') || '- Sin registros detallados de alta rotación';

    const bajaRotacionDetalle = (performanceContext?.rendimientoProductos?.productosBajaRotacionDetalle || [])
      .map(
        (p: any) =>
          `- ${p.nombre}: ${p.unidadesVendidas ?? p.cantidad ?? 1} unidades vendidas ($${Number(p.totalVentas ?? p.total ?? 0).toLocaleString('es-CO')})`
      )
      .join('\n') || '- Sin registros detallados de baja rotación';

    // Excluir cualquier campo sensible (PIN, contraseña, clave maestra) del contexto enviado a IA
    const workerContextText = [
      'EXPEDIENTE Y MÉTRICAS OPERATIVAS DEL COLABORADOR:',
      `- Nombre: ${worker.nombre || 'Colaborador'}`,
      `- Rol / Cargo: ${worker.rol || 'Colaborador Operativo'}`,
      `- Área Preferida: ${worker.area_preferida || 'General'}`,
      '',
      'MÉTRICAS DE RENDIMIENTO, TAREAS Y ASISTENCIA:',
      `- Cumplimiento de Tareas: ${performanceContext?.eficienciaPuntualidad?.cumplimientoPct || worker.tareasCumplidasPct || 'N/A'}`,
      `- Puntualidad en Fichajes: ${performanceContext?.eficienciaPuntualidad?.puntualidadPct || 'N/A'}`,
      `- Llegadas Tardías: ${performanceContext?.eficienciaPuntualidad?.llegadasTardias ?? worker.llegadasTardesCount ?? 0}`,
      `- Observaciones: ${performanceContext?.eficienciaPuntualidad?.comentario || 'Sin observaciones adicionales'}`,
      '',
      'PATRONES COMERCIALES Y HORARIOS DE VENTA:',
      `- Volumen Total: ${performanceContext?.patronesVenta?.volumenTotal || worker.ventasTotales || 'N/A'}`,
      `- Día Mayor Venta: ${performanceContext?.patronesVenta?.diaMaxVenta?.fecha || 'N/A'} ($${Number(performanceContext?.patronesVenta?.diaMaxVenta?.totalMonto || 0).toLocaleString('es-CO')})`,
      `- Horario Pico: ${performanceContext?.patronesVenta?.diaMaxVenta?.horaPico || performanceContext?.patronesVenta?.picoHorario || 'N/A'}`,
      `- Día Menor Venta: ${performanceContext?.patronesVenta?.diaMinVenta?.fecha || 'N/A'} ($${Number(performanceContext?.patronesVenta?.diaMinVenta?.totalMonto || 0).toLocaleString('es-CO')})`,
      '',
      'PRODUCTOS DE ALTA ROTACIÓN:',
      altaRotacionDetalle,
      '',
      'PRODUCTOS DE BAJA ROTACIÓN:',
      bajaRotacionDetalle,
    ].join('\n');

    const systemInstruction =
      'Eres un consultor experto en operaciones y talento humano para Coccole Fit. ' +
      'Responde en español con tono ejecutivo, objetivo y basado estrictamente en el expediente operativo del colaborador. ' +
      'Usa subtítulos en negrita y viñetas claras. No uses emojis.';

    const contents: any[] = [
      {
        role: 'user',
        parts: [{ text: `Expediente operativo del colaborador:\n\n${workerContextText}` }],
      },
      {
        role: 'model',
        parts: [{ text: `Entendido. He analizado el expediente operativo de ${worker.nombre || 'este colaborador'} y estoy listo para responder.` }],
      },
    ];

    for (const msg of chatHistory.slice(-12)) {
      if (msg && msg.text && (msg.role === 'user' || msg.role === 'model' || msg.role === 'assistant')) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: String(msg.text) }],
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: question }],
    });

    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents,
      config: { systemInstruction },
    });

    const answer = (response.text || '').trim();
    if (!answer) {
      return res.status(502).json({ error: 'El servicio de IA no devolvió respuesta.' });
    }

    return res.status(200).json({ answer });
  } catch (err: any) {
    console.error('[api/worker-ai-query] error:', err?.message || err);
    const { status, error } = formatGeminiErrorResponse(err);
    return res.status(status).json({ error });
  }
}
