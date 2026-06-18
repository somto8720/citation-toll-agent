import express from 'express';
import { insertArticle } from '../../db/queries';

const router = express.Router();

router.post('/ingest', (req, res) => {
    // Basic API Key protection for ingestion
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.INGEST_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id, title, content, sourceUrl, creatorWallet } = req.body;

    if (!id || !title || !content || !creatorWallet) {
        return res.status(400).json({ error: 'Missing required fields: id, title, content, creatorWallet' });
    }

    try {
        insertArticle(id, title, content, sourceUrl || '', creatorWallet);
        res.json({ success: true, message: `Article ${id} ingested.` });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
