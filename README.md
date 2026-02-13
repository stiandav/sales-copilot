# Cold Call AI Assistant

Real-time AI cold calling coach Chrome extension for real estate sales reps. Listens to live phone calls through browser-based dialers, transcribes conversations in real-time, detects prospect objections, and displays word-for-word scripts to handle objections and book listing appointments.

## Architecture

- **Chrome Extension** (Manifest V3) — Side panel UI, tab audio + mic capture via offscreen document
- **Node.js Backend** — WebSocket server for audio streaming, Deepgram transcription, objection detection, Claude AI script adaptation

## Prerequisites

- Node.js 18+
- Chrome browser
- [Deepgram API key](https://console.deepgram.com/) — real-time speech-to-text
- [Anthropic API key](https://console.anthropic.com/) — Claude Haiku for script adaptation

## Setup

### 1. Backend

```bash
cd server
cp .env.example .env
# Edit .env with your API keys
npm install
npm run dev
```

### 2. Chrome Extension

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `extension/` folder
4. Click the extension icon on any tab to open the side panel

## Usage

1. Open a browser-based dialer (or any tab with audio for testing)
2. Click the extension icon → side panel opens
3. Click **Start Call** → recording begins
4. The AI transcribes the conversation in real-time with speaker labels
5. When the prospect raises an objection, the AI:
   - Instantly shows a pre-built response script
   - Streams a Claude-adapted version personalized to the conversation
6. Click **End Call** when done

## Objection Categories

| Category | Example Triggers |
|----------|-----------------|
| Not Interested | "not interested", "no thanks" |
| Already Has Agent | "already have an agent", "working with someone" |
| Bad Timing | "bad time", "call back later" |
| Not Selling | "not selling", "happy where we are" |
| Price Concern | "market is down", "prices are dropping" |
| Do Not Call | "take me off your list", "don't call again" |

## REST API

Scripts CRUD (requires `X-API-Key` header if `API_KEY` is set in `.env`):

```
GET    /api/scripts      — List all scripts
GET    /api/scripts/:id  — Get script by ID
POST   /api/scripts      — Create custom script
PUT    /api/scripts/:id  — Update script
DELETE /api/scripts/:id  — Delete script
GET    /health           — Health check
```

## Tech Stack

- **Speech-to-Text**: Deepgram Nova-3 (sub-300ms streaming)
- **AI Model**: Claude Haiku 4.5 (streaming script adaptation)
- **Audio**: Linear16 PCM, 16kHz mono via AudioWorklet
- **Backend**: Node.js, Express, TypeScript, WebSocket
- **Extension**: Manifest V3, Side Panel API, Offscreen Document API
