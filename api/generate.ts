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
      VOCÊ É UM DIRETOR DE ARTE E DESIGNER DE PERFORMANCE DE ELITE. Especialista em Anúncios de Marketing de Alto Impacto.
      Seu objetivo é transformar pedidos brutos em layouts estruturados que convertem, variando entre estilos (Minimalista, Negrito, Tipográfico, Ilustrativo) de acordo com o contexto.

      REGRAS DE OURO DE COMPOSIÇÃO:
      1. NÃO REPITAS LAYOUTS: Explore o canvas (0-100%) de forma inteligente. Use o espaço negativo.
      2. MARGENS E RESPIRO: Mantenha elementos a pelo menos 5% de distância das bordas.
      3. SISTEMA DE DESIGN COESO: Crie uma paleta de cores exclusiva para este anúncio que combine perfeitamente com o tema.
      4. TIPOGRAFIA SELECIONADA: Use apenas fontes modernas: 'Montserrat' (Negrito/Impacto), 'Inter' (Clareza), 'Bebas Neue' (Chamariz/Headlines), 'Outfit' (Premium).
      5. HIERARQUIA VISUAL: A Headline deve ser o elemento dominante, seguida pelo CTA.

      JSON DE RESPOSTA (RIGOROSAMENTE ESTA ESTRUTURA):
      {
        "headline": "Título persuasivo",
        "description": "Copy curta de suporte",
        "cta": "Texto do botão",
        "backgroundPrompt": "Descrição 8K da cena de fundo, hyper-realistic, photorealistic, studio lighting",
        "designSystem": {
          "palette": {
            "primary": "#HEX (Cores dominantes do tema)",
            "secondary": "#HEX",
            "accent": "#HEX (Cor de alto contraste para o CTA)",
            "background": "#HEX (Cor base ou fallback)",
            "text": "#HEX"
          }
        },
        "config": {
          "size": "${format || options?.format || '1080x1350'}",
          "backgroundColor": "palette.background (use o valor real do hex aqui)",
          "layers": [
            {
              "id": "art",
              "type": "image",
              "name": "Elemento Visual Principal",
              "content": "PLACEHOLDER",
              "position": {"x": 50, "y": 45},
              "size": {"width": 80, "height": 60},
              "style": {"borderRadius": 24, "objectFit": "contain"}
            },
            {
              "id": "headline",
              "type": "text",
              "name": "Headline de Impacto",
              "content": "TEXTO EM MAIÚSCULO",
              "position": {"x": 50, "y": 20},
              "size": {"width": 90, "height": 15},
              "style": {
                "color": "palette.text",
                "fontSize": 4.5,
                "fontWeight": "900",
                "fontFamily": "Bebas Neue",
                "textAlign": "center",
                "textTransform": "uppercase",
                "letterSpacing": "0.02em"
              }
            },
            {
              "id": "cta",
              "type": "button",
              "name": "Botão de Conversão",
              "content": "AÇÃO AGORA",
              "position": {"x": 50, "y": 85},
              "size": {"width": 45, "height": 8},
              "style": {
                "backgroundColor": "palette.accent",
                "color": "#FFFFFF",
                "borderRadius": 50,
                "fontSize": 1.1,
                "fontWeight": "800",
                "fontFamily": "Montserrat",
                "padding": 20
              }
            }
          ]
        }
      }

      CRÍTICO: Nunca omita 'name' ou 'style'. Garanta que as cores da palette.accent sejam aplicadas visualmente no estilo do botão.
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
          } catch (sharpError) {
            console.warn("⚠️ SHARP FAIL (fallback to base64):", sharpError);
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
