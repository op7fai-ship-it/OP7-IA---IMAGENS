export const runtime = 'nodejs';

export default async function handler(req: any, res: any) {
    res.setHeader("Content-Type", "application/json");

    if (req.method !== 'GET') {
        return res.status(405).json({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Apenas GET permitido' } });
    }

    return res.status(200).json({
        ok: true,
        api: "working"
    });
}
