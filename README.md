# Citation Toll Agent 🪙

**Lepton Agents Hackathon Submission**

The Citation Toll Agent is an **x402-powered content monetization layer** where an autonomous LangChain agent dynamically prices articles based on demand signals, and routes nanopayments instantly to creators on the Arc Testnet.

Live Dashboard: [https://citation-toll-agent.vercel.app](https://citation-toll-agent.vercel.app)

## The Problem
Content creators are actively scraped by AI agents, LLM crawlers, and summarization pipelines, but the creators receive zero compensation or attribution for this value extraction.

## The Solution
By placing a sleek Gateway middleware in front of a content backend, we can enforce **HTTP 402 Payment Required** workflows for machine consumers. 

Our **Citation Toll Agent** sits on top of this layer and observes the network:
- How fast is this article being cited? (Velocity)
- Is it gaining traction among different agents? (Unique Consumers)
- Has the content aged? (Time Decay)

Using these signals, our Pricing Agent autonomously raises or lowers the nanopayment toll (e.g. from 0.005 USDC to 0.012 USDC) to perfectly capture demand, maximizing creator revenue.

## Circle Tooling Used
- **Gateway & x402**: The `@circle-fin/x402-batching` middleware sits at the edge of our API, intercepting unauthorized bots and negotiating the EIP-3009 transfer.
- **Arc Testnet & USDC**: The default settlement rail for our nanopayments.
- **App Kit Send**: Used in our revenue splitter to sweep earnings to the actual creator wallets when they accumulate over $0.10.

## Architecture
- **Backend**: Express.js server hosted on Vercel Serverless Functions.
- **Database**: In-memory Vercel Edge store (scalable to Vercel Postgres).
- **Pricing Agent**: OpenAI `gpt-4o-mini` chained via LangChain, running continuously via Vercel Cron Jobs.
- **Frontend**: A custom HTML/CSS glassmorphism dashboard using Chart.js to visualize revenue velocity.

## Try It Out
1. Visit the Dashboard link to view active prices and Agent reasoning.
2. Hit `/api/catalog` to see the free listing.
3. Use a Gateway Client to hit `/api/articles/1` and negotiate the nanopayment!
