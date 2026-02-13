import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { AudioHandler } from './audio-handler';
import { ResultEmitter } from './result-emitter';
import { ScriptStore } from '../scripts/script-store';
import { SessionStore } from '../session/session-store';
import { SuggestionGenerator } from '../ai/suggestion-generator';
import { ConversationContext } from '../session/conversation-context';
import { LeadType } from '../types';

interface SessionConnections {
  audioWs?: WebSocket;
  resultsWs?: WebSocket;
  audioHandler?: AudioHandler;
  resultEmitter: ResultEmitter;
  practiceMode: boolean;
  leadType?: LeadType;
  // For practice mode without audio handler
  practiceSuggestionGenerator?: SuggestionGenerator;
  practiceContext?: ConversationContext;
}

const sessions = new Map<string, SessionConnections>();
const sessionStore = new SessionStore();

export function setupWebSocketServer(server: http.Server, scriptStore: ScriptStore): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '/', `http://${request.headers.host}`);
    const pathname = url.pathname;
    const sessionId = url.searchParams.get('sessionId') || uuidv4();

    if (pathname === '/ws/audio' || pathname === '/ws/results') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        const practiceMode = url.searchParams.get('practiceMode') === 'true';
        const leadType = (url.searchParams.get('leadType') || undefined) as LeadType | undefined;
        handleConnection(ws, pathname, sessionId, scriptStore, practiceMode, leadType);
      });
    } else {
      socket.destroy();
    }
  });
}

function handleConnection(
  ws: WebSocket,
  pathname: string,
  sessionId: string,
  scriptStore: ScriptStore,
  practiceMode: boolean,
  leadType?: LeadType
): void {
  let session = sessions.get(sessionId);

  if (!session) {
    const resultEmitter = new ResultEmitter();
    session = { resultEmitter, practiceMode, leadType };
    sessions.set(sessionId, session);
    sessionStore.createSession(sessionId);
  }

  // Update session settings if provided
  if (practiceMode) session.practiceMode = true;
  if (leadType) session.leadType = leadType;

  if (pathname === '/ws/results') {
    session.resultsWs = ws;
    session.resultEmitter.setSocket(ws);

    if (session.practiceMode) {
      session.resultEmitter.sendStatus('practice', sessionId);

      // Create practice-mode suggestion generator (no Deepgram needed)
      const context = new ConversationContext();
      session.practiceContext = context;
      session.practiceSuggestionGenerator = new SuggestionGenerator(
        scriptStore,
        context,
        session.resultEmitter,
        true,
        session.leadType
      );
    } else {
      session.resultEmitter.sendStatus('connected', sessionId);
    }

    // Handle control messages from the client
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        handleClientMessage(sessionId, msg, scriptStore);
      } catch {
        // Ignore non-JSON messages
      }
    });

    ws.on('close', () => {
      const s = sessions.get(sessionId);
      if (s) {
        s.resultsWs = undefined;
        s.resultEmitter.clearSocket();
      }
    });

    ws.on('error', (err) => {
      console.error(`Results WS error [${sessionId}]:`, err.message);
    });
  }

  if (pathname === '/ws/audio') {
    session.audioWs = ws;

    const audioHandler = new AudioHandler(
      sessionId,
      session.resultEmitter,
      scriptStore,
      sessionStore,
      session.practiceMode,
      session.leadType
    );
    session.audioHandler = audioHandler;

    audioHandler.start();
    session.resultEmitter.sendStatus('transcribing', sessionId);

    ws.on('message', (data: Buffer) => {
      if (data.length > 1) {
        audioHandler.handleAudioFrame(data);
      }
    });

    ws.on('close', () => {
      console.log(`Audio WS closed [${sessionId}]`);
      audioHandler.stop();
      session!.resultEmitter.sendStatus('ended', sessionId);

      const s = sessions.get(sessionId);
      if (s) {
        s.audioWs = undefined;
        s.audioHandler = undefined;
      }

      // Clean up session if both connections closed
      if (!s?.resultsWs) {
        sessions.delete(sessionId);
      }
    });

    ws.on('error', (err) => {
      console.error(`Audio WS error [${sessionId}]:`, err.message);
    });
  }
}

function handleClientMessage(
  sessionId: string,
  msg: { type: string; [key: string]: any },
  scriptStore: ScriptStore
): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  switch (msg.type) {
    case 'practice_input': {
      // Practice mode: run objection detection on typed text
      const text = msg.text as string;
      if (!text || text.trim().length < 3) return;

      // Show as transcript
      session.resultEmitter.sendTranscriptFinal('prospect', text);

      // Add to context
      session.practiceContext?.addTurn('prospect', text);

      // Run suggestion pipeline (practice mode, no Claude)
      session.practiceSuggestionGenerator?.processProspectUtterance(text).catch((err) => {
        console.error(`Practice suggestion failed [${sessionId}]:`, err);
      });
      break;
    }

    case 'set_paused': {
      const paused = msg.paused as boolean;
      if (session.audioHandler) {
        session.audioHandler.setPaused(paused);
      }
      session.resultEmitter.sendStatus(
        paused ? 'paused' : 'transcribing',
        sessionId
      );
      break;
    }
  }
}
