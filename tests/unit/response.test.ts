import { Response } from 'express';
import { successResponse, errorResponse, badRequest, unauthorized, forbidden, notFound, conflict, validationError, internalError, paginatedResponse } from '../../src/utils/response';

describe('Response Utilities', () => {
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = {
      status: statusMock,
      json: jsonMock
    };
  });

  describe('successResponse', () => {
    it('should return 200 status with data', () => {
      const data = { id: 1, name: 'Test' };
      successResponse(mockResponse as Response, data);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        data,
        meta: expect.objectContaining({
          timestamp: expect.any(String)
        })
      }));
    });

    it('should allow custom status code', () => {
      successResponse(mockResponse as Response, { created: true }, 201);

      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  describe('paginatedResponse', () => {
    it('should include pagination metadata', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = { page: 1, limit: 10, total: 100, totalPages: 10 };
      
      paginatedResponse(mockResponse as Response, data, pagination);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        data,
        pagination
      }));
    });
  });

  describe('errorResponse', () => {
    it('should return error with code and message', () => {
      errorResponse(mockResponse as Response, 'TEST_ERROR', 'Test error message', 400);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        error: {
          code: 'TEST_ERROR',
          message: 'Test error message',
          details: undefined
        }
      }));
    });

    it('should include validation details when provided', () => {
      const details = [{ field: 'email', message: 'Invalid email' }];
      errorResponse(mockResponse as Response, 'VALIDATION_ERROR', 'Validation failed', 422, details);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          details
        })
      }));
    });
  });

  describe('badRequest', () => {
    it('should return 400 status', () => {
      badRequest(mockResponse as Response, 'Bad request message');

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'BAD_REQUEST',
          message: 'Bad request message'
        })
      }));
    });
  });

  describe('unauthorized', () => {
    it('should return 401 status', () => {
      unauthorized(mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'UNAUTHORIZED'
        })
      }));
    });
  });

  describe('forbidden', () => {
    it('should return 403 status', () => {
      forbidden(mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'FORBIDDEN'
        })
      }));
    });
  });

  describe('notFound', () => {
    it('should return 404 status', () => {
      notFound(mockResponse as Response, 'User not found');

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'User not found'
        })
      }));
    });
  });

  describe('conflict', () => {
    it('should return 409 status', () => {
      conflict(mockResponse as Response, 'Resource already exists');

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'CONFLICT'
        })
      }));
    });
  });

  describe('validationError', () => {
    it('should return 422 status with validation details', () => {
      const details = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' }
      ];
      validationError(mockResponse as Response, details);

      expect(statusMock).toHaveBeenCalledWith(422);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          details
        })
      }));
    });
  });

  describe('internalError', () => {
    it('should return 500 status', () => {
      internalError(mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR'
        })
      }));
    });
  });
});
