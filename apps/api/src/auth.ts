import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export const authMiddleware =
  (secret: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer '))
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    try {
      const payload = jwt.verify(header.slice(7), secret);
      if (typeof payload !== 'object' || typeof payload.sub !== 'string')
        throw new Error('Invalid token');
      req.userId = payload.sub;
      next();
    } catch {
      res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
    }
  };
