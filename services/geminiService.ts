import { GenerationOptions, GenerationProgress, DesignConfig } from "../types";

export interface CreativeResponse {
  headline: string;
  description: string;
  cta: string;
  backgroundPrompt: string;
  config: DesignConfig;
  imageUrl?: string;
  messageId?: string;
  data?: {
    image?: {
      kind: 'url' | 'base64';
      url?: string;
      base64?: string;
      mimeType: string;
    }
  };
}

export const generateCreative = async (
  prompt: string,
  images: string[],
  options: GenerationOptions,
  onProgress?: (progress: GenerationProgress) => void
): Promise<CreativeResponse> => {

  if (onProgress) onProgress({ step: 'Conectando ao Diretor de Arte...', percentage: 10 });

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        images,
        options,
        format: options.format,
        userId: options.userId,
        conversationId: options.conversationId
      })
    });

    // 🛡️ Validação Crítica: Impede o erro de SyntaxError no Frontend
    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `Erro no Servidor (${response.status})`;

      try {
        const parsedError = JSON.parse(errorBody);
        errorMessage = parsedError.error?.message || parsedError.error || errorMessage;
      } catch (e) {
        // Se não for JSON, o erroBody contém o texto real do crash (ex: "Invocation Failed")
        errorMessage = errorBody.includes("FUNCTION_INVOCATION_FAILED")
          ? "O servidor esgotou o tempo limite. Tente uma imagem menor ou um prompt mais curto."
          : errorBody;
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();

    if (!result.ok) throw new Error(typeof result.error === 'string' ? result.error : (result.error?.message || "Erro desconhecido no backend"));

    if (onProgress) onProgress({ step: 'Design finalizado!', percentage: 100 });

    // Retorna os dados formatados para o App.tsx
    return {
      ...result.data,
      messageId: result.messageId
    } as CreativeResponse;

  } catch (error: any) {
    console.error("🚀 [GEMINI SERVICE ERROR]:", error.message);
    throw error;
  }
};

export const regenerateLayer = async (
  currentConfig: DesignConfig,
  target: 'all' | 'text' | 'art' | 'layout'
): Promise<DesignConfig | null> => {
  // Placeholder para futuras expansões de edição individual de camadas
  return null;
};