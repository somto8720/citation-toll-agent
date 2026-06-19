const { execSync } = require('child_process');
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env'));

const keysToPush = [
    'CIRCLE_API_KEY',
    'CIRCLE_ENTITY_SECRET',
    'AGENT_WALLET_ID',
    'USDC_TOKEN_ID'
];

for (const key of keysToPush) {
    const value = envConfig[key];
    if (value) {
        console.log(`Pushing ${key} to Vercel production...`);
        try {
            // Remove the variable if it exists to avoid prompts
            try {
                execSync(`npx vercel env rm ${key} production --yes`, { stdio: 'ignore' });
            } catch (e) {
                // Ignore if it doesn't exist
            }
            
            // Add the variable via echo pipe. Windows cmd syntax.
            execSync(`npx vercel env add ${key} production`, {
                input: value,
                stdio: ['pipe', 'inherit', 'inherit']
            });
            console.log(`Successfully added ${key}`);
        } catch (error) {
            console.error(`Failed to add ${key}:`, error.message);
        }
    }
}

console.log('Finished pushing env vars to Vercel!');
