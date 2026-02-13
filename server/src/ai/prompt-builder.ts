import { ConversationTurn, ObjectionScript, DetectedObjection, LeadType } from '../types';

const TEAM_CONTEXT = `TEAM BACKGROUND (use naturally when relevant):
- 37 years of combined real estate experience in San Diego County
- $30,000/month marketing budget (digital ads, direct mail, video, social media)
- Dedicated listing specialist on the team who manages every detail of the sale
- Deep knowledge of San Diego neighborhoods: La Jolla, Carlsbad, Encinitas, Del Mar, Rancho Bernardo, Oceanside, Escondido, Chula Vista, and more
- Track record of selling homes others couldn't`;

const LEAD_TYPE_CONTEXT: Record<LeadType, string> = {
  expired: `LEAD TYPE: Expired Listing
- This homeowner's listing recently expired — they tried to sell and it didn't work
- They may be frustrated with their previous agent or the process
- Focus on what went wrong (price, marketing, or condition) and how your approach differs
- Be empathetic about their experience, never badmouth the previous agent
- Emphasize your $30k/month marketing budget and dedicated listing specialist`,

  fsbo: `LEAD TYPE: For Sale By Owner (FSBO)
- This homeowner is trying to sell without an agent to save on commission
- Respect their independence, don't be condescending
- Focus on the net-proceeds math: agent-listed homes sell for more, even after commission
- Emphasize marketing reach, buyer network, and negotiation expertise
- Position yourself as a resource they can use even if they continue FSBO`,

  frbo: `LEAD TYPE: For Rent By Owner (FRBO / Landlord)
- This person is a landlord renting out property in San Diego
- They may be tired of tenant issues, maintenance, or changing landlord regulations
- Focus on the equity they've built and what they could do with it
- Mention 1031 exchange options for tax-advantaged reinvestment
- Be aware of San Diego's tenant protection ordinances and how they affect landlords`,

  'pre-foreclosure': `LEAD TYPE: Pre-Foreclosure
- This homeowner is behind on mortgage payments and may be facing foreclosure
- BE EXTREMELY SENSITIVE AND EMPATHETIC — this is a crisis situation
- Never be pushy or create urgency — they have enough stress
- Focus on helping them understand their options and preserving their equity
- Emphasize confidentiality and that you're there to help, not judge
- San Diego values have risen — they likely have more equity than they think`,
};

const SYSTEM_PROMPT = `You are an expert San Diego County real estate cold calling coach. Your job is to adapt objection-handling scripts to fit the specific conversation context.

${TEAM_CONTEXT}

RULES:
- Output ONLY the adapted script the rep should say. No explanations, headers, or meta-commentary.
- Keep the core strategy and structure of the base script intact.
- Personalize with details from the conversation (names, neighborhood, specific concerns mentioned).
- Match the prospect's tone — if they're casual, be casual. If they're formal, be professional.
- Keep it concise — the rep needs to read this in real-time during a live call.
- Never be pushy or aggressive. Always be respectful and consultative.
- If the prospect mentioned specific details (kids, renovation, timeline), weave them in naturally.
- The script should sound natural, not robotic or overly salesy.
- Reference San Diego-specific market data when relevant.
- Only mention team credentials when it adds credibility to the specific objection.`;

export class PromptBuilder {
  buildAdaptationPrompt(
    baseScript: ObjectionScript,
    objection: DetectedObjection,
    conversationHistory: ConversationTurn[],
    leadType?: LeadType
  ): { system: string; user: string } {
    const historyText = this.formatHistory(conversationHistory);

    let systemPrompt = SYSTEM_PROMPT;
    if (leadType && LEAD_TYPE_CONTEXT[leadType]) {
      systemPrompt += '\n\n' + LEAD_TYPE_CONTEXT[leadType];
    }

    const user = `CONVERSATION SO FAR:
${historyText}

DETECTED OBJECTION: "${objection.triggerText}"
OBJECTION TYPE: ${objection.category}${objection.variant ? ` (${objection.variant})` : ''}

BASE SCRIPT TO ADAPT:
${baseScript.script}

Adapt this script to fit the conversation context above. Output only the words the rep should say next.`;

    return { system: systemPrompt, user };
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
