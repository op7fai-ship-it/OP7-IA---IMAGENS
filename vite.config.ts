import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // 🛡️ ANTI-BUG & SECURITY MODE
  const API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const hasClientLeak = Object.keys(env).some(k =>
    (k.includes('VITE_') || k.includes('NEXT_PUBLIC_')) && k.includes('GEMINI')
  );

  if (hasClientLeak) {
    throw new Error("🚨 SECURITY ALERT: Gemini API Key detectada sendo exposta ao frontend. Certifique-se de que a variável NÃO comece com VITE_ ou NEXT_PUBLIC_.");
  }

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react()
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
