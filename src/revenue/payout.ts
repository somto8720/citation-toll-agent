import { dbStore } from '../db/schema';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import dotenv from 'dotenv';

dotenv.config();

const PLATFORM_FEE_PERCENTAGE = 0.15; // 15% platform fee
const MIN_PAYOUT_THRESHOLD = 0.001; // Trigger payout when creator has $0.001+

// Initialize Circle SDK
const circleClient = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY || 'MISSING_API_KEY',
    entitySecret: process.env.CIRCLE_ENTITY_SECRET || 'MISSING_SECRET'
});

export async function processPayouts() {
    console.log('Running payout processor...');

    const pendingEarnings = dbStore.earnings.filter(e => e.paid_out === 0);
    
    // Group by creator_wallet
    const balances: Record<string, number> = {};
    for (const e of pendingEarnings) {
        balances[e.creator_wallet] = (balances[e.creator_wallet] || 0) + e.amount;
    }

    for (const wallet in balances) {
        const total_unpaid = balances[wallet];
        if (!total_unpaid || total_unpaid < MIN_PAYOUT_THRESHOLD) continue;

        console.log(`Creator ${wallet} crossed threshold with $${total_unpaid}. Initiating App Kit Send...`);

        try {
            let txHash = '';
            
            // If we have real keys, execute on Arc Testnet via Circle SDK
            if (process.env.CIRCLE_API_KEY) {
                const response = await circleClient.createTransaction({
                    walletId: process.env.AGENT_WALLET_ID || '',
                    tokenId: process.env.USDC_TOKEN_ID || '',
                    destinationAddress: wallet,
                    amount: [total_unpaid.toString()],
                    fee: {
                        type: 'level',
                        config: {
                            feeLevel: 'MEDIUM'
                        }
                    }
                });
                txHash = response.data?.id || 'pending';
                console.log(`Live Circle SDK Payout successful. TxID: ${txHash}`);
            } else {
                // Fallback simulation for local demo without API keys
                txHash = `sim_0x${Math.random().toString(16).slice(2)}...`;
                console.log(`Simulated Payout successful. TxHash: ${txHash}`);
            }

                // Mark as paid
                for (const e of dbStore.earnings) {
                    if (e.creator_wallet === wallet && e.paid_out === 0) {
                        e.paid_out = 1;
                        e.payout_tx_hash = txHash;
                    }
                }

            } catch (e: any) {
                console.error(`Failed to send payout to ${wallet}:`, e.message);
                if (e.response?.data) {
                    console.error('Circle SDK Error details:', e.response.data);
                    throw new Error(`Circle API Error: ${JSON.stringify(e.response.data)}`);
                }
                throw e;
            }
    }
}
