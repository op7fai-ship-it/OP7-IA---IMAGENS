import { createClient } from '@supabase/supabase-js';

// Prioritiza nomes padrão do servidor (Vercel) para garantir persistência real
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ [SUPABASE LIB] Credenciais críticas ausentes (URL ou KEY undefined)!");
} else {
    const safeUrl = supabaseUrl.substring(0, 15) + "...";
    console.log(`📡 [SUPABASE LIB] Conexão configurada para: ${safeUrl}`);
}

// Inicialização segura
let client;
try {
    client = createClient(
        supabaseUrl || 'https://placeholder.supabase.co',
        supabaseKey || 'placeholder'
    );
} catch (err: any) {
    console.error("💥 [SUPABASE LIB] Erro fatal na inicialização do cliente:", err.message);
}

export const supabase = client!;
