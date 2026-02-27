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
      Você é um Especialista em Design e Copywriting de Alta Performance.
      
      OBJETIVO:
      Criar um anúncio visual e textual que siga RIGOROSAMENTE as preferências do usuário.
      VOCÊ NÃO ESTÁ PRESO A UM ESTILO ÚNICO. Se o usuário mandar uma paleta ou referência, ELA É A LEI.

      REGRAS CRÍTICAS:
      1. FIDELIDADE COR/ESTILO: Use exatamente a paleta de cores fornecida abaixo. Se o usuário enviar imagens de referência, analise o estilo visual, cores e composição dessas imagens para guiar a criação.
      2. BACKGROUND: O 'backgroundPrompt' deve ser uma descrição detalhada para IA de imagem que reflita o tema pedido pelo usuário.
      3. TEXTOS: Título e descrição devem ser persuasivos, curtos e diretos ao ponto.
      
      PALETA DE CORES FORNECIDA PELO USUÁRIO (OBRIGATÓRIO USAR):
      - Primária: ${paletteObj.primary}
      - Secundária: ${paletteObj.secondary}
      - Fundo: ${paletteObj.background}
      - Texto Principal: ${paletteObj.text}
      - Destaque/CTA: ${paletteObj.accent}

      REFERÊNCIAS VISUAIS:
      Se imagens forem enviadas, extraia o "feeling" delas. Se for algo luxuoso, use termos de luxo. Se for urbano, use termos urbanos.
      
      FORMATO: ${format || options?.format || '1080x1350'}

      RETORNE APENAS JSON NESTE FORMATO:
      {
        "headline": "Título curto e impactante (Ex: 'Recupere sua Autoestima')",
        "description": "Texto de apoio persuasivo (Ex: 'Tratamentos exclusivos com tecnologia de ponta')",
        "cta": "Chamada para ação curta (Ex: 'AGENDAR AGORA')",
        "backgroundPrompt": "Descrição visual DETALHADA para o motor de imagem. (Ex: 'Luxury aesthetic clinic interior, clean white walls, golden accents, soft lighting, professional ambiance, 8k resolution')",
        "config": {
          "size": "${format || options?.format || '1080x1350'}",
          "backgroundColor": "${paletteObj.background}",
          "backgroundImage": "URL_PLACEHOLDER",
          "overlayOpacity": 0.25,
          "overlayColor": "#000000",
          "layers": [
            {
              "id": "art",
              "type": "image",
              "name": "Arte Principal",
              "content": "URL_PLACEHOLDER",
              "position": {"x": 50, "y": 45},
              "size": {"width": 60, "height": 40},
              "style": { "borderRadius": 20, "rotate": 0 }
            },
            {
              "id": "headline",
              "type": "text",
              "name": "Título",
              "content": "MESMA HEADLINE ACIMA",
              "position": {"x": 50, "y": 30},
              "size": {"width": 80, "height": 10},
              "style": { "color": "${paletteObj.text}", "fontSize": 4, "fontWeight": "900", "fontFamily": "Montserrat", "textAlign": "center", "textTransform": "uppercase" }
            },
            {
              "id": "subheadline",
              "type": "text",
              "name": "Descrição",
              "content": "MESMA DESCRIPTION ACIMA",
              "position": {"x": 50, "y": 55},
              "size": {"width": 75, "height": 15},
              "style": { "color": "${paletteObj.secondary}", "fontSize": 1.8, "fontWeight": "500", "fontFamily": "Outfit", "textAlign": "center" }
            },
            {
              "id": "cta",
              "type": "button",
              "name": "Botão",
              "content": "MESMO CTA ACIMA",
              "position": {"x": 50, "y": 82},
              "size": {"width": 45, "height": 8},
              "style": { "color": "#FFFFFF", "backgroundColor": "${paletteObj.accent}", "fontSize": 1.4, "fontWeight": "900", "fontFamily": "Montserrat", "borderRadius": 50, "padding": 20 }
            }
          ]
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
      } catch (err) {
        console.error("❌ IMAGEN ENGINE ERROR:", err);
      }
    } else {
      // Nano Banana mode (Unsplash Placeholder)
      data.imageUrl = `https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1080&q=80`;
    }

    // Aplicar URL gerada no fundo e na camada de arte se existirem placeholders
    if (data.config) {
      data.config.backgroundImage = data.imageUrl;
      if (data.config.layers) {
        data.config.layers = data.config.layers.map((l: any) =>
          l.id === 'art' ? { ...l, content: data.imageUrl } : l
        );
      }
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
