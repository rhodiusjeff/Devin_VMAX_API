import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole, JwtPayload } from '../types';
import { verifyAccessToken } from '../utils/jwt';
import { unauthorized, forbidden } from '../utils/response';

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      unauthorized(res, 'No authorization header provided');
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      unauthorized(res, 'Invalid authorization header format');
      return;
    }

    const token = parts[1];
    const payload = verifyAccessToken(token);
    
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        unauthorized(res, 'Token has expired');
        return;
      }
      if (error.name === 'JsonWebTokenError') {
        unauthorized(res, 'Invalid token');
        return;
      }
    }
    unauthorized(res, 'Authentication failed');
  }
}

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      unauthorized(res, 'Not authenticated');
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      forbidden(res, 'Insufficient permissions');
      return;
    }

    next();
  };
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  return requireRoles(UserRole.ADMIN)(req, res, next);
}

export function requireAdminOrSubAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  return requireRoles(UserRole.ADMIN, UserRole.SUB_ADMIN)(req, res, next);
}

export function requireFleetManager(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  return requireRoles(UserRole.ADMIN, UserRole.FLEET_MGR)(req, res, next);
}

export function requireFleetAccess(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  return requireRoles(UserRole.ADMIN, UserRole.SUB_ADMIN, UserRole.FLEET_MGR, UserRole.SUB_FLEET_MGR)(req, res, next);
}

export function canAccessFleet(user: JwtPayload, fleetId: string): boolean {
  if (user.role === UserRole.ADMIN || user.role === UserRole.SUB_ADMIN) {
    return true;
  }
  if ((user.role === UserRole.FLEET_MGR || user.role === UserRole.SUB_FLEET_MGR) && user.fleetId === fleetId) {
    return true;
  }
  return false;
}

export function canAccessRegulator(user: JwtPayload, regulatorFleetId: string | null, regulatorOwnerId: string | null): boolean {
  if (user.role === UserRole.ADMIN || user.role === UserRole.SUB_ADMIN) {
    return true;
  }
  if ((user.role === UserRole.FLEET_MGR || user.role === UserRole.SUB_FLEET_MGR) && regulatorFleetId && user.fleetId === regulatorFleetId) {
    return true;
  }
  if (user.role === UserRole.FLEET_USER && regulatorFleetId && user.fleetId === regulatorFleetId) {
    return true;
  }
  if (user.role === UserRole.REG_OWNER && regulatorOwnerId === user.userId) {
    return true;
  }
  return false;
}

export function canManageUser(requestingUser: JwtPayload, targetUserRole: UserRole, targetUserFleetId: string | null): boolean {
  if (requestingUser.role === UserRole.ADMIN) {
    return true;
  }
  if (requestingUser.role === UserRole.FLEET_MGR) {
    const fleetRoles = [UserRole.FLEET_USER, UserRole.SUB_FLEET_MGR];
    return fleetRoles.includes(targetUserRole) && requestingUser.fleetId === targetUserFleetId;
  }
  return false;
}
