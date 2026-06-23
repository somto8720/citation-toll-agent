import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from '../src/db/schema';
import { hydrateFromRSS } from '../src/attribution/rss-ingest';
import { requirePayment } from '../src/server/middleware/gateway';
import ingestRouter from '../src/server/routes/ingest';
import { getCatalogArticles, getArticleById, getStats, logCitation, getLogs, insertArticle } from '../src/db/queries';
import { hydrateDbFromKV, persistArticle } from '../src/db/kv-store';
import Parser from 'rss-parser';
import axios from 'axios';
import crypto from 'crypto';

// Configure parser with browser-like headers so Medium/Substack don't 403 us
const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, application/atom+xml, text/xml, */*'
    },
    timeout: 8000,
});

// Fetch a feed with fallback to RSS2JSON proxy (needed on Vercel edge)
async function fetchFeed(feedUrl: string) {
    try {
        return await parser.parseURL(feedUrl);
    } catch (directError: any) {
        console.log(`Direct fetch failed (${directError.message}), trying RSS2JSON proxy...`);
        // Use public RSS2JSON proxy as fallback
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
        const { data } = await axios.get(proxyUrl, { timeout: 8000 });
        if (data.status !== 'ok') throw new Error('RSS proxy also failed: ' + data.message);
        // Map rss2json format back to rss-parser format
        return {
            title: data.feed?.title || '',
            items: (data.items || []).map((item: any) => ({
                title: item.title,
                link: item.link,
                content: item.content,
                contentSnippet: item.description?.replace(/<[^>]+>/g, '').substring(0, 300)
            }))
        };
    }
}

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    // Disable all caching for API endpoints
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Disable caching for all endpoints so live dashboard updates aren't frozen by Vercel CDN
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Initialize DB + hydrate from KV (persisted publisher articles)
initDb();
let isHydrated = false;
async function coldStart() {
    await hydrateDbFromKV();  // Load persisted publisher articles first
    // Note: Dummy data seeding via hydrateFromRSS() is disabled for production
    isHydrated = true;
}

// Routes
app.use('/api', ingestRouter);

// 1. Free Catalog Endpoint
app.get('/api/catalog', async (req, res) => {
    try {
        if (!isHydrated) {
            console.log('Performing cold-start hydration...');
            await coldStart();
        } else {
            // If already hot, sync any new articles added by other Vercel instances
            await hydrateDbFromKV();
        }
        const articles = getCatalogArticles();
        res.json({ success: true, articles });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 2. x402 Protected Article Endpoint
app.get('/api/articles/:id', requirePayment, (req, res) => {
    try {
        const article: any = getArticleById(req.params.id);
        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }

        const fingerprint = req.headers['user-agent'] || 'unknown';
        logCitation(article.id, fingerprint, 'browser', article.current_price, req.headers.referer || '');

        res.json({
            success: true,
            article: {
                id: article.id,
                title: article.title,
                content: article.content, // full premium content
                source_url: article.source_url
            }
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 3. Stats & Earnings
app.get('/api/stats', (req, res) => {
    try {
        const stats = getStats();
        res.json({ success: true, stats });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 3.1 Agent Reasoning Logs
app.get('/api/logs', (req, res) => {
    try {
        res.json({ success: true, logs: getLogs() });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 3.2 Publisher Sign Up (RSS Submission)
app.post('/api/articles/submit', async (req, res) => {
    try {
        const { url, arc_wallet } = req.body;
        if (!url || !arc_wallet) {
            return res.status(400).json({ error: 'URL and Arc Wallet are required.' });
        }

        let feedUrl = url.trim();

        // ── Universal Blog Platform RSS Resolver ──────────────────────────────
        // Converts any known blog URL into its canonical RSS feed URL.

        // 1. Medium profile: medium.com/@username
        const mediumProfile = feedUrl.match(/^https?:\/\/medium\.com\/@([\w-]+)\/?$/);
        if (mediumProfile) {
            feedUrl = `https://medium.com/feed/@${mediumProfile[1]}`;
        }

        // 2. Medium publication: medium.com/publication-name
        const mediumPub = feedUrl.match(/^https?:\/\/medium\.com\/([\w-]+)\/?$/);
        if (mediumPub && !feedUrl.includes('/feed/')) {
            feedUrl = `https://medium.com/feed/${mediumPub[1]}`;
        }

        // 3. Substack: username.substack.com  OR  substack.com/@username
        const substackSub = feedUrl.match(/^https?:\/\/([\w-]+)\.substack\.com\/?$/);
        if (substackSub) {
            feedUrl = `https://${substackSub[1]}.substack.com/feed`;
        }
        const substackAt = feedUrl.match(/^https?:\/\/substack\.com\/@([\w-]+)\/?$/);
        if (substackAt) {
            feedUrl = `https://${substackAt[1]}.substack.com/feed`;
        }

        // 4. WordPress.com: username.wordpress.com
        const wpCom = feedUrl.match(/^https?:\/\/([\w-]+)\.wordpress\.com\/?$/);
        if (wpCom) {
            feedUrl = `https://${wpCom[1]}.wordpress.com/feed/`;
        }

        // 5. Self-hosted WordPress / generic blog: append /feed if not already an RSS URL
        //    (heuristic: if the URL is a homepage and has no known feed extension)
        const isBareHomepage = !feedUrl.match(/\.(xml|rss|atom|json)(\?.*)?$/i) && !feedUrl.includes('/feed');
        if (isBareHomepage) {
            // Try WordPress-style /feed first — most common for self-hosted blogs
            feedUrl = feedUrl.replace(/\/?$/, '/feed');
        }

        // 6. Ghost blogs: ghost.io or self-hosted — they use /rss/
        const ghostIo = feedUrl.match(/^https?:\/\/([\w-]+)\.ghost\.io\/?$/);
        if (ghostIo) {
            feedUrl = `https://${ghostIo[1]}.ghost.io/rss/`;
        }

        // 7. Blogger / blogspot: username.blogspot.com
        const blogspot = feedUrl.match(/^https?:\/\/([\w-]+)\.blogspot\.com\/?$/);
        if (blogspot) {
            feedUrl = `https://${blogspot[1]}.blogspot.com/feeds/posts/default?alt=rss`;
        }

        // 8. Hashnode: hashnode.dev or custom domain
        const hashnode = feedUrl.match(/^https?:\/\/([\w-]+)\.hashnode\.dev\/?$/);
        if (hashnode) {
            feedUrl = `https://${hashnode[1]}.hashnode.dev/rss.xml`;
        }

        // 9. Beehiiv: username.beehiiv.com
        const beehiiv = feedUrl.match(/^https?:\/\/([\w-]+)\.beehiiv\.com\/?$/);
        if (beehiiv) {
            feedUrl = `https://${beehiiv[1]}.beehiiv.com/feed`;
        }

        // 10. Dev.to: dev.to/username
        const devTo = feedUrl.match(/^https?:\/\/dev\.to\/([\w-]+)\/?$/);
        if (devTo) {
            feedUrl = `https://dev.to/feed/${devTo[1]}`;
        }

        // 11. If URL already looks like a direct RSS/Atom/XML feed, use it as-is
        const isDirectFeed = feedUrl.match(/\.(xml|rss|atom)(\?.*)?$/i) || feedUrl.includes('/feed') || feedUrl.includes('/rss');
        if (isDirectFeed) {
            // Already a feed URL — use directly
        } else {
            // Final fallback: try to fetch the HTML page and autodiscover the RSS link tag
            try {
                const { data: html } = await axios.get(feedUrl, {
                    timeout: 5000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CitationTollAgent/1.0; +https://citation-toll-agent.vercel.app)' }
                });
                const rssLinkMatch = html.match(/<link[^>]+type="application\/(rss|atom)\+xml"[^>]+href="([^"]+)"/i)
                                  || html.match(/<link[^>]+href="([^"]+)"[^>]+type="application\/(rss|atom)\+xml"/i);
                if (rssLinkMatch) {
                    const discovered = rssLinkMatch[2] || rssLinkMatch[1];
                    // Resolve relative URLs
                    feedUrl = discovered.startsWith('http') ? discovered : new URL(discovered, url).href;
                    console.log(`[RSS Autodiscover] Found feed at: ${feedUrl}`);
                }
            } catch (autodiscoverErr: any) {
                console.log(`[RSS Autodiscover] Could not autodiscover feed: ${autodiscoverErr.message}`);
            }
        }
        // ────────────────────────────────────────────────────────────────────

        console.log(`[Submit] Resolved feed URL: ${feedUrl}`);

        let feed;
        try {
            feed = await fetchFeed(feedUrl);

            // Fallback for specific article URLs: if the feed has 0 items (e.g. WordPress comment feed), try the root domain
            if (!feed.items || feed.items.length === 0) {
                try {
                    const rootFeedUrl = new URL(feedUrl).origin + '/feed';
                    if (rootFeedUrl !== feedUrl && !feedUrl.includes('medium.com')) {
                        const fallbackFeed = await fetchFeed(rootFeedUrl);
                        if (fallbackFeed.items && fallbackFeed.items.length > 0) {
                            feed = fallbackFeed;
                        }
                    }
                } catch (fallbackError) {
                    // Ignore fallback errors
                }
            }
        } catch (feedErr: any) {
            return res.status(400).json({
                error: `Could not fetch RSS feed from "${feedUrl}". Make sure your blog has an RSS feed enabled. Tip: try pasting the direct RSS URL (e.g. yourblog.com/feed or yourblog.com/rss.xml).`
            });
        }

        if (!feed || !feed.items || feed.items.length === 0) {
            return res.status(400).json({ error: 'Found an RSS feed but it contains no articles. If you pasted a specific article link, please use your blog homepage instead (e.g., https://yourblog.com).' });
        }

        // Ingest up to 5 articles to populate the catalog
        let addedCount = 0;
        for (const item of feed.items.slice(0, 5)) {
            if (!item) continue;
            const sourceUrl = item.link || url;
            const stableId = 'rss_' + crypto.createHash('md5').update(sourceUrl).digest('hex').substring(0, 8);

            const newArticle = insertArticle(
                stableId,
                item.title || 'Untitled',
                item.contentSnippet || item.content || 'No content snippet available.',
                sourceUrl,
                arc_wallet
            );
            // Persist to KV so it survives across Vercel serverless instances
            await persistArticle(newArticle);
            addedCount++;
        }

        res.json({ success: true, message: `Successfully registered and monetized ${addedCount} articles.` });
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to process RSS feed: ' + e.message });
    }
});

// 4. Cron Job & Manual Settlement
import { runPricingAgent } from '../src/agent/pricing-agent';
import { processPayouts }  from '../src/revenue/payout';
import { runBuyerAgent }   from '../src/agent/buyer-agent';

app.get('/api/cron/pricing', async (req, res) => {
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        console.log('Unauthenticated cron run');
    }
    await runPricingAgent();
    await processPayouts();
    res.json({ success: true, message: 'Cron job executed' });
});

app.post('/api/payout/force', async (req, res) => {
    try {
        await processPayouts();
        res.json({ success: true, message: 'On-chain settlement triggered for all eligible balances.' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 5. Buyer Agent Demo Endpoint
app.post('/api/demo/buyer-agent', async (req, res) => {
    try {
        const result = await runBuyerAgent();
        res.json({ success: true, ...result });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default app;
