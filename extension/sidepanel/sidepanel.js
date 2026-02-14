// ========== COLD CALL AI — Main Controller ==========
// Practice mode runs 100% locally in the browser. No server, no API keys, no setup.

(function () {
  var engine = new ObjectionEngine();

  // DOM refs — tabs + modes
  var modeTabs = document.querySelectorAll('.mode-tab');
  var modePractice = document.getElementById('mode-practice');
  var modeLive = document.getElementById('mode-live');
  var modeScripts = document.getElementById('mode-scripts');
  var modeVoice = document.getElementById('mode-voice');
  var leadSelect = document.getElementById('lead-type');
  var scenarioGrid = document.getElementById('scenario-grid');
  var practiceField = document.getElementById('practice-field');
  var practiceSend = document.getElementById('practice-send');
  var transcriptEl = document.getElementById('transcript-practice');
  var suggestionContainer = document.getElementById('suggestion-container-practice');
  var emptyHint = document.getElementById('empty-hint-practice');
  var scriptLibrary = document.getElementById('script-library');

  var modes = {
    practice: modePractice,
    voice: modeVoice,
    live: modeLive,
    scripts: modeScripts,
  };

  // ==================== MODE SWITCHING ====================
  modeTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var mode = tab.dataset.mode;
      modeTabs.forEach(function (t) { t.classList.remove('mode-tab--active'); });
      tab.classList.add('mode-tab--active');

      Object.entries(modes).forEach(function (entry) {
        entry[1].classList.toggle('hidden', entry[0] !== mode);
      });

      if (mode === 'scripts') renderScriptLibrary();
    });
  });

  // ==================== LEAD TYPE CHANGE ====================
  leadSelect.addEventListener('change', function () {
    renderScenarios();
    renderScriptLibrary();
  });

  // ==================== SCENARIOS ====================
  function renderScenarios() {
    var leadType = leadSelect.value;
    var scenarios = engine.getScenariosForLeadType(leadType);
    scenarioGrid.innerHTML = '';

    scenarios.forEach(function (s) {
      var btn = document.createElement('button');
      btn.className = 'scenario-btn';
      btn.textContent = s.label;
      btn.title = s.text;
      btn.addEventListener('click', function () { handleProspectText(s.text); });
      scenarioGrid.appendChild(btn);
    });
  }

  // ==================== PRACTICE INPUT ====================
  practiceField.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && practiceField.value.trim()) {
      handleProspectText(practiceField.value.trim());
      practiceField.value = '';
    }
  });

  practiceSend.addEventListener('click', function () {
    if (practiceField.value.trim()) {
      handleProspectText(practiceField.value.trim());
      practiceField.value = '';
    }
  });

  // ==================== CORE: PROCESS PROSPECT TEXT ====================
  function handleProspectText(text) {
    emptyHint.classList.add('hidden');
    addTranscriptEntry('prospect', text);

    var match = engine.detect(text);
    if (match) {
      showSuggestion(match);
    }

    suggestionContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function addTranscriptEntry(speaker, text) {
    var entry = document.createElement('div');
    entry.className = 'transcript-entry transcript-entry--' + speaker;

    var label = document.createElement('span');
    label.className = 'speaker-label speaker-label--' + speaker;
    label.textContent = speaker === 'prospect' ? 'Prospect' : 'You';

    var textEl = document.createElement('span');
    textEl.className = 'transcript-text';
    textEl.textContent = text;

    entry.appendChild(label);
    entry.appendChild(textEl);
    transcriptEl.appendChild(entry);
  }

  function showSuggestion(match) {
    var script = match.script;
    var colors = CATEGORY_COLORS[script.category] || { bg: 'rgba(168,85,247,0.15)', text: '#c084fc' };

    suggestionContainer.innerHTML = '';

    var card = document.createElement('div');
    card.className = 'suggestion-card';

    var matchLabel = '';
    if (match.matchType === 'keyword') {
      matchLabel = '<span class="match-type match-type--keyword">Keyword Match</span>';
    } else if (match.matchType === 'bridge') {
      matchLabel = '<span class="match-type match-type--bridge">Smart Response</span>';
    }

    var triggerHtml = '';
    if (match.matchType === 'exact') {
      triggerHtml = '<div class="suggestion-card__trigger">Matched: "' + escapeHtml(match.matchedPattern) + '"</div>';
    } else if (match.matchType === 'keyword') {
      triggerHtml = '<div class="suggestion-card__trigger">Keywords matched: ' + escapeHtml(match.matchedPattern) + '</div>';
    } else {
      triggerHtml = '<div class="suggestion-card__trigger">Responding to: "' + escapeHtml(match.triggerText) + '"</div>';
    }

    card.innerHTML =
      '<div class="suggestion-card__header">' +
        '<span class="objection-badge" style="background:' + colors.bg + ';color:' + colors.text + '">' +
          escapeHtml(script.label) +
        '</span>' +
        matchLabel +
      '</div>' +
      '<div class="suggestion-card__say-label">SAY THIS:</div>' +
      '<div class="suggestion-card__script">' + escapeHtml(script.script) + '</div>' +
      triggerHtml;

    suggestionContainer.appendChild(card);
  }

  // ==================== SCRIPT LIBRARY ====================
  function renderScriptLibrary() {
    var leadType = leadSelect.value;
    var scripts = engine.getScriptsForLeadType(leadType);
    scriptLibrary.innerHTML = '';

    scripts.forEach(function (s) {
      var card = document.createElement('div');
      card.className = 'script-card';

      var leadTags = (s.leadTypes || [])
        .map(function (lt) { return '<span class="script-card__lead-tag">' + (LEAD_TYPE_LABELS[lt] || lt) + '</span>'; })
        .join(' ');

      var topPatterns = s.patterns.slice(0, 5).map(function (p) { return '"' + p + '"'; }).join(', ');

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

  // ==================== VOICE ROLEPLAY MODE ====================
  var voiceSetup = document.getElementById('voice-setup');
  var voiceCall = document.getElementById('voice-call');
  var voiceSummary = document.getElementById('voice-summary');
  var voiceStart = document.getElementById('voice-start');
  var voiceEnd = document.getElementById('voice-end');
  var voiceRetry = document.getElementById('voice-retry');
  var voiceConversation = document.getElementById('voice-conversation');
  var voiceCoach = document.getElementById('voice-coach');
  var voiceCoachScript = document.getElementById('voice-coach-script');
  var voiceName = document.getElementById('voice-name');
  var voiceLeadTag = document.getElementById('voice-lead-tag');
  var voiceTimerEl = document.getElementById('voice-timer');
  var voiceInterim = document.getElementById('voice-interim');
  var micIcon = document.getElementById('mic-icon');
  var micStatusText = document.getElementById('mic-status-text');
  var summaryTitle = document.getElementById('summary-title');
  var summaryResult = document.getElementById('summary-result');
  var summaryStats = document.getElementById('summary-stats');
  var diffBtns = document.querySelectorAll('.diff-btn');

  var prospect = null;
  var recognition = null;
  var voiceTimerInterval = null;
  var voiceStartTime = null;
  var selectedDifficulty = 'medium';
  var isVoiceCallActive = false;
  var isProspectSpeaking = false;
  var pendingAgentText = '';

  // Difficulty buttons
  diffBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      diffBtns.forEach(function (b) { b.classList.remove('diff-btn--active'); });
      btn.classList.add('diff-btn--active');
      selectedDifficulty = btn.dataset.diff;
    });
  });

  // Start voice call
  voiceStart.addEventListener('click', startVoiceCall);
  voiceEnd.addEventListener('click', endVoiceCall);
  voiceRetry.addEventListener('click', function () {
    voiceSummary.classList.add('hidden');
    voiceSetup.classList.remove('hidden');
  });

  function startVoiceCall() {
    // Determine lead type — default to expired if none selected
    var leadType = leadSelect.value || 'expired';
    if (!leadSelect.value) leadSelect.value = 'expired';

    prospect = new ProspectAI(leadType, selectedDifficulty);
    isVoiceCallActive = true;
    pendingAgentText = '';

    // Switch UI
    voiceSetup.classList.add('hidden');
    voiceSummary.classList.add('hidden');
    voiceCall.classList.remove('hidden');
    voiceCoach.classList.add('hidden');
    voiceConversation.innerHTML = '';
    voiceInterim.textContent = '';

    // Set prospect info
    voiceName.textContent = prospect.prospectName;
    voiceLeadTag.textContent = LEAD_TYPE_LABELS[leadType] || leadType;

    // Start timer
    voiceStartTime = Date.now();
    voiceTimerEl.textContent = '00:00';
    voiceTimerInterval = setInterval(function () {
      var s = Math.floor((Date.now() - voiceStartTime) / 1000);
      voiceTimerEl.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }, 1000);

    // Phone ringing effect then prospect greeting
    addVoiceBubble('system', 'Calling ' + prospect.prospectName + '...');

    setTimeout(function () {
      if (!isVoiceCallActive) return;
      addVoiceBubble('system', 'Connected');
      var greeting = prospect.getGreeting();

      setTimeout(function () {
        if (!isVoiceCallActive) return;
        prospectSays(greeting);
      }, 800);
    }, 1500);
  }

  function prospectSays(text) {
    isProspectSpeaking = true;
    micStatusText.textContent = 'Prospect speaking...';
    micIcon.classList.remove('mic-icon--listening');
    micIcon.classList.add('mic-icon--prospect');

    addVoiceBubble('prospect', text);

    // Detect objection and show coaching
    var match = engine.detect(text);
    if (match) {
      voiceCoach.classList.remove('hidden');
      voiceCoachScript.textContent = match.script.script;
      voiceCoach.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Speak it via TTS
    speakText(text, function () {
      if (!isVoiceCallActive) return;
      isProspectSpeaking = false;

      // Check if call is over
      if (prospect.appointmentSet || prospect.hungUp) {
        setTimeout(function () { endVoiceCall(); }, 1000);
        return;
      }

      // Start listening
      startListening();
    });
  }

  function agentSaid(text) {
    if (!text.trim() || !isVoiceCallActive) return;

    addVoiceBubble('agent', text);

    // Get prospect response
    var response = prospect.respond(text);
    if (response) {
      // Small pause before prospect responds
      setTimeout(function () {
        if (!isVoiceCallActive) return;
        prospectSays(response);
      }, 1200);
    } else {
      // Conversation ended
      setTimeout(function () { endVoiceCall(); }, 1000);
    }
  }

  function endVoiceCall() {
    isVoiceCallActive = false;
    stopListening();
    window.speechSynthesis.cancel();

    if (voiceTimerInterval) {
      clearInterval(voiceTimerInterval);
      voiceTimerInterval = null;
    }

    // Get summary
    var summary = prospect ? prospect.getCallSummary() : null;

    voiceCall.classList.add('hidden');
    voiceSummary.classList.remove('hidden');

    if (summary) {
      var duration = voiceStartTime ? Math.floor((Date.now() - voiceStartTime) / 1000) : 0;
      var mins = Math.floor(duration / 60);
      var secs = duration % 60;

      if (summary.result === 'appointment') {
        summaryTitle.textContent = 'Appointment Set!';
        summaryTitle.style.color = 'var(--accent-green)';
        summaryResult.innerHTML =
          '<div class="summary-badge summary-badge--success">SUCCESS</div>' +
          '<p>' + escapeHtml(summary.prospectName) + ' agreed to an appointment!</p>';
      } else if (summary.result === 'hung_up') {
        summaryTitle.textContent = 'Prospect Hung Up';
        summaryTitle.style.color = 'var(--accent-red)';
        summaryResult.innerHTML =
          '<div class="summary-badge summary-badge--fail">HUNG UP</div>' +
          '<p>' + escapeHtml(summary.prospectName) + ' ended the call.</p>';
      } else {
        summaryTitle.textContent = 'Call Ended';
        summaryTitle.style.color = 'var(--text-primary)';
        summaryResult.innerHTML =
          '<div class="summary-badge summary-badge--neutral">ENDED</div>' +
          '<p>The conversation ended without a clear outcome.</p>';
      }

      summaryStats.innerHTML =
        '<div class="summary-stat"><span class="summary-stat__label">Duration</span><span class="summary-stat__value">' + mins + 'm ' + secs + 's</span></div>' +
        '<div class="summary-stat"><span class="summary-stat__label">Exchanges</span><span class="summary-stat__value">' + summary.turns + '</span></div>' +
        '<div class="summary-stat"><span class="summary-stat__label">Lead Type</span><span class="summary-stat__value">' + (LEAD_TYPE_LABELS[summary.leadType] || summary.leadType) + '</span></div>' +
        '<div class="summary-stat"><span class="summary-stat__label">Difficulty</span><span class="summary-stat__value">' + summary.difficulty.charAt(0).toUpperCase() + summary.difficulty.slice(1) + '</span></div>';
    }
  }

  // ==================== SPEECH RECOGNITION (STT) ====================
  function startListening() {
    if (!isVoiceCallActive || isProspectSpeaking) return;

    micStatusText.textContent = 'Listening... speak your response';
    micIcon.classList.add('mic-icon--listening');
    micIcon.classList.remove('mic-icon--prospect');
    voiceInterim.textContent = '';
    voiceCoach.classList.remove('hidden');

    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      micStatusText.textContent = 'Speech not supported — type below';
      showVoiceFallbackInput();
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    var finalText = '';
    var silenceTimer = null;

    recognition.onresult = function (event) {
      var interim = '';
      finalText = '';

      for (var i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      voiceInterim.textContent = interim || finalText;

      // Reset silence timer
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(function () {
        // User stopped speaking for 2 seconds
        if (finalText.trim() || interim.trim()) {
          var text = (finalText + ' ' + interim).trim();
          recognition.stop();
          voiceInterim.textContent = '';
          agentSaid(text);
        }
      }, 2000);
    };

    recognition.onerror = function (event) {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        micStatusText.textContent = 'Microphone blocked — check permissions';
        showVoiceFallbackInput();
      } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
        micStatusText.textContent = 'Listening...';
      }
    };

    recognition.onend = function () {
      // If call is still active and we didn't get text, restart
      if (isVoiceCallActive && !isProspectSpeaking) {
        var text = voiceInterim.textContent.trim();
        if (text) {
          voiceInterim.textContent = '';
          agentSaid(text);
        } else {
          // Try restarting recognition
          try {
            recognition.start();
          } catch (e) {
            // Already started or ended — ignore
          }
        }
      }
    };

    try {
      recognition.start();
    } catch (e) {
      micStatusText.textContent = 'Could not start mic';
      showVoiceFallbackInput();
    }
  }

  function stopListening() {
    if (recognition) {
      try { recognition.stop(); } catch (e) { /* ignore */ }
      recognition = null;
    }
  }

  function showVoiceFallbackInput() {
    // Show a text input as fallback when mic doesn't work
    var existing = document.getElementById('voice-fallback');
    if (existing) return;

    var row = document.createElement('div');
    row.className = 'practice-input__row';
    row.id = 'voice-fallback';
    row.innerHTML =
      '<input type="text" class="practice-input__field" id="voice-fallback-field" placeholder="Type your response here..." autocomplete="off">' +
      '<button class="btn btn--send" id="voice-fallback-send">' +
        '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">' +
          '<path d="M1.7 1.2l13 6.3a.5.5 0 010 .9l-13 6.3a.5.5 0 01-.7-.6L3 8 1 2a.5.5 0 01.7-.8z"/>' +
        '</svg>' +
      '</button>';

    var micBar = document.getElementById('voice-mic-bar');
    micBar.parentNode.insertBefore(row, micBar.nextSibling);

    var field = document.getElementById('voice-fallback-field');
    var sendBtn = document.getElementById('voice-fallback-send');

    field.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && field.value.trim()) {
        agentSaid(field.value.trim());
        field.value = '';
      }
    });
    sendBtn.addEventListener('click', function () {
      if (field.value.trim()) {
        agentSaid(field.value.trim());
        field.value = '';
      }
    });

    field.focus();
  }

  // ==================== TEXT-TO-SPEECH (TTS) ====================
  function speakText(text, onDone) {
    if (!window.speechSynthesis) {
      if (onDone) setTimeout(onDone, 1500);
      return;
    }

    window.speechSynthesis.cancel();

    var utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to pick a natural voice
    var voices = window.speechSynthesis.getVoices();
    var preferred = voices.find(function (v) {
      return v.lang.startsWith('en') && v.name.toLowerCase().includes('natural');
    }) || voices.find(function (v) {
      return v.lang.startsWith('en-US');
    }) || voices.find(function (v) {
      return v.lang.startsWith('en');
    });

    if (preferred) utterance.voice = preferred;

    utterance.onend = function () {
      if (onDone) onDone();
    };
    utterance.onerror = function () {
      if (onDone) onDone();
    };

    window.speechSynthesis.speak(utterance);
  }

  // Pre-load voices (Chrome loads them async)
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = function () {
      window.speechSynthesis.getVoices();
    };
  }

  // ==================== VOICE CONVERSATION BUBBLES ====================
  function addVoiceBubble(speaker, text) {
    var bubble = document.createElement('div');
    bubble.className = 'voice-bubble voice-bubble--' + speaker;

    if (speaker === 'system') {
      bubble.innerHTML = '<span class="voice-bubble__system">' + escapeHtml(text) + '</span>';
    } else {
      var labelText = speaker === 'prospect' ? prospect.prospectName : 'You';
      bubble.innerHTML =
        '<div class="voice-bubble__header">' +
          '<span class="voice-bubble__name voice-bubble__name--' + speaker + '">' + escapeHtml(labelText) + '</span>' +
        '</div>' +
        '<div class="voice-bubble__text">' + escapeHtml(text) + '</div>';
    }

    voiceConversation.appendChild(bubble);
    voiceConversation.scrollTop = voiceConversation.scrollHeight;
  }

  // ==================== LIVE CALL MODE (uses server) ====================
  var WS_BASE_URL = 'ws://localhost:3000';
  var MSG = {
    START_CALL: 'start-call',
    STOP_CALL: 'stop-call',
    GET_STATUS: 'get-status',
    CALL_STATUS: 'call-status',
    PAUSE_CALL: 'pause-call',
    RESUME_CALL: 'resume-call',
  };

  var resultsWs = null;
  var sessionId = null;
  var isCallActive = false;

  var btnStart = document.getElementById('btn-start');
  var btnStop = document.getElementById('btn-stop');
  var btnPause = document.getElementById('btn-pause');
  var callTimer = document.getElementById('call-timer');
  var liveSetup = document.getElementById('live-setup');
  var transcriptLive = document.getElementById('transcript-live');
  var transcriptSectionLive = document.getElementById('transcript-section-live');
  var suggestionSectionLive = document.getElementById('suggestion-section-live');
  var suggestionContainerLive = document.getElementById('suggestion-container-live');
  var costBar = document.getElementById('cost-bar');
  var costAmount = document.getElementById('cost-amount');
  var costDetail = document.getElementById('cost-detail');
  var timerInterval = null;

  btnStart.addEventListener('click', startLiveCall);
  btnStop.addEventListener('click', stopLiveCall);

  function startLiveCall() {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      alert('Live Call requires running as a Chrome extension.\n\nUse Voice Roleplay or Practice mode instead.');
      return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var tab = tabs[0];
      if (!tab) return;

      btnStart.disabled = true;
      btnStart.textContent = 'Starting...';

      chrome.runtime.sendMessage(
        { type: MSG.START_CALL, tabId: tab.id, leadType: leadSelect.value },
        function (response) {
          btnStart.disabled = false;
          if (chrome.runtime.lastError) {
            alert('Error: ' + chrome.runtime.lastError.message + '\n\nMake sure you\'re on your dialer tab (not a chrome:// page) and click the extension icon first.');
            resetStartBtn();
            return;
          }
          if (response && response.success) {
            sessionId = response.sessionId;
            onLiveCallStarted();
          } else {
            alert('Failed to start call: ' + (response && response.error || 'Unknown error') + '\n\nMake sure:\n1. You\'re on your dialer website (not chrome:// pages)\n2. The server is running (cd server && npm run dev)');
            resetStartBtn();
          }
        }
      );
    });
  }

  function resetStartBtn() {
    btnStart.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.6 10.3l-2.8-1.2a.7.7 0 00-.7.1l-1.3 1.1a.4.4 0 01-.4 0A10 10 0 015.7 7.6a.4.4 0 010-.4L6.8 5.9a.7.7 0 00.1-.7L5.7 2.4a.7.7 0 00-.8-.4l-2.4.6A.7.7 0 002 3.3 12.1 12.1 0 0012.7 14a.7.7 0 00.7-.5l.6-2.4a.7.7 0 00-.4-.8z"/></svg> Start Call';
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
    startLiveTimer();
    connectLiveWs();
  }

  function stopLiveCall() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: MSG.STOP_CALL });
    }
    isCallActive = false;
    liveSetup.classList.remove('hidden');
    btnStart.classList.remove('hidden');
    btnStop.classList.add('hidden');
    btnPause.classList.add('hidden');
    callTimer.classList.add('hidden');
    stopLiveTimer();
    if (resultsWs) { resultsWs.close(); resultsWs = null; }
  }

  function connectLiveWs() {
    var url = WS_BASE_URL + '/ws/results?sessionId=' + sessionId;
    if (leadSelect.value) url += '&leadType=' + leadSelect.value;
    resultsWs = new WebSocket(url);
    resultsWs.onmessage = function (event) {
      try {
        var msg = JSON.parse(event.data);
        handleLiveMessage(msg);
      } catch (e) { /* ignore */ }
    };
    resultsWs.onclose = function () {
      if (isCallActive) setTimeout(connectLiveWs, 2000);
    };
  }

  function handleLiveMessage(msg) {
    if (msg.type === 'transcript_final') {
      var entry = document.createElement('div');
      entry.className = 'transcript-entry transcript-entry--' + msg.speaker;
      entry.innerHTML =
        '<span class="speaker-label speaker-label--' + msg.speaker + '">' +
        (msg.speaker === 'prospect' ? 'Prospect' : 'You') + '</span>' +
        '<span class="transcript-text">' + escapeHtml(msg.text) + '</span>';
      transcriptLive.appendChild(entry);
      transcriptLive.scrollTop = transcriptLive.scrollHeight;
    }
    if (msg.type === 'suggestion_start') {
      var colors = CATEGORY_COLORS[msg.objectionType] || { bg: 'rgba(168,85,247,0.15)', text: '#c084fc' };
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
      var card = suggestionContainerLive.querySelector('.suggestion-card__script');
      if (card) card.textContent = msg.fullScript;
    }
    if (msg.type === 'cost_update') {
      costAmount.textContent = '$' + ((msg.estimatedCostCents || 0) / 100).toFixed(2);
      costDetail.textContent = (msg.claudeCalls || 0) + ' AI calls';
    }
  }

  function startLiveTimer() {
    var start = Date.now();
    callTimer.textContent = '00:00';
    timerInterval = setInterval(function () {
      var s = Math.floor((Date.now() - start) / 1000);
      callTimer.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }, 1000);
  }
  function stopLiveTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  // Listen for call status from service worker
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function (message) {
      if (message.type === MSG.CALL_STATUS && !message.isCapturing && isCallActive) {
        stopLiveCall();
      }
    });
  }

  // ==================== UTILS ====================
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ==================== INIT ====================
  renderScenarios();
  practiceField.focus();
})();
