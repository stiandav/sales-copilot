import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ScriptStore } from '../scripts/script-store';
import { ObjectionScript } from '../types';

export class ScriptsController {
  private store: ScriptStore;

  constructor(store: ScriptStore) {
    this.store = store;
  }

  getAll = (_req: Request, res: Response): void => {
    res.json(this.store.getAll());
  };

  getById = (req: Request<{ id: string }>, res: Response): void => {
    const script = this.store.getById(req.params.id);
    if (!script) {
      res.status(404).json({ error: 'Script not found' });
      return;
    }
    res.json(script);
  };

  create = (req: Request, res: Response): void => {
    const { category, variant, label, patterns, script, priority } = req.body;

    if (!category || !label || !patterns || !script) {
      res.status(400).json({ error: 'Missing required fields: category, label, patterns, script' });
      return;
    }

    const newScript: ObjectionScript = {
      id: uuidv4(),
      category,
      variant,
      label,
      patterns,
      script,
      priority: priority || 1,
    };

    this.store.create(newScript);
    res.status(201).json(newScript);
  };

  update = (req: Request<{ id: string }>, res: Response): void => {
    const updated = this.store.update(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Script not found' });
      return;
    }
    res.json(updated);
  };

  delete = (req: Request<{ id: string }>, res: Response): void => {
    const deleted = this.store.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Script not found' });
      return;
    }
    res.status(204).send();
  };
}
