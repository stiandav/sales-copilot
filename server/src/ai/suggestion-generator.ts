import { v4 as uuidv4 } from 'uuid';
import { ObjectionDetector } from './objection-detector';
import { ClaudeClient } from './claude-client';
import { PromptBuilder } from './prompt-builder';
import { ScriptMatcher } from '../scripts/script-matcher';
import { ScriptStore } from '../scripts/script-store';
import { ConversationContext } from '../session/conversation-context';
import { ResultEmitter } from '../websocket/result-emitter';
import { LeadType } from '../types';
import { config } from '../config';

export class SuggestionGenerator {
  private detector: ObjectionDetector;
  private matcher: ScriptMatcher;
  private claude: ClaudeClient;
  private promptBuilder: PromptBuilder;
  private context: ConversationContext;
  private emitter: ResultEmitter;
  private practiceMode: boolean;
  private leadType?: LeadType;

  // Cost tracking
  private claudeCalls = 0;
  private claudeInputTokens = 0;
  private claudeOutputTokens = 0;

  constructor(
    scriptStore: ScriptStore,
    context: ConversationContext,
    emitter: ResultEmitter,
    practiceMode = false,
    leadType?: LeadType
  ) {
    this.detector = new ObjectionDetector(scriptStore);
    this.matcher = new ScriptMatcher(scriptStore);
    this.claude = new ClaudeClient();
    this.promptBuilder = new PromptBuilder();
    this.context = context;
    this.emitter = emitter;
    this.practiceMode = practiceMode;
    this.leadType = leadType;
  }

  async processProspectUtterance(text: string): Promise<void> {
    const startTime = Date.now();

    // Cost control: skip short utterances
    if (text.trim().length < config.session.minProspectChars) {
      return;
    }

    // Step 1: Detect objection (~1ms)
    const objection = this.detector.detect(text);
    if (!objection) return;

    // Step 2: Match to script
    const match = this.matcher.match(objection);
    if (!match) return;

    const suggestionId = uuidv4();
    const detectionLatency = Date.now() - startTime;

    // Step 3: Send base script immediately
    this.emitter.sendSuggestionStart(
      suggestionId,
      match.script.category,
      match.script.label,
      match.script.script,
      objection.triggerText,
      detectionLatency
    );

    // Practice mode: skip Claude, send base script as the "adapted" version
    if (this.practiceMode) {
      this.emitter.sendSuggestionComplete(
        suggestionId,
        match.script.script,
        Date.now() - startTime
      );
      return;
    }

    // Step 4: Build prompt and stream Claude's adaptation
    const { system, user } = this.promptBuilder.buildAdaptationPrompt(
      match.script,
      objection,
      this.context.getTurns(),
      this.leadType
    );

    await this.claude.streamCompletion(
      system,
      user,
      (chunk) => {
        this.emitter.sendSuggestionChunk(suggestionId, chunk);
      },
      (fullScript, inputTokens, outputTokens) => {
        const totalLatency = Date.now() - startTime;
        this.emitter.sendSuggestionComplete(suggestionId, fullScript, totalLatency);

        // Track costs
        this.claudeCalls++;
        this.claudeInputTokens += inputTokens;
        this.claudeOutputTokens += outputTokens;
        this.emitter.sendCostUpdate(this.getCostBreakdown());
      }
    );
  }

  getCostBreakdown() {
    const claudeInputCost = (this.claudeInputTokens / 1_000_000) * config.costRates.claudeInputPerMTok;
    const claudeOutputCost = (this.claudeOutputTokens / 1_000_000) * config.costRates.claudeOutputPerMTok;
    const estimatedCostCents = Math.round((claudeInputCost + claudeOutputCost) * 100);

    return {
      deepgramMinutes: 0,
      claudeCalls: this.claudeCalls,
      claudeInputTokens: this.claudeInputTokens,
      claudeOutputTokens: this.claudeOutputTokens,
      estimatedCostCents,
    };
  }
}
