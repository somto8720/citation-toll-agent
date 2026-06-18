/**
 * Traffic Bots
 * 
 * Run this script locally or on a free server (e.g. Render/Railway)
 * to continuously simulate diverse AI agent traffic hitting your endpoints.
 * This ensures your LangChain Pricing Agent has real velocity data to analyze!
 */

const API_URL = process.env.API_URL || 'https://citation-toll-agent.vercel.app';

// Different personas with different behaviors
const BOTS = [
    { name: 'NewsSummarizerBot', intervalMs: 15000 },  // Very aggressive, reads every 15s
    { name: 'MarketSentimentAI', intervalMs: 45000 },  // Moderate, reads every 45s
    { name: 'ArchivalCrawler',   intervalMs: 120000 }  // Slow, reads every 2m
];

async function hitEndpoint(botName) {
    try {
        // 1. Fetch catalog to see what's available
        const catalogRes = await fetch(`${API_URL}/api/catalog`);
        if (!catalogRes.ok) return;
        const catalogData = await catalogRes.json();
        
        if (!catalogData.articles || catalogData.articles.length === 0) {
            console.log(`[${botName}] Catalog empty, skipping...`);
            return;
        }

        // 2. Pick a random article to read
        const randomArticle = catalogData.articles[Math.floor(Math.random() * catalogData.articles.length)];
        
        // 3. Request the article with a mock payment token
        const articleRes = await fetch(`${API_URL}/api/articles/${randomArticle.id}`, {
            headers: {
                'User-Agent': botName,
                'x-payment-token': 'mock-paid-token-' + Date.now()
            }
        });

        if (articleRes.ok) {
            console.log(`[${botName}] Successfully paid toll and read: "${randomArticle.title}"`);
        } else {
            console.log(`[${botName}] Encountered issue reading article. Status: ${articleRes.status}`);
        }
    } catch (e) {
        console.error(`[${botName}] Error: ${e.message}`);
    }
}

// Start the bots
console.log(`Starting ${BOTS.length} Traffic Bots against ${API_URL}...`);
for (const bot of BOTS) {
    console.log(`- Deployed ${bot.name} (Frequency: ${bot.intervalMs}ms)`);
    setInterval(() => hitEndpoint(bot.name), bot.intervalMs);
    
    // Initial hit
    hitEndpoint(bot.name);
}
