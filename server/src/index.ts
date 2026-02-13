import express from 'express';
import cors from 'cors';
import http from 'http';
import { config } from './config';
import { setupWebSocketServer } from './websocket/ws-server';
import { setupRoutes } from './api/routes';
import { ScriptStore } from './scripts/script-store';

// Validate API keys on startup (warnings, not fatal — practice mode works without them)
if (!config.deepgramApiKey) {
  console.warn('WARNING: DEEPGRAM_API_KEY is not set. Live transcription will not work. Practice mode is still available.');
}
if (!config.anthropicApiKey) {
  console.warn('WARNING: ANTHROPIC_API_KEY is not set. AI script adaptation will not work. Base scripts and practice mode are still available.');
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '1.0.0',
    practiceMode: !config.deepgramApiKey || !config.anthropicApiKey,
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
  if (!config.deepgramApiKey || !config.anthropicApiKey) {
    console.log('Practice mode available (some API keys missing)');
  }
});
