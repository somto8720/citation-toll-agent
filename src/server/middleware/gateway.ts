import dotenv from 'dotenv';

dotenv.config();


export const requirePayment = (req: any, res: any, next: any) => {
    // This is a wrapper around the gateway middleware that intercepts
    // requests and issues 402 if they haven't paid or passes them through.
    return x402Gateway(req, res, next);
};
