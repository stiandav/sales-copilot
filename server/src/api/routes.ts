import { Express, Router } from 'express';
import { ScriptsController } from './scripts-controller';
import { authMiddleware } from './auth-middleware';
import { ScriptStore } from '../scripts/script-store';

export function setupRoutes(app: Express, scriptStore: ScriptStore): void {
  const router = Router();
  const scriptsController = new ScriptsController(scriptStore);

  router.use(authMiddleware);

  router.get('/scripts', scriptsController.getAll);
  router.get('/scripts/:id', scriptsController.getById);
  router.post('/scripts', scriptsController.create);
  router.put('/scripts/:id', scriptsController.update);
  router.delete('/scripts/:id', scriptsController.delete);

  app.use('/api', router);
}
