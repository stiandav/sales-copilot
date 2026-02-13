import { CHANNEL_PROSPECT, CHANNEL_REP } from '../types';
import { DeepgramClient } from '../transcription/deepgram-client';
import { TranscriptAccumulator } from '../transcription/transcript-accumulator';
import { SuggestionGenerator } from '../ai/suggestion-generator';
import { ConversationContext } from '../session/conversation-context';
import { ResultEmitter } from './result-emitter';
import { ScriptStore } from '../scripts/script-store';
import { SessionStore } from '../session/session-store';
import { config } from '../config';

export class AudioHandler {
  private sessionId: string;
  private resultEmitter: ResultEmitter;
  private prospectStream: DeepgramClient | null = null;
  private repStream: DeepgramClient | null = null;
  private prospectAccumulator: TranscriptAccumulator;
  private repAccumulator: TranscriptAccumulator;
  private suggestionGenerator: SuggestionGenerator;
  private conversationContext: ConversationContext;
  private sessionStore: SessionStore;
  private suggestionDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    sessionId: string,
    resultEmitter: ResultEmitter,
    scriptStore: ScriptStore,
    sessionStore: SessionStore
  ) {
    this.sessionId = sessionId;
    this.resultEmitter = resultEmitter;
    this.sessionStore = sessionStore;
    this.conversationContext = new ConversationContext();
    this.suggestionGenerator = new SuggestionGenerator(
      scriptStore,
      this.conversationContext,
      resultEmitter
    );

    this.prospectAccumulator = new TranscriptAccumulator('prospect');
    this.repAccumulator = new TranscriptAccumulator('rep');
  }

  start(): void {
    this.prospectStream = new DeepgramClient(
      (text, isFinal) => this.onTranscript('prospect', text, isFinal)
    );

    this.repStream = new DeepgramClient(
      (text, isFinal) => this.onTranscript('rep', text, isFinal)
    );

    this.prospectStream.connect();
    this.repStream.connect();
  }

  stop(): void {
    if (this.suggestionDebounceTimer) {
      clearTimeout(this.suggestionDebounceTimer);
    }
    this.prospectStream?.disconnect();
    this.repStream?.disconnect();
    this.prospectStream = null;
    this.repStream = null;
  }

  handleAudioFrame(data: Buffer): void {
    if (data.length < 2) return;

    const channel = data[0];
    const pcmData = data.subarray(1);

    if (channel === CHANNEL_PROSPECT && this.prospectStream) {
      this.prospectStream.sendAudio(pcmData);
    } else if (channel === CHANNEL_REP && this.repStream) {
      this.repStream.sendAudio(pcmData);
    }
  }

  private onTranscript(speaker: 'prospect' | 'rep', text: string, isFinal: boolean): void {
    if (!text.trim()) return;

    if (isFinal) {
      this.resultEmitter.sendTranscriptFinal(speaker, text);

      // Add to conversation context
      this.conversationContext.addTurn(speaker, text);

      // Store in session
      this.sessionStore.addTranscriptEntry(this.sessionId, {
        speaker,
        text,
        timestamp: Date.now(),
        isFinal: true,
      });

      // Trigger suggestion if prospect spoke
      if (speaker === 'prospect') {
        this.debounceSuggestion(text);
      }
    } else {
      this.resultEmitter.sendTranscriptInterim(speaker, text);
    }
  }

  private debounceSuggestion(prospectText: string): void {
    if (this.suggestionDebounceTimer) {
      clearTimeout(this.suggestionDebounceTimer);
    }

    this.suggestionDebounceTimer = setTimeout(() => {
      this.suggestionGenerator.processProspectUtterance(prospectText).catch((err) => {
        console.error(`Suggestion generation failed [${this.sessionId}]:`, err);
        this.resultEmitter.sendError('SUGGESTION_FAILED', 'Failed to generate suggestion');
      });
    }, config.session.suggestionDebounceMs);
  }
}
