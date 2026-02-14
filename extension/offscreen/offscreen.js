// ========== Offscreen Audio Capture ==========
// Captures tab audio and optionally mic audio.
// Two modes:
//   1. Direct Deepgram: connects straight to Deepgram API (no local server)
//   2. Server relay: connects to localhost server (legacy)

const DEEPGRAM_WS_URL = 'wss://api.deepgram.com/v1/listen';
const WS_BASE_URL = 'ws://localhost:3000';
const AUDIO_SAMPLE_RATE = 16000;

const MSG = {
  START_CAPTURE: 'start-capture',
  START_CAPTURE_DIRECT: 'start-capture-direct',
  STOP_CAPTURE: 'stop-capture',
  CAPTURE_STARTED: 'capture-started',
  CAPTURE_STOPPED: 'capture-stopped',
  CAPTURE_ERROR: 'capture-error',
  PAUSE_CAPTURE: 'pause-capture',
  RESUME_CAPTURE: 'resume-capture',
  TRANSCRIPTION: 'transcription',
};

let audioContext = null;
let tabStream = null;
let ws = null;
let tabWorkletNode = null;
let isPaused = false;
let mode = 'direct'; // 'direct' or 'server'

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MSG.START_CAPTURE_DIRECT) {
    mode = 'direct';
    startCaptureDirect(message.streamId, message.apiKey);
  } else if (message.type === MSG.START_CAPTURE) {
    mode = 'server';
    startCaptureServer(message.streamId, message.sessionId, message.leadType);
  } else if (message.type === MSG.STOP_CAPTURE) {
    stopCapture();
  } else if (message.type === MSG.PAUSE_CAPTURE) {
    isPaused = true;
  } else if (message.type === MSG.RESUME_CAPTURE) {
    isPaused = false;
  }
});

// ==================== DIRECT DEEPGRAM MODE ====================
async function startCaptureDirect(streamId, apiKey) {
  try {
    tabStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
        },
      },
    });

    audioContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
    await audioContext.audioWorklet.addModule('audio-worklet-processor.js');

    // Connect to Deepgram directly using token protocol for browser auth
    var dgParams = [
      'encoding=linear16',
      'sample_rate=' + AUDIO_SAMPLE_RATE,
      'channels=1',
      'model=nova-2',
      'smart_format=true',
      'interim_results=true',
      'endpointing=300',
      'utterance_end_ms=1500',
    ].join('&');

    ws = new WebSocket(DEEPGRAM_WS_URL + '?' + dgParams, ['token', apiKey]);

    ws.onopen = () => {
      console.log('Deepgram WebSocket connected (direct mode)');
      setupDirectPipeline();
      chrome.runtime.sendMessage({ type: MSG.CAPTURE_STARTED });
    };

    ws.onmessage = (event) => {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'Results' && data.channel) {
          var alt = data.channel.alternatives && data.channel.alternatives[0];
          if (alt && alt.transcript) {
            chrome.runtime.sendMessage({
              type: MSG.TRANSCRIPTION,
              text: alt.transcript,
              isFinal: data.is_final,
              speechFinal: data.speech_final,
              confidence: alt.confidence,
              speaker: 'prospect',
            });
          }
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };

    ws.onclose = (event) => {
      console.log('Deepgram WebSocket closed:', event.code, event.reason);
    };

    ws.onerror = (err) => {
      console.error('Deepgram WebSocket error:', err);
      chrome.runtime.sendMessage({
        type: MSG.CAPTURE_ERROR,
        error: 'Deepgram connection failed — check your API key',
      });
    };
  } catch (error) {
    console.error('Failed to start direct capture:', error);
    chrome.runtime.sendMessage({
      type: MSG.CAPTURE_ERROR,
      error: error.message,
    });
  }
}

function setupDirectPipeline() {
  if (!audioContext || !tabStream) return;

  var tabSource = audioContext.createMediaStreamSource(tabStream);
  tabWorkletNode = new AudioWorkletNode(audioContext, 'pcm-processor');

  tabWorkletNode.port.onmessage = (event) => {
    if (!isPaused && ws && ws.readyState === WebSocket.OPEN) {
      // Send raw PCM Int16 directly to Deepgram
      ws.send(event.data);
    }
  };

  tabSource.connect(tabWorkletNode);
  // Route tab audio to speakers so the rep can hear the prospect
  tabSource.connect(audioContext.destination);
}

// ==================== SERVER RELAY MODE (legacy) ====================
async function startCaptureServer(streamId, sessionId, leadType) {
  try {
    tabStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
        },
      },
    });

    let micStream = null;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: AUDIO_SAMPLE_RATE },
      });
    } catch (micErr) {
      console.warn('Mic access denied, tab audio only:', micErr.message);
    }

    audioContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
    await audioContext.audioWorklet.addModule('audio-worklet-processor.js');

    let wsUrl = WS_BASE_URL + '/ws/audio?sessionId=' + sessionId;
    if (leadType) wsUrl += '&leadType=' + leadType;
    ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      console.log('Server WebSocket connected');
      setupServerPipeline(micStream);
      chrome.runtime.sendMessage({ type: MSG.CAPTURE_STARTED });
    };

    ws.onclose = () => console.log('Server WebSocket closed');
    ws.onerror = (err) => {
      console.error('Server WebSocket error:', err);
      chrome.runtime.sendMessage({ type: MSG.CAPTURE_ERROR, error: 'Server connection failed' });
    };
  } catch (error) {
    console.error('Failed to start server capture:', error);
    chrome.runtime.sendMessage({ type: MSG.CAPTURE_ERROR, error: error.message });
  }
}

function setupServerPipeline(micStream) {
  if (!audioContext || !tabStream) return;

  var CHANNEL_PROSPECT = 0x00;
  var CHANNEL_REP = 0x01;

  var tabSource = audioContext.createMediaStreamSource(tabStream);
  tabWorkletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
  tabWorkletNode.port.onmessage = (event) => {
    if (!isPaused) sendFrameToServer(CHANNEL_PROSPECT, event.data);
  };
  tabSource.connect(tabWorkletNode);
  tabSource.connect(audioContext.destination);

  if (micStream) {
    var micSource = audioContext.createMediaStreamSource(micStream);
    var micWorkletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
    micWorkletNode.port.onmessage = (event) => {
      if (!isPaused) sendFrameToServer(CHANNEL_REP, event.data);
    };
    micSource.connect(micWorkletNode);
  }
}

function sendFrameToServer(channel, pcmBuffer) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  var pcmData = new Uint8Array(pcmBuffer);
  var frame = new Uint8Array(1 + pcmData.length);
  frame[0] = channel;
  frame.set(pcmData, 1);
  ws.send(frame.buffer);
}

// ==================== CLEANUP ====================
function stopCapture() {
  isPaused = false;

  if (tabWorkletNode) { tabWorkletNode.disconnect(); tabWorkletNode = null; }

  if (tabStream) { tabStream.getTracks().forEach((t) => t.stop()); tabStream = null; }

  if (ws) {
    if (mode === 'direct' && ws.readyState === WebSocket.OPEN) {
      // Send close frame to Deepgram
      ws.send(new Uint8Array(0));
    }
    ws.close();
    ws = null;
  }

  if (audioContext) { audioContext.close(); audioContext = null; }

  chrome.runtime.sendMessage({ type: MSG.CAPTURE_STOPPED });
}
