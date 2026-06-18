import dotenv from 'dotenv';

dotenv.config();

export const requirePayment = (req: any, res: any, next: any) => {
    // 1. Check for x-payment-token
    const paymentToken = req.headers['x-payment-token'];

    if (!paymentToken) {
        // 2. Mock 402 Negotiation
        return res.status(402).json({
            error: 'Payment Required',
            x402_gateway: 'https://gateway.arc.network',
            price: '0.005 USDC',
            currency: 'USDC'
        });
    }

    // 3. Verify token (Mocked)
    console.log(`[Gateway] Verified payment token: ${paymentToken}`);

    // Proceed to serve premium content
    next();
};
