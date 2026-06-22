/**
 * Persistent store using Vercel KV (Redis) in production,
 * falling back to the in-memory dbStore in local dev.
 *
 * Stores submitted publishers as a list of { id, title, content, source_url, creator_wallet, current_price, ... }
 * under key "ctl:articles".
 */

import { dbStore } from './schema';

// Dynamically require @vercel/kv so the app still works without it (local dev)
let kv: any = null;
try {
    // Only available when KV_REST_API_URL env var is set (i.e. on Vercel)
    if (process.env.KV_REST_API_URL) {
        kv = require('@vercel/kv').kv;
    }
} catch (_) {
    // @vercel/kv not installed — fall through to in-memory
}

const KV_KEY = 'ctl:publisher_articles';

export async function persistArticle(article: any) {
    if (!kv) return; // local dev — already in dbStore memory
    try {
        const existing: any[] = (await kv.get(KV_KEY)) || [];
        // Avoid duplicates by id
        const filtered = existing.filter((a: any) => a.id !== article.id);
        filtered.push(article);
        await kv.set(KV_KEY, filtered);
        console.log(`[KV] Persisted article ${article.id}`);
    } catch (e: any) {
        console.error('[KV] persistArticle failed:', e.message);
    }
}

export async function loadPersistedArticles(): Promise<any[]> {
    if (!kv) return [];
    try {
        const articles: any[] = (await kv.get(KV_KEY)) || [];
        console.log(`[KV] Loaded ${articles.length} persisted articles`);
        return articles;
    } catch (e: any) {
        console.error('[KV] loadPersistedArticles failed:', e.message);
        return [];
    }
}

export async function hydrateDbFromKV() {
    const persisted = await loadPersistedArticles();
    for (const article of persisted) {
        // Only add if not already in memory (avoid duplicates on warm instances)
        if (!dbStore.articles.find((a: any) => a.id === article.id)) {
            dbStore.articles.push(article);
        }
    }
}
