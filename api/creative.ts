import { GoogleGenerativeAI } from "@google/generative-ai";

// 🚀 [BACKEND] Configurações para deploy no Vercel
export const config = {
    runtime: 'nodejs',
};

// Chave fornecida pelo usuário (Fallback Hardcoded para garantir funcionamento imediato)
const FALLBACK_KEY = "AIzaSyC0D5MCQ57o6wXNw8cUrWiwd2t5OjCkaYo";
const API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || FALLBACK_KEY;

export default async function handler(req: any, res: any) {
    // 1. Validar Método
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    // 2. Validar Chave de API
    console.log("🛠️ [SERVER] Validando conexão com Gemini...");
    if (!API_KEY) {
        console.error("❌ [SERVER] Chave de API ausente.");
        return res.status(500).json({
            error: "Faltou configurar a chave GEMINI_API_KEY.",
            instruction: "Insira a chave no dashboard do Vercel ou verifique o arquivo .env.local"
        });
    }

    const { prompt, imagePrompt, referenceImage, type } = req.body;
    const genAI = new GoogleGenerativeAI(API_KEY);

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // TIPO 1: Geração Completa (Texto + Layout)
        if (type === 'full') {
            const aiInstructions = `
                Como Diretor de Arte AI, crie um criativo para: "${prompt}".
                Retorne APENAS um JSON:
                {
                  "content": {"headline": "...", "tagline": "...", "cta": "..."},
                  "layout": {
                    "headlinePos": {"x": 50, "y": 30},
                    "taglinePos": {"x": 50, "y": 55},
                    "ctaPos": {"x": 50, "y": 80}
                  },
                  "imagePrompt": "Premium advertising background description in English"
                }
            `;
            const result = await model.generateContent(aiInstructions);
            const text = result.response.text();
            const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || text;
            return res.status(200).json(JSON.parse(jsonStr));
        }

        // TIPO 2: Geração de Imagem
        if (type === 'image') {
            const parts: any[] = [{ text: `High resolution cinematic background for: ${imagePrompt}` }];
            if (referenceImage) {
                const matches = referenceImage.match(/^data:(.+);base64,(.+)$/);
                if (matches?.length === 3) {
                    parts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
                }
            }
            const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
            const parts_res = result.response.candidates?.[0]?.content?.parts || [];
            const imgData = parts_res.find(p => p.inlineData)?.inlineData?.data;
            if (imgData) {
                return res.status(200).json({ imageData: `data:image/png;base64,${imgData}` });
            }
            throw new Error("Gemini não retornou dados de imagem.");
        }

        return res.status(400).json({ error: "Tipo de requisição inválido" });

    } catch (error: any) {
        console.error("❌ [SERVER ERROR]:", error);
        return res.status(500).json({ error: error.message });
    }
}
