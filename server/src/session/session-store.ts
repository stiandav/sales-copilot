import { SessionInfo, TranscriptEntry, SuggestionRecord } from '../types';

export class SessionStore {
  private sessions: Map<string, SessionInfo> = new Map();

  createSession(sessionId: string): SessionInfo {
    const session: SessionInfo = {
      sessionId,
      startedAt: Date.now(),
      transcriptEntries: [],
      suggestions: [],
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): SessionInfo | undefined {
    return this.sessions.get(sessionId);
  }

  addTranscriptEntry(sessionId: string, entry: TranscriptEntry): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.transcriptEntries.push(entry);
    }
  }

  addSuggestion(sessionId: string, suggestion: SuggestionRecord): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.suggestions.push(suggestion);
    }
  }

  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endedAt = Date.now();
    }
  }

  getAllSessions(): SessionInfo[] {
    return Array.from(this.sessions.values());
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
}
