import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/AuthService';
import { AuthenticatedRequest } from '../types';
import { successResponse, badRequest } from '../utils/response';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        badRequest(res, 'Email and password are required');
        return;
      }

      const result = await AuthService.login(email, password);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, firstName, lastName, phoneNumber } = req.body;
      
      const result = await AuthService.register(email, password, firstName, lastName, phoneNumber);
      successResponse(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        badRequest(res, 'Refresh token is required');
        return;
      }

      await AuthService.logout(req.user!.userId, refreshToken);
      successResponse(res, { message: 'Logout successful' });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        badRequest(res, 'Refresh token is required');
        return;
      }

      const result = await AuthService.refreshTokens(refreshToken);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      
      if (!email) {
        badRequest(res, 'Email is required');
        return;
      }

      const result = await AuthService.forgotPassword(email);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        badRequest(res, 'Token and new password are required');
        return;
      }

      const result = await AuthService.resetPassword(token, newPassword);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        badRequest(res, 'Current password and new password are required');
        return;
      }

      const result = await AuthService.changePassword(req.user!.userId, currentPassword, newPassword);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
