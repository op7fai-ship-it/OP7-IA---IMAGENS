import { supabase } from './lib/supabase';

export const runtime = 'nodejs';

export default async function handler(req: any, res: any) {
    res.setHeader('Content-Type', 'application/json');

    const { method } = req;
    const { conversationId, messageId } = req.query;

    try {
        switch (method) {
            case 'GET':
                // Load messages for a specific conversation
                if (conversationId) {
                    const { data, error } = await supabase
                        .from('messages')
                        .select(`
              *,
              generations (
                *
              )
            `)
                        .eq('conversation_id', conversationId)
                        .order('created_at', { ascending: true });

                    if (error) throw error;
                    return res.status(200).json({ ok: true, data });
                }

                // Load specific generation context for a message
                if (messageId) {
                    const { data, error } = await supabase
                        .from('generations')
                        .select('*')
                        .eq('message_id', messageId)
                        .single();
                    if (error) throw error;
                    return res.status(200).json({ ok: true, data });
                }

                return res.status(400).json({ ok: false, error: 'Missing conversationId or messageId' });

            default:
                res.setHeader('Allow', ['GET']);
                return res.status(405).json({ ok: false, error: `Method ${method} Not Allowed` });
        }
    } catch (error: any) {
        if (error.code === 'PGRST116') {
            // Supabase not found single row
            return res.status(404).json({ ok: false, error: 'Not found' });
        }
        console.error(`❌ [BACKEND ERROR] /api/messages [${method}]:`, error);
        return res.status(500).json({ ok: false, error: error.message || 'Internal Server Error' });
    }
}
