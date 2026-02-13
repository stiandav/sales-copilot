class CallControls {
  constructor({ btnStart, btnStop, timer, onStart, onStop }) {
    this.btnStart = btnStart;
    this.btnStop = btnStop;
    this.timerEl = timer;
    this.onStart = onStart;
    this.onStop = onStop;
    this.timerInterval = null;
    this.startTime = null;

    this.btnStart.addEventListener('click', () => this.onStart());
    this.btnStop.addEventListener('click', () => this.onStop());
  }

  setActive(active) {
    if (active) {
      this.btnStart.classList.add('hidden');
      this.btnStop.classList.remove('hidden');
      this.timerEl.classList.remove('hidden');
      this.startTimer();
    } else {
      this.btnStart.classList.remove('hidden');
      this.btnStop.classList.add('hidden');
      this.timerEl.classList.add('hidden');
      this.stopTimer();
    }
  }

  setLoading(loading) {
    this.btnStart.disabled = loading;
    if (loading) {
      this.btnStart.innerHTML = 'Starting...';
    } else {
      this.btnStart.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">' +
        '<path d="M13.6 10.3l-2.8-1.2a.7.7 0 00-.7.1l-1.3 1.1a.4.4 0 01-.4 0A10 10 0 015.7 7.6a.4.4 0 010-.4L6.8 5.9a.7.7 0 00.1-.7L5.7 2.4a.7.7 0 00-.8-.4l-2.4.6A.7.7 0 002 3.3 12.1 12.1 0 0012.7 14a.7.7 0 00.7-.5l.6-2.4a.7.7 0 00-.4-.8z"/>' +
        '</svg> Start Call';
    }
  }

  startTimer() {
    this.startTime = Date.now();
    this.timerEl.textContent = '00:00';

    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const seconds = (elapsed % 60).toString().padStart(2, '0');
      this.timerEl.textContent = minutes + ':' + seconds;
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
