import { supabase } from './lib/supabase';

export const runtime = 'nodejs';

export default async function handler(req: any, res: any) {
    res.setHeader("Content-Type", "application/json");

    if (req.method !== 'GET') {
        return res.status(405).json({
            ok: false,
            error: { code: 'METHOD_NOT_ALLOWED', message: 'Apenas GET permitido' }
        });
    }

    let dbConnected = false;
    const missingEnvs: string[] = [];

    // Check Gemini (Strict Server Side)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) missingEnvs.push("GEMINI_API_KEY");

    // Check Supabase Envs (Strict Server Side)
    const sbUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!sbUrl) missingEnvs.push("SUPABASE_URL");

    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!sbKey) missingEnvs.push("SUPABASE_KEY");

    // 🚀 TESTE REAL DE CONEXÃO (INFRAESTRUTURA)
    try {
        const { error } = await supabase.from('conversations').select('id').limit(1);
        if (!error) {
            dbConnected = true;
        } else {
            console.error("❌ [HEALTH CHECK] Supabase Connection Error:", error.message);
            dbConnected = false;
        }
    } catch (e: any) {
        console.error("💥 [HEALTH CHECK] Critical Exception:", e.message);
        dbConnected = false;
    }

    return res.status(200).json({
        ok: true,
        envConfigured: missingEnvs.length === 0,
        missingEnvs: missingEnvs,
        geminiConfigured: !!geminiKey,
        dbConnected,
        timestamp: Date.now(), // Usando timestamp numérico para evitar Invalid Date no client
        node_version: process.version
    });
}
