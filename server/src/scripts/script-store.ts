import { ObjectionScript, ObjectionCategory } from '../types';
import defaultScripts from './default-scripts.json';

export class ScriptStore {
  private scripts: Map<string, ObjectionScript> = new Map();

  constructor() {
    this.loadDefaults();
  }

  private loadDefaults(): void {
    for (const script of defaultScripts as ObjectionScript[]) {
      this.scripts.set(script.id, script);
    }
  }

  getAll(): ObjectionScript[] {
    return Array.from(this.scripts.values());
  }

  getById(id: string): ObjectionScript | undefined {
    return this.scripts.get(id);
  }

  getByCategory(category: ObjectionCategory): ObjectionScript[] {
    return this.getAll()
      .filter((s) => s.category === category)
      .sort((a, b) => a.priority - b.priority);
  }

  create(script: ObjectionScript): ObjectionScript {
    this.scripts.set(script.id, script);
    return script;
  }

  update(id: string, updates: Partial<ObjectionScript>): ObjectionScript | null {
    const existing = this.scripts.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, id };
    this.scripts.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.scripts.delete(id);
  }
}
