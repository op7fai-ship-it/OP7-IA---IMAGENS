// 🚀 ANTI-BUG MODE: GUARD ENVIRONMENT
// Este arquivo é estritamente Server-Side.
export const getEnv = () => {
    return {
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        isConfigured: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10,
    };
};

export const requireEnv = () => {
    const env = getEnv();
    if (!env.isConfigured) {
        console.error("❌ [BACKEND ERROR] ENV GEMINI_API_KEY ausente ou inválida.");
        return null;
    }
    return env.GEMINI_API_KEY as string;
};
