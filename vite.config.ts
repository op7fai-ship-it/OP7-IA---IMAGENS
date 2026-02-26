import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // 🔑 CHAVE DEFINITIVA (Inserida conforme solicitado pelo usuário)
  const HARDCODED_KEY = "AIzaSyC0D5MCQ57o6wXNw8cUrWiwd2t5OjCkaYo";
  const API_KEY = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || HARDCODED_KEY;

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {},

      // Simulação do Backend para Desenvolvimento Local
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.startsWith('/api/creative')) {
            if (req.method === 'POST') {
              let bodyBuffer = '';
              req.on('data', chunk => { bodyBuffer += chunk; });
              req.on('end', async () => {
                try {
                  const parsedBody = JSON.parse(bodyBuffer);
                  const { prompt, imagePrompt, referenceImage, type } = parsedBody;

                  const genAI = new GoogleGenerativeAI(API_KEY);
                  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

                  res.setHeader('Content-Type', 'application/json');

                  if (type === 'full') {
                    console.log("🛠️ [LOCAL] Gerando Criativo Completo...");
                    const instructions = `Director: "${prompt}". JSON format: {"content": {"headline": "...", "tagline": "...", "cta": "..."}, "layout": {"headlinePos": {"x": 50, "y": 30}, "taglinePos": {"x": 50, "y": 55}, "ctaPos": {"x": 50, "y": 80}}, "imagePrompt": "..."}`;
                    const result = await model.generateContent(instructions);
                    const text = result.response.text();
                    const jsonOutput = text.match(/\{[\s\S]*\}/)?.[0] || text;
                    res.end(jsonOutput);
                  } else if (type === 'image') {
                    console.log("🛠️ [LOCAL] Gerando Imagem...");
                    const imageParts: any[] = [{ text: `High quality background for: ${imagePrompt}` }];
                    if (referenceImage) {
                      const tokens = referenceImage.match(/^data:(.+);base64,(.+)$/);
                      if (tokens?.length === 3) imageParts.push({ inlineData: { mimeType: tokens[1], data: tokens[2] } });
                    }
                    const result = await model.generateContent({ contents: [{ role: 'user', parts: imageParts }] });
                    const imageContent = result.response.candidates?.[0]?.content?.parts || [];
                    const b64 = imageContent.find(p => p.inlineData)?.inlineData?.data;
                    if (b64) {
                      res.end(JSON.stringify({ imageData: `data:image/png;base64,${b64}` }));
                    } else {
                      throw new Error("Desculpe, o modelo não conseguiu gerar a imagem agora. Tente novamente.");
                    }
                  }
                } catch (e: any) {
                  console.error("❌ ERRO NO LOCAL DEV:", e.message);
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
