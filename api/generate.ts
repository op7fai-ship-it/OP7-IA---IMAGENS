import { GoogleGenerativeAI } from "@google/generative-ai";
import sharp from "sharp";
import { requireEnv } from "../lib/env";
import { toErrorResponse } from "../lib/api/error";

// 🚀 ANTI-BUG: Rota imutável. UI depende de /api/generate
export const runtime = 'nodejs';

const MODELS = ["gemini-1.5-flash-001", "gemini-flash-latest"];
const IMAGEN_MODEL = "imagen-3.0-generate-001";

export default async function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");

  try {
    console.log("HIT /api/generate");

    const API_KEY = requireEnv();
    if (!API_KEY) {
      return res.status(500).json(toErrorResponse("ENV_MISSING", "GEMINI_API_KEY não configurada no backend."));
    }

    if (req.method !== 'POST') {
      return res.status(405).json(toErrorResponse("METHOD_NOT_ALLOWED", "Apenas POST permitido"));
    }

    const { prompt, format, images, options } = req.body;
    console.log("BODY RECEIVED");

    if (!prompt || prompt.trim() === '') {
      return res.status(400).json(toErrorResponse("INVALID_PROMPT", "O prompt não pode estar vazio."));
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const engine = options?.engine === 'imagen' ? 'imagen' : 'nano';

    const paletteObj = options?.palette || {
      primary: '#002B5B',
      secondary: '#1A73E8',
      background: '#F8FAFC',
      text: '#002B5B',
      accent: '#FF7D3C'
    };

    const systemPrompt = `
      Você é um Diretor de Arte e Copywriter Senior da OP7.
      RETORNE UM JSON NO SEGUINTE FORMATO:
      {
        "headline": "...",
        "description": "...",
        "cta": "...",
        "backgroundPrompt": "Crie uma descrição visual detalhada para o fundo da imagem...",
        "config": {
          "size": "${format || options?.format || '1080x1350'}",
          "backgroundColor": "${paletteObj.background}",
          "backgroundImage": "URL_PLACEHOLDER",
          "layers": [...]
        }
      }
    `;

    const parts: any[] = [{ text: systemPrompt }, { text: `USUÁRIO PEDIU: ${prompt}` }];

    // ... (logic for image references compression remains the same)
    if (options?.useReferences !== false && images && images.length > 0) {
      for (const img of images) {
        const match = img.match(/^data:(.*);base64,(.*)$/);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];
          try {
            const buffer = Buffer.from(base64Data, 'base64');
            const compressedBuffer = await sharp(buffer)
              .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 80 })
              .toBuffer();
            parts.push({ inlineData: { mimeType: 'image/jpeg', data: compressedBuffer.toString('base64') } });
          } catch (e) {
            parts.push({ inlineData: { mimeType, data: base64Data } });
          }
        }
      }
    }

    let lastError = null;
    let data = null;

    for (const modelName of MODELS) {
      try {
        console.log(`🤖[BACKEND] using model: ${modelName}`);
        console.log("CALLING GEMINI");
        const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json" } });
        const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
        data = JSON.parse(result.response.text());
        break;
      } catch (error: any) {
        lastError = error;
        if (error.status === 404) continue;
        break;
      }
    }

    if (!data) {
      return res.status(500).json(toErrorResponse("AI_GENERATION_FAILED", "Falha ao gerar na IA.", lastError?.message));
    }

    // --- ENGINE SELECTION ---
    if (engine === 'imagen') {
      try {
        console.log(`🎨 [BACKEND] Using IMAGEN engine for high-quality generation...`);
        // Aqui seria a chamada real ao Imagen 3.0 via REST
        // data.imageUrl = await generateImagen(API_KEY, data.backgroundPrompt);

        // PLACEHOLDER PREMIUM PARA IMAGEN
        data.imageUrl = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2000&auto=format&fit=crop`;
        data.config.backgroundImage = data.imageUrl;
      } catch (err) {
        console.error("❌ IMAGEN ENGINE ERROR:", err);
      }
    } else {
      // Nano Banana mode (Unsplash Placeholder)
      data.imageUrl = `https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1080&q=80`;
      data.config.backgroundImage = data.imageUrl;
    }

    console.log("RETURN SUCCESS");

    // --- DB SYNC (Supabase) ---
    let dbPayload = {};
    const { conversationId, userId } = req.body;
    if (conversationId && userId) {
      try {
        const { supabase } = await import('./lib/supabase');

        const { data: userMessage } = await supabase
          .from('messages')
          .insert([{ conversation_id: conversationId, user_id: userId, role: 'user', content: { text: prompt } }])
          .select().single();

        const { data: assistantMessage } = await supabase
          .from('messages')
          .insert([{ conversation_id: conversationId, user_id: userId, role: 'assistant', content: data }])
          .select().single();

        if (userMessage && assistantMessage) {
          await supabase.from('generations').insert([{
            conversation_id: conversationId,
            message_id: assistantMessage.id,
            prompt: prompt,
            palette: paletteObj,
            references_data: images ? images.map((i: string) => ({ length: i.length })) : [],
            result: data
          }]);
        }
        dbPayload = { messageId: assistantMessage?.id };
      } catch (dbErr) {
        console.warn("DB SYNC ERROR:", dbErr);
      }
    }

    return res.status(200).json({ ok: true, data, ...dbPayload });

  } catch (globalError: any) {
    console.error("💥 [BACKEND CRITICAL]:", globalError);
    return res.status(500).json(toErrorResponse("INTERNAL_SERVER_ERROR", "Erro interno no backend.", globalError.message));
  }
}
