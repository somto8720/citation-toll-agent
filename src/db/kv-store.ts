/**
 * Persistent store using Vercel KV (Redis) in production,
 * falling back to the in-memory dbStore in local dev.
 */

import { dbStore } from './schema';

// Dynamically require @vercel/kv so the app still works without it
let kv: any = null;
try {
    if (process.env.KV_REST_API_URL) {
        kv = require('@vercel/kv').kv;
    }
} catch (_) {
    // local dev
}

const KV_KEY = 'ctl:db_store';

export async function persistStore() {
    if (!kv) return; 
    try {
        await kv.set(KV_KEY, dbStore);
        console.log(`[KV] Persisted full dbStore to KV`);
    } catch (e: any) {
        console.error('[KV] persistStore failed:', e.message);
    }
}

export async function hydrateDbFromKV() {
    if (!kv) return;
    try {
        const persisted: any = await kv.get(KV_KEY);
        if (persisted) {
            if (persisted.articles) dbStore.articles = persisted.articles;
            if (persisted.citations) dbStore.citations = persisted.citations;
            if (persisted.earnings) dbStore.earnings = persisted.earnings;
            if (persisted.price_adjustments) dbStore.price_adjustments = persisted.price_adjustments;
            console.log(`[KV] Hydrated dbStore from KV`);
        }
    } catch (e: any) {
        console.error('[KV] hydrateDbFromKV failed:', e.message);
    }
}
