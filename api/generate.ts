import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireEnv } from "../lib/env";
import { toErrorResponse } from "../lib/api/error";

// 🚀 ANTI-BUG: Rota imutável. UI depende de /api/generate
export const runtime = 'nodejs';

const MODELS = ["gemini-1.5-flash", "gemini-2.0-flash-exp", "gemini-flash-latest"];
const IMAGEN_MODEL = "imagen-3.0-generate-001";

export default async function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");

  try {
    const { prompt, images, options } = req.body;
    console.log("Iniciando geração para prompt:", prompt?.substring(0, 50));

    // 🛡️ FAIL-SAFE: Verificação Manual de Infraestrutura
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ ok: false, error: 'Chave Gemini ausente no servidor' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: "Apenas POST permitido" });
    }

    const { format } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(API_KEY);
    const engine = options?.engine === 'imagen' ? 'imagen' : 'nano';

    if (!prompt || prompt.trim() === '') {
      return res.status(400).json({ ok: false, error: "O prompt não pode estar vazio." });
    }

    const paletteObj = options?.palette || {
      primary: '#002B5B',
      secondary: '#1A73E8',
      background: '#F8FAFC',
      text: '#002B5B',
      accent: '#FF7D3C'
    };

    const systemPrompt = `Aja como um Diretor de Arte. Crie designs modernos com espaços negativos. Nunca encoste elementos nas bordas (mantenha 10% de margem). Gere uma paleta de cores coesa no campo 'designSystem'.

      REGRAS ADICIONAIS DE COMPOSIÇÃO:
      1. NÃO REPITAS LAYOUTS: Explore o canvas (0-100%) de forma inteligente.
      2. SISTEMA DE DESIGN COESO: Crie uma paleta exclusiva no objeto "designSystem".
      3. TIPOGRAFIA SELECIONADA: Use apenas fontes modernas: 'Montserrat', 'Inter', 'Bebas Neue', 'Outfit'.
      4. COORDENADAS DINÂMICAS: Varie o layout. Não centralize tudo sempre. Use alinhamentos criativos (esquerda, direita) respeitando a margem de 10% (x e y devem estar no mínimo em 10 e no máximo em 90).

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
            "surface": "#HEX (Cor para cards/painéis sobrepostos)",
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
      IMPORTANTE: A imagem principal gerada pela IA deve ser obrigatoriamente colocada na camada com id: "art".
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

          // Optimization: Send base64 directly to Gemini to bypass server-side processing bottlenecks
          parts.push({ inlineData: { mimeType, data: base64Data } });
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
      if (data.designSystem?.palette) {
        data.config.palette = data.designSystem.palette;
      }
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
    return res.status(500).json({ ok: false, error: error.message || 'Erro interno no servidor' });
  }
}
