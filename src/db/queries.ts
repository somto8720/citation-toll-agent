import { dbStore } from './schema';

export function getCatalogArticles() {
    return dbStore.articles.map(a => ({
        id: a.id,
        title: a.title,
        preview: a.preview,
        current_price: a.current_price,
        created_at: a.created_at
    }));
}

export function getArticleById(id: string) {
    return dbStore.articles.find(a => a.id === id);
}

export function logCitation(articleId: string, consumerFingerprint: string, consumerType: string, pricePaid: number, referrer: string) {
    dbStore.citations.push({
        id: Date.now(),
        article_id: articleId,
        consumer_fingerprint: consumerFingerprint,
        consumer_type: consumerType,
        price_paid: pricePaid,
        referrer: referrer,
        accessed_at: new Date().toISOString()
    });
    
    // Also record earnings
    const article = getArticleById(articleId);
    if (article) {
        const creatorWallet = article.creator_wallet;
        // Assume 85% to creator
        const amount = pricePaid * 0.85; 
        dbStore.earnings.push({
            id: Date.now(),
            creator_wallet: creatorWallet,
            article_id: articleId,
            amount: amount,
            paid_out: 0,
            earned_at: new Date().toISOString()
        });
    }
    return Date.now();
}

export function insertArticle(id: string, title: string, content: string, sourceUrl: string, creatorWallet: string) {
    const preview = content.length > 200 ? content.substring(0, 200) + '...' : content;
    const newArticle = {
        id, title, content, preview, source_url: sourceUrl, creator_wallet: creatorWallet,
        current_price: 0.005, min_price: 0.001, max_price: 0.05,
        created_at: new Date().toISOString()
    };
    dbStore.articles.push(newArticle);
    return newArticle;
}

export function updateArticlePrice(id: string, newPrice: number) {
    const article = dbStore.articles.find(a => a.id === id);
    if (article) {
        article.current_price = newPrice;
    }
}

export function getStats() {
    const totalCitations = dbStore.citations.length;
    const totalEarned = dbStore.earnings.reduce((sum, e) => sum + e.amount, 0);
    return { citations: totalCitations, totalEarned: totalEarned };
}
