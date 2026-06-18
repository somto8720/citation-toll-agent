import crypto from 'crypto';

/**
 * Generates a unique fingerprint for a consumer based on their request.
 * In a real environment, you'd use a combination of IP, User-Agent, and potentially TLS fingerprints.
 * 
 * @param req The Express request object
 * @returns A SHA-256 hash representing the consumer fingerprint
 */
export function getConsumerFingerprint(req: any): string {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Create a deterministic hash
    return crypto.createHash('sha256').update(`${ip}-${userAgent}`).digest('hex');
}

/**
 * Attempts to classify the consumer type based on User-Agent heuristics.
 */
export function classifyConsumer(userAgent: string): 'ai_agent' | 'crawler' | 'browser' {
    const ua = userAgent.toLowerCase();
    
    // AI Agents and LLM Crawlers
    if (ua.includes('gptbot') || ua.includes('anthropic') || ua.includes('claude') || ua.includes('langchain') || ua.includes('python-requests')) {
        return 'ai_agent';
    }
    
    // General Crawlers
    if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) {
        return 'crawler';
    }
    
    // Browsers
    return 'browser';
}
