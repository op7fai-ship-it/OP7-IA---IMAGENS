import { DesignConfig, GenerationOptions, GenerationProgress } from "../types";

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
  onProgress?: (progress: GenerationProgress) => void,
  retries: number = 2
): Promise<CreativeResponse> => {
  console.log("🚀 [SERVICE] Iniciando geração Criativa...");

  if (onProgress) onProgress({ step: 'Interpretando seu pedido...', percentage: 10 });

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

    if (!response.ok) {
      const errText = await response.text();
      if (retries > 0) {
        console.warn(`⚠️ Erro na API (${response.status}). Tentando novamente... Restam ${retries}`);
        return generateCreative(prompt, images, options, onProgress, retries - 1);
      }
      throw new Error(errText || `Erro HTTP ${response.status}`);
    }

    const result = await response.json();
    if (!result.ok) throw new Error(result.error?.message || "Erro desconhecido no backend");

    if (onProgress) onProgress({ step: 'Finalizando composição...', percentage: 95 });
    return { ...result.data, messageId: result.messageId } as CreativeResponse;

  } catch (error: any) {
    if (retries > 0) {
      console.warn(`⚠️ Falha na conexão. Retentando... (${retries})`);
      return generateCreative(prompt, images, options, onProgress, retries - 1);
    }
    throw error;
  }
};

export const regenerateLayer = async (
  currentConfig: DesignConfig,
  target: 'all' | 'text' | 'art' | 'layout'
): Promise<DesignConfig | null> => {
  return null;
};