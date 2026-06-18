import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import fetch from 'node-fetch';
// import { GatewayClient } from '@circle-fin/x402-batching';
import dotenv from 'dotenv';

dotenv.config();

const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY
});

// Mocked GatewayClient for demonstration without valid API keys
const gatewayClient = {
    payAndFetch: async (url: string) => {
        console.log(`[Consumer Agent] Negotiating x402 payment for ${url}...`);
        
        // Simulating the 402 flow
        // 1. Fetch -> receives 402 Payment Required with x-payment-token
        // 2. Client signs EIP-3009 transfer
        // 3. Client re-requests with payment token
        
        console.log(`[Consumer Agent] Payment successful. Fetching premium content...`);
        
        return {
            json: async () => ({
                success: true,
                article: {
                    id: 'mock-id',
                    title: 'The Future of AI Agents',
                    content: 'This is the full premium content after the Gateway client successfully negotiated the payment and settled via the Arc testnet.',
                    source_url: 'https://example.com'
                }
            })
        };
    }
};

export async function runConsumerDemo() {
    console.log('--- Starting Consumer Agent Demo ---');
    
    // 1. Agent discovers available content via the free catalog
    console.log('[Consumer Agent] Fetching catalog...');
    // In a real run, this fetches from localhost:3000/catalog
    const catalog = [
        { id: '1', title: 'The Future of AI Agents', current_price: 0.005 }
    ];
    console.log(`[Consumer Agent] Found ${catalog.length} articles.`);

    // 2. Agent decides which article to buy based on its goal
    const targetArticle = catalog[0];
    console.log(`[Consumer Agent] Decided to read: "${targetArticle.title}" (Price: $${targetArticle.current_price})`);

    // 3. Agent attempts to fetch the protected endpoint
    const url = `http://localhost:3000/articles/${targetArticle.id}`;
    
    // The GatewayClient abstracts the entire HTTP 402 handshake!
    const response = await gatewayClient.payAndFetch(url);
    const data = await response.json();

    if (data.success) {
        console.log(`[Consumer Agent] Successfully consumed article! Content snippet:`);
        console.log(`"${data.article.content.substring(0, 50)}..."`);
        
        // 4. Agent incorporates the knowledge
        console.log(`[Consumer Agent] Knowledge incorporated. Demo complete.`);
    }
}
