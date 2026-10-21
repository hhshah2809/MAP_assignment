import { Request, Response, NextFunction } from 'express';
import { idempotencyRepository } from '../repositories/idempotency.repository';
import { computeSha256, canonicalizeJson } from '../utils/hash';
import { IdempotencyConflictError, ValidationError, ConflictError } from '../utils/errors';

export function idempotencyMiddleware(options: { required?: boolean } = { required: true }) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawKey = req.headers['idempotency-key'];

      if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) {
        if (options.required) {
          throw new ValidationError('Idempotency-Key header is required for this request.');
        }
        return next();
      }

      const key = rawKey.trim();
      if (key.length > 255) {
        throw new ValidationError('Idempotency-Key header cannot exceed 255 characters.');
      }

      const canonicalBody = canonicalizeJson(req.body);
      const requestHash = computeSha256(canonicalBody);

      const existingRecord = await idempotencyRepository.findByKey(key);

      if (existingRecord) {
        const isExpired = new Date(existingRecord.expiresAt).getTime() <= Date.now();

        if (!isExpired) {
          // Check hash equality
          if (existingRecord.requestHash !== requestHash) {
            throw new IdempotencyConflictError(
              'The provided Idempotency-Key was previously used with a different request payload.'
            );
          }

          // If response is already cached, replay it
          if (existingRecord.responseStatus !== null && existingRecord.responseBody !== null) {
            res.setHeader('X-Idempotent-Replay', 'true');
            res.status(existingRecord.responseStatus).json(existingRecord.responseBody);
            return;
          }

          // Concurrent request currently processing
          throw new ConflictError(
            'A request with this Idempotency-Key is currently being processed. Please retry shortly.'
          );
        }
      }

      req.idempotencyKey = key;
      (req as any).requestHash = requestHash;
      next();
    } catch (err) {
      next(err);
    }
  };
}
