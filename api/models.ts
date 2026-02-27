import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = 'nodejs';

const API_KEY = process.env.GEMINI_API_KEY;

export default async function handler(req: any, res: any) {
    if (!API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY missing" });
    }

    try {
        // Nota: A lib @google/generative-ai não expõe listModels diretamente de forma simples no SDK v1
        // Mas podemos tentar inferir ou usar um fetch direto se necessário.
        // Por simplicidade e segurança, vamos retornar os modelos que estamos tentando usar como fallback.

        return res.status(200).json({
            info: "Endpoint de Debug de Modelos",
            primary_models: ["gemini-1.5-flash-002", "gemini-1.5-flash-001", "gemini-1.5-flash"],
            status: "Chave de API presente",
            tip: "Se houver erro 404, verifique se sua região suporta o modelo específico ou se há typo no ID."
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
