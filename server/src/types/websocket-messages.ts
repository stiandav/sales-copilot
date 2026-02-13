// Audio WebSocket: binary frames with 1-byte channel header
// 0x00 = prospect (tab audio), 0x01 = rep (mic audio)
export const CHANNEL_PROSPECT = 0x00;
export const CHANNEL_REP = 0x01;

// Results WebSocket: JSON messages
export type ResultMessage =
  | TranscriptInterimMessage
  | TranscriptFinalMessage
  | SuggestionStartMessage
  | SuggestionChunkMessage
  | SuggestionCompleteMessage
  | ErrorMessage
  | SessionStatusMessage;

export interface TranscriptInterimMessage {
  type: 'transcript_interim';
  speaker: 'prospect' | 'rep';
  text: string;
  timestamp: number;
}

export interface TranscriptFinalMessage {
  type: 'transcript_final';
  speaker: 'prospect' | 'rep';
  text: string;
  timestamp: number;
}

export interface SuggestionStartMessage {
  type: 'suggestion_start';
  suggestionId: string;
  objectionType: string;
  objectionLabel: string;
  baseScript: string;
  triggerText: string;
  timestamp: number;
}

export interface SuggestionChunkMessage {
  type: 'suggestion_chunk';
  suggestionId: string;
  chunk: string;
}

export interface SuggestionCompleteMessage {
  type: 'suggestion_complete';
  suggestionId: string;
  fullScript: string;
}

export interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
}

export interface SessionStatusMessage {
  type: 'session_status';
  status: 'connected' | 'transcribing' | 'ended';
  sessionId: string;
}
