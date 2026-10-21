export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(422, 'VALIDATION_ERROR', message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'ORDER_NOT_FOUND') {
    super(404, code, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = 'ORDER_STATE_CONFLICT', details?: unknown) {
    super(409, code, message, details);
  }
}

export class IdempotencyConflictError extends AppError {
  constructor(message = 'Provided Idempotency-Key was previously used with a different request body.') {
    super(409, 'IDEMPOTENCY_KEY_CONFLICT', message);
  }
}

export class StaleVersionError extends AppError {
  constructor(message = 'The order version is stale. Refresh and retry the update.') {
    super(409, 'STALE_ORDER_VERSION', message);
  }
}

export class DatabaseUnavailableError extends AppError {
  constructor(message = 'Database is currently unreachable.') {
    super(503, 'DATABASE_UNAVAILABLE', message);
  }
}
