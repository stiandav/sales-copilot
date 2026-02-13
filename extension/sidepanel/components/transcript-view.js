class TranscriptView {
  constructor(container) {
    this.container = container;
    this.interimEntries = new Map();
  }

  addInterim(speaker, text) {
    let entry = this.interimEntries.get(speaker);

    if (!entry) {
      entry = this.createEntry(speaker, text, true);
      this.container.appendChild(entry);
      this.interimEntries.set(speaker, entry);
    } else {
      entry.querySelector('.transcript-text').textContent = text;
    }

    this.scrollToBottom();
  }

  addFinal(speaker, text) {
    const interim = this.interimEntries.get(speaker);
    if (interim) {
      interim.remove();
      this.interimEntries.delete(speaker);
    }

    const entry = this.createEntry(speaker, text, false);
    this.container.appendChild(entry);
    this.scrollToBottom();
  }

  createEntry(speaker, text, isInterim) {
    const entry = document.createElement('div');
    entry.className = 'transcript-entry transcript-entry--' + speaker;
    if (isInterim) {
      entry.classList.add('transcript-entry--interim');
    }

    const label = document.createElement('span');
    label.className = 'speaker-label speaker-label--' + speaker;
    label.textContent = speaker === 'prospect' ? 'Prospect' : 'You';

    const textEl = document.createElement('span');
    textEl.className = 'transcript-text';
    textEl.textContent = text;

    entry.appendChild(label);
    entry.appendChild(textEl);

    return entry;
  }

  scrollToBottom() {
    requestAnimationFrame(() => {
      this.container.scrollTop = this.container.scrollHeight;
    });
  }

  clear() {
    this.container.innerHTML = '';
    this.interimEntries.clear();
  }
}
