import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireEnv } from "../lib/env";

export const runtime = 'nodejs';

// Prioridade para o modelo Flash (Gera layouts em < 5 segundos)
const MODELS = ["gemini-1.5-flash", "gemini-2.0-flash-exp"];

export default async function handler(req: any, res: any) {
  // Garante que a resposta seja SEMPRE JSON para evitar erro de Syntax no frontend
  res.setHeader("Content-Type", "application/json");

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: "Apenas POST permitido" });
    }

    const API_KEY = requireEnv();
    if (!API_KEY) {
      return res.status(500).json({ ok: false, error: "Chave Gemini não configurada no servidor." });
    }

    const { prompt, format, images, options, conversationId, userId } = req.body;

    if (!prompt) {
      return res.status(400).json({ ok: false, error: "Prompt vazio." });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const palette = options?.palette || { primary: '#002B5B', accent: '#FF7D3C', background: '#F8FAFC', text: '#002B5B' };

    const systemPrompt = `
      VOCÊ É UM DIRETOR DE ARTE DE ELITE.
      OBJETIVO: Criar um layout de anúncio moderno e profissional.
      
      REGRAS DE DESIGN (CRÍTICO):
      1. MARGENS: Mantenha pelo menos 12% de margem de respiro em todas as bordas. NUNCA grude elementos nos cantos.
      2. COMPOSIÇÃO: Use o sistema de coordenadas 0-100. Espalhe os elementos harmonicamente.
      3. TIPOGRAFIA: Use 'Montserrat' (900) para títulos.
      4. CORES: Use primária ${palette.primary} e destaque ${palette.accent}.
      
      RETORNE APENAS O JSON:
      {
        "headline": "Título",
        "description": "Subtítulo",
        "cta": "Botão",
        "config": {
          "size": "${format || '1080x1350'}",
          "backgroundColor": "${palette.background}",
          "layers": [
            { "id": "art", "type": "image", "name": "Visual", "position": {"x": 50, "y": 45}, "size": {"width": 80, "height": 55}, "style": {"borderRadius": 20} },
            { "id": "headline", "type": "text", "name": "Título", "position": {"x": 50, "y": 20}, "style": {"fontSize": 4, "fontFamily": "Montserrat", "fontWeight": "900", "textAlign": "center", "color": "${palette.text}"} },
            { "id": "cta", "type": "button", "name": "Botão", "position": {"x": 50, "y": 82}, "style": {"backgroundColor": "${palette.accent}", "borderRadius": 50, "color": "#FFFFFF", "fontSize": 1.2} }
          ]
        }
      }
    `;

    // Processamento ultra-rápido de imagens (sem Sharp)
    const parts: any[] = [{ text: systemPrompt }];
    if (images && images.length > 0) {
      images.forEach((img: string) => {
        const match = img.match(/^data:(.*);base64,(.*)$/);
        if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      });
    }
    parts.push({ text: `USUÁRIO PEDIU: ${prompt}` });

    const model = genAI.getGenerativeModel({ model: MODELS[0] });
    const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
    const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();

    const data = JSON.parse(responseText);

    // Placeholder de imagem elegante
    const finalImg = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&w=1080";
    data.imageUrl = finalImg;
    data.config.backgroundImage = finalImg;
    data.config.layers = data.config.layers.map((l: any) => l.id === 'art' ? { ...l, content: finalImg } : l);

    // SALVAMENTO AUTOMÁTICO NO SUPABASE (HISTÓRICO)
    let messageId = null;
    if (conversationId && userId) {
      try {
        const { supabase } = await import('./lib/supabase');
        const { data: msg } = await supabase
          .from('messages')
          .insert([{ conversation_id: conversationId, user_id: userId, role: 'assistant', content: data }])
          .select().single();
        messageId = msg?.id;
      } catch (e) { console.error("Erro DB Sync"); }
    }

    return res.status(200).json({ ok: true, data, messageId });

  } catch (error: any) {
    console.error("💥 BACKEND CRITICAL ERROR:", error.message);
    return res.status(500).json({ ok: false, error: error.message || "Erro interno." });
  }
}