import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import dotenv from 'dotenv';

dotenv.config();

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});

async function main() {
  const walletId = process.env.AGENT_WALLET_ID;
  if (!walletId) throw new Error("Missing AGENT_WALLET_ID");

  console.log(`Checking balance for Wallet ${walletId}...`);
  const balancesResponse = await client.getWalletTokenBalance({
    id: walletId,
  });

  const tokenBalances = balancesResponse.data?.tokenBalances || [];
  if (tokenBalances.length === 0) {
    console.log("No tokens found yet. The faucet transaction might still be confirming.");
    return;
  }

  // Find USDC or any token with balance > 0
  const usdcToken = tokenBalances.find(t => t.token.symbol === 'USDC' || parseFloat(t.amount) > 0);
  
  if (usdcToken) {
    const tokenId = usdcToken.token.id;
    console.log(`Found USDC! Balance: ${usdcToken.amount}`);
    console.log(`Token ID: ${tokenId}`);

    // Update .env
    const envContent = readFileSync(".env", "utf8");
    if (envContent.includes("USDC_TOKEN_ID=")) {
        const newEnv = envContent.replace(/USDC_TOKEN_ID=.*/g, `USDC_TOKEN_ID="${tokenId}"`);
        writeFileSync(".env", newEnv);
    } else {
        appendFileSync(".env", `\nUSDC_TOKEN_ID="${tokenId}"\n`);
    }
    console.log("Successfully injected USDC_TOKEN_ID into .env!");
  } else {
    console.log("Tokens found, but none match USDC.");
  }
}

main().catch(console.error);
