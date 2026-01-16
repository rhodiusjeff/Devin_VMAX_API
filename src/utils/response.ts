import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ApiResponse, ApiError, PaginationMeta } from '../types';

export function createMeta(requestId?: string) {
  return {
    timestamp: new Date().toISOString(),
    requestId: requestId || uuidv4()
  };
}

export function successResponse<T>(res: Response, data: T, statusCode = 200, requestId?: string): Response {
  const response: ApiResponse<T> = {
    data,
    meta: createMeta(requestId)
  };
  return res.status(statusCode).json(response);
}

export function paginatedResponse<T>(
  res: Response,
  data: T,
  pagination: PaginationMeta,
  requestId?: string
): Response {
  const response = {
    data,
    pagination,
    meta: createMeta(requestId)
  };
  return res.status(200).json(response);
}

export function errorResponse(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: { field: string; message: string }[],
  requestId?: string
): Response {
  const error: ApiError = {
    code,
    message,
    details
  };
  const response: ApiResponse = {
    error,
    meta: createMeta(requestId)
  };
  return res.status(statusCode).json(response);
}

// Common error responses
export function badRequest(res: Response, message: string, details?: { field: string; message: string }[], requestId?: string): Response {
  return errorResponse(res, 'BAD_REQUEST', message, 400, details, requestId);
}

export function unauthorized(res: Response, message = 'Unauthorized', requestId?: string): Response {
  return errorResponse(res, 'UNAUTHORIZED', message, 401, undefined, requestId);
}

export function forbidden(res: Response, message = 'Forbidden', requestId?: string): Response {
  return errorResponse(res, 'FORBIDDEN', message, 403, undefined, requestId);
}

export function notFound(res: Response, message = 'Resource not found', requestId?: string): Response {
  return errorResponse(res, 'NOT_FOUND', message, 404, undefined, requestId);
}

export function conflict(res: Response, message: string, requestId?: string): Response {
  return errorResponse(res, 'CONFLICT', message, 409, undefined, requestId);
}

export function validationError(res: Response, details: { field: string; message: string }[], requestId?: string): Response {
  return errorResponse(res, 'VALIDATION_ERROR', 'Validation failed', 422, details, requestId);
}

export function tooManyRequests(res: Response, message = 'Too many requests', requestId?: string): Response {
  return errorResponse(res, 'TOO_MANY_REQUESTS', message, 429, undefined, requestId);
}

export function internalError(res: Response, message = 'Internal server error', requestId?: string): Response {
  return errorResponse(res, 'INTERNAL_ERROR', message, 500, undefined, requestId);
}
