import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // 🛡️ ANTI-BUG & SECURITY MODE
  const API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const hasClientLeak = Object.keys(env).some(k =>
    (k.includes('VITE_') || k.includes('NEXT_PUBLIC_')) && k.includes('GEMINI')
  );

  if (hasClientLeak) {
    throw new Error("🚨 SECURITY ALERT: Gemini API Key detectada sendo exposta ao frontend. Certifique-se de que a variável NÃO comece com VITE_ ou NEXT_PUBLIC_.");
  }

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'mock-api-plugin',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = new URL(req.url || '/', `http://${req.headers.host}`);

            // --- PERSISTÊNCIA MOCK LOCAL EM MEMÓRIA ---
            if (!global.__MOCK_DB) {
              global.__MOCK_DB = { conversations: [], messages: [] };
            }
            const db = global.__MOCK_DB;

            // 1. HEALTH CHECK
            if (url.pathname === '/api/health') {
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ ok: true, api: "working", dbConnected: true }));
            }

            // 2. CONVERSATIONS
            if (url.pathname === '/api/conversations') {
              res.setHeader('Content-Type', 'application/json');
              const id = url.searchParams.get('id');
              const userId = url.searchParams.get('userId');

              if (req.method === 'GET') {
                if (id) {
                  const conv = db.conversations.find(c => c.id === id);
                  const msgs = db.messages.filter(m => m.conversation_id === id);
                  return res.end(JSON.stringify({ ok: true, data: { ...conv, messages: msgs } }));
                }
                if (userId) {
                  const userConvs = db.conversations.filter(c => c.user_id === userId);
                  return res.end(JSON.stringify({ ok: true, data: userConvs }));
                }
              }

              if (req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', () => {
                  const { user_id, title } = JSON.parse(body);
                  const newConv = {
                    id: Math.random().toString(36).substr(2, 9),
                    user_id,
                    title: title || 'Nova Arte',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  };
                  db.conversations.push(newConv);
                  res.end(JSON.stringify({ ok: true, data: newConv }));
                });
                return;
              }

              if (req.method === 'DELETE') {
                db.conversations = db.conversations.filter(c => c.id !== id);
                db.messages = db.messages.filter(m => m.conversation_id !== id);
                return res.end(JSON.stringify({ ok: true }));
              }
            }

            // 3. MESSAGES
            if (url.pathname === '/api/messages') {
              res.setHeader('Content-Type', 'application/json');
              const conversationId = url.searchParams.get('conversationId');
              const messageId = url.searchParams.get('messageId');

              if (req.method === 'GET') {
                if (conversationId) {
                  const msgs = db.messages.filter(m => m.conversation_id === conversationId);
                  return res.end(JSON.stringify({ ok: true, data: msgs }));
                }
                if (messageId) {
                  const msg = db.messages.find(m => m.id === messageId);
                  return res.end(JSON.stringify({ ok: true, data: { result: msg?.content } }));
                }
              }
            }

            // 4. GENERATE
            if (url.pathname === '/api/generate') {
              res.setHeader('Content-Type', 'application/json');
              if (req.method !== 'POST') {
                res.statusCode = 405;
                return res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
              }

              let bodyBuffer = '';
              req.on('data', chunk => { bodyBuffer += chunk; });
              req.on('end', async () => {
                try {
                  const parsed = JSON.parse(bodyBuffer);
                  const { prompt, options, images } = parsed;
                  const conversationId = options?.conversationId;
                  const userId = options?.userId;

                  const p = options?.palette || { primary: '#002B5B', accent: '#FF7D3C', background: '#F8FAFC', text: '#002B5B' };
                  const format = options?.format || '1080x1350';

                  let finalData = null;
                  let messageId = Math.random().toString(36).substr(2, 9);

                  if (API_KEY) {
                    const genAI = new GoogleGenerativeAI(API_KEY);
                    const MODELS = ["gemini-1.5-flash-001", "gemini-2.0-flash-exp", "gemini-flash-latest"];

                    const systemInstruction = `
                        VOCÊ É UM DIRETOR DE ARTE ELITE E ESTRATEGISTA DE MARKETING.
                        SEU OBJETIVO: Criar um anúncio visualmente deslumbrante e psicologicamente persuasivo.

                        ANÁLISE DE REFERÊNCIA (CRÍTICO):
                        Se imagens forem enviadas, você DEVE fazer uma análise profunda:
                        1. ESTILO VISUAL: É minimalista, luxuoso, urbano, vibrante ou corporativo? Mimetize esse estilo.
                        2. ILUMINAÇÃO: Identifique se é luz suave, cinematográfica, neon ou natural.
                        3. COMPOSIÇÃO: Onde estão os elementos? Use isso para guiar o 'backgroundPrompt'.
                        4. EXTRAÇÃO DE CORES: Se a imagem tiver uma paleta forte, priorize-a sobre a paleta padrão se 'useReferences' for true.

                        REGRAS DE OURO PARA O DESIGN:
                        - 'headline': Curta, impactante, usando gatilhos mentais de elite.
                        - 'backgroundPrompt': Não seja genérico. Descreva uma cena 8k, ultra-detalhada, com termos de fotografia profissional (ex: "depth of field", "golden hour", "high-end studio lighting").
                        - 'layers': A 'art' layer deve ser o foco visual. O texto deve ter contraste perfeito.

                        PALETA DO USUÁRIO: ${JSON.stringify(p)}
                        FORMATO: ${format}

                        RETORNE RIGOROSAMENTE APENAS JSON:
                        {
                          "headline": "TEXTO_IMPACTANTE",
                          "description": "COPY_PERSUASIVA",
                          "cta": "CHAMADA_CURTA",
                          "backgroundPrompt": "PROMPT_VISUAL_DETALHADO_8K",
                          "config": {
                            "size": "${format}",
                            "backgroundColor": "${p.background}",
                            "backgroundImage": "URL_PLACEHOLDER",
                            "layers": [
                              { 
                                "id": "art", 
                                "type": "image", 
                                "content": "URL_PLACEHOLDER", 
                                "position": {"x": 50, "y": 45}, 
                                "size": {"width": 65, "height": 45}, 
                                "style": {"borderRadius": 24, "boxShadow": "0 20px 50px rgba(0,0,0,0.3)"} 
                              },
                              { 
                                "id": "headline", 
                                "type": "text", 
                                "content": "HEADLINE_AQUI", 
                                "position": {"x": 50, "y": 25}, 
                                "size": {"width": 90, "height": 12}, 
                                "style": {"color": "${p.text}", "fontSize": 4.5, "fontWeight": "900", "fontFamily": "Outfit", "textAlign": "center", "textTransform": "uppercase"} 
                              }
                            ]
                          }
                        }
                      `;

                    const parts: any[] = [{ text: systemInstruction }, { text: `PEDIDO DO CLIENTE: ${prompt}` }];
                    if (images && images.length > 0) {
                      for (const img of images) {
                        const m = img.match(/^data:(.*);base64,(.*)$/);
                        if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
                      }
                    }

                    for (const modelName of MODELS) {
                      try {
                        const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json" } });
                        const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
                        finalData = JSON.parse(result.response.text());
                        break;
                      } catch (e) { console.warn(`Model ${modelName} failed`); }
                    }
                  }

                  // Fallback se Gemini falhar ou se não houver chave
                  if (!finalData) {
                    finalData = {
                      headline: "Criativo de Alta Performance",
                      description: "Design gerado automaticamente com base no seu pedido.",
                      cta: "SAIBA MAIS",
                      backgroundPrompt: prompt,
                      config: {
                        size: format,
                        backgroundColor: p.background,
                        backgroundImage: "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format",
                        layers: [
                          { id: "art", type: "image", content: "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format", position: { x: 50, y: 45 }, size: { width: 60, height: 40 }, style: { borderRadius: 20 } },
                          { id: "headline", type: "text", content: "SUA HEADLINE AQUI", position: { x: 50, y: 30 }, size: { width: 100, height: 10 }, style: { color: p.text, fontSize: 4, fontWeight: "900", textAlign: "center" } }
                        ]
                      }
                    };
                  }

                  // Engine specifics
                  const engineImg = options?.engine === 'imagen'
                    ? "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format"
                    : "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format";

                  finalData.imageUrl = engineImg;
                  finalData.config.backgroundImage = engineImg;
                  if (finalData.config.layers) {
                    finalData.config.layers = finalData.config.layers.map((l: any) => l.id === 'art' ? { ...l, content: engineImg } : l);
                  }

                  // Persistência Mock
                  if (conversationId) {
                    db.messages.push({ id: Math.random().toString(36).substr(2, 9), conversation_id: conversationId, role: 'user', content: { text: prompt }, created_at: new Date().toISOString() });
                    db.messages.push({ id: messageId, conversation_id: conversationId, role: 'assistant', content: finalData, created_at: new Date().toISOString() });
                  }

                  res.end(JSON.stringify({ ok: true, data: finalData, messageId }));
                } catch (e: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ ok: false, error: e.message }));
                }
              });
              return;
            }

            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
