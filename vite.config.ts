import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  const API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  // 🛡️ ANTI-BUG & SECURITY MODE
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

            // --- PERSISTÊNCIA MOCK LOCAL EM MEMÓRIA (GLOBAL PARA VITE) ---
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
                const userConvs = db.conversations.filter(c => c.user_id === userId);
                return res.end(JSON.stringify({ ok: true, data: userConvs }));
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

              if (!API_KEY) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ ok: false, error: { message: "GEMINI_API_KEY não configurada" } }));
              }

              let bodyBuffer = '';
              req.on('data', chunk => { bodyBuffer += chunk; });
              req.on('end', async () => {
                try {
                  const body = JSON.parse(bodyBuffer);
                  const { prompt, options, images } = body;
                  const conversationId = options?.conversationId;
                  const userId = options?.userId;

                  const genAI = new GoogleGenerativeAI(API_KEY);
                  const MODELS = ["gemini-1.5-flash-001", "gemini-2.0-flash-exp", "gemini-flash-latest"];
                  const p = options?.palette || { primary: '#002B5B', accent: '#FF7D3C', background: '#F8FAFC', text: '#002B5B' };

                  const instructions = `Atue como Diretor de Arte OP7. SIGA RIGOROSAMENTE A PALETA E REFERÊNCIAS. Retorne JSON: { "headline": "...", "description": "...", "cta": "...", "backgroundPrompt": "...", "config": { "size": "${options?.format || '1080x1350'}", "backgroundColor": "${p.background}", "backgroundImage": "URL", "layers": [ { "id": "art", "type": "image", "content": "URL", "position": {"x": 50, "y": 45}, "size": {"width": 60, "height": 40}, "style": {"borderRadius": 20} }, { "id": "headline", "type": "text", "content": "TÍTULO", "position": {"x": 50, "y": 25}, "size": {"width": 80, "height": 10}, "style": {"color": "${p.text}", "fontSize": 4, "fontWeight": "900", "fontFamily": "Montserrat", "textAlign": "center"} } ] } }`;

                  const parts: any[] = [{ text: instructions }, { text: `USUÁRIO PEDIU: ${prompt}` }];

                  // Adicionar referências se existirem
                  if (options?.useReferences !== false && images && images.length > 0) {
                    for (const img of images) {
                      const match = img.match(/^data:(.*);base64,(.*)$/);
                      if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
                    }
                  }

                  let lastError = null;
                  let data = null;

                  for (const modelName of MODELS) {
                    try {
                      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json" } });
                      const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
                      data = JSON.parse(result.response.text());
                      break;
                    } catch (err) {
                      lastError = err;
                      continue;
                    }
                  }

                  if (!data) throw lastError;

                  // Engine selection Mock
                  const imgUrl = options?.engine === 'imagen'
                    ? `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200`
                    : `https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1080`;

                  data.imageUrl = imgUrl;
                  data.config.backgroundImage = imgUrl;
                  if (data.config.layers) {
                    data.config.layers = data.config.layers.map((l: any) => l.id === 'art' ? { ...l, content: imgUrl } : l);
                  }

                  // Persistência Mock
                  if (conversationId && userId) {
                    db.messages.push({
                      id: Math.random().toString(36).substr(2, 9),
                      conversation_id: conversationId,
                      role: 'user',
                      content: { text: prompt },
                      created_at: new Date().toISOString()
                    });
                    db.messages.push({
                      id: Math.random().toString(36).substr(2, 9),
                      conversation_id: conversationId,
                      role: 'assistant',
                      content: data,
                      created_at: new Date().toISOString()
                    });
                    const conv = db.conversations.find(c => c.id === conversationId);
                    if (conv) conv.updated_at = new Date().toISOString();
                  }

                  res.end(JSON.stringify({ ok: true, data }));
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
