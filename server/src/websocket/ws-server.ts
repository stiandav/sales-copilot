import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { AudioHandler } from './audio-handler';
import { ResultEmitter } from './result-emitter';
import { ScriptStore } from '../scripts/script-store';
import { SessionStore } from '../session/session-store';

interface SessionConnections {
  audioWs?: WebSocket;
  resultsWs?: WebSocket;
  audioHandler?: AudioHandler;
  resultEmitter: ResultEmitter;
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
        handleConnection(ws, pathname, sessionId, scriptStore);
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
  scriptStore: ScriptStore
): void {
  let session = sessions.get(sessionId);

  if (!session) {
    const resultEmitter = new ResultEmitter();
    session = { resultEmitter };
    sessions.set(sessionId, session);
    sessionStore.createSession(sessionId);
  }

  if (pathname === '/ws/results') {
    session.resultsWs = ws;
    session.resultEmitter.setSocket(ws);

    session.resultEmitter.sendStatus('connected', sessionId);

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
      sessionStore
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
