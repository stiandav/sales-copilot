import { ObjectionScript, DetectedObjection, ScriptMatch } from '../types';
import { ScriptStore } from './script-store';

export class ScriptMatcher {
  private scriptStore: ScriptStore;

  constructor(scriptStore: ScriptStore) {
    this.scriptStore = scriptStore;
  }

  match(objection: DetectedObjection): ScriptMatch | null {
    const scripts = this.scriptStore.getByCategory(objection.category);
    if (scripts.length === 0) return null;

    // If objection has a variant, try to match it first
    if (objection.variant) {
      const variantMatch = scripts.find((s) => s.variant === objection.variant);
      if (variantMatch) {
        return { script: variantMatch, objection };
      }
    }

    // Fall back to highest priority (lowest number) script
    return { script: scripts[0], objection };
  }
}
