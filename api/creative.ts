import { GoogleGenerativeAI } from "@google/generative-ai";

// 🚀 [BACKEND CONFIG] 
export const config = {
    runtime: 'nodejs',
};

// 🔑 CHAVE DE SEGURANÇA (Dada pelo usuário)
const DEFINITIVE_KEY = "AIzaSyC0D5MCQ57o6wXNw8cUrWiwd2t5OjCkaYo";

export default async function handler(req: any, res: any) {
    // 1. Logs de Entrada
    console.log("🛠️ [BACKEND] Recebendo Requisição:", req.method);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    // 2. Chave de API
    const API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || DEFINITIVE_KEY;

    if (!API_KEY) {
        console.error("❌ [BACKEND ERROR] Nenhuma chave encontrada.");
        return res.status(500).json({ error: "Chave de API não configurada no servidor." });
    }

    const { prompt, imagePrompt, referenceImage, type } = req.body;
    console.log("📋 [BACKEND DATA] Type:", type, "| Prompt:", prompt?.substring(0, 30));

    const genAI = new GoogleGenerativeAI(API_KEY);

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        if (type === 'full') {
            const aiInstructions = `
                Como Diretor de Arte Senior, analise: "${prompt}".
                Retorne APENAS um JSON:
                {
                  "content": {"headline": "...", "tagline": "...", "cta": "..."},
                  "layout": {
                    "headlinePos": {"x": 50, "y": 30},
                    "taglinePos": {"x": 50, "y": 55},
                    "ctaPos": {"x": 50, "y": 80}
                  },
                  "imagePrompt": "Advertising background description"
                }
            `;
            const result = await model.generateContent(aiInstructions);
            const response = await result.response;
            const text = response.text();

            // Extrair JSON com RegExp para evitar problemas com formatação Markdown da IA
            const jsonPart = text.match(/\{[\s\S]*\}/)?.[0] || text;
            const data = JSON.parse(jsonPart);

            console.log("✅ [BACKEND SUCCESS] Full Response Ready");
            return res.status(200).json(data);
        }

        if (type === 'image') {
            console.log("🖼️ [BACKEND IMAGE] Prompt:", imagePrompt);
            const parts: any[] = [{ text: `Generate a premium background for: ${imagePrompt}` }];
            if (referenceImage) {
                const parts_img = referenceImage.split(',');
                if (parts_img.length === 2) {
                    const mime = parts_img[0].match(/:(.*?);/)?.[1] || 'image/png';
                    parts.push({ inlineData: { mimeType: mime, data: parts_img[1] } });
                }
            }

            const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
            const response = await result.response;
            const parts_res = response.candidates?.[0]?.content?.parts || [];

            for (const part of parts_res) {
                if (part.inlineData?.data) {
                    return res.status(200).json({ imageData: `data:image/png;base64,${part.inlineData.data}` });
                }
            }
            throw new Error("O Gemini não retornou a imagem. Certifique-se de que o modelo suporta geração de imagem.");
        }

        return res.status(400).json({ error: "Invalid Request Type" });

    } catch (error: any) {
        console.error("❌ [BACKEND FATAL ERROR]:", error.message);
        return res.status(500).json({ error: error.message });
    }
}
