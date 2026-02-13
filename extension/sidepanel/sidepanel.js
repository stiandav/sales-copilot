const WS_BASE_URL = 'ws://localhost:3000';

const MSG = {
  START_CALL: 'start-call',
  STOP_CALL: 'stop-call',
  GET_STATUS: 'get-status',
  CALL_STATUS: 'call-status',
  PAUSE_CALL: 'pause-call',
  RESUME_CALL: 'resume-call',
};

(function () {
  let resultsWs = null;
  let sessionId = null;
  let isCallActive = false;
  let isPracticeMode = false;
  let isPaused = false;
  let reconnectTimer = null;
  let activeSuggestion = null;
  const suggestions = [];

  // DOM elements
  const transcriptView = new TranscriptView(
    document.getElementById('transcript')
  );
  const callControls = new CallControls({
    btnStart: document.getElementById('btn-start'),
    btnStop: document.getElementById('btn-stop'),
    btnPause: document.getElementById('btn-pause'),
    timer: document.getElementById('call-timer'),
    onStart: startCall,
    onStop: stopCall,
    onPause: togglePause,
  });

  const suggestionContainer = document.getElementById('suggestion-container');
  const previousSuggestions = document.getElementById('previous-suggestions');
  const emptyState = document.getElementById('empty-state');
  const transcriptSection = document.getElementById('transcript-section');
  const suggestionSection = document.getElementById('suggestion-section');
  const connectionStatus = document.getElementById('connection-status');
  const practiceToggle = document.getElementById('practice-toggle');
  const leadTypeSelect = document.getElementById('lead-type');
  const practiceInput = document.getElementById('practice-input');
  const practiceField = document.getElementById('practice-field');
  const practiceSend = document.getElementById('practice-send');
  const costBar = document.getElementById('cost-bar');
  const costAmount = document.getElementById('cost-amount');
  const costDetail = document.getElementById('cost-detail');

  // Practice mode toggle
  practiceToggle.addEventListener('change', () => {
    isPracticeMode = practiceToggle.checked;
    if (isPracticeMode) {
      callControls.setStartLabel('Start Practice');
    } else {
      callControls.setStartLabel('Start Call');
    }
  });

  // Practice input handlers
  practiceField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && practiceField.value.trim()) {
      sendPracticeInput();
    }
  });
  practiceSend.addEventListener('click', () => {
    if (practiceField.value.trim()) {
      sendPracticeInput();
    }
  });

  function sendPracticeInput() {
    const text = practiceField.value.trim();
    if (!text || !resultsWs) return;

    resultsWs.send(JSON.stringify({ type: 'practice_input', text }));
    practiceField.value = '';
    practiceField.focus();
  }

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
    if (isPracticeMode) {
      // Practice mode: just connect WebSocket, no tab capture
      sessionId = 'practice-' + Date.now();
      onCallStarted();
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    callControls.setLoading(true);

    const leadType = leadTypeSelect.value;
    chrome.runtime.sendMessage(
      { type: MSG.START_CALL, tabId: tab.id, leadType },
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
    if (isPracticeMode) {
      onCallStopped();
      return;
    }

    chrome.runtime.sendMessage({ type: MSG.STOP_CALL }, () => {
      onCallStopped();
    });
  }

  function togglePause() {
    isPaused = !isPaused;
    callControls.setPaused(isPaused);

    if (isPracticeMode) return;

    // Send pause state to server via results WebSocket
    if (resultsWs && resultsWs.readyState === WebSocket.OPEN) {
      resultsWs.send(JSON.stringify({ type: 'set_paused', paused: isPaused }));
    }

    // Also tell service worker to pause audio sending
    chrome.runtime.sendMessage({
      type: isPaused ? MSG.PAUSE_CALL : MSG.RESUME_CALL,
    }).catch(() => {});

    updateConnectionStatus(isPaused ? 'paused' : 'recording');
  }

  function onCallStarted() {
    isCallActive = true;
    isPaused = false;
    callControls.setActive(true, isPracticeMode);

    // Clear previous call state
    transcriptView.clear();
    suggestionContainer.innerHTML = '';
    previousSuggestions.innerHTML = '';
    activeSuggestion = null;
    suggestions.length = 0;

    emptyState.classList.add('hidden');
    transcriptSection.classList.remove('hidden');
    suggestionSection.classList.remove('hidden');

    if (isPracticeMode) {
      practiceInput.classList.remove('hidden');
      costBar.classList.add('hidden');
      updateConnectionStatus('practice');
    } else {
      practiceInput.classList.add('hidden');
      costBar.classList.remove('hidden');
      updateConnectionStatus('recording');
    }

    // Disable settings during call
    practiceToggle.disabled = true;
    leadTypeSelect.disabled = true;

    connectResultsWs();
  }

  function onCallStopped() {
    isCallActive = false;
    isPaused = false;
    callControls.setActive(false);
    callControls.setPaused(false);
    updateConnectionStatus('disconnected');
    disconnectResultsWs();
    practiceInput.classList.add('hidden');

    // Re-enable settings
    practiceToggle.disabled = false;
    leadTypeSelect.disabled = false;
  }

  function connectResultsWs() {
    if (resultsWs) {
      resultsWs.close();
    }

    let url = WS_BASE_URL + '/ws/results?sessionId=' + sessionId;
    if (isPracticeMode) {
      url += '&practiceMode=true';
    }
    const leadType = leadTypeSelect.value;
    if (leadType) {
      url += '&leadType=' + leadType;
    }

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
      if (isCallActive && !isPracticeMode) {
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

      case 'cost_update':
        handleCostUpdate(message);
        break;

      case 'session_status':
        if (message.status === 'paused') {
          updateConnectionStatus('paused');
        }
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
      latencyMs: message.latencyMs,
      isPracticeMode: isPracticeMode,
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
      activeSuggestion.setComplete(message.fullScript, message.latencyMs);
    }
  }

  function handleCostUpdate(message) {
    const cents = message.estimatedCostCents || 0;
    const dollars = (cents / 100).toFixed(2);
    costAmount.textContent = '$' + dollars;
    costDetail.textContent = message.claudeCalls + ' AI calls';
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
      case 'paused':
        dot.classList.add('status-dot--paused');
        text.textContent = 'Paused';
        break;
      case 'practice':
        dot.classList.add('status-dot--practice');
        text.textContent = 'Practice';
        break;
      default:
        text.textContent = 'Disconnected';
        break;
    }
  }
})();
