import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import dotenv from 'dotenv';

dotenv.config();

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});

async function main() {
  console.log("Creating Wallet Set...");
  const walletSetResponse = await client.createWalletSet({
    name: "CTL Agent Master Wallet Set",
  });

  const walletSet = walletSetResponse.data?.walletSet;
  if (!walletSet?.id) {
    throw new Error("Wallet set creation failed: no ID returned");
  }

  console.log(`Wallet Set created with ID: ${walletSet.id}`);
  console.log("Creating Arc Testnet Wallet...");

  const walletResponse = await client.createWallets({
    walletSetId: walletSet.id,
    blockchains: ["ARC-TESTNET"],
    count: 1,
    accountType: "EOA", 
  });

  const wallet = walletResponse.data?.wallets?.[0];
  if (!wallet) {
    throw new Error("Wallet creation failed");
  }

  console.log("\n================================================");
  console.log("SUCCESS! Here are your Wallet details:");
  console.log("================================================");
  console.log(`AGENT_WALLET_ID="${wallet.id}"`);
  console.log(`Address: ${wallet.address}`);
  console.log("================================================\n");
  console.log("1. Add the AGENT_WALLET_ID to your .env file.");
  console.log(`2. Go to the Circle Faucet and fund ${wallet.address} with testnet USDC.`);
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
