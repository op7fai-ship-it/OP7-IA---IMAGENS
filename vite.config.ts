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
      proxy: {}, // Placeholder

      // 🚀 [LOCAL DEV BACKEND]
      // Resolve o problema de chamar /api/creative localmente sem precisar do Vercel CLI
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.startsWith('/api/creative')) {
            if (!API_KEY) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                error: "Faltou configurar ENV: GEMINI_API_KEY no .env.local",
                instruction: "Adicione VITE_GEMINI_API_KEY=sua_chave no arquivo .env.local"
              }));
              return;
            }

            if (req.method === 'POST') {
              let bodyBuffer = '';
              req.on('data', chunk => { bodyBuffer += chunk; });
              req.on('end', async () => {
                try {
                  const { prompt, imagePrompt, referenceImage, type } = JSON.parse(bodyBuffer);
                  const genAI = new GoogleGenerativeAI(API_KEY);
                  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

                  res.setHeader('Content-Type', 'application/json');

                  if (type === 'full') {
                    console.log("🛠️ [LOCAL-SERVER] Geração Completa... Prompt:", prompt);
                    const aiInstructions = `Director/Copywriter: "${prompt}". JSON: {"content": {"headline": "...", "tagline": "...", "cta": "..."}, "layout": {"headlinePos": {"x": 50, "y": 30}, "taglinePos": {"x": 50, "y": 55}, "ctaPos": {"x": 50, "y": 80}}, "imagePrompt": "..."}`;
                    const result = await model.generateContent(aiInstructions);
                    const text = result.response.text();
                    const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || text;
                    res.end(jsonStr);
                  } else if (type === 'image') {
                    console.log("🛠️ [LOCAL-SERVER] Geração de Imagem... Prompt:", imagePrompt);
                    const parts: any[] = [{ text: `High quality background image for: ${imagePrompt}` }];
                    if (referenceImage) {
                      const matches = referenceImage.match(/^data:(.+);base64,(.+)$/);
                      if (matches?.length === 3) parts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
                    }
                    const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
                    const parts_res = result.response.candidates?.[0]?.content?.parts || [];
                    const imgData = parts_res.find(p => p.inlineData)?.inlineData?.data;
                    if (imgData) {
                      res.end(JSON.stringify({ imageData: `data:image/png;base64,${imgData}` }));
                    } else {
                      throw new Error("Modelo não retornou imagem direta no local mock.");
                    }
                  }
                } catch (e: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: e.message }));
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
