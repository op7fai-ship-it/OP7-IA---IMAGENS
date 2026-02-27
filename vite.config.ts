import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  const API_KEY = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {},

      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.startsWith('/api/generate')) {
            if (req.method === 'POST') {
              let bodyBuffer = '';
              req.on('data', chunk => { bodyBuffer += chunk; });
              req.on('end', async () => {
                try {
                  const { prompt, options, images } = JSON.parse(bodyBuffer);

                  if (!API_KEY) {
                    res.statusCode = 500;
                    return res.end(JSON.stringify({ ok: false, error: { message: "GEMINI_API_KEY não configurada no .env.local" } }));
                  }

                  const genAI = new GoogleGenerativeAI(API_KEY);
                  const MODELS = ["gemini-1.5-flash-001", "gemini-flash-latest"];

                  res.setHeader('Content-Type', 'application/json');

                  console.log("🛠️ [LOCAL] Simulando /api/generate...");
                  const p = options?.palette || {
                    primary: '#002B5B',
                    secondary: '#1A73E8',
                    background: '#F8FAFC',
                    text: '#002B5B',
                    accent: '#FF7D3C'
                  };
                  const instructions = `Atue como Diretor de Arte OP7. Retorne JSON: { "headline": "Título Local", "description": "Desc Local", "cta": "CTA Local", "backgroundPrompt": "Background", "config": { "size": "${options?.format || '1080x1350'}", "backgroundColor": "${p.background}", "backgroundImage": "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1080&q=80", "overlayOpacity": 0.2, "layers": [ { "id": "headline", "type": "text", "name": "Título", "content": "HEADLINE", "position": {"x": 50, "y": 30}, "size": {"width": 80, "height": 20}, "style": {"color": "${p.text}", "fontSize": 4, "fontWeight": "900", "fontFamily": "Montserrat", "textAlign": "center", "textTransform": "uppercase"} }, { "id": "subheadline", "type": "text", "name": "Sub", "content": "Descrição", "position": {"x": 50, "y": 55}, "size": {"width": 70, "height": 10}, "style": {"color": "${p.secondary}", "fontSize": 1.5, "fontWeight": "600", "fontFamily": "Outfit", "textAlign": "center"} }, { "id": "cta", "type": "button", "name": "CTA", "content": "SAIBA MAIS", "position": {"x": 50, "y": 80}, "size": {"width": 40, "height": 8}, "style": {"color": "#FFFFFF", "backgroundColor": "${p.accent}", "fontSize": 1.2, "fontWeight": "900", "fontFamily": "Montserrat", "borderRadius": 50, "padding": 20} } ] } }`;

                  const parts: any[] = [{ text: instructions }];
                  if (options?.useReferences !== false && images && images.length > 0) {
                    for (const img of images) {
                      const match = img.match(/^data:(.*);base64,(.*)$/);
                      if (match) {
                        const mimeType = match[1];
                        const base64Data = match[2];
                        try {
                          // Importante: No Vite config pode dar require() em runtime ou importar no topo
                          const sharp = require('sharp');
                          const buffer = Buffer.from(base64Data, 'base64');
                          const compressedBuffer = await sharp(buffer)
                            .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
                            .jpeg({ quality: 80 })
                            .toBuffer();

                          const compressedBase64 = compressedBuffer.toString('base64');
                          const sizeInMB = (compressedBase64.length * (3 / 4)) / (1024 * 1024);
                          if (sizeInMB > 4) {
                            res.statusCode = 400;
                            return res.end(JSON.stringify({ ok: false, error: { code: "IMAGE_TOO_LARGE", message: "Referência muito pesada. Envie imagens menores." } }));
                          }

                          parts.push({ inlineData: { mimeType: 'image/jpeg', data: compressedBase64 } });
                        } catch (err) {
                          console.error("❌ [LOCAL ERROR] Falha ao comprimir:", err);
                          parts.push({ inlineData: { mimeType, data: base64Data } });
                        }
                      }
                    }
                  }

                  let lastError = null;
                  for (const modelName of MODELS) {
                    try {
                      console.log(`🤖 [LOCAL] Tentando modelo: ${modelName}`);
                      const model = genAI.getGenerativeModel({
                        model: modelName,
                        generationConfig: { responseMimeType: "application/json" }
                      });
                      const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
                      console.log("Modelo Gemini usado:", modelName);
                      const data = JSON.parse(result.response.text());
                      return res.end(JSON.stringify({ ok: true, data }));
                    } catch (err: any) {
                      lastError = err;
                      if (err.status === 404 || err.message.includes("not found")) continue;
                      break;
                    }
                  }

                  throw lastError;
                } catch (e: any) {
                  console.error("❌ ERRO LOCAL:", e.message);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ ok: false, error: { message: e.message } }));
                }
              });
              return;
            }
          }
          next();
        });
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
