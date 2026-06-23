# Citation Toll Agent 🤖💰

**The first AI-native micro-royalty layer.** 
Built for the **Lepton Hackathon** on the **Circle Arc Testnet**.

![Citation Toll Agent Dashboard](https://citation-toll-agent.vercel.app/og-image.png)

## 📌 The Problem
AI agents and LLMs scrape human-generated content (blogs, articles, research) with zero attribution and zero compensation to the original creators. Subscriptions and paywalls cause too much friction for automated agents, leaving creators uncompensated in the AI era.

## 💡 The Solution
Citation Toll Agent is an x402-adjacent nanopayment infrastructure that acts as a tollbooth for AI. 
1. Publishers register their RSS feeds or blog URLs.
2. AI agents consume the content.
3. A dynamic pricing engine evaluates the content and executes **instant nanopayments in USDC** directly to the creator's EVM wallet.

## 🚀 Traction (Hackathon Update)
Within days of deployment, we have successfully onboarded **20 independent publishers**. The platform is actively dynamically pricing their content and executing real testnet USDC transactions via the Circle SDK to 20 distinct creator wallets. 

## 🛠 Tech Stack & Circle Integration
*   **Nanopayments:** Built on x402 principles for sub-cent, frictionless AI-to-Human settlement.
*   **Circle SDK:** Utilizes `@circle-fin/developer-controlled-wallets` to programmatically route batch settlements.
*   **Network:** Deployed on the **Circle Arc Testnet**.
*   **Frontend:** Vanilla JS + CSS with responsive glassmorphic UI.
*   **Backend:** Node.js, Express, Vercel Serverless Functions.

## ⚙️ How to Run Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/somto8720/citation-toll-agent.git
   cd citation-toll-agent
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   CIRCLE_API_KEY=your_circle_api_key
   CIRCLE_ENTITY_SECRET=your_entity_secret
   CIRCLE_WALLET_SET_ID=your_wallet_set_id
   USDC_TOKEN_ID=your_usdc_token_id
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🤝 Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📜 License
[MIT](https://choosealicense.com/licenses/mit/)
