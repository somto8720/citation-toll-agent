import { dbStore } from '../db/schema';
import { getCatalogArticles, logCitation, updateArticlePrice } from '../db/queries';

/**
 * Buyer Agent — Simulates an autonomous AI researcher that:
 * 1. Browses the Content Catalog
 * 2. Decides which articles are worth reading (deterministic scoring)
 * 3. "Pays" for them by logging citations and earnings
 * 4. Applies citation-velocity surge pricing if the same article is purchased multiple times
 */

const BUYER_FINGERPRINTS = [
    'GPTBot/1.2 (OpenAI Enterprise Research)',
    'ClaudeBot/2.0 (Anthropic Research Crawler)',
    'PerplexityBot/1.0 (Academic Research)',
    'GeminiBot/1.0 (Google DeepMind Research)',
    'BingBot/2.0 (Microsoft AI Research)',
];

const BUYER_REASONS = [
    'Article is highly relevant to current AI safety research query',
    'Source authority matches enterprise data sourcing policy',
    'Content cited in 3 other knowledge graph nodes — purchasing to resolve context',
    'Semantic similarity score 0.87 to target topic cluster — purchasing for RAG pipeline',
    'Article freshness score is high — relevant for real-time market intelligence',
];

export interface BuyerAgentResult {
    purchased: number;
    details: Array<{ articleId: string; title: string; price: number; buyer: string; reasoning: string }>;
}

export async function runBuyerAgent(): Promise<BuyerAgentResult> {
    const articles = getCatalogArticles();
    if (articles.length === 0) return { purchased: 0, details: [] };

    const details: BuyerAgentResult['details'] = [];

    // Deterministically select up to 3 articles to "purchase"
    const selected = articles
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(3, articles.length));

    for (const article of selected) {
        const buyer    = BUYER_FINGERPRINTS[Math.floor(Math.random() * BUYER_FINGERPRINTS.length)]!;
        const reasoning = BUYER_REASONS[Math.floor(Math.random() * BUYER_REASONS.length)]!;

        // Apply citation-velocity surge pricing: if this article has been purchased
        // in the last hour, raise its price by 20% (demand signal)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentHits = dbStore.citations.filter(c =>
            c.article_id === article.id && new Date(c.accessed_at) >= oneHourAgo
        ).length;

        const fullArticle = dbStore.articles.find(a => a.id === article.id);
        if (!fullArticle) continue;

        let priceToPay = fullArticle.current_price;

        if (recentHits >= 2) {
            // Surge: raise price 20%
            const surgedPrice = Math.min(fullArticle.max_price, priceToPay * 1.2);
            updateArticlePrice(article.id, surgedPrice);
            priceToPay = surgedPrice;

            // Log the surge event
            dbStore.price_adjustments.push({
                id: Date.now() + Math.random(),
                article_id: article.id,
                old_price: fullArticle.current_price,
                new_price: surgedPrice,
                reasoning: `Buyer Agent surge pricing: ${recentHits + 1} citations in last hour — demand detected. Price increased 20%.`,
                signals: JSON.stringify({ recentHits, buyer }),
                adjusted_at: new Date().toISOString()
            });
        }

        // Log the citation (this records the earning automatically)
        logCitation(article.id, buyer, 'buyer-agent', priceToPay, 'buyer-agent-demo');

        // Log the purchase event in price_adjustments so it shows in the Intelligence panel
        dbStore.price_adjustments.push({
            id: Date.now() + Math.random() * 100,
            article_id: article.id,
            old_price: priceToPay,
            new_price: priceToPay,
            reasoning: `Buyer Agent [${buyer.split('/')[0]}]: ${reasoning}. Paid $${priceToPay.toFixed(4)}.`,
            signals: JSON.stringify({ buyer, reasoning }),
            adjusted_at: new Date().toISOString()
        });

        details.push({ articleId: article.id, title: article.title, price: priceToPay, buyer, reasoning });
        console.log(`[BuyerAgent] Purchased "${article.title}" for $${priceToPay.toFixed(4)} — ${buyer}`);
    }

    return { purchased: details.length, details };
}
