const WS_BASE_URL = 'ws://localhost:3000';
const AUDIO_SAMPLE_RATE = 16000;
const CHANNEL_PROSPECT = 0x00;
const CHANNEL_REP = 0x01;

const MSG = {
  START_CAPTURE: 'start-capture',
  STOP_CAPTURE: 'stop-capture',
  CAPTURE_STARTED: 'capture-started',
  CAPTURE_STOPPED: 'capture-stopped',
  CAPTURE_ERROR: 'capture-error',
  PAUSE_CAPTURE: 'pause-capture',
  RESUME_CAPTURE: 'resume-capture',
};

let audioContext = null;
let tabStream = null;
let micStream = null;
let ws = null;
let tabWorkletNode = null;
let micWorkletNode = null;
let isPaused = false;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MSG.START_CAPTURE) {
    startCapture(message.streamId, message.sessionId, message.leadType);
  } else if (message.type === MSG.STOP_CAPTURE) {
    stopCapture();
  } else if (message.type === MSG.PAUSE_CAPTURE) {
    isPaused = true;
  } else if (message.type === MSG.RESUME_CAPTURE) {
    isPaused = false;
  }
});

async function startCapture(streamId, sessionId, leadType) {
  try {
    // Get tab audio stream using the stream ID from tabCapture
    tabStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
        },
      },
    });

    // Get microphone stream
    // On macOS with BlackHole: set Chrome's mic input to your earbuds mic
    // BlackHole captures system audio, but the extension already captures tab audio directly
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: AUDIO_SAMPLE_RATE,
        },
      });
    } catch (micErr) {
      console.warn('Mic access denied, continuing with tab audio only:', micErr.message);
    }

    // Create AudioContext at target sample rate
    audioContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });

    // Load worklet
    await audioContext.audioWorklet.addModule('audio-worklet-processor.js');

    // Connect WebSocket with leadType param
    let wsUrl = WS_BASE_URL + '/ws/audio?sessionId=' + sessionId;
    if (leadType) {
      wsUrl += '&leadType=' + leadType;
    }
    ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      console.log('Audio WebSocket connected');
      setupAudioPipeline();
      chrome.runtime.sendMessage({ type: MSG.CAPTURE_STARTED });
    };

    ws.onclose = () => {
      console.log('Audio WebSocket closed');
    };

    ws.onerror = (err) => {
      console.error('Audio WebSocket error:', err);
      chrome.runtime.sendMessage({
        type: MSG.CAPTURE_ERROR,
        error: 'WebSocket connection failed',
      });
    };
  } catch (error) {
    console.error('Failed to start capture:', error);
    chrome.runtime.sendMessage({
      type: MSG.CAPTURE_ERROR,
      error: error.message,
    });
  }
}

function setupAudioPipeline() {
  if (!audioContext || !tabStream) return;

  // Tab audio (prospect) pipeline
  const tabSource = audioContext.createMediaStreamSource(tabStream);
  tabWorkletNode = new AudioWorkletNode(audioContext, 'pcm-processor');

  tabWorkletNode.port.onmessage = (event) => {
    if (!isPaused) {
      sendAudioFrame(CHANNEL_PROSPECT, event.data);
    }
  };

  tabSource.connect(tabWorkletNode);
  // Also route tab audio to speakers so the rep can hear the prospect
  tabSource.connect(audioContext.destination);

  // Mic audio (rep) pipeline
  if (micStream) {
    const micSource = audioContext.createMediaStreamSource(micStream);
    micWorkletNode = new AudioWorkletNode(audioContext, 'pcm-processor');

    micWorkletNode.port.onmessage = (event) => {
      if (!isPaused) {
        sendAudioFrame(CHANNEL_REP, event.data);
      }
    };

    micSource.connect(micWorkletNode);
    // Don't connect mic to destination (would cause feedback)
  }
}

function sendAudioFrame(channel, pcmBuffer) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const pcmData = new Uint8Array(pcmBuffer);
  const frame = new Uint8Array(1 + pcmData.length);
  frame[0] = channel;
  frame.set(pcmData, 1);

  ws.send(frame.buffer);
}

function stopCapture() {
  isPaused = false;

  if (tabWorkletNode) {
    tabWorkletNode.disconnect();
    tabWorkletNode = null;
  }
  if (micWorkletNode) {
    micWorkletNode.disconnect();
    micWorkletNode = null;
  }

  if (tabStream) {
    tabStream.getTracks().forEach((t) => t.stop());
    tabStream = null;
  }
  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop());
    micStream = null;
  }

  if (ws) {
    ws.close();
    ws = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  chrome.runtime.sendMessage({ type: MSG.CAPTURE_STOPPED });
}
