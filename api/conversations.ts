import { supabase } from './lib/supabase';

export const runtime = 'nodejs';

export default async function handler(req: any, res: any) {
    res.setHeader('Content-Type', 'application/json');

    try {
        const { method } = req;
        const { id, userId } = req.query;

        switch (method) {
            case 'GET':
                if (id) {
                    // Get specific conversation with messages
                    const { data, error } = await supabase
                        .from('conversations')
                        .select(`
              *,
              messages (
                *
              )
            `)
                        .eq('id', id)
                        .single();

                    if (error) throw error;

                    // Sort messages by created_at
                    if (data && data.messages) {
                        data.messages.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                    }

                    return res.status(200).json({ ok: true, data });
                } else if (userId) {
                    // List conversations for user
                    const { data, error } = await supabase
                        .from('conversations')
                        .select('*')
                        .eq('user_id', userId)
                        .order('updated_at', { ascending: false });

                    if (error) throw error;
                    return res.status(200).json({ ok: true, data });
                } else {
                    return res.status(400).json({ ok: false, error: 'Missing userId or id' });
                }

            case 'POST':
                // Create new conversation
                const { user_id, title, prompt } = req.body;
                if (!user_id) {
                    return res.status(400).json({ ok: false, error: 'Missing user_id' });
                }

                // Auto-title logic
                let finalTitle = title;
                if (!finalTitle && prompt) {
                    finalTitle = prompt.split(' ').slice(0, 6).join(' ').replace(/[#@*]/g, '') + (prompt.split(' ').length > 6 ? '...' : '');
                }
                if (!finalTitle) finalTitle = "Nova Arte";

                const { data: newConv, error: createError } = await supabase
                    .from('conversations')
                    .insert([{ user_id, title: finalTitle }])
                    .select()
                    .single();

                if (createError) throw createError;
                return res.status(201).json({ ok: true, data: newConv });

            case 'PATCH':
                // Rename conversation
                if (!id) return res.status(400).json({ ok: false, error: 'Missing conversation id' });

                const { title: newTitle, userId: patchUserId } = req.body;
                if (!newTitle) return res.status(400).json({ ok: false, error: 'Missing new title' });

                const { data: updatedConv, error: updateError } = await supabase
                    .from('conversations')
                    .update({ title: newTitle, updated_at: new Date().toISOString() })
                    .eq('id', id)
                    .select()
                    .single();

                if (updateError) throw updateError;
                return res.status(200).json({ ok: true, data: updatedConv });

            case 'DELETE':
                // Delete conversation
                if (!id) return res.status(400).json({ ok: false, error: 'Missing conversation id' });

                const { error: deleteError } = await supabase
                    .from('conversations')
                    .delete()
                    .eq('id', id);

                if (deleteError) throw deleteError;
                return res.status(200).json({ ok: true });

            default:
                res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
                return res.status(405).json({ ok: false, error: `Method ${method} Not Allowed` });
        }
    } catch (error: any) {
        console.error(`❌ [BACKEND ERROR] /api/conversations:`, error);
        return res.status(500).json({ ok: false, error: error.message || 'Erro interno no servidor' });
    }
}
