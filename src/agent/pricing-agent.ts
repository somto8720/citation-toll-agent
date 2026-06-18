import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { dbStore } from '../db/schema';
import { updateArticlePrice } from '../db/queries';
import dotenv from 'dotenv';

dotenv.config();

// The LLM that powers the pricing agent
const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.2, // Low temperature for consistent reasoning
    openAIApiKey: process.env.OPENAI_API_KEY
});

const pricingPrompt = PromptTemplate.fromTemplate(`
You are an autonomous pricing agent for an x402-powered content monetization layer.
Your goal is to maximize creator revenue by dynamically adjusting article prices based on demand signals.

Current Article: {title}
Current Price: ${'{current_price}'}
Minimum Price: ${'{min_price}'}
Maximum Price: ${'{max_price}'}

Demand Signals snapshot (last 24 hours):
- Total Citations: {citations_24h}
- Unique AI Consumers: {unique_consumers_24h}
- Velocity (citations per hour): {velocity}
- Content Age (days): {age_days}

Pricing Rules:
1. If velocity is high (> 5/hr), increase price by 10-20% to capture demand.
2. If citations are low and age > 7 days, decrease price by 5-10% to stimulate demand.
3. If unique consumers are high (spreading fast), increase price.
4. Never exceed Max Price or go below Min Price.
5. If signals are flat/normal, keep the price the same.

Analyze the demand signals, explain your reasoning step-by-step, and output the NEW PRICE as a float.
Respond with JSON matching this schema:
{{
  "reasoning": "your step by step explanation",
  "newPrice": 0.005
}}
`);

export async function runPricingAgent() {
    console.log('Pricing agent woke up. Analyzing demand...');

    const articles = dbStore.articles;
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const article of articles) {
        // Calculate demand signals from DB Store
        const recentCitations = dbStore.citations.filter(c => 
            c.article_id === article.id && new Date(c.accessed_at) >= oneDayAgo
        );
        const citations_24h = recentCitations.length;
        const unique_consumers_24h = new Set(recentCitations.map(c => c.consumer_fingerprint)).size;
        
        const velocity = citations_24h / 24.0;
        const age_days = (now.getTime() - new Date(article.created_at).getTime()) / (1000 * 60 * 60 * 24);

        const inputs = {
            title: article.title,
            current_price: article.current_price,
            min_price: article.min_price,
            max_price: article.max_price,
            citations_24h: citations_24h,
            unique_consumers_24h: unique_consumers_24h,
            velocity: velocity.toFixed(2),
            age_days: Math.floor(age_days)
        };

        try {
            const chain = pricingPrompt.pipe(model);
            const response = await chain.invoke(inputs);
            
            let content = response.content as string;
            if (content.startsWith('\`\`\`json')) {
                content = content.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '');
            }
            
            const result = JSON.parse(content);
            const newPrice = Math.max(article.min_price, Math.min(article.max_price, result.newPrice));

            if (newPrice !== article.current_price) {
                console.log(`[Pricing Agent] Adjusting ${article.id}: ${article.current_price} -> ${newPrice}`);
                updateArticlePrice(article.id, newPrice);

                dbStore.price_adjustments.push({
                    id: Date.now(),
                    article_id: article.id,
                    old_price: article.current_price,
                    new_price: newPrice,
                    reasoning: result.reasoning,
                    signals: JSON.stringify(inputs),
                    adjusted_at: new Date().toISOString()
                });
            }

        } catch (e: any) {
            console.error(`Error processing pricing for article ${article.id}:`, e.message);
        }
    }
    
    console.log('Pricing agent finished.');
}
