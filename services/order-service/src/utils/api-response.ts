import { Response } from 'express';

export interface ApiResponseMeta {
  requestId?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  [key: string]: unknown;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: ApiResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: ApiResponseMeta;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: ApiResponseMeta
): Response {
  const requestId = (res.req as any).id || (res.getHeader('x-request-id') as string) || undefined;
  const responseBody: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta: {
      ...(requestId ? { requestId } : {}),
      ...meta
    }
  };

  return res.status(statusCode).json(responseBody);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
  meta?: ApiResponseMeta
): Response {
  const requestId = (res.req as any)?.id || (res.getHeader('x-request-id') as string) || undefined;
  const responseBody: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {})
    },
    meta: {
      ...(requestId ? { requestId } : {}),
      ...meta
    }
  };

  return res.status(statusCode).json(responseBody);
}
