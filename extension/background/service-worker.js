const MSG = {
  START_CAPTURE: 'start-capture',
  START_CAPTURE_DIRECT: 'start-capture-direct',
  STOP_CAPTURE: 'stop-capture',
  CAPTURE_STARTED: 'capture-started',
  CAPTURE_STOPPED: 'capture-stopped',
  CAPTURE_ERROR: 'capture-error',
  START_CALL: 'start-call',
  START_CALL_DIRECT: 'start-call-direct',
  STOP_CALL: 'stop-call',
  GET_STATUS: 'get-status',
  CALL_STATUS: 'call-status',
  PAUSE_CALL: 'pause-call',
  RESUME_CALL: 'resume-call',
  PAUSE_CAPTURE: 'pause-capture',
  RESUME_CAPTURE: 'resume-capture',
  TRANSCRIPTION: 'transcription',
};

let currentSessionId = null;
let isCapturing = false;

// Open side panel on extension icon click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Handle messages from side panel and offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case MSG.START_CALL:
      handleStartCall(message.tabId, message.leadType).then(sendResponse);
      return true;

    case MSG.START_CALL_DIRECT:
      handleStartCallDirect(message.tabId, message.apiKey).then(sendResponse);
      return true;

    case MSG.STOP_CALL:
      handleStopCall().then(sendResponse);
      return true;

    case MSG.GET_STATUS:
      sendResponse({
        isCapturing,
        sessionId: currentSessionId,
      });
      return false;

    case MSG.CAPTURE_STARTED:
      isCapturing = true;
      broadcastStatus();
      return false;

    case MSG.CAPTURE_STOPPED:
      isCapturing = false;
      broadcastStatus();
      return false;

    case MSG.CAPTURE_ERROR:
      console.error('Capture error:', message.error);
      isCapturing = false;
      broadcastStatus();
      return false;

    case MSG.PAUSE_CALL:
      chrome.runtime.sendMessage({ type: MSG.PAUSE_CAPTURE }).catch(() => {});
      return false;

    case MSG.RESUME_CALL:
      chrome.runtime.sendMessage({ type: MSG.RESUME_CAPTURE }).catch(() => {});
      return false;

    // Transcription messages from offscreen are automatically received by
    // all extension pages (including sidepanel) via chrome.runtime.onMessage.
    // No explicit relay needed.
  }
});

// Direct Deepgram mode — no local server, connects to Deepgram from offscreen doc
async function handleStartCallDirect(tabId, apiKey) {
  try {
    currentSessionId = crypto.randomUUID();

    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId,
    });

    await createOffscreenDocument();

    chrome.runtime.sendMessage({
      type: MSG.START_CAPTURE_DIRECT,
      streamId,
      apiKey,
    });

    return { success: true, sessionId: currentSessionId };
  } catch (error) {
    console.error('Failed to start direct call:', error);
    return { success: false, error: error.message };
  }
}

// Server relay mode (legacy)
async function handleStartCall(tabId, leadType) {
  try {
    currentSessionId = crypto.randomUUID();

    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId,
    });

    await createOffscreenDocument();

    chrome.runtime.sendMessage({
      type: MSG.START_CAPTURE,
      streamId,
      sessionId: currentSessionId,
      tabId,
      leadType: leadType || '',
    });

    return { success: true, sessionId: currentSessionId };
  } catch (error) {
    console.error('Failed to start call:', error);
    return { success: false, error: error.message };
  }
}

async function handleStopCall() {
  try {
    chrome.runtime.sendMessage({ type: MSG.STOP_CAPTURE });
    currentSessionId = null;
    isCapturing = false;
    broadcastStatus();

    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
    });
    if (contexts.length > 0) {
      await chrome.offscreen.closeDocument();
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to stop call:', error);
    return { success: false, error: error.message };
  }
}

async function createOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });

  if (contexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: 'offscreen/offscreen.html',
    reasons: ['USER_MEDIA', 'AUDIO_PLAYBACK'],
    justification: 'Capture tab audio and microphone for real-time transcription',
  });
}

function broadcastStatus() {
  chrome.runtime.sendMessage({
    type: MSG.CALL_STATUS,
    isCapturing,
    sessionId: currentSessionId,
  }).catch(() => {
    // Side panel may not be open
  });
}
