import { WebSocket } from 'ws';
import { ResultMessage } from '../types';

export class ResultEmitter {
  private ws: WebSocket | null = null;

  setSocket(ws: WebSocket): void {
    this.ws = ws;
  }

  clearSocket(): void {
    this.ws = null;
  }

  send(message: ResultMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  sendStatus(status: 'connected' | 'transcribing' | 'ended', sessionId: string): void {
    this.send({
      type: 'session_status',
      status,
      sessionId,
    });
  }

  sendTranscriptInterim(speaker: 'prospect' | 'rep', text: string): void {
    this.send({
      type: 'transcript_interim',
      speaker,
      text,
      timestamp: Date.now(),
    });
  }

  sendTranscriptFinal(speaker: 'prospect' | 'rep', text: string): void {
    this.send({
      type: 'transcript_final',
      speaker,
      text,
      timestamp: Date.now(),
    });
  }

  sendSuggestionStart(
    suggestionId: string,
    objectionType: string,
    objectionLabel: string,
    baseScript: string,
    triggerText: string
  ): void {
    this.send({
      type: 'suggestion_start',
      suggestionId,
      objectionType,
      objectionLabel,
      baseScript,
      triggerText,
      timestamp: Date.now(),
    });
  }

  sendSuggestionChunk(suggestionId: string, chunk: string): void {
    this.send({
      type: 'suggestion_chunk',
      suggestionId,
      chunk,
    });
  }

  sendSuggestionComplete(suggestionId: string, fullScript: string): void {
    this.send({
      type: 'suggestion_complete',
      suggestionId,
      fullScript,
    });
  }

  sendError(code: string, message: string): void {
    this.send({
      type: 'error',
      code,
      message,
    });
  }
}
