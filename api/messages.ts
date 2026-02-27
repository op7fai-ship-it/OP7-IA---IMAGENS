import { supabase } from './lib/supabase';

export const runtime = 'nodejs';

export default async function handler(req: any, res: any) {
    res.setHeader('Content-Type', 'application/json');

    try {
        const { method } = req;
        const { conversationId, messageId } = req.query;

        switch (method) {
            case 'GET':
                // Load messages for a specific conversation
                if (conversationId) {
                    const { data, error } = await supabase
                        .from('messages')
                        .select(`*, generations (*)`)
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

            case 'POST':
                const payload = req.body;
                if (!payload.conversation_id || !payload.role || !payload.content) {
                    return res.status(400).json({ ok: false, error: 'Missing required fields' });
                }

                const { data: savedMsg, error: saveErr } = await supabase
                    .from('messages')
                    .insert([{
                        conversation_id: payload.conversation_id,
                        user_id: payload.user_id,
                        role: payload.role,
                        content: payload.content,
                        created_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (saveErr) throw saveErr;
                return res.status(200).json({ ok: true, data: savedMsg });

            default:
                res.setHeader('Allow', ['GET', 'POST']);
                return res.status(405).json({ ok: false, error: `Method ${method} Not Allowed` });
        }
    } catch (error: any) {
        if (error.code === 'PGRST116') {
            return res.status(404).json({ ok: false, error: 'Not found' });
        }
        console.error(`❌ [BACKEND ERROR] /api/messages:`, error);
        return res.status(500).json({ ok: false, error: error.message });
    }
}
