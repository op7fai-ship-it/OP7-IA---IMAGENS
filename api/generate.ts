import { GoogleGenerativeAI } from "@google/generative-ai";
import sharp from "sharp";

// 🚀 OBRIGATÓRIO: Forçar runtime Node.js (não Edge) para máxima compatibilidade na Vercel
export const runtime = 'nodejs';

// 🔑 A chave de API deve existir SOMENTE no servidor
// Padronizado para usar process.env.GEMINI_API_KEY
const API_KEY = process.env.GEMINI_API_KEY;

const MODELS = ["gemini-1.5-flash-001", "gemini-flash-latest"];

export default async function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");

  try {
    console.log("HIT /api/generate");

    if (!API_KEY) {
      console.error("❌ [BACKEND ERROR] ENV GEMINI_API_KEY ausente.");
      return res.status(500).json({
        ok: false,
        error: {
          code: "MISSING_ENV",
          message: "ENV GEMINI_API_KEY ausente. Configure em Vercel > Settings > Environment Variables."
        }
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "Apenas POST permitido" } });
    }

    const { prompt, format, images, options } = req.body;
    console.log("BODY RECEIVED");

    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({ ok: false, error: { code: "INVALID_PROMPT", message: "O prompt não pode estar vazio." } });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);

    const paletteObj = options?.palette || {
      primary: '#002B5B',
      secondary: '#1A73E8',
      background: '#F8FAFC',
      text: '#002B5B',
      accent: '#FF7D3C'
    };

    const systemPrompt = `
      Você é um Diretor de Arte e Copywriter Senior da OP7, especialista em tráfego pago de alta conversão.
      Objetivo: Criar um design de anúncio matador resolvendo o problema do usuário.

      A PALETA DE CORES SOLICITADA É:
      - Cor Primária: ${paletteObj.primary}
      - Cor Secundária: ${paletteObj.secondary}
      - Cor do Fundo: ${paletteObj.background}
      - Cor do Texto Principal: ${paletteObj.text}
      - Cor de Destaque/CTA: ${paletteObj.accent}
      
      RETORNE UM JSON NO SEGUINTE FORMATO:
      {
        "headline": "Título curto e impactante",
        "description": "Texto de apoio persuasivo",
        "cta": "Chamada para ação curta",
        "backgroundPrompt": "Descrição detalhada do estilo visual do fundo",
        "config": {
          "size": "${format || options?.format || '1080x1350'}",
          "backgroundColor": "${paletteObj.background}",
          "backgroundImage": "URL_PLACEHOLDER",
          "overlayOpacity": 0.2,
          "overlayColor": "#000000",
          "layers": [
            {
              "id": "headline",
              "type": "text",
              "name": "Título",
              "content": "MESMA HEADLINE ACIMA",
              "position": {"x": 50, "y": 30},
              "size": {"width": 80, "height": 20},
              "style": { "color": "${paletteObj.text}", "fontSize": 4.5, "fontWeight": "900", "fontFamily": "Montserrat", "textAlign": "center", "textTransform": "uppercase" }
            },
            {
              "id": "subheadline",
              "type": "text",
              "name": "Descrição",
              "content": "MESMA DESCRIPTION ACIMA",
              "position": {"x": 50, "y": 55},
              "size": {"width": 75, "height": 15},
              "style": { "color": "${paletteObj.secondary}", "fontSize": 2, "fontWeight": "600", "fontFamily": "Outfit", "textAlign": "center" }
            },
            {
              "id": "cta",
              "type": "button",
              "name": "Botão",
              "content": "MESMO CTA ACIMA",
              "position": {"x": 50, "y": 80},
              "size": {"width": 45, "height": 8},
              "style": { "color": "#FFFFFF", "backgroundColor": "${paletteObj.accent}", "fontSize": 1.5, "fontWeight": "900", "fontFamily": "Montserrat", "borderRadius": 50, "padding": 20 }
            }
          ]
        }
      }

      ESTILO:
      - Siga as cores da paleta definida acima rigorosamente.
      - Fontes: Montserrat, Bebas Neue, Outfit.
      - Foco total em conversão.
      ${options?.useReferences !== false && images && images.length > 0 ? "AS IMAGENS ANEXADAS SÃO APENAS REFERÊNCIAS. Extraia o estilo/tema visual ou produto (ex: 'clínica clean', 'tech neon', 'produto x') e crie um prompt de fundo e layout que remetam a esse estilo/produto, sem copiar." : ""}
    `;

    const parts: any[] = [{ text: systemPrompt }, { text: `USUÁRIO PEDIU: ${prompt}` }];

    if (options?.useReferences !== false && images && images.length > 0) {
      for (const img of images) {
        const match = img.match(/^data:(.*);base64,(.*)$/);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];
          const buffer = Buffer.from(base64Data, 'base64');

          try {
            const compressedBuffer = await sharp(buffer)
              .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 80 })
              .toBuffer();

            const compressedBase64 = compressedBuffer.toString('base64');
            const sizeInMB = (compressedBase64.length * (3 / 4)) / (1024 * 1024);

            if (sizeInMB > 4) {
              return res.status(400).json({ ok: false, error: { code: "IMAGE_TOO_LARGE", message: "Referência muito pesada. Envie imagens menores." } });
            }

            parts.push({ inlineData: { mimeType: 'image/jpeg', data: compressedBase64 } });
          } catch (err) {
            console.error("❌ [BACKEND ERROR] Falha ao comprimir imagem:", err);
            parts.push({ inlineData: { mimeType, data: base64Data } });
          }
        }
      }
    }

    let lastError = null;
    let data = null;
    let usedModel = null;

    for (const modelName of MODELS) {
      try {
        console.log(`🤖[BACKEND] using model: ${modelName}`);
        console.log("CALLING GEMINI");
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: "application/json" }
        });

        // Add an explicit timeout to prevent hanging connections
        const generationPromise = model.generateContent({ contents: [{ role: 'user', parts }] });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout of 25s exceeded")), 25000));

        const result: any = await Promise.race([generationPromise, timeoutPromise]);

        console.log(`✅ [BACKEND] provider response received`);

        const text = result.response.text();
        data = JSON.parse(text);
        usedModel = modelName;
        break; // Success, escape loop
      } catch (error: any) {
        lastError = error;
        if (error.status === 404 || error.message.includes("not found") || error.message.includes("not supported")) {
          console.warn(`⚠️ [BACKEND] Modelo ${modelName} inválido ou não suportado. Trocando para fallback...`);
          continue; // Try next fallback model
        }
        console.error(`❌ [BACKEND ERROR] Erro com modelo ${modelName}:`, error.message);
        break; // Serious error, do not retry
      }
    }

    if (!data) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "AI_GENERATION_FAILED",
          message: lastError?.message || "Falha ao gerar na IA após tentar múltiplos modelos.",
          details: lastError?.stack || "Detalhes indisponíveis"
        }
      });
    }

    // Default Images/Mock
    data.imageUrl = `https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1080&q=80`;
    data.config.backgroundImage = data.imageUrl;

    console.log("RETURN SUCCESS");

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
        console.error("❌ [BACKEND ERROR] Erro ao salvar no Supabase:", dbErr);
      }
    }

    return res.status(200).json({ ok: true, data, ...dbPayload });

  } catch (globalError: any) {
    console.error("💥 [BACKEND CRITICAL] error stack:", globalError);
    return res.status(500).json({
      ok: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Ocorreu um erro interno no backend.",
        details: globalError.message
      }
    });
  }
}
