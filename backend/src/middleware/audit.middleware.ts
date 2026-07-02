import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { logAudit } from '../services/audit.service';

export function auditMiddleware(entite: string, action: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      const statusCode = res.statusCode;
      if (statusCode >= 200 && statusCode < 300 && req.user) {
        const entiteId = (req.params.id) ? parseInt(req.params.id) : null;
        logAudit(
          req.user.id,
          action,
          entite,
          entiteId,
          null,
          req.body,
          req.ip
        ).catch(console.error);
      }
      return originalJson(body);
    };

    next();
  };
}
