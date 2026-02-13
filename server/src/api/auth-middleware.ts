import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip auth if no API key configured
  if (!config.apiKey) {
    next();
    return;
  }

  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey || apiKey !== config.apiKey) {
    res.status(401).json({ error: 'Unauthorized. Provide a valid X-API-Key header.' });
    return;
  }

  next();
}
