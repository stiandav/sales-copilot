// ========== COLD CALL AI — Main Controller ==========
// Real-time AI sales copilot for real estate cold calling.
// Practice + Voice Roleplay run 100% in browser. Live Call uses server.

// ==================== AUTH GATE ====================
(function () {
  var authGate = document.getElementById('auth-gate');
  var appMain = document.getElementById('app-main');
  var loginForm = document.getElementById('auth-form-login');
  var signupForm = document.getElementById('auth-form-signup');
  var authTabLogin = document.getElementById('auth-tab-login');
  var authTabSignup = document.getElementById('auth-tab-signup');
  var loginEmailInput = document.getElementById('login-email');
  var loginPasswordInput = document.getElementById('login-password');
  var signupEmailInput = document.getElementById('signup-email');
  var signupPasswordInput = document.getElementById('signup-password');
  var btnLogin = document.getElementById('btn-login');
  var btnSignup = document.getElementById('btn-signup');
  var btnGoogle = document.getElementById('btn-google');
  var authStatus = document.getElementById('auth-status');
  var authConfirmMsg = document.getElementById('auth-confirm-msg');
  var authBlocked = document.getElementById('auth-blocked');
  var authToggle = document.getElementById('auth-toggle');
  var btnAuthLogout = document.getElementById('btn-auth-logout');
  var btnHeaderLogout = document.getElementById('btn-header-logout');
  var headerUser = document.getElementById('header-user');

  function showStatus(msg, color) {
    authStatus.textContent = msg;
    authStatus.style.color = color || 'var(--accent-red)';
  }

  function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.textContent = loading ? 'Please wait...' : btn.dataset.label;
  }

  // Store original button labels
  if (btnLogin) btnLogin.dataset.label = btnLogin.textContent;
  if (btnSignup) btnSignup.dataset.label = btnSignup.textContent;

  // Skip auth gate if Supabase isn't configured (dev mode)
  if (!SupabaseAuth.isConfigured()) {
    authGate.classList.add('hidden');
    appMain.classList.remove('hidden');
    initApp();
    return;
  }

  // ---- Toggle login/signup ----
  if (authTabLogin) authTabLogin.addEventListener('click', function () {
    authTabLogin.classList.add('auth-toggle__btn--active');
    authTabSignup.classList.remove('auth-toggle__btn--active');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    authConfirmMsg.classList.add('hidden');
    showStatus('', '');
  });
  if (authTabSignup) authTabSignup.addEventListener('click', function () {
    authTabSignup.classList.add('auth-toggle__btn--active');
    authTabLogin.classList.remove('auth-toggle__btn--active');
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    authConfirmMsg.classList.add('hidden');
    showStatus('', '');
  });

  // ---- After auth succeeds, check subscription/trial then show app ----
  function handleAuthSuccess(user) {
    var email = user.email || (user.user_metadata && user.user_metadata.email) || '';
    showStatus('Checking access...', 'var(--accent-blue)');

    // First check subscription/trial status
    SupabaseAuth.checkSubscription(function (access) {

      // If subscription table doesn't exist yet, fall back to whitelist
      if (access.fallbackToWhitelist) {
        SupabaseAuth.checkWhitelist(email, function (allowed, row) {
          if (allowed) {
            grantAccess(email, null);
          } else {
            showPaywall();
          }
        });
        return;
      }

      if (access.allowed) {
        grantAccess(email, access);
      } else {
        // Not allowed — check whitelist as a manual override
        SupabaseAuth.checkWhitelist(email, function (whitelisted) {
          if (whitelisted) {
            grantAccess(email, { status: 'whitelisted', allowed: true });
          } else {
            showPaywall(access);
          }
        });
      }
    });
  }

  function grantAccess(email, access) {
    authGate.classList.add('hidden');
    appMain.classList.remove('hidden');
    if (headerUser) headerUser.textContent = email;
    showStatus('', '');

    // Show trial badge in header if on trial
    var trialBadge = document.getElementById('trial-badge');
    if (trialBadge && access && access.status === 'trial') {
      trialBadge.textContent = access.daysLeft + 'd left';
      trialBadge.classList.remove('hidden');
    } else if (trialBadge) {
      trialBadge.classList.add('hidden');
    }

    initApp();
  }

  function showPaywall(access) {
    showStatus('', '');
    loginForm.classList.add('hidden');
    signupForm.classList.add('hidden');
    authToggle.classList.add('hidden');
    authConfirmMsg.classList.add('hidden');
    if (btnGoogle) btnGoogle.classList.add('hidden');
    var divider = document.querySelector('.auth-divider');
    if (divider) divider.classList.add('hidden');
    authBlocked.classList.add('hidden');

    // Show upgrade screen
    var upgradeScreen = document.getElementById('upgrade-screen');
    if (upgradeScreen) {
      var pricing = SupabaseAuth.PRICING;
      var title = upgradeScreen.querySelector('.upgrade__title');
      var subtitle = upgradeScreen.querySelector('.upgrade__subtitle');

      if (access && access.status === 'trial_expired') {
        if (title) title.textContent = 'Your free trial has ended';
        if (subtitle) subtitle.textContent = 'Subscribe to keep using Cold Call AI and book more appointments.';
      } else if (access && access.status === 'canceled') {
        if (title) title.textContent = 'Subscription canceled';
        if (subtitle) subtitle.textContent = 'Resubscribe to continue using Cold Call AI.';
      } else if (access && access.status === 'past_due') {
        if (title) title.textContent = 'Payment failed';
        if (subtitle) subtitle.textContent = 'Update your payment method to continue.';
      } else {
        if (title) title.textContent = 'Subscribe to Cold Call AI';
        if (subtitle) subtitle.textContent = 'Start closing more listing appointments today.';
      }

      upgradeScreen.classList.remove('hidden');
    }
  }

  // ---- Email login ----
  if (btnLogin) btnLogin.addEventListener('click', function () {
    var email = loginEmailInput.value.trim();
    var password = loginPasswordInput.value;
    if (!email || !password) { showStatus('Enter your email and password.'); return; }

    setLoading(btnLogin, true);
    SupabaseAuth.signIn(email, password, function (user, error) {
      setLoading(btnLogin, false);
      if (error) { showStatus(error); return; }
      handleAuthSuccess(user);
    });
  });

  // Enter key on password fields
  if (loginPasswordInput) loginPasswordInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') btnLogin.click();
  });
  if (signupPasswordInput) signupPasswordInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') btnSignup.click();
  });

  // ---- Email signup ----
  if (btnSignup) btnSignup.addEventListener('click', function () {
    var email = signupEmailInput.value.trim();
    var password = signupPasswordInput.value;
    if (!email || !password) { showStatus('Enter your email and password.'); return; }
    if (password.length < 6) { showStatus('Password must be at least 6 characters.'); return; }

    setLoading(btnSignup, true);
    SupabaseAuth.signUp(email, password, function (user, error) {
      setLoading(btnSignup, false);
      if (error === 'confirm_email') {
        authConfirmMsg.classList.remove('hidden');
        showStatus('', '');
        return;
      }
      if (error) { showStatus(error); return; }
      handleAuthSuccess(user);
    });
  });

  // ---- Google sign-in ----
  if (btnGoogle) btnGoogle.addEventListener('click', function () {
    showStatus('Opening Google sign-in...', 'var(--accent-blue)');
    SupabaseAuth.signInWithGoogle(function (user, error) {
      if (error) { showStatus(error); return; }
      handleAuthSuccess(user);
    });
  });

  // ---- Reset auth gate to login form ----
  function resetToLoginForm() {
    authBlocked.classList.add('hidden');
    var upgradeScreen = document.getElementById('upgrade-screen');
    if (upgradeScreen) upgradeScreen.classList.add('hidden');
    authToggle.classList.remove('hidden');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    if (btnGoogle) btnGoogle.classList.remove('hidden');
    var divider = document.querySelector('.auth-divider');
    if (divider) divider.classList.remove('hidden');
    authTabLogin.classList.add('auth-toggle__btn--active');
    authTabSignup.classList.remove('auth-toggle__btn--active');
  }

  // ---- Sign out (from blocked screen) ----
  if (btnAuthLogout) btnAuthLogout.addEventListener('click', function () {
    SupabaseAuth.signOut(function () {
      resetToLoginForm();
      showStatus('', '');
    });
  });

  // ---- Sign out (from upgrade screen) ----
  var btnUpgradeLogout = document.getElementById('btn-upgrade-logout');
  if (btnUpgradeLogout) btnUpgradeLogout.addEventListener('click', function () {
    SupabaseAuth.signOut(function () {
      resetToLoginForm();
      showStatus('Signed out.', 'var(--text-dim)');
    });
  });

  // ---- Upgrade buttons ----
  var btnUpgradeMonthly = document.getElementById('btn-upgrade-monthly');
  var btnUpgradeAnnual = document.getElementById('btn-upgrade-annual');
  if (btnUpgradeMonthly) btnUpgradeMonthly.addEventListener('click', function () {
    SupabaseAuth.openCheckout('monthly');
  });
  if (btnUpgradeAnnual) btnUpgradeAnnual.addEventListener('click', function () {
    SupabaseAuth.openCheckout('annual');
  });

  // ---- Sign out (from header) ----
  if (btnHeaderLogout) btnHeaderLogout.addEventListener('click', function () {
    SupabaseAuth.signOut(function () {
      appMain.classList.add('hidden');
      authGate.classList.remove('hidden');
      resetToLoginForm();
      showStatus('Signed out.', 'var(--text-dim)');
    });
  });

  // ---- Auto-login: check for existing session ----
  showStatus('Loading...', 'var(--text-dim)');
  SupabaseAuth.loadSession(function (user) {
    if (user) {
      handleAuthSuccess(user);
    } else {
      showStatus('', '');
    }
  });
})();

// ==================== MAIN APP ====================
function initApp() {
  // Prevent double-init
  if (window._appInitialized) return;
  window._appInitialized = true;

(function () {
  var engine = new ObjectionEngine();

  // DOM refs
  var modeTabs = document.querySelectorAll('.mode-tab');
  var modePractice = document.getElementById('mode-practice');
  var modeLive = document.getElementById('mode-live');
  var modeScripts = document.getElementById('mode-scripts');
  var modeSetup = document.getElementById('mode-setup');
  var leadSelect = document.getElementById('lead-type');
  var scenarioGrid = document.getElementById('scenario-grid');
  var practiceField = document.getElementById('practice-field');
  var practiceSend = document.getElementById('practice-send');
  var copilotPractice = document.getElementById('copilot-practice');
  var emptyHint = document.getElementById('empty-hint-practice');
  var scriptLibrary = document.getElementById('script-library');

  // Practice sub-sections
  var practiceTextSection = document.getElementById('practice-text-section');
  var practiceVoiceSection = document.getElementById('practice-voice-section');
  var subTextBtn = document.getElementById('sub-text');
  var subVoiceBtn = document.getElementById('sub-voice');

  var modes = {
    practice: modePractice,
    live: modeLive,
    scripts: modeScripts,
    setup: modeSetup,
  };

  // ---- Agent Profile + Custom Scripts state ----
  var agentProfile = { name: '', team: '', area: 'San Diego County', calendarLink: '', valueProp: '' };
  var customScripts = []; // Array of {label, category, objection, script, source}

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
      if (mode === 'setup') renderSavedScripts();
    });
  });

  // ---- Practice sub-toggle (Text / Voice Roleplay) ----
  function switchPracticeSub(sub) {
    if (sub === 'voice') {
      practiceTextSection.classList.add('hidden');
      practiceVoiceSection.classList.remove('hidden');
      subTextBtn.classList.remove('practice-toggle__btn--active');
      subVoiceBtn.classList.add('practice-toggle__btn--active');
    } else {
      practiceTextSection.classList.remove('hidden');
      practiceVoiceSection.classList.add('hidden');
      subTextBtn.classList.add('practice-toggle__btn--active');
      subVoiceBtn.classList.remove('practice-toggle__btn--active');
    }
  }
  subTextBtn.addEventListener('click', function () { switchPracticeSub('text'); });
  subVoiceBtn.addEventListener('click', function () { switchPracticeSub('voice'); });

  leadSelect.addEventListener('change', function () {
    renderScenarios();
    renderScriptLibrary();
    buildQuickTapGrid();
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
        .map(function (lt) { var labels = typeof LEAD_TYPE_LABELS !== 'undefined' ? LEAD_TYPE_LABELS : {}; return '<span class="script-card__lead-tag">' + (labels[lt] || lt) + '</span>'; })
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
    voiceLeadTag.textContent = (typeof LEAD_TYPE_LABELS !== 'undefined' && LEAD_TYPE_LABELS[leadType]) || leadType;

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
        '<div class="summary-stat"><span class="summary-stat__label">Lead Type</span><span class="summary-stat__value">' + ((typeof LEAD_TYPE_LABELS !== 'undefined' && LEAD_TYPE_LABELS[summary.leadType]) || summary.leadType) + '</span></div>' +
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
  var MSG_LIVE = {
    START_CALL: 'start-call',
    START_CALL_DIRECT: 'start-call-direct',
    STOP_CALL: 'stop-call',
    CALL_STATUS: 'call-status',
    TRANSCRIPTION: 'transcription',
    CAPTURE_ERROR: 'capture-error',
  };

  // DOM refs
  var btnLiveStart = document.getElementById('btn-live-start');
  var btnLiveEnd = document.getElementById('btn-live-end');
  var btnLiveNext = document.getElementById('btn-live-next');
  var btnLiveAppt = document.getElementById('btn-live-appt');
  var liveSetup = document.getElementById('live-setup');
  var liveTimer = document.getElementById('live-timer');
  var sessionCallsEl = document.getElementById('session-calls');
  var sessionApptsEl = document.getElementById('session-appts');
  var listenModeIndicator = document.getElementById('listen-mode-indicator');
  var openingCard = document.getElementById('opening-card');
  var openingScriptEl = document.getElementById('opening-script');
  var openingFollowUp = document.getElementById('opening-followup');
  var openingFollowUpBtn = document.getElementById('opening-followup-btn');
  var sayThis = document.getElementById('say-this');
  var sayThisScript = document.getElementById('say-this-script');
  var sayThisSignal = document.getElementById('say-this-signal');
  var sayThisMore = document.getElementById('say-this-more');
  var sayThisOptions = document.getElementById('say-this-options');
  var closeCard = document.getElementById('close-card');
  var closeScriptEl = document.getElementById('close-script');
  var quickTap = document.getElementById('quick-tap');
  var quickTapGrid = document.getElementById('quick-tap-grid');
  var quickTapCloseBtn = document.getElementById('quick-tap-close');
  var listenBar = document.getElementById('listen-bar');
  var listenBarText = document.getElementById('listen-bar-text');
  var listenBarInterim = document.getElementById('listen-bar-interim');

  // Settings DOM
  var modeMicBtn = document.getElementById('mode-mic-btn');
  var modeTabBtn = document.getElementById('mode-tab-btn');
  var listenModeDesc = document.getElementById('listen-mode-desc');
  var apiKeySection = document.getElementById('api-key-section');
  var deepgramKeyInput = document.getElementById('deepgram-key-input');
  var saveKeyBtn = document.getElementById('save-key-btn');
  var keyStatus = document.getElementById('key-status');

  // Close script buttons
  var closeSoftBtn = document.getElementById('close-soft');
  var closeCalendarBtn = document.getElementById('close-calendar');
  var closeConfirmBtn = document.getElementById('close-confirm');

  // State
  var isLiveActive = false;
  var liveTimerInterval = null;
  var liveStartTime = null;
  var sessionCalls = 0;
  var sessionAppts = 0;
  var listenMode = 'mic'; // 'mic' or 'tab'
  var liveRecognition = null;
  var savedApiKey = '';

  // ---- Load saved settings ----
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['listenMode', 'deepgramKey'], function (data) {
      if (data.listenMode) {
        listenMode = data.listenMode;
        updateListenModeUI();
      }
      if (data.deepgramKey) {
        savedApiKey = data.deepgramKey;
        if (deepgramKeyInput) deepgramKeyInput.value = '••••••••••••';
      }
    });
  }

  // ---- Listen mode toggle ----
  function updateListenModeUI() {
    if (modeMicBtn) modeMicBtn.classList.toggle('listen-mode-btn--active', listenMode === 'mic');
    if (modeTabBtn) modeTabBtn.classList.toggle('listen-mode-btn--active', listenMode === 'tab');
    if (apiKeySection) apiKeySection.classList.toggle('hidden', listenMode !== 'tab');
    if (listenModeDesc) {
      listenModeDesc.textContent = listenMode === 'mic'
        ? 'Uses your microphone — works with any call. Put prospect on speaker.'
        : 'Captures audio directly from your dialer tab. Best for headset users. Requires Deepgram API key.';
    }
    if (listenModeIndicator) listenModeIndicator.textContent = listenMode === 'mic' ? 'MIC' : 'TAB';
  }

  if (modeMicBtn) modeMicBtn.addEventListener('click', function () {
    listenMode = 'mic'; updateListenModeUI();
    if (typeof chrome !== 'undefined' && chrome.storage) chrome.storage.local.set({ listenMode: 'mic' });
  });
  if (modeTabBtn) modeTabBtn.addEventListener('click', function () {
    listenMode = 'tab'; updateListenModeUI();
    if (typeof chrome !== 'undefined' && chrome.storage) chrome.storage.local.set({ listenMode: 'tab' });
  });

  // ---- API key save ----
  if (saveKeyBtn) saveKeyBtn.addEventListener('click', function () {
    var key = deepgramKeyInput.value.trim();
    if (!key || key === '••••••••••••') { keyStatus.textContent = 'Enter a valid key'; keyStatus.style.color = 'var(--accent-red)'; return; }
    savedApiKey = key;
    if (typeof chrome !== 'undefined' && chrome.storage) chrome.storage.local.set({ deepgramKey: key });
    deepgramKeyInput.value = '••••••••••••';
    keyStatus.textContent = 'Key saved!';
    keyStatus.style.color = 'var(--accent-green)';
    setTimeout(function () { keyStatus.textContent = ''; }, 2000);
  });

  // ---- Build quick-tap grid (lead-type-specific + custom scripts) ----
  function buildQuickTapGrid() {
    if (!quickTapGrid) return;
    quickTapGrid.innerHTML = '';
    var leadType = leadSelect ? leadSelect.value : '';

    // Add custom scripts first (highlighted)
    if (customScripts && customScripts.length > 0) {
      customScripts.forEach(function (cs) {
        var btn = document.createElement('button');
        btn.className = 'quick-tap-btn quick-tap-btn--custom';
        btn.textContent = cs.label;
        btn.title = cs.script;
        btn.addEventListener('click', function () {
          handleCustomQuickTap(cs);
        });
        quickTapGrid.appendChild(btn);
      });
    }

    // Add built-in taps for the selected lead type
    var taps = [];
    if (typeof QUICK_TAPS !== 'undefined') {
      taps = QUICK_TAPS[leadType] || QUICK_TAPS[''] || [];
    }
    taps.forEach(function (tap) {
      var btn = document.createElement('button');
      btn.className = 'quick-tap-btn';
      btn.textContent = tap.label;
      btn.title = tap.text;
      btn.addEventListener('click', function () {
        handleQuickTap(tap);
      });
      quickTapGrid.appendChild(btn);
    });
  }

  function handleQuickTap(tap) {
    // Live mode: show one-liner response directly, no diagnosis
    showSayThisOneLiner(tap.response || tap.text);
    openingCard.classList.add('hidden');
    closeCard.classList.add('hidden');
  }

  function handleCustomQuickTap(cs) {
    // For custom scripts, show the script directly as a one-liner
    showSayThisOneLiner(personalizeScript(cs.script));
    openingCard.classList.add('hidden');
    closeCard.classList.add('hidden');
  }

  // ---- Find best matching one-liner from QUICK_TAPS for detected speech ----
  function findBestResponse(text) {
    if (!text || text.trim().length < 5) return null;
    var lower = text.toLowerCase();
    var leadType = leadSelect ? leadSelect.value : '';
    var taps = (typeof QUICK_TAPS !== 'undefined') ? (QUICK_TAPS[leadType] || QUICK_TAPS[''] || []) : [];
    var allTaps = taps;
    // Also check generic taps if a lead type is selected
    if (leadType && typeof QUICK_TAPS !== 'undefined' && QUICK_TAPS['']) {
      allTaps = taps.concat(QUICK_TAPS['']);
    }

    var bestScore = 0;
    var bestTap = null;

    for (var i = 0; i < allTaps.length; i++) {
      var tap = allTaps[i];
      var keywords = tap.text.toLowerCase().split(/\s+/);
      var score = 0;
      for (var k = 0; k < keywords.length; k++) {
        if (keywords[k].length > 3 && lower.indexOf(keywords[k]) !== -1) {
          score++;
        }
      }
      // Also check the label
      if (lower.indexOf(tap.label.toLowerCase()) !== -1) {
        score += 2;
      }
      if (score > bestScore) {
        bestScore = score;
        bestTap = tap;
      }
    }

    // Require at least 2 keyword matches
    if (bestScore >= 2 && bestTap && bestTap.response) {
      return bestTap.response;
    }
    return null;
  }

  // ---- Opening script ----
  function showOpeningScript() {
    var leadType = leadSelect.value || '';
    var opening = DiagnosisEngine.getOpeningScript(leadType);
    if (!opening) return;
    openingScriptEl.textContent = personalizeScript(opening.script);
    openingFollowUp.textContent = personalizeScript(opening.followUp || '');
    openingFollowUp.classList.add('hidden');
    openingFollowUpBtn.classList.remove('hidden');
    openingCard.classList.remove('hidden');
    sayThis.classList.add('hidden');
    closeCard.classList.add('hidden');
  }

  if (openingFollowUpBtn) openingFollowUpBtn.addEventListener('click', function () {
    openingFollowUp.classList.remove('hidden');
    openingFollowUpBtn.classList.add('hidden');
  });

  // ---- SAY THIS (mindless mode — one sentence only) ----
  function showSayThisOneLiner(text) {
    if (!text) return;
    sayThisScript.textContent = text;
    sayThisSignal.style.display = 'none';
    sayThisMore.style.display = 'none';
    sayThisOptions.innerHTML = '';
    sayThisOptions.classList.add('hidden');

    sayThis.classList.remove('hidden');
    flashSayThis();
    sayThis.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Legacy showSayThis kept for any edge cases — now simplified
  function showSayThis(result) {
    if (!result || !result.options || result.options.length === 0) return;
    showSayThisOneLiner(result.options[0].script);
  }

  function flashSayThis() {
    sayThis.classList.remove('say-this--flash');
    void sayThis.offsetWidth; // force reflow
    sayThis.classList.add('say-this--flash');
  }

  // More options button disabled in one-liner mode but kept for compatibility
  if (sayThisMore) sayThisMore.addEventListener('click', function () {
    var hidden = sayThisOptions.classList.contains('hidden');
    sayThisOptions.classList.toggle('hidden');
    sayThisMore.textContent = hidden ? 'Less Options' : 'More Options';
  });

  // ---- Close scripts ----
  function showCloseScript(index) {
    var close = DiagnosisEngine.getCloseScript(index);
    if (!close) return;
    closeScriptEl.textContent = close.script;
    closeCard.classList.remove('hidden');
    sayThis.classList.add('hidden');
    openingCard.classList.add('hidden');
    closeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Highlight active button
    [closeSoftBtn, closeCalendarBtn, closeConfirmBtn].forEach(function (btn, i) {
      if (btn) btn.classList.toggle('close-card__btn--active', i === index);
    });
  }

  if (closeSoftBtn) closeSoftBtn.addEventListener('click', function () { showCloseScript(0); });
  if (closeCalendarBtn) closeCalendarBtn.addEventListener('click', function () { showCloseScript(1); });
  if (closeConfirmBtn) closeConfirmBtn.addEventListener('click', function () { showCloseScript(2); });
  if (quickTapCloseBtn) quickTapCloseBtn.addEventListener('click', function () { showCloseScript(0); });

  // ---- Start / End / Next Call ----
  if (btnLiveStart) btnLiveStart.addEventListener('click', startLiveCall);
  if (btnLiveEnd) btnLiveEnd.addEventListener('click', endLiveCall);
  if (btnLiveNext) btnLiveNext.addEventListener('click', nextCall);
  if (btnLiveAppt) btnLiveAppt.addEventListener('click', function () {
    sessionAppts++;
    sessionApptsEl.textContent = sessionAppts;
    nextCall();
  });

  function startLiveCall() {
    sessionCalls++;
    sessionCallsEl.textContent = sessionCalls;
    isLiveActive = true;

    // Hide setup, show active controls
    liveSetup.classList.add('hidden');
    btnLiveStart.classList.add('hidden');
    btnLiveEnd.classList.remove('hidden');
    btnLiveNext.classList.remove('hidden');
    btnLiveAppt.classList.remove('hidden');
    quickTap.classList.remove('hidden');
    listenBar.classList.remove('hidden');

    // Show opening script
    showOpeningScript();

    // Start timer
    liveStartTime = Date.now();
    liveTimer.textContent = '00:00';
    liveTimerInterval = setInterval(function () {
      var s = Math.floor((Date.now() - liveStartTime) / 1000);
      liveTimer.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }, 1000);

    // Start listening based on mode
    if (listenMode === 'mic') {
      startMicListen();
    } else {
      startTabCapture();
    }

    updateListenModeUI();
  }

  function endLiveCall() {
    isLiveActive = false;
    stopMicListen();
    stopTabCapture();
    if (liveTimerInterval) { clearInterval(liveTimerInterval); liveTimerInterval = null; }

    // Reset UI
    btnLiveStart.classList.remove('hidden');
    btnLiveStart.textContent = 'Start Listening';
    btnLiveEnd.classList.add('hidden');
    btnLiveNext.classList.add('hidden');
    btnLiveAppt.classList.add('hidden');
    openingCard.classList.add('hidden');
    sayThis.classList.add('hidden');
    closeCard.classList.add('hidden');
    listenBar.classList.add('hidden');
    liveSetup.classList.remove('hidden');
  }

  function nextCall() {
    // End current, start fresh for next dial
    stopMicListen();
    stopTabCapture();
    if (liveTimerInterval) { clearInterval(liveTimerInterval); liveTimerInterval = null; }

    // Reset coaching
    openingCard.classList.add('hidden');
    sayThis.classList.add('hidden');
    closeCard.classList.add('hidden');

    // Increment call count and restart
    sessionCalls++;
    sessionCallsEl.textContent = sessionCalls;
    liveStartTime = Date.now();
    liveTimer.textContent = '00:00';
    liveTimerInterval = setInterval(function () {
      var s = Math.floor((Date.now() - liveStartTime) / 1000);
      liveTimer.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }, 1000);

    showOpeningScript();

    if (listenMode === 'mic') { startMicListen(); }
    else { startTabCapture(); }
  }

  // ---- MIC LISTEN MODE (free, uses Web Speech API) ----
  function startMicListen() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      listenBarText.textContent = 'Mic not supported — use quick-tap buttons';
      return;
    }

    liveRecognition = new SR();
    liveRecognition.continuous = true;
    liveRecognition.interimResults = true;
    liveRecognition.lang = 'en-US';
    liveRecognition.maxAlternatives = 1;

    var accumulatedFinal = '';

    liveRecognition.onresult = function (event) {
      var interim = '';
      var newFinal = '';
      for (var i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          newFinal += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      listenBarInterim.textContent = interim;

      // Process new final transcripts
      if (newFinal && newFinal !== accumulatedFinal) {
        var newText = newFinal.slice(accumulatedFinal.length).trim();
        accumulatedFinal = newFinal;
        if (newText.length > 8) {
          processTranscription(newText);
        }
      }
    };

    liveRecognition.onerror = function (event) {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        listenBarText.textContent = 'Mic blocked — check permissions. Use quick-tap buttons.';
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        listenBarText.textContent = 'Mic error: ' + event.error;
      }
    };

    liveRecognition.onend = function () {
      // Auto-restart if still active
      if (isLiveActive && listenMode === 'mic') {
        accumulatedFinal = '';
        try { liveRecognition.start(); } catch (e) {}
      }
    };

    try {
      liveRecognition.start();
      listenBarText.textContent = 'Listening...';
    } catch (e) {
      listenBarText.textContent = 'Could not start mic — use quick-tap buttons';
    }
  }

  function stopMicListen() {
    if (liveRecognition) {
      try { liveRecognition.stop(); } catch (e) {}
      liveRecognition = null;
    }
  }

  // ---- TAB CAPTURE MODE (Deepgram direct, needs API key) ----
  function startTabCapture() {
    if (!savedApiKey) {
      listenBarText.textContent = 'No API key — enter Deepgram key in settings or use quick-tap';
      return;
    }
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      listenBarText.textContent = 'Tab capture requires Chrome extension context';
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var tab = tabs[0];
      if (!tab) { listenBarText.textContent = 'No active tab found'; return; }

      chrome.runtime.sendMessage(
        { type: MSG_LIVE.START_CALL_DIRECT, tabId: tab.id, apiKey: savedApiKey },
        function (response) {
          if (chrome.runtime.lastError) {
            listenBarText.textContent = 'Error: ' + chrome.runtime.lastError.message;
            return;
          }
          if (response && response.success) {
            listenBarText.textContent = 'Capturing tab audio...';
          } else {
            listenBarText.textContent = 'Failed: ' + (response && response.error || 'Unknown');
          }
        }
      );
    });
  }

  function stopTabCapture() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: MSG_LIVE.STOP_CALL }).catch(function () {});
    }
  }

  // ---- Process transcription from any source ----
  function processTranscription(text) {
    if (!text || text.trim().length < 5) return;

    // Check for buying signals — suggest close
    if (DiagnosisEngine.detectBuyingSignal(text)) {
      showCloseScript(0);
      return;
    }

    // Find best one-liner response from QUICK_TAPS
    var oneLiner = findBestResponse(text);
    if (oneLiner) {
      openingCard.classList.add('hidden');
      closeCard.classList.add('hidden');
      showSayThisOneLiner(oneLiner);
    }
  }

  // ---- Listen for transcription messages from offscreen (tab capture mode) ----
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function (message) {
      if (message.type === MSG_LIVE.TRANSCRIPTION && isLiveActive) {
        if (message.isFinal && message.text && message.text.trim().length > 5) {
          processTranscription(message.text.trim());
          listenBarInterim.textContent = '';
        } else if (!message.isFinal && message.text) {
          listenBarInterim.textContent = message.text;
        }
      }
      if (message.type === MSG_LIVE.CALL_STATUS && !message.isCapturing && isLiveActive) {
        // Tab capture stopped externally
        listenBarText.textContent = 'Tab capture stopped';
      }
      if (message.type === MSG_LIVE.CAPTURE_ERROR && isLiveActive) {
        listenBarText.textContent = message.error || 'Capture error';
      }
    });
  }

  // ==================== SETUP TAB ====================
  var agentNameInput = document.getElementById('agent-name');
  var agentTeamInput = document.getElementById('agent-team');
  var agentAreaInput = document.getElementById('agent-area');
  var agentCalendarInput = document.getElementById('agent-calendar');
  var agentValuePropInput = document.getElementById('agent-value-prop');
  var saveProfileBtn = document.getElementById('save-profile-btn');
  var profileStatus = document.getElementById('profile-status');

  var customScriptsInput = document.getElementById('custom-scripts-input');
  var scriptFileInput = document.getElementById('script-file-input');
  var extractScriptsBtn = document.getElementById('extract-scripts-btn');
  var extractStatus = document.getElementById('extract-status');
  var extractedPreview = document.getElementById('extracted-preview');
  var extractedList = document.getElementById('extracted-list');
  var extractedCountEl = document.getElementById('extracted-count');
  var saveExtractedBtn = document.getElementById('save-extracted-btn');
  var saveExtractedStatus = document.getElementById('save-extracted-status');
  var savedScriptsList = document.getElementById('saved-scripts-list');
  var savedCountEl = document.getElementById('saved-count');
  var clearScriptsBtn = document.getElementById('clear-scripts-btn');

  var pendingExtracted = []; // Scripts waiting to be saved

  // ---- Load saved profile + custom scripts from storage ----
  function loadSavedData() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['agentProfile', 'customScripts'], function (data) {
        if (data.agentProfile) {
          agentProfile = data.agentProfile;
          if (agentNameInput) agentNameInput.value = agentProfile.name || '';
          if (agentTeamInput) agentTeamInput.value = agentProfile.team || '';
          if (agentAreaInput) agentAreaInput.value = agentProfile.area || 'San Diego County';
          if (agentCalendarInput) agentCalendarInput.value = agentProfile.calendarLink || '';
          if (agentValuePropInput) agentValuePropInput.value = agentProfile.valueProp || '';
        }
        if (data.customScripts && data.customScripts.length > 0) {
          customScripts = data.customScripts;
          buildQuickTapGrid(); // Rebuild with custom scripts included
        }
        renderSavedScripts();
      });
    }
  }

  // ---- Save profile ----
  if (saveProfileBtn) saveProfileBtn.addEventListener('click', function () {
    agentProfile.name = (agentNameInput.value || '').trim();
    agentProfile.team = (agentTeamInput.value || '').trim();
    agentProfile.area = (agentAreaInput.value || '').trim() || 'San Diego County';
    agentProfile.calendarLink = (agentCalendarInput.value || '').trim();
    agentProfile.valueProp = (agentValuePropInput.value || '').trim();

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ agentProfile: agentProfile });
    }
    profileStatus.textContent = 'Profile saved! Scripts are now personalized.';
    profileStatus.style.color = 'var(--accent-green)';
    setTimeout(function () { profileStatus.textContent = ''; }, 3000);
  });

  // ---- File upload handler (PDF, DOCX, RTF, TXT, images) ----
  if (scriptFileInput) scriptFileInput.addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;

    extractStatus.textContent = 'Reading ' + file.name + '...';
    extractStatus.style.color = 'var(--accent-blue)';

    if (typeof FileReaderEngine !== 'undefined') {
      FileReaderEngine.extractText(file).then(function (result) {
        if (result.error) {
          extractStatus.textContent = result.error;
          extractStatus.style.color = result.isImage ? 'var(--accent-yellow)' : 'var(--accent-red)';
          if (result.text) customScriptsInput.value = result.text;
          return;
        }
        customScriptsInput.value = result.text;
        extractStatus.textContent = 'Extracted text from ' + file.name + ' — click Extract Scripts to process.';
        extractStatus.style.color = 'var(--accent-green)';
      }).catch(function () {
        extractStatus.textContent = 'Could not read file. Try copy-pasting the text instead.';
        extractStatus.style.color = 'var(--accent-red)';
      });
    } else {
      // Fallback: read as plain text
      var reader = new FileReader();
      reader.onload = function (ev) {
        customScriptsInput.value = ev.target.result;
        extractStatus.textContent = 'File loaded: ' + file.name;
        extractStatus.style.color = 'var(--accent-blue)';
      };
      reader.readAsText(file);
    }
  });

  // ---- Extract scripts ----
  if (extractScriptsBtn) extractScriptsBtn.addEventListener('click', function () {
    var rawText = (customScriptsInput.value || '').trim();
    if (!rawText || rawText.length < 20) {
      extractStatus.textContent = 'Paste or upload your scripts first.';
      extractStatus.style.color = 'var(--accent-red)';
      return;
    }

    extractStatus.textContent = 'Extracting...';
    extractStatus.style.color = 'var(--accent-blue)';

    // Run extraction
    var results = ScriptExtractor.extract(rawText);

    // Also try to extract profile info
    var profileHints = ScriptExtractor.extractProfile(rawText);
    if (profileHints.name && !agentNameInput.value) agentNameInput.value = profileHints.name;
    if (profileHints.team && !agentTeamInput.value) agentTeamInput.value = profileHints.team;
    if (profileHints.area && !agentAreaInput.value) agentAreaInput.value = profileHints.area;

    if (results.length === 0) {
      extractStatus.textContent = 'No scripts detected. Try a different format (see examples in the text area).';
      extractStatus.style.color = 'var(--accent-yellow)';
      extractedPreview.classList.add('hidden');
      return;
    }

    extractStatus.textContent = 'Found ' + results.length + ' scripts!';
    extractStatus.style.color = 'var(--accent-green)';

    pendingExtracted = results;
    renderExtractedPreview();
  });

  // ---- Render extracted preview ----
  function renderExtractedPreview() {
    extractedPreview.classList.remove('hidden');
    extractedCountEl.textContent = pendingExtracted.length;
    extractedList.innerHTML = '';

    pendingExtracted.forEach(function (script, idx) {
      var card = document.createElement('div');
      card.className = 'extracted-card';
      card.innerHTML =
        '<div class="extracted-card__body">' +
          '<div class="extracted-card__header">' +
            '<span class="extracted-card__label">' + esc(script.label) + '</span>' +
            '<span class="extracted-card__category">' + esc(ScriptExtractor.CATEGORY_LABELS[script.category] || script.category) + '</span>' +
          '</div>' +
          '<div class="extracted-card__objection">' + esc(script.objection) + '</div>' +
          '<div class="extracted-card__script">' + esc(script.script) + '</div>' +
        '</div>' +
        '<button class="extracted-card__delete" title="Remove">&times;</button>';

      var deleteBtn = card.querySelector('.extracted-card__delete');
      (function (index) {
        deleteBtn.addEventListener('click', function () {
          pendingExtracted.splice(index, 1);
          renderExtractedPreview();
        });
      })(idx);

      extractedList.appendChild(card);
    });
  }

  // ---- Save extracted scripts ----
  if (saveExtractedBtn) saveExtractedBtn.addEventListener('click', function () {
    if (pendingExtracted.length === 0) {
      saveExtractedStatus.textContent = 'No scripts to save.';
      saveExtractedStatus.style.color = 'var(--accent-red)';
      return;
    }

    // Merge with existing custom scripts (avoid exact duplicates)
    var existingKeys = {};
    customScripts.forEach(function (s) { existingKeys[s.script.substring(0, 50).toLowerCase()] = true; });

    var added = 0;
    pendingExtracted.forEach(function (s) {
      var key = s.script.substring(0, 50).toLowerCase();
      if (!existingKeys[key]) {
        customScripts.push(s);
        existingKeys[key] = true;
        added++;
      }
    });

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ customScripts: customScripts });
    }

    saveExtractedStatus.textContent = 'Saved ' + added + ' new scripts! They now appear in your quick-tap grid.';
    saveExtractedStatus.style.color = 'var(--accent-green)';
    setTimeout(function () { saveExtractedStatus.textContent = ''; }, 4000);

    pendingExtracted = [];
    extractedPreview.classList.add('hidden');
    customScriptsInput.value = '';
    buildQuickTapGrid(); // Rebuild grid with new scripts
    renderSavedScripts();
  });

  // ---- Render saved custom scripts ----
  function renderSavedScripts() {
    if (!savedScriptsList) return;
    savedScriptsList.innerHTML = '';
    savedCountEl.textContent = customScripts.length;
    if (clearScriptsBtn) clearScriptsBtn.classList.toggle('hidden', customScripts.length === 0);

    if (customScripts.length === 0) {
      savedScriptsList.innerHTML = '<div style="font-size: 12px; color: var(--text-dim); padding: 8px 0;">No custom scripts yet. Upload or paste your scripts above.</div>';
      return;
    }

    customScripts.forEach(function (script, idx) {
      var card = document.createElement('div');
      card.className = 'extracted-card';
      card.innerHTML =
        '<div class="extracted-card__body">' +
          '<div class="extracted-card__header">' +
            '<span class="extracted-card__label">' + esc(script.label) + '</span>' +
            '<span class="extracted-card__category">' + esc(ScriptExtractor.CATEGORY_LABELS[script.category] || script.category) + '</span>' +
          '</div>' +
          '<div class="extracted-card__script">' + esc(script.script) + '</div>' +
        '</div>' +
        '<button class="extracted-card__delete" title="Remove">&times;</button>';

      var deleteBtn = card.querySelector('.extracted-card__delete');
      (function (index) {
        deleteBtn.addEventListener('click', function () {
          customScripts.splice(index, 1);
          if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ customScripts: customScripts });
          }
          buildQuickTapGrid();
          renderSavedScripts();
        });
      })(idx);

      savedScriptsList.appendChild(card);
    });
  }

  // ---- Clear all custom scripts ----
  if (clearScriptsBtn) clearScriptsBtn.addEventListener('click', function () {
    customScripts = [];
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ customScripts: [] });
    }
    buildQuickTapGrid();
    renderSavedScripts();
  });

  // ---- Personalize script text with agent profile ----
  function personalizeScript(text) {
    if (!text) return text;
    var result = text;
    if (agentProfile.name) {
      result = result.replace(/my name is ___/gi, 'my name is ' + agentProfile.name);
      result = result.replace(/I'm ___/g, "I'm " + agentProfile.name);
    }
    if (agentProfile.team) {
      result = result.replace(/a real estate team/gi, agentProfile.team);
      result = result.replace(/our team/gi, agentProfile.team);
    }
    if (agentProfile.area && agentProfile.area !== 'San Diego County') {
      result = result.replace(/San Diego County/g, agentProfile.area);
      result = result.replace(/San Diego/g, agentProfile.area.replace(/ County$/, ''));
    }
    return result;
  }

  // ==================== UTILS ====================
  function esc(text) {
    var div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  // ==================== INIT ====================
  renderScenarios();
  buildQuickTapGrid();
  updateListenModeUI();
  loadSavedData();
  practiceField.focus();
})();
} // end initApp
