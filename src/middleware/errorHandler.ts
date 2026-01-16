import { Request, Response, NextFunction } from 'express';
import { internalError } from '../utils/response';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Handle Sequelize errors
  if (err.name === 'SequelizeValidationError') {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Database validation failed',
        details: (err as unknown as { errors: { path: string; message: string }[] }).errors.map((e) => ({
          field: e.path,
          message: e.message
        }))
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'Resource already exists'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    res.status(400).json({
      error: {
        code: 'FOREIGN_KEY_ERROR',
        message: 'Referenced resource does not exist'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Default to internal server error
  internalError(res, process.env.NODE_ENV === 'development' ? err.message : 'Internal server error');
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found'
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  });
}
