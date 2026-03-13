import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { isEnterprise } from '../lib/enterpriseConfig.js';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation error', details: err.errors });
    return;
  }

  console.error('Server error:', err);

  if (isEnterprise()) {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
