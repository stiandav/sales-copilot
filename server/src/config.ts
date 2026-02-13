import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  deepgramApiKey: process.env.DEEPGRAM_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  apiKey: process.env.API_KEY || '',

  deepgram: {
    model: 'nova-3',
    sampleRate: 16000,
    channels: 1,
    encoding: 'linear16' as const,
    interimResults: true,
    utteranceEndMs: 1000,
    vadEvents: true,
    punctuate: true,
    smartFormat: true,
  },

  claude: {
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 512,
    temperature: 0.3,
  },

  session: {
    maxConversationTurns: 10,
    maxContextTokens: 2000,
    suggestionDebounceMs: 500,
  },
};
