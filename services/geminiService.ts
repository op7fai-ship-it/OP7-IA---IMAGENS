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

    if (response.status === 204) {
      throw new Error(`Resposta vazia do backend (Status: ${response.status})`);
    }

    const contentType = response.headers.get('content-type');
    let result: any;

    if (contentType && contentType.includes('application/json')) {
      const text = await response.text();
      if (!text || text.trim() === '') {
        throw new Error(`Resposta vazia do backend ao parsear JSON (Status: ${response.status})`);
      }
      try {
        result = JSON.parse(text);
      } catch (parseErr) {
        throw new Error(`Falha ao decodificar resposta JSON do servidor (Status: ${response.status})`);
      }
    } else {
      const text = await response.text();
      console.error(`Status: ${response.status}, Content-Type: ${contentType}`);
      console.error("Resposta não-JSON do servidor:", text);
      throw new Error(`Backend /api/generate não encontrado ou inválido. Status: ${response.status}`);
    }

    if (!response.ok || !result.ok) {
      const complexError = result?.error || {
        code: "UNKNOWN_NET_ERROR",
        message: `Erro na comunicação com a IA (Status: ${response.status})`,
        details: null
      };

      // Inject HTTP details
      complexError.httpStatus = response.status;

      throw new Error(JSON.stringify(complexError));
    }

    if (onProgress) onProgress({ step: 'Gerando narrativa persuasiva...', percentage: 60 });

    if (onProgress) onProgress({ step: 'Finalizando composição visual...', percentage: 90 });

    // Pequeno delay para experiência visual
    await new Promise(r => setTimeout(r, 600));

    if (onProgress) onProgress({ step: 'Arte pronta!', percentage: 100 });

    return { ...result.data, messageId: result.messageId } as CreativeResponse;
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