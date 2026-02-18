import OpenAI from 'openai';

// Lazy initialization — only throws at runtime when API is called, not at build time
export function getOpenAI(): OpenAI {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('Missing OPENAI_API_KEY environment variable');
    }
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
