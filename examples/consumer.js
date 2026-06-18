/**
 * Example AI Consumer Script
 * 
 * This script demonstrates how an AI agent (e.g. LangChain, AutoGPT)
 * can interact with the Citation Toll Agent x402 paywall.
 */

async function fetchPremiumArticle(articleId) {
    const API_URL = process.env.API_URL || 'https://citation-toll-agent.vercel.app';
    const ARTICLE_URL = `${API_URL}/api/articles/${articleId}`;

    console.log(`[Consumer Agent] Attempting to fetch ${ARTICLE_URL} without a payment token...`);

    // 1. Initial request (will fail with 402)
    const initialResponse = await fetch(ARTICLE_URL, {
        headers: { 'User-Agent': 'Demo-Consumer-Agent-v1' }
    });

    if (initialResponse.status === 402) {
        const errorData = await initialResponse.json();
        console.log(`[Consumer Agent] Received 402 Payment Required!`);
        console.log(`[Consumer Agent] Price demanded: ${errorData.price}`);
        console.log(`[Consumer Agent] Gateway to negotiate with: ${errorData.x402_gateway}`);

        // 2. Mocking the EIP-3009 transfer authorization
        console.log(`[Consumer Agent] Negotiating payment via Circle Gateway...`);
        // In a real scenario, you use the @circle-fin/x402-client to sign a transaction here.
        const mockPaymentToken = 'ey-mock-signed-eip3009-token-12345';

        console.log(`[Consumer Agent] Retrying request with x-payment-token...`);
        
        // 3. Retry with payment token
        const paidResponse = await fetch(ARTICLE_URL, {
            headers: {
                'User-Agent': 'Demo-Consumer-Agent-v1',
                'x-payment-token': mockPaymentToken
            }
        });

        if (paidResponse.ok) {
            const data = await paidResponse.json();
            console.log(`[Consumer Agent] Success! Premium content unlocked:`);
            console.log(`-------------------------------------------------`);
            console.log(data.article.title);
            console.log(data.article.content.substring(0, 150) + '...');
            console.log(`-------------------------------------------------`);
        } else {
            console.error(`[Consumer Agent] Failed to unlock content. Status: ${paidResponse.status}`);
        }
    } else if (initialResponse.ok) {
        console.log(`[Consumer Agent] Article is free! (Unexpected for this demo)`);
    } else {
        console.log(`[Consumer Agent] Failed to fetch. Status: ${initialResponse.status}`);
    }
}

// Run the demo
fetchPremiumArticle('art_101').catch(console.error);
