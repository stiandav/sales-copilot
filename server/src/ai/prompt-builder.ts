import { ConversationTurn, ObjectionScript, DetectedObjection } from '../types';

const SYSTEM_PROMPT = `You are an expert real estate cold calling coach. Your job is to adapt objection-handling scripts to fit the specific conversation context.

RULES:
- Output ONLY the adapted script the rep should say. No explanations, headers, or meta-commentary.
- Keep the core strategy and structure of the base script intact.
- Personalize with details from the conversation (names, neighborhood, specific concerns mentioned).
- Match the prospect's tone — if they're casual, be casual. If they're formal, be professional.
- Keep it concise — the rep needs to read this in real-time during a live call.
- Never be pushy or aggressive. Always be respectful and consultative.
- If the prospect mentioned specific details (kids, renovation, timeline), weave them in naturally.
- The script should sound natural, not robotic or overly salesy.`;

export class PromptBuilder {
  buildAdaptationPrompt(
    baseScript: ObjectionScript,
    objection: DetectedObjection,
    conversationHistory: ConversationTurn[]
  ): { system: string; user: string } {
    const historyText = this.formatHistory(conversationHistory);

    const user = `CONVERSATION SO FAR:
${historyText}

DETECTED OBJECTION: "${objection.triggerText}"
OBJECTION TYPE: ${objection.category}${objection.variant ? ` (${objection.variant})` : ''}

BASE SCRIPT TO ADAPT:
${baseScript.script}

Adapt this script to fit the conversation context above. Output only the words the rep should say next.`;

    return { system: SYSTEM_PROMPT, user };
  }

  private formatHistory(turns: ConversationTurn[]): string {
    if (turns.length === 0) return '(No prior conversation)';

    return turns
      .map((turn) => {
        const label = turn.role === 'prospect' ? 'PROSPECT' : 'REP';
        return `${label}: ${turn.content}`;
      })
      .join('\n');
  }
}
