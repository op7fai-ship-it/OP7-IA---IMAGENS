import { createClient } from '@supabase/supabase-js';

// Prioritiza nomes padrão da Vercel/Next.js/Vite para evitar confusão de envs
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ [SUPABASE LIB] Credenciais ausentes. Verifique SUPABASE_URL e as chaves de acesso.");
} else {
    const safeUrl = supabaseUrl.substring(0, 15) + "...";
    console.log(`📡 [SUPABASE LIB] Conexão configurada para: ${safeUrl}`);
}

export const supabase = createClient(
    supabaseUrl || '',
    supabaseKey || ''
);
