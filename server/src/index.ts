import express from 'express';
import cors from 'cors';
import http from 'http';
import { config } from './config';
import { setupWebSocketServer } from './websocket/ws-server';
import { setupRoutes } from './api/routes';
import { ScriptStore } from './scripts/script-store';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '1.0.0',
  });
});

const scriptStore = new ScriptStore();
setupRoutes(app, scriptStore);

const server = http.createServer(app);
setupWebSocketServer(server, scriptStore);

server.listen(config.port, () => {
  console.log(`Cold Call Assistant server running on port ${config.port}`);
  console.log(`Health check: http://localhost:${config.port}/health`);
  console.log(`WebSocket audio: ws://localhost:${config.port}/ws/audio`);
  console.log(`WebSocket results: ws://localhost:${config.port}/ws/results`);
});
