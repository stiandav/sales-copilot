import { ConversationTurn } from '../types';
import { config } from '../config';

export class ConversationContext {
  private turns: ConversationTurn[] = [];

  addTurn(role: 'prospect' | 'rep', content: string): void {
    this.turns.push({
      role,
      content,
      timestamp: Date.now(),
    });

    // Keep rolling window
    if (this.turns.length > config.session.maxConversationTurns) {
      this.turns = this.turns.slice(-config.session.maxConversationTurns);
    }
  }

  getTurns(): ConversationTurn[] {
    return [...this.turns];
  }

  getRecentContext(maxTurns?: number): ConversationTurn[] {
    const limit = maxTurns || config.session.maxConversationTurns;
    return this.turns.slice(-limit);
  }

  clear(): void {
    this.turns = [];
  }

  estimateTokens(): number {
    // Rough estimate: ~4 chars per token
    const totalChars = this.turns.reduce((sum, t) => sum + t.content.length, 0);
    return Math.ceil(totalChars / 4);
  }
}
