import { GoogleGenerativeAI } from "@google/generative-ai";

// Vercel Serverless Function requirements
export const config = {
    runtime: 'nodejs',
};

const API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

export default async function handler(req: any, res: any) {
    // 1. Validate Method
    if (req.method !== 'POST') {
        return res.status(post).json({ error: "Only POST allowed" });
    }

    // 2. Validate API Key
    console.log("🛠️ [SERVER] Verificando ENV: GEMINI_API_KEY");
    if (!API_KEY) {
        console.error("❌ [SERVER] Faltou configurar ENV: GEMINI_API_KEY no Vercel");
        return res.status(500).json({
            error: "Chave de API não configurada no servidor Vercel!",
            instruction: "Adicione GEMINI_API_KEY nas Environment Variables do projeto no Vercel."
        });
    }

    const { prompt, type } = req.body;
    const genAI = new GoogleGenerativeAI(API_KEY);

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        if (type === 'full') {
            console.log("⏳ [SERVER] Chamando Gemini 1.5 Flash (Full Creative)...");
            const aiInstructions = `
        Atue como Diretor de Arte e Copywriter Senior.
        Crie um anúncio completo para: "${prompt}".
        Retorne um JSON:
        {
          "content": {"headline": "...", "tagline": "...", "cta": "..."},
          "layout": {
            "headlinePos": {"x": 50, "y": 30},
            "taglinePos": {"x": 50, "y": 55},
            "ctaPos": {"x": 50, "y": 80}
          },
          "imagePrompt": "vibrant premium background description in English"
        }
        Responda APENAS o JSON.
      `;
            const result = await model.generateContent(aiInstructions);
            const text = result.response.text();
            const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || text;
            return res.status(200).json(JSON.parse(jsonStr));
        }

        if (type === 'image') {
            console.log("⏳ [SERVER] Chamando Gemini (Image Generation)...");
            const { imagePrompt, referenceImage } = req.body;
            const parts: any[] = [{ text: `High quality background image for: ${imagePrompt}. Professional, cinematic.` }];

            if (referenceImage) {
                const matches = referenceImage.match(/^data:(.+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    parts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
                }
            }

            const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
            const parts_res = result.response.candidates?.[0]?.content?.parts || [];
            for (const part of parts_res) {
                if (part.inlineData?.data) {
                    return res.status(200).json({ imageData: `data:image/png;base64,${part.inlineData.data}` });
                }
            }
            throw new Error("No image data returned from model");
        }

        return res.status(400).json({ error: "Invalid request type" });

    } catch (error: any) {
        console.error("❌ [SERVER] Gemini Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
