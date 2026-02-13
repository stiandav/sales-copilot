export * from './websocket-messages';
export * from './script-types';

export interface SessionInfo {
  sessionId: string;
  startedAt: number;
  endedAt?: number;
  transcriptEntries: TranscriptEntry[];
  suggestions: SuggestionRecord[];
}

export interface TranscriptEntry {
  speaker: 'prospect' | 'rep';
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export interface SuggestionRecord {
  objectionType: string;
  baseScript: string;
  adaptedScript: string;
  timestamp: number;
  triggerText: string;
}

export interface ConversationTurn {
  role: 'prospect' | 'rep';
  content: string;
  timestamp: number;
}
