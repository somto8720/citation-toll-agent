// In-Memory Data Store for Vercel Serverless Environment
// Note: In a production Vercel environment, this should be replaced with Vercel Postgres or Vercel KV.

export const dbStore = {
    articles: [] as any[],
    citations: [] as any[],
    earnings: [] as any[],
    price_adjustments: [] as any[]
};

export function initDb() {
    console.log('Initialized In-Memory Database for Vercel Serverless Edge.');
}
