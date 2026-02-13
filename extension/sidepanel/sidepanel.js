const WS_BASE_URL = 'ws://localhost:3000';

const MSG = {
  START_CALL: 'start-call',
  STOP_CALL: 'stop-call',
  GET_STATUS: 'get-status',
  CALL_STATUS: 'call-status',
};

(function () {
  let resultsWs = null;
  let sessionId = null;
  let isCallActive = false;
  let reconnectTimer = null;
  let activeSuggestion = null;
  const suggestions = [];

  const transcriptView = new TranscriptView(
    document.getElementById('transcript')
  );
  const callControls = new CallControls({
    btnStart: document.getElementById('btn-start'),
    btnStop: document.getElementById('btn-stop'),
    timer: document.getElementById('call-timer'),
    onStart: startCall,
    onStop: stopCall,
  });

  const suggestionContainer = document.getElementById('suggestion-container');
  const previousSuggestions = document.getElementById('previous-suggestions');
  const emptyState = document.getElementById('empty-state');
  const transcriptSection = document.getElementById('transcript-section');
  const suggestionSection = document.getElementById('suggestion-section');
  const connectionStatus = document.getElementById('connection-status');

  // Check current status on load
  chrome.runtime.sendMessage({ type: MSG.GET_STATUS }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response && response.isCapturing) {
      sessionId = response.sessionId;
      onCallStarted();
    }
  });

  // Listen for status updates from service worker
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === MSG.CALL_STATUS) {
      if (message.isCapturing && !isCallActive) {
        sessionId = message.sessionId;
        onCallStarted();
      } else if (!message.isCapturing && isCallActive) {
        onCallStopped();
      }
    }
  });

  async function startCall() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    callControls.setLoading(true);

    chrome.runtime.sendMessage(
      { type: MSG.START_CALL, tabId: tab.id },
      (response) => {
        callControls.setLoading(false);

        if (chrome.runtime.lastError) {
          console.error('Message error:', chrome.runtime.lastError.message);
          return;
        }

        if (response && response.success) {
          sessionId = response.sessionId;
          onCallStarted();
        } else {
          console.error('Failed to start call:', response && response.error);
        }
      }
    );
  }

  function stopCall() {
    chrome.runtime.sendMessage({ type: MSG.STOP_CALL }, () => {
      onCallStopped();
    });
  }

  function onCallStarted() {
    isCallActive = true;
    callControls.setActive(true);

    // Clear previous call state
    transcriptView.clear();
    suggestionContainer.innerHTML = '';
    previousSuggestions.innerHTML = '';
    activeSuggestion = null;
    suggestions.length = 0;

    emptyState.classList.add('hidden');
    transcriptSection.classList.remove('hidden');
    suggestionSection.classList.remove('hidden');
    updateConnectionStatus('recording');
    connectResultsWs();
  }

  function onCallStopped() {
    isCallActive = false;
    callControls.setActive(false);
    updateConnectionStatus('disconnected');
    disconnectResultsWs();
  }

  function connectResultsWs() {
    if (resultsWs) {
      resultsWs.close();
    }

    const url = WS_BASE_URL + '/ws/results?sessionId=' + sessionId;
    resultsWs = new WebSocket(url);

    resultsWs.onopen = () => {
      console.log('Results WebSocket connected');
    };

    resultsWs.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleResultMessage(message);
      } catch (err) {
        console.error('Error parsing result message:', err);
      }
    };

    resultsWs.onclose = () => {
      if (isCallActive) {
        reconnectTimer = setTimeout(() => connectResultsWs(), 2000);
      }
    };

    resultsWs.onerror = (err) => {
      console.error('Results WebSocket error:', err);
    };
  }

  function disconnectResultsWs() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (resultsWs) {
      resultsWs.close();
      resultsWs = null;
    }
  }

  function handleResultMessage(message) {
    switch (message.type) {
      case 'transcript_interim':
        transcriptView.addInterim(message.speaker, message.text);
        break;

      case 'transcript_final':
        transcriptView.addFinal(message.speaker, message.text);
        break;

      case 'suggestion_start':
        handleSuggestionStart(message);
        break;

      case 'suggestion_chunk':
        handleSuggestionChunk(message);
        break;

      case 'suggestion_complete':
        handleSuggestionComplete(message);
        break;

      case 'error':
        console.error('Server error:', message.code, message.message);
        break;
    }
  }

  function handleSuggestionStart(message) {
    if (activeSuggestion) {
      activeSuggestion.setPrevious();
      previousSuggestions.prepend(activeSuggestion.element);
    }

    activeSuggestion = new SuggestionCard({
      suggestionId: message.suggestionId,
      objectionType: message.objectionType,
      objectionLabel: message.objectionLabel,
      baseScript: message.baseScript,
      triggerText: message.triggerText,
    });

    suggestionContainer.innerHTML = '';
    suggestionContainer.appendChild(activeSuggestion.element);
    suggestions.push(activeSuggestion);
  }

  function handleSuggestionChunk(message) {
    if (activeSuggestion && activeSuggestion.suggestionId === message.suggestionId) {
      activeSuggestion.appendChunk(message.chunk);
    }
  }

  function handleSuggestionComplete(message) {
    if (activeSuggestion && activeSuggestion.suggestionId === message.suggestionId) {
      activeSuggestion.setComplete(message.fullScript);
    }
  }

  function updateConnectionStatus(status) {
    const dot = connectionStatus.querySelector('.status-dot');
    const text = connectionStatus.querySelector('.status-text');

    dot.className = 'status-dot';
    switch (status) {
      case 'connected':
        dot.classList.add('status-dot--connected');
        text.textContent = 'Connected';
        break;
      case 'recording':
        dot.classList.add('status-dot--recording');
        text.textContent = 'Recording';
        break;
      default:
        text.textContent = 'Disconnected';
        break;
    }
  }
})();
