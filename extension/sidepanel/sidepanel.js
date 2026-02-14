// ========== COLD CALL AI — Main Controller ==========
// Real-time AI sales copilot for real estate cold calling.
// Practice + Voice Roleplay run 100% in browser. Live Call uses server.

(function () {
  var engine = new ObjectionEngine();

  // DOM refs
  var modeTabs = document.querySelectorAll('.mode-tab');
  var modePractice = document.getElementById('mode-practice');
  var modeLive = document.getElementById('mode-live');
  var modeScripts = document.getElementById('mode-scripts');
  var modeVoice = document.getElementById('mode-voice');
  var leadSelect = document.getElementById('lead-type');
  var scenarioGrid = document.getElementById('scenario-grid');
  var practiceField = document.getElementById('practice-field');
  var practiceSend = document.getElementById('practice-send');
  var copilotPractice = document.getElementById('copilot-practice');
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

  // ==================== COPILOT OUTPUT (shared renderer) ====================
  function handleProspectText(text) {
    emptyHint.classList.add('hidden');
    var result = DiagnosisEngine.diagnose(text);
    if (result) {
      renderCopilotOutput(copilotPractice, result);
    }
    copilotPractice.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderCopilotOutput(container, result) {
    container.innerHTML = '';

    var wrap = document.createElement('div');
    wrap.className = 'copilot';

    // -- Prospect quote
    var quoteEl = document.createElement('div');
    quoteEl.className = 'copilot__quote';
    quoteEl.innerHTML =
      '<span class="copilot__quote-icon">"</span>' +
      '<span class="copilot__quote-text">' + esc(result.prospectText) + '</span>';
    wrap.appendChild(quoteEl);

    // -- Signal badge
    if (result.signal) {
      var signalEl = document.createElement('div');
      signalEl.className = 'copilot__signal';
      signalEl.innerHTML =
        '<span class="copilot__signal-label">Signal</span>' +
        '<span class="copilot__signal-value">' + esc(result.signal.label) + '</span>';
      wrap.appendChild(signalEl);
    }

    // -- Diagnosis
    var diagEl = document.createElement('div');
    diagEl.className = 'copilot__diagnosis';
    diagEl.innerHTML =
      '<div class="copilot__diagnosis-label">Diagnosis</div>' +
      '<div class="copilot__diagnosis-text">' + esc(result.diagnosis) + '</div>';
    wrap.appendChild(diagEl);

    // -- Response Options
    var optsEl = document.createElement('div');
    optsEl.className = 'copilot__options';
    optsEl.innerHTML = '<div class="copilot__options-label">Options</div>';

    result.options.forEach(function (opt, idx) {
      var optEl = document.createElement('div');
      optEl.className = 'copilot__option' + (idx === 0 ? ' copilot__option--recommended' : '');

      optEl.innerHTML =
        '<div class="copilot__option-header">' +
          '<span class="copilot__option-name">' + esc(opt.label) + '</span>' +
          (idx === 0 ? '<span class="copilot__option-badge">Recommended</span>' : '') +
        '</div>' +
        '<div class="copilot__option-script">' + esc(opt.script) + '</div>' +
        '<div class="copilot__option-why"><span class="why-label">Why:</span> ' + esc(opt.why) + '</div>';

      // Click to expand/select
      var header = optEl.querySelector('.copilot__option-header');
      var scriptDiv = optEl.querySelector('.copilot__option-script');
      var whyDiv = optEl.querySelector('.copilot__option-why');

      if (idx !== 0) {
        scriptDiv.classList.add('collapsed');
        whyDiv.classList.add('collapsed');
      }

      header.style.cursor = 'pointer';
      header.addEventListener('click', function () {
        scriptDiv.classList.toggle('collapsed');
        whyDiv.classList.toggle('collapsed');
      });

      optsEl.appendChild(optEl);
    });

    wrap.appendChild(optsEl);

    // -- Battle Card
    if (result.battleCard) {
      var bcEl = document.createElement('div');
      bcEl.className = 'copilot__battlecard';
      bcEl.innerHTML =
        '<div class="copilot__bc-header">' +
          '<span class="copilot__bc-flag">vs</span>' +
          '<span class="copilot__bc-name">' + esc(result.battleCard.competitor) + '</span>' +
        '</div>';

      result.battleCard.angles.forEach(function (angle) {
        var aEl = document.createElement('div');
        aEl.className = 'copilot__bc-angle';
        aEl.innerHTML =
          '<div class="copilot__bc-angle-title">' + esc(angle.title) + '</div>' +
          '<div class="copilot__bc-angle-text">' + esc(angle.text) + '</div>';
        bcEl.appendChild(aEl);
      });

      wrap.appendChild(bcEl);
    }

    container.appendChild(wrap);
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
          '<span class="script-card__label">' + esc(s.label) + '</span>' +
          leadTags +
        '</div>' +
        '<div class="script-card__patterns">Triggers: ' + esc(topPatterns) + '</div>' +
        '<div class="script-card__body">' + esc(s.script) + '</div>';
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

  diffBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      diffBtns.forEach(function (b) { b.classList.remove('diff-btn--active'); });
      btn.classList.add('diff-btn--active');
      selectedDifficulty = btn.dataset.diff;
    });
  });

  voiceStart.addEventListener('click', startVoiceCall);
  voiceEnd.addEventListener('click', endVoiceCall);
  voiceRetry.addEventListener('click', function () {
    voiceSummary.classList.add('hidden');
    voiceSetup.classList.remove('hidden');
  });

  function startVoiceCall() {
    var leadType = leadSelect.value || 'expired';
    if (!leadSelect.value) leadSelect.value = 'expired';
    prospect = new ProspectAI(leadType, selectedDifficulty);
    isVoiceCallActive = true;

    voiceSetup.classList.add('hidden');
    voiceSummary.classList.add('hidden');
    voiceCall.classList.remove('hidden');
    voiceCoach.classList.add('hidden');
    voiceConversation.innerHTML = '';
    voiceInterim.textContent = '';
    voiceName.textContent = prospect.prospectName;
    voiceLeadTag.textContent = LEAD_TYPE_LABELS[leadType] || leadType;

    voiceStartTime = Date.now();
    voiceTimerEl.textContent = '00:00';
    voiceTimerInterval = setInterval(function () {
      var s = Math.floor((Date.now() - voiceStartTime) / 1000);
      voiceTimerEl.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }, 1000);

    addVoiceBubble('system', 'Calling ' + prospect.prospectName + '...');
    setTimeout(function () {
      if (!isVoiceCallActive) return;
      addVoiceBubble('system', 'Connected');
      setTimeout(function () {
        if (!isVoiceCallActive) return;
        prospectSays(prospect.getGreeting());
      }, 800);
    }, 1500);
  }

  function prospectSays(text) {
    isProspectSpeaking = true;
    micStatusText.textContent = 'Prospect speaking...';
    micIcon.classList.remove('mic-icon--listening');
    micIcon.classList.add('mic-icon--prospect');
    addVoiceBubble('prospect', text);

    var match = engine.detect(text);
    if (match) {
      voiceCoach.classList.remove('hidden');
      voiceCoachScript.textContent = match.script.script;
      voiceCoach.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    speakText(text, function () {
      if (!isVoiceCallActive) return;
      isProspectSpeaking = false;
      if (prospect.appointmentSet || prospect.hungUp) {
        setTimeout(endVoiceCall, 1000);
        return;
      }
      startListening();
    });
  }

  function agentSaid(text) {
    if (!text.trim() || !isVoiceCallActive) return;
    addVoiceBubble('agent', text);
    var response = prospect.respond(text);
    if (response) {
      setTimeout(function () {
        if (!isVoiceCallActive) return;
        prospectSays(response);
      }, 1200);
    } else {
      setTimeout(endVoiceCall, 1000);
    }
  }

  function endVoiceCall() {
    isVoiceCallActive = false;
    stopListening();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (voiceTimerInterval) { clearInterval(voiceTimerInterval); voiceTimerInterval = null; }

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
        summaryResult.innerHTML = '<div class="summary-badge summary-badge--success">SUCCESS</div><p>' + esc(summary.prospectName) + ' agreed to an appointment!</p>';
      } else if (summary.result === 'hung_up') {
        summaryTitle.textContent = 'Prospect Hung Up';
        summaryTitle.style.color = 'var(--accent-red)';
        summaryResult.innerHTML = '<div class="summary-badge summary-badge--fail">HUNG UP</div><p>' + esc(summary.prospectName) + ' ended the call.</p>';
      } else {
        summaryTitle.textContent = 'Call Ended';
        summaryTitle.style.color = 'var(--text-primary)';
        summaryResult.innerHTML = '<div class="summary-badge summary-badge--neutral">ENDED</div><p>The conversation ended without a clear outcome.</p>';
      }

      summaryStats.innerHTML =
        '<div class="summary-stat"><span class="summary-stat__label">Duration</span><span class="summary-stat__value">' + mins + 'm ' + secs + 's</span></div>' +
        '<div class="summary-stat"><span class="summary-stat__label">Exchanges</span><span class="summary-stat__value">' + summary.turns + '</span></div>' +
        '<div class="summary-stat"><span class="summary-stat__label">Lead Type</span><span class="summary-stat__value">' + (LEAD_TYPE_LABELS[summary.leadType] || summary.leadType) + '</span></div>' +
        '<div class="summary-stat"><span class="summary-stat__label">Difficulty</span><span class="summary-stat__value">' + summary.difficulty.charAt(0).toUpperCase() + summary.difficulty.slice(1) + '</span></div>';
    }
  }

  // ==================== SPEECH RECOGNITION ====================
  function startListening() {
    if (!isVoiceCallActive || isProspectSpeaking) return;
    micStatusText.textContent = 'Listening... speak your response';
    micIcon.classList.add('mic-icon--listening');
    micIcon.classList.remove('mic-icon--prospect');
    voiceInterim.textContent = '';
    voiceCoach.classList.remove('hidden');

    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { micStatusText.textContent = 'Speech not supported — type below'; showVoiceFallbackInput(); return; }

    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    var finalText = '';
    var silenceTimer = null;

    recognition.onresult = function (event) {
      var interim = ''; finalText = '';
      for (var i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      voiceInterim.textContent = interim || finalText;
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(function () {
        if (finalText.trim() || interim.trim()) {
          recognition.stop();
          voiceInterim.textContent = '';
          agentSaid((finalText + ' ' + interim).trim());
        }
      }, 2000);
    };

    recognition.onerror = function (event) {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        micStatusText.textContent = 'Microphone blocked — check permissions';
        showVoiceFallbackInput();
      }
    };

    recognition.onend = function () {
      if (isVoiceCallActive && !isProspectSpeaking) {
        var text = voiceInterim.textContent.trim();
        if (text) { voiceInterim.textContent = ''; agentSaid(text); }
        else { try { recognition.start(); } catch (e) {} }
      }
    };

    try { recognition.start(); } catch (e) { micStatusText.textContent = 'Could not start mic'; showVoiceFallbackInput(); }
  }

  function stopListening() {
    if (recognition) { try { recognition.stop(); } catch (e) {} recognition = null; }
  }

  function showVoiceFallbackInput() {
    if (document.getElementById('voice-fallback')) return;
    var row = document.createElement('div');
    row.className = 'practice-input__row'; row.id = 'voice-fallback';
    row.innerHTML = '<input type="text" class="practice-input__field" id="voice-fallback-field" placeholder="Type your response..." autocomplete="off"><button class="btn btn--send" id="voice-fallback-send"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1.7 1.2l13 6.3a.5.5 0 010 .9l-13 6.3a.5.5 0 01-.7-.6L3 8 1 2a.5.5 0 01.7-.8z"/></svg></button>';
    document.getElementById('voice-mic-bar').parentNode.insertBefore(row, document.getElementById('voice-mic-bar').nextSibling);
    var field = document.getElementById('voice-fallback-field');
    field.addEventListener('keydown', function (e) { if (e.key === 'Enter' && field.value.trim()) { agentSaid(field.value.trim()); field.value = ''; } });
    document.getElementById('voice-fallback-send').addEventListener('click', function () { if (field.value.trim()) { agentSaid(field.value.trim()); field.value = ''; } });
    field.focus();
  }

  // ==================== TTS ====================
  function speakText(text, onDone) {
    if (!window.speechSynthesis) { if (onDone) setTimeout(onDone, 1500); return; }
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0;
    var voices = window.speechSynthesis.getVoices();
    var pref = voices.find(function (v) { return v.lang.startsWith('en') && v.name.toLowerCase().includes('natural'); })
      || voices.find(function (v) { return v.lang.startsWith('en-US'); })
      || voices.find(function (v) { return v.lang.startsWith('en'); });
    if (pref) u.voice = pref;
    u.onend = function () { if (onDone) onDone(); };
    u.onerror = function () { if (onDone) onDone(); };
    window.speechSynthesis.speak(u);
  }

  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = function () { window.speechSynthesis.getVoices(); };
  }

  function addVoiceBubble(speaker, text) {
    var bubble = document.createElement('div');
    bubble.className = 'voice-bubble voice-bubble--' + speaker;
    if (speaker === 'system') {
      bubble.innerHTML = '<span class="voice-bubble__system">' + esc(text) + '</span>';
    } else {
      var labelText = speaker === 'prospect' ? prospect.prospectName : 'You';
      bubble.innerHTML = '<div class="voice-bubble__header"><span class="voice-bubble__name voice-bubble__name--' + speaker + '">' + esc(labelText) + '</span></div><div class="voice-bubble__text">' + esc(text) + '</div>';
    }
    voiceConversation.appendChild(bubble);
    voiceConversation.scrollTop = voiceConversation.scrollHeight;
  }

  // ==================== LIVE CALL MODE ====================
  var WS_BASE_URL = 'ws://localhost:3000';
  var MSG = { START_CALL: 'start-call', STOP_CALL: 'stop-call', GET_STATUS: 'get-status', CALL_STATUS: 'call-status', PAUSE_CALL: 'pause-call', RESUME_CALL: 'resume-call' };
  var resultsWs = null, sessionId = null, isCallActive = false;
  var btnStart = document.getElementById('btn-start');
  var btnStop = document.getElementById('btn-stop');
  var btnPause = document.getElementById('btn-pause');
  var callTimer = document.getElementById('call-timer');
  var liveSetup = document.getElementById('live-setup');
  var transcriptLive = document.getElementById('transcript-live');
  var transcriptDetailsLive = document.getElementById('transcript-details-live');
  var liveCopilotArea = document.getElementById('live-copilot-area');
  var liveProspectText = document.getElementById('live-prospect-text');
  var copilotLive = document.getElementById('copilot-live');
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
      var tab = tabs[0]; if (!tab) return;
      btnStart.disabled = true; btnStart.textContent = 'Starting...';
      chrome.runtime.sendMessage(
        { type: MSG.START_CALL, tabId: tab.id, leadType: leadSelect.value },
        function (response) {
          btnStart.disabled = false;
          if (chrome.runtime.lastError) {
            alert('Error: ' + chrome.runtime.lastError.message + '\n\nMake sure you\'re on your dialer tab (not a chrome:// page).');
            resetStartBtn(); return;
          }
          if (response && response.success) {
            sessionId = response.sessionId;
            onLiveCallStarted();
          } else {
            alert('Failed: ' + (response && response.error || 'Unknown') + '\n\nMake sure:\n1. You\'re on your dialer website\n2. Server is running (cd server && npm run dev)');
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
    liveCopilotArea.classList.remove('hidden');
    transcriptDetailsLive.classList.remove('hidden');
    costBar.classList.remove('hidden');
    startLiveTimer();
    connectLiveWs();
  }

  function stopLiveCall() {
    if (typeof chrome !== 'undefined' && chrome.runtime) chrome.runtime.sendMessage({ type: MSG.STOP_CALL });
    isCallActive = false;
    liveSetup.classList.remove('hidden');
    btnStart.classList.remove('hidden');
    btnStop.classList.add('hidden');
    btnPause.classList.add('hidden');
    callTimer.classList.add('hidden');
    liveCopilotArea.classList.add('hidden');
    stopLiveTimer();
    if (resultsWs) { resultsWs.close(); resultsWs = null; }
  }

  function connectLiveWs() {
    var url = WS_BASE_URL + '/ws/results?sessionId=' + sessionId;
    if (leadSelect.value) url += '&leadType=' + leadSelect.value;
    resultsWs = new WebSocket(url);
    resultsWs.onmessage = function (event) { try { handleLiveMessage(JSON.parse(event.data)); } catch (e) {} };
    resultsWs.onclose = function () { if (isCallActive) setTimeout(connectLiveWs, 2000); };
  }

  function handleLiveMessage(msg) {
    // Transcript
    if (msg.type === 'transcript_final') {
      var entry = document.createElement('div');
      entry.className = 'transcript-entry transcript-entry--' + msg.speaker;
      entry.innerHTML = '<span class="speaker-label speaker-label--' + msg.speaker + '">' + (msg.speaker === 'prospect' ? 'Prospect' : 'You') + '</span><span class="transcript-text">' + esc(msg.text) + '</span>';
      transcriptLive.appendChild(entry);
      transcriptLive.scrollTop = transcriptLive.scrollHeight;

      // Run diagnosis on prospect speech
      if (msg.speaker === 'prospect' && msg.text.length > 10) {
        liveProspectText.textContent = '"' + msg.text + '"';
        var result = DiagnosisEngine.diagnose(msg.text);
        if (result) renderCopilotOutput(copilotLive, result);
      }
    }
    // Suggestion from server (AI-adapted)
    if (msg.type === 'suggestion_start') {
      // Server suggestions enhance the local diagnosis
      var serverCard = document.createElement('div');
      serverCard.className = 'copilot__ai-enhanced';
      serverCard.innerHTML = '<div class="copilot__ai-label">AI-Adapted Response</div><div class="copilot__option-script">' + esc(msg.baseScript) + '</div>';
      copilotLive.appendChild(serverCard);
    }
    if (msg.type === 'suggestion_complete') {
      var aiCard = copilotLive.querySelector('.copilot__ai-enhanced .copilot__option-script');
      if (aiCard) aiCard.textContent = msg.fullScript;
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
  function stopLiveTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function (message) {
      if (message.type === MSG.CALL_STATUS && !message.isCapturing && isCallActive) stopLiveCall();
    });
  }

  // ==================== UTILS ====================
  function esc(text) {
    var div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  // ==================== INIT ====================
  renderScenarios();
  practiceField.focus();
})();
