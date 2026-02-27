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
                  try {
                    const { user_id, title, prompt } = JSON.parse(body);

                    // Auto-title logic
                    let finalTitle = title || "Nova Arte";
                    if (prompt && !title) {
                      finalTitle = prompt.split(' ').slice(0, 5).join(' ').replace(/[#@*]/g, '') + (prompt.split(' ').length > 5 ? '...' : '');
                    }

                    const newConv = {
                      id: Math.random().toString(36).substr(2, 9),
                      user_id,
                      title: finalTitle,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    };
                    db.conversations.push(newConv);
                    res.end(JSON.stringify({ ok: true, data: newConv }));
                  } catch (e) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ ok: false, error: "Invalid JSON" }));
                  }
                });
                return;
              }

              if (req.method === 'PATCH') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', () => {
                  const { title } = JSON.parse(body);
                  const conv = db.conversations.find(c => c.id === id);
                  if (conv) {
                    conv.title = title;
                    conv.updated_at = new Date().toISOString();
                  }
                  res.end(JSON.stringify({ ok: true, data: conv }));
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
                        VOCÊ É UM DIRETOR DE ARTE ELITE.
                        RETORNE RIGOROSAMENTE APENAS JSON:
                        {
                          "headline": "TEXTO_IMPACTANTE",
                          "description": "COPY_PERSUASIVA",
                          "cta": "CHAMADA_CURTA",
                          "backgroundPrompt": "PROMPT_VISUAL_DETALHADO_8K",
                          "config": {
                            "size": "${format}",
                            "backgroundColor": "${p.background}",
                            "backgroundImage": "PLACEHOLDER",
                            "layers": [
                              { 
                                "id": "art", 
                                "type": "image", 
                                "content": "PLACEHOLDER", 
                                "position": {"x": 50, "y": 45}, 
                                "size": {"width": 65, "height": 45}, 
                                "style": {"borderRadius": 24} 
                              },
                              { 
                                "id": "headline", 
                                "type": "text", 
                                "content": "HEADLINE", 
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
                        console.log(`🤖 [MOCK-API] Using model: ${modelName}`);
                        const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json" } });
                        const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
                        const response = result.response;
                        const text = response.text();
                        finalData = JSON.parse(text);

                        // Procurar por imagem no response (multimodal output se suportado)
                        const imagePart = response.candidates[0]?.content?.parts?.find(p => p.inlineData);
                        if (imagePart) {
                          console.log("📸 [MOCK-API] Image found in response!");
                          finalData.image = {
                            kind: 'base64',
                            base64: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
                            mimeType: imagePart.inlineData.mimeType
                          };
                        }
                        break;
                      } catch (e) {
                        console.warn(`Model ${modelName} failed or returned invalid JSON.`, e.message);
                      }
                    }
                  }

                  // Fallback & Standardization
                  if (!finalData || !finalData.image) {
                    const engineImg = options?.engine === 'imagen'
                      ? "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format"
                      : "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format";

                    if (!finalData) {
                      finalData = {
                        headline: "Criativo de Performance",
                        description: "Design gerado automaticamente com base no seu pedido.",
                        cta: "SAIBA MAIS",
                        backgroundPrompt: prompt,
                        config: {
                          size: format,
                          backgroundColor: p.background,
                          layers: [
                            { id: "art", type: "image", content: engineImg, position: { x: 50, y: 45 }, size: { width: 60, height: 40 }, style: { borderRadius: 24 } },
                            { id: "headline", type: "text", content: "SUA HEADLINE", position: { x: 50, y: 25 }, size: { width: 90, height: 10 }, style: { color: p.text, fontSize: 4, fontWeight: "900", textAlign: "center" } }
                          ]
                        }
                      };
                    }

                    finalData.image = { kind: 'url', url: engineImg, mimeType: 'image/jpeg' };
                  }

                  // Apply image to config
                  const finalImgSrc = finalData.image.kind === 'base64' ? finalData.image.base64 : finalData.image.url;
                  finalData.imageUrl = finalImgSrc;
                  finalData.config.backgroundImage = finalImgSrc;
                  if (finalData.config.layers) {
                    finalData.config.layers = finalData.config.layers.map((l: any) =>
                      l.type === 'image' ? { ...l, content: finalImgSrc } : l
                    );
                  }

                  // Persistência Mock
                  if (conversationId) {
                    db.messages.push({ id: Math.random().toString(36).substr(2, 9), conversation_id: conversationId, role: 'user', content: { text: prompt }, created_at: new Date().toISOString() });
                    db.messages.push({ id: messageId, conversation_id: conversationId, role: 'assistant', content: finalData, created_at: new Date().toISOString() });
                  }

                  res.end(JSON.stringify({ ok: true, data: finalData, messageId }));
                } catch (e: any) {
                  console.error("💥 [MOCK-API ERROR]:", e);
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
