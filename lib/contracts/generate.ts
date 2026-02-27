import { AdSize, ToneType, BackgroundStyle, ColorPalette, ImageReference, DesignConfig } from '../../types';

export interface GenerateRequest {
    prompt: string;
    format?: AdSize;
    options?: {
        palette?: ColorPalette;
        conversationId?: string | null;
        userId?: string;
        useReferences?: boolean;
        language?: string;
        tone?: ToneType;
        backgroundStyle?: BackgroundStyle;
    };
    images?: string[];
}

export interface GenerateResponseSuccess {
    ok: true;
    data: {
        headline: string;
        description: string;
        cta: string;
        backgroundPrompt: string;
        config: DesignConfig;
        imageUrl?: string;
        messageId?: string;
    };
}

export interface GenerateResponseError {
    ok: false;
    error: {
        code: string;
        message: string;
        details?: string;
        httpStatus?: number;
    };
}

export type GenerateResponse = GenerateResponseSuccess | GenerateResponseError;
