class SuggestionCard {
  constructor({ suggestionId, objectionType, objectionLabel, baseScript, triggerText, latencyMs, isPracticeMode }) {
    this.suggestionId = suggestionId;
    this.objectionType = objectionType;
    this.baseScript = baseScript;
    this.adaptedScript = '';
    this.activeTab = isPracticeMode ? 'base' : 'adapted';

    this.element = document.createElement('div');
    this.element.className = 'suggestion-card suggestion-card--active';

    const escapedLabel = this.escapeHtml(objectionLabel);
    const escapedBase = this.escapeHtml(baseScript);
    const escapedTrigger = this.escapeHtml(triggerText);
    const latencyText = latencyMs ? latencyMs + 'ms' : '';

    this.element.innerHTML =
      '<div class="suggestion-card__header">' +
        '<span class="objection-badge objection-badge--' + objectionType + '">' + escapedLabel + '</span>' +
        (latencyText ? '<span class="suggestion-card__latency">' + latencyText + '</span>' : '') +
      '</div>' +
      (isPracticeMode
        ? ''
        : '<div class="suggestion-card__tabs">' +
          '<button class="suggestion-tab suggestion-tab--active" data-tab="adapted">AI Adapted</button>' +
          '<button class="suggestion-tab" data-tab="base">Base Script</button>' +
          '</div>') +
      (isPracticeMode
        ? '<div class="suggestion-card__script" data-content="base">' + escapedBase + '</div>'
        : '<div class="suggestion-card__script suggestion-card__script--streaming" data-content="adapted"></div>' +
          '<div class="suggestion-card__script hidden" data-content="base">' + escapedBase + '</div>') +
      '<div class="suggestion-card__trigger">Triggered by: "' + escapedTrigger + '"</div>';

    this.element.querySelectorAll('.suggestion-tab').forEach((tab) => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    this.adaptedContent = this.element.querySelector('[data-content="adapted"]');
    this.baseContent = this.element.querySelector('[data-content="base"]');
    if (this.adaptedContent) {
      this.adaptedContent.textContent = '';
    }
  }

  switchTab(tab) {
    this.activeTab = tab;

    this.element.querySelectorAll('.suggestion-tab').forEach((t) => {
      t.classList.toggle('suggestion-tab--active', t.dataset.tab === tab);
    });

    if (this.adaptedContent) {
      this.adaptedContent.classList.toggle('hidden', tab !== 'adapted');
    }
    if (this.baseContent) {
      this.baseContent.classList.toggle('hidden', tab !== 'base');
    }
  }

  appendChunk(chunk) {
    this.adaptedScript += chunk;
    if (this.adaptedContent) {
      this.adaptedContent.textContent = this.adaptedScript;
    }

    if (this.activeTab !== 'adapted' && this.adaptedContent) {
      this.switchTab('adapted');
    }
  }

  setComplete(fullScript, latencyMs) {
    this.adaptedScript = fullScript;
    if (this.adaptedContent) {
      this.adaptedContent.textContent = fullScript;
      this.adaptedContent.classList.remove('suggestion-card__script--streaming');
    }

    // Update latency display
    if (latencyMs) {
      const latencyEl = this.element.querySelector('.suggestion-card__latency');
      if (latencyEl) {
        latencyEl.textContent = latencyMs + 'ms total';
      }
    }
  }

  setPrevious() {
    this.element.classList.remove('suggestion-card--active');
    this.element.classList.add('suggestion-card--previous');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
