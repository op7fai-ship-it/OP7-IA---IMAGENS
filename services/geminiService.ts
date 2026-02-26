import { GoogleGenerativeAI } from "@google/generative-ai";
import { AdContent, DesignConfig, Position } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export interface FullCreativeResponse {
  content: AdContent;
  layout: {
    headlinePos: Position;
    taglinePos: Position;
    ctaPos: Position;
  };
  imagePrompt: string;
}

export const generateFullCreative = async (prompt: string): Promise<FullCreativeResponse> => {
  console.log("🛠️ [SERVICE] Início generateFullCreative. Prompt:", prompt);

  if (!API_KEY) {
    throw new Error("Chave de API não configurada.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const aiInstructions = `
      Atue como um Diretor de Arte e Copywriter Senior.
      Com base no prompt do usuário: "${prompt}", crie um anúncio completo.
      
      Você deve retornar um JSON com:
      1. headline (impactante, max 60 carac)
      2. tagline (persuasiva, max 120 carac)
      3. cta (curto, max 20 carac)
      4. layout (posições X e Y de 0 a 100 para cada elemento)
      5. imagePrompt (instrução em inglês para gerar uma imagem de fundo premium no tema)

      Considere hierarquia visual: Título deve ficar acima ou no centro, descrição próxima, e CTA geralmente mais abaixo.
      Mantenha respiro e elegância.

      Responda APENAS o JSON no formato:
      {
        "content": {"headline": "...", "tagline": "...", "cta": "..."},
        "layout": {
          "headlinePos": {"x": 50, "y": 30},
          "taglinePos": {"x": 50, "y": 50},
          "ctaPos": {"x": 50, "y": 80}
        },
        "imagePrompt": "..."
      }
    `;

    const result = await model.generateContent(aiInstructions);
    const response = await result.response;
    const text = response.text();

    const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || text;
    const data = JSON.parse(jsonStr);

    return data as FullCreativeResponse;
  } catch (error: any) {
    console.error("❌ [SERVICE] Erro em generateFullCreative:", error);
    throw error;
  }
};

export const generateCreativeCopy = async (
  topic: string,
  audience: string
): Promise<AdContent> => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `
    Crie uma copy para: "${topic}". Público: "${audience}".
    JSON: {"headline": "...", "tagline": "...", "cta": "..."}
  `;
  const result = await model.generateContent(prompt);
  const text = (await result.response).text();
  const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || text;
  return JSON.parse(jsonStr) as AdContent;
};

export const generateCreativeImage = async (
  imagePrompt: string,
  referenceImageUrl?: string | null
): Promise<string> => {
  console.log("🛠️ [SERVICE] Início generateCreativeImage. Prompt:", imagePrompt);

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const parts: any[] = [{ text: `Generate a high-quality advertising background image for: ${imagePrompt}. Style: Cinematic, Premium, Clean for text overlay.` }];

  if (referenceImageUrl) {
    const matches = referenceImageUrl.match(/^data:(.+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      parts.push({
        inlineData: { mimeType: matches[1], data: matches[2] }
      });
    }
  }

  try {
    const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
    const response = await result.response;

    const parts_res = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts_res) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Não foi possível gerar a imagem diretamente. Verifique se o modelo suporta geração de imagem ou use um fallback.");
  } catch (error: any) {
    console.error("❌ [SERVICE] Erro em generateCreativeImage:", error);
    throw error;
  }
};