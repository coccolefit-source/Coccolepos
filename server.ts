import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API endpoint for worker performance analysis
  app.post('/api/worker-performance', async (req, res) => {
    try {
      const { worker } = req.body;
      if (!worker) {
        return res.status(400).json({ error: 'Worker data is required' });
      }

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          eficienciaPuntualidad: {
            type: Type.OBJECT,
            properties: {
              cumplimientoPct: { type: Type.STRING },
              puntualidadPct: { type: Type.STRING },
              llegadasTardias: { type: Type.INTEGER },
              comentario: { type: Type.STRING }
            },
            required: ["cumplimientoPct", "puntualidadPct", "llegadasTardias", "comentario"]
          },
          patronesVenta: {
            type: Type.OBJECT,
            properties: {
              volumenTotal: { type: Type.STRING },
              picoHorario: { type: Type.STRING },
              comentario: { type: Type.STRING }
            },
            required: ["volumenTotal", "picoHorario", "comentario"]
          },
          rendimientoProductos: {
            type: Type.OBJECT,
            properties: {
              productosAltaRotacion: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              productosBajaRotacion: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              comentario: { type: Type.STRING }
            },
            required: ["productosAltaRotacion", "productosBajaRotacion", "comentario"]
          },
          diagnosticoPlanAccion: {
            type: Type.OBJECT,
            properties: {
              resumenEjecutivo: { type: Type.STRING },
              recomendaciones: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["resumenEjecutivo", "recomendaciones"]
          }
        },
        required: ["eficienciaPuntualidad", "patronesVenta", "rendimientoProductos", "diagnosticoPlanAccion"]
      };

      const systemInstruction = `Eres un sistema experto en análisis de recursos humanos y optimización operativa para restaurantes y tiendas de comida saludable.
Tu tarea es analizar el rendimiento de un trabajador en base a sus métricas históricas de eficiencia, puntualidad y ventas.
La respuesta debe redactarse con un tono profesional, objetivo, analítico y 100% en español.
REGLA CRÍTICA DE SEGURIDAD Y FORMATO: No utilices absolutamente ningún emoji ni íconos decorativos en ninguna parte de la respuesta. Tampoco utilices asteriscos u otros adornos tipográficos dentro de las cadenas. El texto debe ser limpio, formal y directo.`;

      const prompt = `Realiza un análisis detallado del rendimiento de este colaborador:
Nombre: ${worker.nombre}
Área Preferida: ${worker.area_preferida || 'No especificada'}
Tareas Cumplidas (Porcentaje): ${worker.tareasCumplidasPct || '88%'}
Llegadas Tardías: ${worker.llegadasTardesCount !== undefined ? worker.llegadasTardesCount : 2}
Ventas Totales: ${worker.ventasTotales || '145 u.'}
Pico Horario de Ventas: ${worker.picoHorarioVentas || 'No registrado'}
Productos de Alta Rotación: ${worker.productosTop ? worker.productosTop.join(', ') : 'No especificado'}
Productos de Baja Rotación: ${worker.productosBajos ? worker.productosBajos.join(', ') : 'No especificado'}

Asegúrate de llenar cada sección del JSON con datos analíticos realistas inspirados en las métricas provistas. Recuerda: CERO EMOJIS, CERO ÍCONOS DECORATIVOS.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('No text returned from Gemini');
      }

      const parsedData = JSON.parse(responseText.trim());
      res.json(parsedData);
    } catch (error: any) {
      console.error('Error generating worker performance analysis:', error);
      res.status(500).json({ error: error.message || 'Error analizando rendimiento del trabajador' });
    }
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
