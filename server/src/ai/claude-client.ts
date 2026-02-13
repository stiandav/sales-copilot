import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

type StreamCallback = (chunk: string) => void;
type CompleteCallback = (fullText: string, inputTokens: number, outputTokens: number) => void;

export class ClaudeClient {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: config.anthropicApiKey,
    });
  }

  async streamCompletion(
    systemPrompt: string,
    userMessage: string,
    onChunk: StreamCallback,
    onComplete: CompleteCallback
  ): Promise<void> {
    let fullText = '';

    try {
      const stream = this.client.messages.stream({
        model: config.claude.model,
        max_tokens: config.claude.maxTokens,
        temperature: config.claude.temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      stream.on('text', (text) => {
        fullText += text;
        onChunk(text);
      });

      const finalMessage = await stream.finalMessage();
      const inputTokens = finalMessage.usage?.input_tokens || 0;
      const outputTokens = finalMessage.usage?.output_tokens || 0;
      onComplete(fullText, inputTokens, outputTokens);
    } catch (error) {
      console.error('Claude streaming error:', error);
      onComplete(fullText || 'Unable to generate adapted script.', 0, 0);
    }
  }
}
