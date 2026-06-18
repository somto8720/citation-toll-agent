import { dbStore } from '../db/schema';
import dotenv from 'dotenv';

dotenv.config();

const PLATFORM_FEE_PERCENTAGE = 0.15; // 15% platform fee
const MIN_PAYOUT_THRESHOLD = 0.10; // Trigger payout when creator has $0.10+

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
        if (total_unpaid >= MIN_PAYOUT_THRESHOLD) {
            console.log(`Creator ${wallet} crossed threshold with $${total_unpaid}. Initiating App Kit Send...`);

            try {
                // Mock execution of App Kit Send on Arc Testnet
                const mockTxHash = `0x${Math.random().toString(16).slice(2)}...`;
                console.log(`Payout successful. TxHash: ${mockTxHash}`);

                // Mark as paid
                for (const e of dbStore.earnings) {
                    if (e.creator_wallet === wallet && e.paid_out === 0) {
                        e.paid_out = 1;
                        e.payout_tx_hash = mockTxHash;
                    }
                }

            } catch (e: any) {
                console.error(`Failed to send payout to ${wallet}:`, e.message);
            }
        }
    }
}
