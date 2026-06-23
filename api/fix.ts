import { dbStore } from '../src/db/schema';
import { hydrateDbFromKV, persistStore } from '../src/db/kv-store';
import { getCatalogArticles } from '../src/db/queries';

export default async function handler(req: any, res: any) {
    // Dynamically require @vercel/kv so the app still works without it
    let kv: any = null;
    try {
        if (process.env.KV_REST_API_URL) {
            kv = require('@vercel/kv').kv;
        }
    } catch (_) {
        return res.status(500).json({ error: "No KV" });
    }

    if (!kv) return res.status(500).json({ error: "No KV loaded" });

    const KV_KEY = 'ctl:db_store';
    try {
        // Fetch raw string from KV
        const rawData = await kv.get(KV_KEY);
        
        let fixed = false;
        let finalData: any = rawData;

        // If it's a string, it means it's double encoded
        if (typeof rawData === 'string') {
            finalData = JSON.parse(rawData);
            await kv.set(KV_KEY, finalData);
            fixed = true;
        }

        res.status(200).json({
            success: true,
            fixed,
            type: typeof rawData,
            dataPreview: finalData ? Object.keys(finalData) : null
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
}
