import { DetectedObjection, ObjectionCategory, ObjectionScript } from '../types';
import { ScriptStore } from '../scripts/script-store';

export class ObjectionDetector {
  private scriptStore: ScriptStore;

  constructor(scriptStore: ScriptStore) {
    this.scriptStore = scriptStore;
  }

  detect(text: string): DetectedObjection | null {
    const normalized = text.toLowerCase().trim();
    if (normalized.length < 3) return null;

    const allScripts = this.scriptStore.getAll();
    let bestMatch: { script: ObjectionScript; pattern: string; index: number } | null = null;

    for (const script of allScripts) {
      for (const pattern of script.patterns) {
        const patternLower = pattern.toLowerCase();
        const index = normalized.indexOf(patternLower);

        if (index !== -1) {
          // Prefer earlier matches and longer patterns
          if (
            !bestMatch ||
            pattern.length > bestMatch.pattern.length ||
            (pattern.length === bestMatch.pattern.length && index < bestMatch.index)
          ) {
            bestMatch = { script, pattern, index };
          }
        }
      }
    }

    if (!bestMatch) return null;

    return {
      category: bestMatch.script.category as ObjectionCategory,
      variant: bestMatch.script.variant,
      confidence: this.calculateConfidence(normalized, bestMatch.pattern),
      matchedPattern: bestMatch.pattern,
      triggerText: text,
    };
  }

  private calculateConfidence(text: string, pattern: string): number {
    // Higher confidence for longer patterns and shorter texts (more specific match)
    const patternRatio = pattern.length / text.length;
    return Math.min(0.5 + patternRatio * 0.5, 1.0);
  }
}
