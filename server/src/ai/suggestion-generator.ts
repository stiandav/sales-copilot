import { v4 as uuidv4 } from 'uuid';
import { ObjectionDetector } from './objection-detector';
import { ClaudeClient } from './claude-client';
import { PromptBuilder } from './prompt-builder';
import { ScriptMatcher } from '../scripts/script-matcher';
import { ScriptStore } from '../scripts/script-store';
import { ConversationContext } from '../session/conversation-context';
import { ResultEmitter } from '../websocket/result-emitter';

export class SuggestionGenerator {
  private detector: ObjectionDetector;
  private matcher: ScriptMatcher;
  private claude: ClaudeClient;
  private promptBuilder: PromptBuilder;
  private context: ConversationContext;
  private emitter: ResultEmitter;

  constructor(
    scriptStore: ScriptStore,
    context: ConversationContext,
    emitter: ResultEmitter
  ) {
    this.detector = new ObjectionDetector(scriptStore);
    this.matcher = new ScriptMatcher(scriptStore);
    this.claude = new ClaudeClient();
    this.promptBuilder = new PromptBuilder();
    this.context = context;
    this.emitter = emitter;
  }

  async processProspectUtterance(text: string): Promise<void> {
    // Step 1: Detect objection (~10ms)
    const objection = this.detector.detect(text);
    if (!objection) return;

    // Step 2: Match to script
    const match = this.matcher.match(objection);
    if (!match) return;

    const suggestionId = uuidv4();

    // Step 3: Send base script immediately
    this.emitter.sendSuggestionStart(
      suggestionId,
      match.script.category,
      match.script.label,
      match.script.script,
      objection.triggerText
    );

    // Step 4: Build prompt and stream Claude's adaptation
    const { system, user } = this.promptBuilder.buildAdaptationPrompt(
      match.script,
      objection,
      this.context.getTurns()
    );

    await this.claude.streamCompletion(
      system,
      user,
      (chunk) => {
        this.emitter.sendSuggestionChunk(suggestionId, chunk);
      },
      (fullScript) => {
        this.emitter.sendSuggestionComplete(suggestionId, fullScript);
      }
    );
  }
}
