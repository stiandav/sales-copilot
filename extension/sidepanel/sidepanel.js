// ========== COLD CALL AI — Main Controller ==========
// Practice mode runs 100% locally in the browser. No server, no API keys, no setup.

(function () {
  const engine = new ObjectionEngine();

  // DOM refs
  const modeTabs = document.querySelectorAll('.mode-tab');
  const modePractice = document.getElementById('mode-practice');
  const modeLive = document.getElementById('mode-live');
  const modeScripts = document.getElementById('mode-scripts');
  const leadSelect = document.getElementById('lead-type');
  const scenarioGrid = document.getElementById('scenario-grid');
  const practiceField = document.getElementById('practice-field');
  const practiceSend = document.getElementById('practice-send');
  const transcriptEl = document.getElementById('transcript-practice');
  const suggestionContainer = document.getElementById('suggestion-container-practice');
  const emptyHint = document.getElementById('empty-hint-practice');
  const scriptLibrary = document.getElementById('script-library');

  const modes = {
    practice: modePractice,
    live: modeLive,
    scripts: modeScripts,
  };

  // ==================== MODE SWITCHING ====================
  modeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode;
      modeTabs.forEach((t) => t.classList.remove('mode-tab--active'));
      tab.classList.add('mode-tab--active');

      Object.entries(modes).forEach(([key, el]) => {
        el.classList.toggle('hidden', key !== mode);
      });

      if (mode === 'scripts') renderScriptLibrary();
    });
  });

  // ==================== LEAD TYPE CHANGE ====================
  leadSelect.addEventListener('change', () => {
    renderScenarios();
    renderScriptLibrary();
  });

  // ==================== SCENARIOS ====================
  function renderScenarios() {
    const leadType = leadSelect.value;
    const scenarios = engine.getScenariosForLeadType(leadType);
    scenarioGrid.innerHTML = '';

    scenarios.forEach((s) => {
      const btn = document.createElement('button');
      btn.className = 'scenario-btn';
      btn.textContent = s.label;
      btn.title = s.text;
      btn.addEventListener('click', () => handleProspectText(s.text));
      scenarioGrid.appendChild(btn);
    });
  }

  // ==================== PRACTICE INPUT ====================
  practiceField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && practiceField.value.trim()) {
      handleProspectText(practiceField.value.trim());
      practiceField.value = '';
    }
  });

  practiceSend.addEventListener('click', () => {
    if (practiceField.value.trim()) {
      handleProspectText(practiceField.value.trim());
      practiceField.value = '';
    }
  });

  // ==================== CORE: PROCESS PROSPECT TEXT ====================
  function handleProspectText(text) {
    emptyHint.classList.add('hidden');

    // Show in transcript
    addTranscriptEntry('prospect', text);

    // Detect objection locally
    const match = engine.detect(text);

    if (match) {
      showSuggestion(match);
    } else {
      showNoMatch(text);
    }

    // Scroll to suggestion
    suggestionContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function addTranscriptEntry(speaker, text) {
    const entry = document.createElement('div');
    entry.className = 'transcript-entry transcript-entry--' + speaker;

    const label = document.createElement('span');
    label.className = 'speaker-label speaker-label--' + speaker;
    label.textContent = speaker === 'prospect' ? 'Prospect' : 'You';

    const textEl = document.createElement('span');
    textEl.className = 'transcript-text';
    textEl.textContent = text;

    entry.appendChild(label);
    entry.appendChild(textEl);
    transcriptEl.appendChild(entry);
  }

  function showSuggestion(match) {
    const script = match.script;
    const colors = CATEGORY_COLORS[script.category] || { bg: 'rgba(168,85,247,0.15)', text: '#c084fc' };

    suggestionContainer.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'suggestion-card';

    card.innerHTML =
      '<div class="suggestion-card__header">' +
        '<span class="objection-badge" style="background:' + colors.bg + ';color:' + colors.text + '">' +
          escapeHtml(script.label) +
        '</span>' +
      '</div>' +
      '<div class="suggestion-card__say-label">SAY THIS:</div>' +
      '<div class="suggestion-card__script">' + escapeHtml(script.script) + '</div>' +
      '<div class="suggestion-card__trigger">Triggered by: "' + escapeHtml(match.triggerText) + '"</div>';

    suggestionContainer.appendChild(card);
  }

  function showNoMatch(text) {
    suggestionContainer.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'suggestion-card';
    card.style.borderColor = 'var(--border)';
    card.style.boxShadow = 'none';

    card.innerHTML =
      '<div class="suggestion-card__header">' +
        '<span class="objection-badge" style="background:rgba(95,99,104,0.15);color:var(--text-dim)">No Match</span>' +
      '</div>' +
      '<div class="suggestion-card__script" style="color:var(--text-secondary);font-size:14px">' +
        'No specific objection detected. Try responding with curiosity: ' +
        '"That\'s interesting \u2014 can you tell me more about that?"' +
      '</div>' +
      '<div class="suggestion-card__trigger">Input: "' + escapeHtml(text) + '"</div>';

    suggestionContainer.appendChild(card);
  }

  // ==================== SCRIPT LIBRARY ====================
  function renderScriptLibrary() {
    const leadType = leadSelect.value;
    const scripts = engine.getScriptsForLeadType(leadType);
    scriptLibrary.innerHTML = '';

    scripts.forEach((s) => {
      const card = document.createElement('div');
      card.className = 'script-card';

      const leadTags = (s.leadTypes || [])
        .map((lt) => '<span class="script-card__lead-tag">' + (LEAD_TYPE_LABELS[lt] || lt) + '</span>')
        .join(' ');

      const topPatterns = s.patterns.slice(0, 5).map((p) => '"' + p + '"').join(', ');

      card.innerHTML =
        '<div class="script-card__header">' +
          '<span class="script-card__label">' + escapeHtml(s.label) + '</span>' +
          leadTags +
        '</div>' +
        '<div class="script-card__patterns">Triggers: ' + escapeHtml(topPatterns) + '</div>' +
        '<div class="script-card__body">' + escapeHtml(s.script) + '</div>';

      scriptLibrary.appendChild(card);
    });
  }

  // ==================== LIVE CALL MODE (uses server) ====================
  const WS_BASE_URL = 'ws://localhost:3000';
  const MSG = {
    START_CALL: 'start-call',
    STOP_CALL: 'stop-call',
    GET_STATUS: 'get-status',
    CALL_STATUS: 'call-status',
    PAUSE_CALL: 'pause-call',
    RESUME_CALL: 'resume-call',
  };

  let resultsWs = null;
  let sessionId = null;
  let isCallActive = false;

  const btnStart = document.getElementById('btn-start');
  const btnStop = document.getElementById('btn-stop');
  const btnPause = document.getElementById('btn-pause');
  const callTimer = document.getElementById('call-timer');
  const liveSetup = document.getElementById('live-setup');
  const transcriptLive = document.getElementById('transcript-live');
  const transcriptSectionLive = document.getElementById('transcript-section-live');
  const suggestionSectionLive = document.getElementById('suggestion-section-live');
  const suggestionContainerLive = document.getElementById('suggestion-container-live');
  const costBar = document.getElementById('cost-bar');
  const costAmount = document.getElementById('cost-amount');
  const costDetail = document.getElementById('cost-detail');
  let timerInterval = null;

  btnStart.addEventListener('click', startLiveCall);
  btnStop.addEventListener('click', stopLiveCall);

  async function startLiveCall() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    btnStart.disabled = true;
    btnStart.textContent = 'Starting...';

    chrome.runtime.sendMessage(
      { type: MSG.START_CALL, tabId: tab.id, leadType: leadSelect.value },
      (response) => {
        btnStart.disabled = false;
        if (chrome.runtime.lastError) {
          alert('Error: ' + chrome.runtime.lastError.message + '\n\nMake sure you\'re on your dialer tab (not a chrome:// page) and click the extension icon first.');
          btnStart.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.6 10.3l-2.8-1.2a.7.7 0 00-.7.1l-1.3 1.1a.4.4 0 01-.4 0A10 10 0 015.7 7.6a.4.4 0 010-.4L6.8 5.9a.7.7 0 00.1-.7L5.7 2.4a.7.7 0 00-.8-.4l-2.4.6A.7.7 0 002 3.3 12.1 12.1 0 0012.7 14a.7.7 0 00.7-.5l.6-2.4a.7.7 0 00-.4-.8z"/></svg> Start Call';
          return;
        }
        if (response && response.success) {
          sessionId = response.sessionId;
          onLiveCallStarted();
        } else {
          alert('Failed to start call: ' + (response && response.error || 'Unknown error') + '\n\nMake sure:\n1. You\'re on your dialer website (not chrome:// pages)\n2. The server is running (cd server && npm run dev)');
          btnStart.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.6 10.3l-2.8-1.2a.7.7 0 00-.7.1l-1.3 1.1a.4.4 0 01-.4 0A10 10 0 015.7 7.6a.4.4 0 010-.4L6.8 5.9a.7.7 0 00.1-.7L5.7 2.4a.7.7 0 00-.8-.4l-2.4.6A.7.7 0 002 3.3 12.1 12.1 0 0012.7 14a.7.7 0 00.7-.5l.6-2.4a.7.7 0 00-.4-.8z"/></svg> Start Call';
        }
      }
    );
  }

  function onLiveCallStarted() {
    isCallActive = true;
    liveSetup.classList.add('hidden');
    btnStart.classList.add('hidden');
    btnStop.classList.remove('hidden');
    btnPause.classList.remove('hidden');
    callTimer.classList.remove('hidden');
    transcriptSectionLive.classList.remove('hidden');
    suggestionSectionLive.classList.remove('hidden');
    costBar.classList.remove('hidden');
    startTimer();
    connectLiveWs();
  }

  function stopLiveCall() {
    chrome.runtime.sendMessage({ type: MSG.STOP_CALL });
    isCallActive = false;
    liveSetup.classList.remove('hidden');
    btnStart.classList.remove('hidden');
    btnStop.classList.add('hidden');
    btnPause.classList.add('hidden');
    callTimer.classList.add('hidden');
    stopTimer();
    if (resultsWs) { resultsWs.close(); resultsWs = null; }
  }

  function connectLiveWs() {
    let url = WS_BASE_URL + '/ws/results?sessionId=' + sessionId;
    if (leadSelect.value) url += '&leadType=' + leadSelect.value;
    resultsWs = new WebSocket(url);
    resultsWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleLiveMessage(msg);
      } catch (e) { /* ignore */ }
    };
    resultsWs.onclose = () => {
      if (isCallActive) setTimeout(connectLiveWs, 2000);
    };
  }

  function handleLiveMessage(msg) {
    if (msg.type === 'transcript_final') {
      const entry = document.createElement('div');
      entry.className = 'transcript-entry transcript-entry--' + msg.speaker;
      entry.innerHTML =
        '<span class="speaker-label speaker-label--' + msg.speaker + '">' +
        (msg.speaker === 'prospect' ? 'Prospect' : 'You') + '</span>' +
        '<span class="transcript-text">' + escapeHtml(msg.text) + '</span>';
      transcriptLive.appendChild(entry);
      transcriptLive.scrollTop = transcriptLive.scrollHeight;
    }
    if (msg.type === 'suggestion_start') {
      const colors = CATEGORY_COLORS[msg.objectionType] || { bg: 'rgba(168,85,247,0.15)', text: '#c084fc' };
      suggestionContainerLive.innerHTML =
        '<div class="suggestion-card">' +
          '<div class="suggestion-card__header">' +
            '<span class="objection-badge" style="background:' + colors.bg + ';color:' + colors.text + '">' + escapeHtml(msg.objectionLabel) + '</span>' +
          '</div>' +
          '<div class="suggestion-card__say-label">SAY THIS:</div>' +
          '<div class="suggestion-card__script">' + escapeHtml(msg.baseScript) + '</div>' +
        '</div>';
    }
    if (msg.type === 'suggestion_complete') {
      const card = suggestionContainerLive.querySelector('.suggestion-card__script');
      if (card) card.textContent = msg.fullScript;
    }
    if (msg.type === 'cost_update') {
      costAmount.textContent = '$' + ((msg.estimatedCostCents || 0) / 100).toFixed(2);
      costDetail.textContent = (msg.claudeCalls || 0) + ' AI calls';
    }
  }

  function startTimer() {
    const start = Date.now();
    callTimer.textContent = '00:00';
    timerInterval = setInterval(() => {
      const s = Math.floor((Date.now() - start) / 1000);
      callTimer.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }, 1000);
  }
  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  // Listen for call status from service worker
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === MSG.CALL_STATUS && !message.isCapturing && isCallActive) {
        stopLiveCall();
      }
    });
  }

  // ==================== UTILS ====================
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ==================== INIT ====================
  renderScenarios();
  practiceField.focus();
})();
