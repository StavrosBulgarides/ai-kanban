import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation error', details: err.errors });
    return;
  }

  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
}
