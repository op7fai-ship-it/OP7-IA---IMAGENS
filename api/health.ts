import { supabase } from './lib/supabase';

export const runtime = 'nodejs';

export default async function handler(req: any, res: any) {
    res.setHeader("Content-Type", "application/json");

    if (req.method !== 'GET') {
        return res.status(405).json({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Apenas GET permitido' } });
    }

    let dbConnected = false;
    try {
        const { data, error } = await supabase.from('conversations').select('id').limit(1);
        if (!error) dbConnected = true;
    } catch (e) {
        dbConnected = false;
    }

    return res.status(200).json({
        ok: true,
        api: "working",
        dbConnected
    });
}
