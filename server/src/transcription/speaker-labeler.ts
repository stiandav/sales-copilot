export class SpeakerLabeler {
  private labels: Map<number, 'prospect' | 'rep'> = new Map();

  constructor() {
    // Channel 0 = prospect (tab audio), Channel 1 = rep (mic)
    this.labels.set(0, 'prospect');
    this.labels.set(1, 'rep');
  }

  getLabel(channel: number): 'prospect' | 'rep' {
    return this.labels.get(channel) || 'prospect';
  }

  formatSpeakerName(speaker: 'prospect' | 'rep'): string {
    return speaker === 'prospect' ? 'Prospect' : 'You';
  }
}
