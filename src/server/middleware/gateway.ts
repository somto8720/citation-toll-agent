import { createGatewayMiddleware } from '@circle-fin/x402-batching';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the x402 Gateway Middleware
// This connects to the Circle Arc testnet Gateway contract
export const x402Gateway = createGatewayMiddleware({
    // Circle App Kit/Developer keys (if needed by underlying client configuration)
    apiKey: process.env.CIRCLE_API_KEY || '',
    
    // Testnet configuration for Arc
    network: 'testnet',
    
    // Contract configuration is handled by the x402-batching package internally
    // or passed via environment variables if custom endpoints are needed
    rpcUrl: process.env.RPC_URL || 'https://arc-testnet.rpc.thirdweb.com',
    
    // Gateway settings
    maxBatchSize: 50,
    batchIntervalMs: 60000, // Process payments every minute
});

export const requirePayment = (req: any, res: any, next: any) => {
    // This is a wrapper around the gateway middleware that intercepts
    // requests and issues 402 if they haven't paid or passes them through.
    return x402Gateway(req, res, next);
};
