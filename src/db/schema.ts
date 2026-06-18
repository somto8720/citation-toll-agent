// In-Memory Data Store for Vercel Serverless Environment
// Note: In a production Vercel environment, this should be replaced with Vercel Postgres or Vercel KV.

export const dbStore = {
    articles: [
        {
            id: 'art_101',
            title: 'The Future of Agentic Workflows in Web3',
            source_url: 'https://blog.example.com/agentic-workflows',
            content: 'AI agents are moving from simple conversational interfaces to autonomous actors capable of managing their own wallets. By utilizing nanopayments, an agent can pay for inference, data scraping, and API access seamlessly across the internet.',
            creator_wallet: '0xABC123CreatorWallet',
            current_price: 0.005,
            base_price: 0.005,
            created_at: new Date().toISOString()
        },
        {
            id: 'art_102',
            title: 'Solving the AI Copyright Dilemma with x402',
            source_url: 'https://news.example.com/ai-copyright',
            content: 'As LLMs scrape the web, creators are left uncompensated. The x402 protocol introduces a standardized Payment Required header that allows machines to instantly negotiate and settle micro-royalties before ingesting copyrighted material.',
            creator_wallet: '0xDEF456CreatorWallet',
            current_price: 0.010,
            base_price: 0.010,
            created_at: new Date().toISOString()
        },
        {
            id: 'art_103',
            title: 'Nanopayments: The End of Subscription Fatigue',
            source_url: 'https://tech.example.com/end-of-subscriptions',
            content: 'Instead of paying $10/month for 15 different publications, nanopayments allow readers (and their AI assistants) to pay exactly $0.02 per article read. This streaming money architecture is made possible by high-throughput blockchains.',
            creator_wallet: '0x789GHICreatorWallet',
            current_price: 0.002,
            base_price: 0.002,
            created_at: new Date().toISOString()
        }
    ] as any[],
    citations: [] as any[],
    earnings: [] as any[],
    price_adjustments: [] as any[]
};

export function initDb() {
    console.log('Initialized In-Memory Database for Vercel Serverless Edge.');
}
