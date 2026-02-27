import { DesignConfig, GenerationOptions, GenerationProgress } from "../types";

export interface CreativeResponse {
  headline: string;
  description: string;
  cta: string;
  backgroundPrompt: string;
  config: DesignConfig;
  imageUrl?: string;
}

export const generateCreative = async (
  prompt: string,
  images: string[],
  options: GenerationOptions,
  onProgress?: (progress: GenerationProgress) => void
): Promise<CreativeResponse> => {
  console.log("🚀 [SERVICE] Iniciando geração Criativa...");

  if (onProgress) onProgress({ step: 'Interpretando seu pedido...', percentage: 10 });

  try {
    if (onProgress) onProgress({ step: 'Analisando nicho e tom...', percentage: 25 });

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        images,
        options,
        format: options.format
      })
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      const errorMsg = result.error?.message || "Erro na comunicação com a IA.";
      throw new Error(errorMsg);
    }

    if (onProgress) onProgress({ step: 'Gerando narrativa persuasiva...', percentage: 60 });

    if (onProgress) onProgress({ step: 'Finalizando composição visual...', percentage: 90 });

    // Pequeno delay para experiência visual
    await new Promise(r => setTimeout(r, 600));

    if (onProgress) onProgress({ step: 'Arte pronta!', percentage: 100 });

    return result.data as CreativeResponse;
  } catch (error: any) {
    console.error("❌ [SERVICE ERROR]:", error.message);
    throw error;
  }
};

export const regenerateLayer = async (
  currentConfig: DesignConfig,
  target: 'all' | 'text' | 'art' | 'layout'
): Promise<DesignConfig | null> => {
  // Simplificado para usar o mesmo endpoint se necessário no futuro
  // Por enquanto, retorna nulo ou mantém o atual
  return null;
};