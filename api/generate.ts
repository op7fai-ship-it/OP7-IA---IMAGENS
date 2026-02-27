import { GoogleGenerativeAI } from "@google/generative-ai";
import sharp from "sharp";
import { requireEnv } from "../lib/env";
import { toErrorResponse } from "../lib/api/error";

// 🚀 ANTI-BUG: Rota imutável. UI depende de /api/generate
export const runtime = 'nodejs';

const MODELS = ["gemini-2.0-flash-exp", "gemini-1.5-flash-001", "gemini-flash-latest"];
const IMAGEN_MODEL = "imagen-3.0-generate-001";

export default async function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");

  // 🛡️ FAIL-SAFE: Verificação Manual de Infraestrutura
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ ok: false, error: 'Chave Gemini ausente no servidor' });
  }

  try {
    console.log("HIT /api/generate");
    const API_KEY = process.env.GEMINI_API_KEY;

    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: "Apenas POST permitido" });
    }

    const { prompt, format, images, options } = req.body;
    console.log("BODY RECEIVED");

    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({ ok: false, error: "O prompt não pode estar vazio." });
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
      VOCÊ É UM ENGENHEIRO DE DESIGN E DIRETOR DE ARTE DE ELITE.
      SEU OBJETIVO: Converter pedidos de marketing em layouts estruturados de alto impacto.

      REGRAS DE OURO PARA O LAYOUT:
      1. COORDENADAS: Use rigorosamente o sistema de porcentagem (0 a 100) para 'position' (x, y) e 'size' (width, height). O canvas é sua área de trabalho total.
      2. CAMADAS OBRIGATÓRIAS (IDs exatos):
         - "art" (tipo: image): Representa o produto ou elemento visual gerado.
         - "headline" (tipo: text): Título principal curto e impactante.
         - "cta" (tipo: button): Chamada de ação persuasiva.
      3. TIPOGRAFIA PREMIUM:
         - Use apenas: 'Montserrat', 'Bebas Neue', 'Inter' ou 'Outfit'.
         - 'fontSize' deve ser um número representando escala visual (ex: 4.5).
         - 'fontWeight' deve ser string (ex: '900').
      4. CORES: Use a paleta: ${JSON.stringify(paletteObj)}.

      CRITICAL CONSTRAINTS:
      - CRITICAL: Every layer must have a 'name' and 'style' object. Never omit these fields.
      - CRÍTICO: Todo o objeto dentro do array 'layers' DEVE conter obrigatoriamente as chaves: 'id', 'type', 'name', 'content', 'position' e 'style'. Nunca omita o campo 'name'.
      - Use ID: "art" for the main product/subject image.
      - Use ID: "headline" for the main title text.

      FORMATO DE RESPOSTA (RIGOROSAMENTE APENAS JSON):
      {
        "headline": "Título curto",
        "description": "Copy de apoio",
        "cta": "Texto do botão",
        "backgroundPrompt": "Descrição 8k, hyper-realistic, studio lighting, cinematographic background for: [TEMA]",
        "config": {
          "size": "${format || options?.format || '1080x1350'}",
          "backgroundColor": "${paletteObj.background}",
          "layers": [
            {
              "id": "art",
              "type": "image",
              "name": "Elemento Visual",
              "content": "PLACEHOLDER",
              "position": {"x": 50, "y": 45},
              "size": {"width": 80, "height": 60},
              "style": {"borderRadius": 24, "objectFit": "contain"}
            },
            {
              "id": "headline",
              "type": "text",
              "name": "Título",
              "content": "TITLE EM MAIÚSCULO",
              "position": {"x": 50, "y": 20},
              "size": {"width": 90, "height": 15},
              "style": {
                "color": "${paletteObj.text}",
                "fontSize": 4.5,
                "fontWeight": "900",
                "fontFamily": "Montserrat",
                "textAlign": "center",
                "textTransform": "uppercase"
              }
            },
            {
              "id": "cta",
              "type": "button",
              "name": "Botão de Ação",
              "content": "TEXTO DO BOTÃO",
              "position": {"x": 50, "y": 85},
              "size": {"width": 40, "height": 8},
              "style": {
                "backgroundColor": "${paletteObj.accent}",
                "color": "#FFFFFF",
                "borderRadius": 50,
                "fontSize": 1.2,
                "fontWeight": "800",
                "fontFamily": "Inter"
              }
            }
          ]
        }
      }
    `;

    const parts: any[] = [
      { text: systemPrompt },
      { text: `CONTEXTO VISUAL: O usuário enviou ${images?.length || 0} imagens de referência abaixo. ANALISE-AS cuidadosamente para extrair estilo, cores, produtos e ambientação.` }
    ];

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

    parts.push({ text: `PROMPT DO USUÁRIO: ${prompt}` });

    let lastError = null;
    let data: any = null;

    for (const modelName of MODELS) {
      try {
        console.log(`🤖[BACKEND] trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json" } });
        const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
        const response = result.response;
        data = JSON.parse(response.text());

        // Check for multimodal image output
        const imagePart = response.candidates[0]?.content?.parts?.find((p: any) => p.inlineData);
        if (imagePart) {
          console.log("📸 [BACKEND] Image found in Gemini output!");
          data.image = {
            kind: 'base64',
            base64: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
            mimeType: imagePart.inlineData.mimeType
          };
        }
        break;
      } catch (error: any) {
        lastError = error;
        console.warn(`Model ${modelName} failed:`, error.message);
        continue;
      }
    }

    if (!data) {
      return res.status(500).json({ ok: false, error: `Falha ao gerar na IA: ${lastError?.message || 'Erro desconhecido'}` });
    }

    // --- ENGINE / IMAGE HANDLING ---
    if (!data.image) {
      const engineImg = engine === 'imagen'
        ? `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format`
        : `https://images.unsplash.com/photo-1557683316-973673baf926?auto=format`;

      data.image = { kind: 'url', url: engineImg, mimeType: 'image/jpeg' };
    }

    const finalImgSrc = data.image.kind === 'base64' ? data.image.base64 : data.image.url;
    data.imageUrl = finalImgSrc;

    if (data.config) {
      data.config.backgroundImage = finalImgSrc;
      if (data.config.layers) {
        data.config.layers = data.config.layers.map((l: any) => {
          // Priority 1: Map to 'art' ID if it exists
          if (l.id === 'art') return { ...l, content: finalImgSrc };
          // Priority 2: Fallback for generic image types if 'art' wasn't used
          if (l.type === 'image' && l.content === 'PLACEHOLDER') return { ...l, content: finalImgSrc };
          return l;
        });
      }
    }

    // --- DB SYNC ---
    const { conversationId, userId } = req.body;
    let dbPayload = {};
    if (conversationId && userId) {
      try {
        const { supabase } = await import('./lib/supabase');
        const { data: assistantMessage } = await supabase
          .from('messages')
          .insert([{ conversation_id: conversationId, user_id: userId, role: 'assistant', content: data }])
          .select().single();
        dbPayload = { messageId: assistantMessage?.id };
      } catch (dbErr) {
        console.warn("DB SYNC ERROR:", dbErr);
      }
    }

    return res.status(200).json({ ok: true, data, ...dbPayload });

  } catch (error: any) {
    console.error("💥 [BACKEND CRITICAL]:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
