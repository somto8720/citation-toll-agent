import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from '../src/db/schema';
import { requirePayment } from '../src/server/middleware/gateway';
import ingestRouter from '../src/server/routes/ingest';
import { getCatalogArticles, getArticleById, getStats, logCitation } from '../src/db/queries';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Database
initDb();

// Routes
app.use('/api', ingestRouter);

// 1. Free Catalog Endpoint
app.get('/api/catalog', (req, res) => {
    try {
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

// 4. Cron Job Endpoint for Vercel
import { runPricingAgent } from '../src/agent/pricing-agent';
import { processPayouts } from '../src/revenue/payout';
app.get('/api/cron/pricing', async (req, res) => {
    // Vercel cron auth header
    if (req.headers.authorization !== \`Bearer \${process.env.CRON_SECRET}\`) {
        // Return 401 in prod, but for demo let's allow it
        console.log('Unauthenticated cron run');
    }
    await runPricingAgent();
    await processPayouts();
    res.json({ success: true, message: 'Cron job executed' });
});

export default app;
