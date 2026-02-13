export class TranscriptAccumulator {
  private speaker: 'prospect' | 'rep';
  private currentUtterance = '';
  private finalizedText: string[] = [];

  constructor(speaker: 'prospect' | 'rep') {
    this.speaker = speaker;
  }

  addInterim(text: string): string {
    this.currentUtterance = text;
    return this.getCurrentDisplay();
  }

  addFinal(text: string): string {
    this.finalizedText.push(text);
    this.currentUtterance = '';
    return text;
  }

  getCurrentDisplay(): string {
    const parts = [...this.finalizedText];
    if (this.currentUtterance) {
      parts.push(this.currentUtterance);
    }
    return parts.join(' ');
  }

  getFullTranscript(): string {
    return this.finalizedText.join(' ');
  }

  getSpeaker(): 'prospect' | 'rep' {
    return this.speaker;
  }

  reset(): void {
    this.currentUtterance = '';
    this.finalizedText = [];
  }
}
