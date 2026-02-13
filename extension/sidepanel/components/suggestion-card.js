class SuggestionCard {
  constructor({ suggestionId, objectionType, objectionLabel, baseScript, triggerText }) {
    this.suggestionId = suggestionId;
    this.objectionType = objectionType;
    this.baseScript = baseScript;
    this.adaptedScript = '';
    this.activeTab = 'adapted';

    this.element = document.createElement('div');
    this.element.className = 'suggestion-card suggestion-card--active';

    const escapedLabel = this.escapeHtml(objectionLabel);
    const escapedBase = this.escapeHtml(baseScript);
    const escapedTrigger = this.escapeHtml(triggerText);

    this.element.innerHTML =
      '<div class="suggestion-card__header">' +
        '<span class="objection-badge objection-badge--' + objectionType + '">' + escapedLabel + '</span>' +
      '</div>' +
      '<div class="suggestion-card__tabs">' +
        '<button class="suggestion-tab suggestion-tab--active" data-tab="adapted">AI Adapted</button>' +
        '<button class="suggestion-tab" data-tab="base">Base Script</button>' +
      '</div>' +
      '<div class="suggestion-card__script suggestion-card__script--streaming" data-content="adapted"></div>' +
      '<div class="suggestion-card__script hidden" data-content="base">' + escapedBase + '</div>' +
      '<div class="suggestion-card__trigger">Triggered by: "' + escapedTrigger + '"</div>';

    this.element.querySelectorAll('.suggestion-tab').forEach((tab) => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    this.adaptedContent = this.element.querySelector('[data-content="adapted"]');
    this.baseContent = this.element.querySelector('[data-content="base"]');
    this.adaptedContent.textContent = '';
  }

  switchTab(tab) {
    this.activeTab = tab;

    this.element.querySelectorAll('.suggestion-tab').forEach((t) => {
      t.classList.toggle('suggestion-tab--active', t.dataset.tab === tab);
    });

    this.adaptedContent.classList.toggle('hidden', tab !== 'adapted');
    this.baseContent.classList.toggle('hidden', tab !== 'base');
  }

  appendChunk(chunk) {
    this.adaptedScript += chunk;
    this.adaptedContent.textContent = this.adaptedScript;

    if (this.activeTab !== 'adapted') {
      this.switchTab('adapted');
    }
  }

  setComplete(fullScript) {
    this.adaptedScript = fullScript;
    this.adaptedContent.textContent = fullScript;
    this.adaptedContent.classList.remove('suggestion-card__script--streaming');
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
