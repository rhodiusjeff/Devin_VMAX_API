import { Response, NextFunction } from 'express';
import UserService from '../services/UserService';
import { AuthenticatedRequest, UserRole } from '../types';
import { successResponse, forbidden, paginatedResponse } from '../utils/response';
import { canManageUser } from '../middleware/auth';

export class UserController {
  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.getUserById(req.user!.userId);
      successResponse(res, user);
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { firstName, lastName, phoneNumber } = req.body;
      const user = await UserService.updateProfile(req.user!.userId, { firstName, lastName, phoneNumber });
      successResponse(res, user);
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const role = req.query.role as UserRole | undefined;
      const fleetId = req.query.fleetId as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await UserService.getUsers(page, limit, { role, fleetId, search });
      paginatedResponse(res, { users: result.users }, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId as string;
      const user = await UserService.getUserById(userId);
      successResponse(res, user);
    } catch (error) {
      next(error);
    }
  }

  async createUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, role, fleetId, firstName, lastName, phoneNumber } = req.body;

      // Check if requesting user can create this type of user
      if (!canManageUser(req.user!, role, fleetId)) {
        forbidden(res, 'You cannot create users with this role');
        return;
      }

      const user = await UserService.createUser({
        email,
        password,
        role,
        fleetId,
        firstName,
        lastName,
        phoneNumber
      });
      successResponse(res, user, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId as string;
      const { firstName, lastName, phoneNumber, role, fleetId, isActive } = req.body;

      // Get target user to check permissions
      const targetUser = await UserService.getUserById(userId);
      if (!canManageUser(req.user!, targetUser.role, targetUser.fleetId || null)) {
        forbidden(res, 'You cannot modify this user');
        return;
      }

      const user = await UserService.updateUser(userId, {
        firstName,
        lastName,
        phoneNumber,
        role,
        fleetId,
        isActive
      });
      successResponse(res, user);
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId as string;

      // Get target user to check permissions
      const targetUser = await UserService.getUserById(userId);
      if (!canManageUser(req.user!, targetUser.role, targetUser.fleetId || null)) {
        forbidden(res, 'You cannot delete this user');
        return;
      }

      await UserService.deleteUser(userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async getFleetUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const fleetId = req.params.fleetId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      // Check fleet access
      if (req.user!.role !== UserRole.ADMIN && req.user!.fleetId !== fleetId) {
        forbidden(res, 'You cannot access users in this fleet');
        return;
      }

      const result = await UserService.getUsersByFleet(fleetId, page, limit);
      paginatedResponse(res, { users: result.users }, result.pagination);
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
