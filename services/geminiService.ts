import { AdContent, Position } from "../types";

export interface FullCreativeResponse {
  content: AdContent;
  layout: {
    headlinePos: Position;
    taglinePos: Position;
    ctaPos: Position;
  };
  imagePrompt: string;
}

/**
 * 🔗 Conexão Segura com a API OP7 IA (Serverless)
 * Agora todas as requisições passam pelo backend seguro no Vercel.
 */
export const generateFullCreative = async (prompt: string): Promise<FullCreativeResponse> => {
  console.log("🛠️ [SERVICE] Chamando API /api/creative (Full)...");

  try {
    const response = await fetch('/api/creative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, type: 'full' })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erro desconhecido no servidor.");
    }

    const data = await response.json();
    return data as FullCreativeResponse;
  } catch (error: any) {
    console.error("❌ [SERVICE] Erro fatal:", error);
    throw error;
  }
};

export const generateCreativeCopy = async (topic: string, audience: string): Promise<AdContent> => {
  // Chamada via API genérica ou mantendo o full como principal
  // Para manter a conformidade com o novo fluxo AI First, usamos o endpoint principal
  const res = await generateFullCreative(topic);
  return res.content;
};

export const generateCreativeImage = async (imagePrompt: string, referenceImageUrl?: string | null): Promise<string> => {
  console.log("🛠️ [SERVICE] Chamando API /api/creative (Image)...");

  try {
    const response = await fetch('/api/creative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagePrompt, referenceImage: referenceImageUrl, type: 'image' })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Falha na geração de imagem.");
    }

    const data = await response.json();
    return data.imageData;
  } catch (error: any) {
    console.error("❌ Error generating image:", error);
    throw error;
  }
};