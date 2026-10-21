import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/api-response';
import { logger } from '../config/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message
    }));

    sendError(res, 422, 'VALIDATION_ERROR', 'The request contains invalid fields.', details);
    return;
  }

  // 1b. JSON Syntax Errors from body-parser
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
    sendError(res, 400, 'INVALID_JSON', 'Malformed JSON in request body.');
    return;
  }

  // 2. Custom Domain / App Errors
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // 3. MySQL Duplicate Entry error (ER_DUP_ENTRY: 1062)
  const errCode = (err as any).code;
  if (errCode === 'ER_DUP_ENTRY') {
    sendError(res, 409, 'CONFLICT', 'A resource with these details already exists.');
    return;
  }

  // 4. Unexpected / Unhandled Server Error
  logger.error(
    {
      err: {
        message: err.message,
        stack: err.stack,
        code: (err as any).code
      },
      requestId: req.id,
      url: req.originalUrl,
      method: req.method
    },
    'Unhandled server error occurred'
  );

  sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected internal server error occurred.');
}
