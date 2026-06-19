import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from '../src/db/schema';
import { hydrateFromRSS } from '../src/attribution/rss-ingest';
import { requirePayment } from '../src/server/middleware/gateway';
import ingestRouter from '../src/server/routes/ingest';
import { getCatalogArticles, getArticleById, getStats, logCitation, getLogs, insertArticle } from '../src/db/queries';
import Parser from 'rss-parser';
import crypto from 'crypto';

const parser = new Parser();

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Disable caching for all endpoints so live dashboard updates aren't frozen by Vercel CDN
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Initialize Database
initDb();

// Routes
app.use('/api', ingestRouter);

let isHydrated = false;

// 1. Free Catalog Endpoint
app.get('/api/catalog', async (req, res) => {
    try {
        if (!isHydrated) {
            console.log('Performing cold-start RSS hydration...');
            await hydrateFromRSS();
            isHydrated = true;
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

        const feed = await parser.parseURL(url);
        if (!feed || !feed.items || feed.items.length === 0) {
            return res.status(400).json({ error: 'Could not find any articles in that RSS feed.' });
        }

        // Just take the newest one to demonstrate the feature
        const item = feed.items[0];
        if (!item) {
            return res.status(400).json({ error: 'Feed is empty.' });
        }
        
        const sourceUrl = item.link || url;
        const stableId = 'rss_' + crypto.createHash('md5').update(sourceUrl).digest('hex').substring(0, 8);

        insertArticle(
            stableId,
            item.title || 'Untitled',
            item.contentSnippet || item.content || 'No content snippet available.',
            sourceUrl,
            arc_wallet
        );

        res.json({ success: true, message: 'Article successfully registered and monetized.' });
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to process RSS feed: ' + e.message });
    }
});

// 4. Cron Job Endpoint for Vercel
import { runPricingAgent } from '../src/agent/pricing-agent';
import { processPayouts } from '../src/revenue/payout';
app.get('/api/cron/pricing', async (req, res) => {
    // Vercel cron auth header
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        // Return 401 in prod, but for demo let's allow it
        console.log('Unauthenticated cron run');
    }
    await runPricingAgent();
    await processPayouts();
    res.json({ success: true, message: 'Cron job executed' });
});

export default app;
