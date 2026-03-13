import { Request, Response, NextFunction } from 'express';

/**
 * SSO validation middleware stub.
 * When ENTERPRISE_SSO_VALIDATION=true, this middleware will validate
 * the X-Forwarded-User header (or similar) from the SSO proxy.
 *
 * Currently a no-op — always calls next().
 * Structure ready for enterprise SSO proxy integration.
 */
export function ssoValidation(req: Request, _res: Response, next: NextFunction): void {
  if (process.env.ENTERPRISE_SSO_VALIDATION !== 'true') {
    return next();
  }

  // Future: validate X-Forwarded-User header from SSO proxy
  // const user = req.headers['x-forwarded-user'];
  // if (!user) { return res.status(401).json({ error: 'SSO authentication required' }); }
  // (req as any).ssoUser = user;

  next();
}
