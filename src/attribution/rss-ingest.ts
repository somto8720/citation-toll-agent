import Parser from 'rss-parser';
import crypto from 'crypto';
import { dbStore } from '../db/schema';

const parser = new Parser();

// List of popular RSS feeds to pull in during demo to simulate scale
const TARGET_FEEDS = [
    'https://openai.com/blog/rss.xml',
    'https://vitalik.eth.limo/feed.xml',
    'https://techcrunch.com/feed/'
];

// Mock wallets to assign revenues to
const MOCK_CREATOR_WALLETS = [
    '0x00000000000000000000000000000000000000A1',
    '0x00000000000000000000000000000000000000B2',
    '0x00000000000000000000000000000000000000C3'
];

export async function hydrateFromRSS() {
    console.log('[RSS Ingestor] Starting auto-hydration from RSS feeds...');
    let addedCount = 0;

    for (const feedUrl of TARGET_FEEDS) {
        try {
            const feed = await parser.parseURL(feedUrl);
            
            // Only take the 5 most recent articles per feed so we don't blow up Vercel memory
            const recentItems = feed.items.slice(0, 5);

            for (const item of recentItems) {
                // Generate a stable ID based on the URL
                const sourceUrl = item.link || feedUrl;
                const stableId = 'rss_' + crypto.createHash('md5').update(sourceUrl).digest('hex').substring(0, 8);

                // Check if it's already in the DB (for when running locally or warm starts)
                const exists = dbStore.articles.find(a => a.id === stableId);
                
                if (!exists) {
                    // Assign a random creator wallet from our mock list
                    const randomWallet = MOCK_CREATOR_WALLETS[Math.floor(Math.random() * MOCK_CREATOR_WALLETS.length)];
                    
                    // Base price between 0.005 and 0.020 USDC
                    const randomBasePrice = Math.max(0.005, parseFloat((Math.random() * 0.02).toFixed(3)));

                    dbStore.articles.push({
                        id: stableId,
                        title: item.title || 'Untitled',
                        source_url: sourceUrl,
                        content: item.contentSnippet || item.content || 'No content snippet available.',
                        creator_wallet: randomWallet,
                        current_price: randomBasePrice,
                        base_price: randomBasePrice,
                        created_at: item.isoDate || new Date().toISOString()
                    });
                    addedCount++;
                }
            }
        } catch (error: any) {
            console.error(`[RSS Ingestor] Failed to fetch feed ${feedUrl}:`, error.message);
        }
    }

    console.log(`[RSS Ingestor] Hydration complete. Added ${addedCount} new articles.`);
}
