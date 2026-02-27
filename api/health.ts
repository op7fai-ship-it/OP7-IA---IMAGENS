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
    let envConfigured = false;
    let geminiConfigured = false;

    // Check Env
    try {
        envConfigured = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
        geminiConfigured = !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY);
    } catch (e) { }

    // Check DB
    try {
        const { data, error } = await supabase.from('conversations').select('id').limit(1);
        if (!error) dbConnected = true;
    } catch (e) {
        dbConnected = false;
    }

    return res.status(200).json({
        ok: true,
        envConfigured,
        geminiConfigured,
        dbConnected,
        timestamp: new Date().toISOString(),
        node_version: process.version
    });
}
