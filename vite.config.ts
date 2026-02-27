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
                  const { prompt, options } = JSON.parse(bodyBuffer);

                  if (!API_KEY) {
                    res.statusCode = 500;
                    return res.end(JSON.stringify({ ok: false, error: { message: "GEMINI_API_KEY não configurada no .env.local" } }));
                  }

                  const genAI = new GoogleGenerativeAI(API_KEY);
                  const MODELS = ["gemini-1.5-flash-001", "gemini-flash-latest"];

                  res.setHeader('Content-Type', 'application/json');

                  console.log("🛠️ [LOCAL] Simulando /api/generate...");
                  const instructions = `Atue como Diretor de Arte OP7. Retorne JSON: { "headline": "Título Local", "description": "Desc Local", "cta": "CTA Local", "backgroundPrompt": "Background", "config": { "size": "${options?.format || '1080x1350'}", "backgroundColor": "#F8FAFC", "backgroundImage": "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1080&q=80", "overlayOpacity": 0.2, "layers": [ { "id": "headline", "type": "text", "name": "Título", "content": "HEADLINE", "position": {"x": 50, "y": 30}, "size": {"width": 80, "height": 20}, "style": {"color": "#002B5B", "fontSize": 4, "fontWeight": "900", "fontFamily": "Montserrat", "textAlign": "center", "textTransform": "uppercase"} }, { "id": "subheadline", "type": "text", "name": "Sub", "content": "Descrição", "position": {"x": 50, "y": 55}, "size": {"width": 70, "height": 10}, "style": {"color": "#1A73E8", "fontSize": 1.5, "fontWeight": "600", "fontFamily": "Outfit", "textAlign": "center"} }, { "id": "cta", "type": "button", "name": "CTA", "content": "SAIBA MAIS", "position": {"x": 50, "y": 80}, "size": {"width": 40, "height": 8}, "style": {"color": "#FFFFFF", "backgroundColor": "#FF7D3C", "fontSize": 1.2, "fontWeight": "900", "fontFamily": "Montserrat", "borderRadius": 50, "padding": 20} } ] } }`;

                  let lastError = null;
                  for (const modelName of MODELS) {
                    try {
                      console.log(`🤖 [LOCAL] Tentando modelo: ${modelName}`);
                      const model = genAI.getGenerativeModel({
                        model: modelName,
                        generationConfig: { responseMimeType: "application/json" }
                      });
                      const result = await model.generateContent(instructions);
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
