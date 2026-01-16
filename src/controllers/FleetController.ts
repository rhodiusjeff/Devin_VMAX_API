import { Response, NextFunction } from 'express';
import FleetService from '../services/FleetService';
import { AuthenticatedRequest } from '../types';
import { successResponse, forbidden, paginatedResponse } from '../utils/response';
import { canAccessFleet } from '../middleware/auth';

export class FleetController {
  async getFleets(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const search = req.query.search as string | undefined;

      const result = await FleetService.getFleets(page, limit, search);
      paginatedResponse(res, { fleets: result.fleets }, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getFleetById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const fleetId = req.params.fleetId as string;

      // Check access
      if (!canAccessFleet(req.user!, fleetId)) {
        forbidden(res, 'You cannot access this fleet');
        return;
      }

      const fleet = await FleetService.getFleetById(fleetId);
      successResponse(res, fleet);
    } catch (error) {
      next(error);
    }
  }

  async createFleet(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        licenseeName,
        address1,
        address2,
        city,
        state,
        postalCode,
        country,
        phoneNumber,
        leaseStartDate,
        leaseEndDate
      } = req.body;

      const fleet = await FleetService.createFleet({
        licenseeName,
        address1,
        address2,
        city,
        state,
        postalCode,
        country,
        phoneNumber,
        leaseStartDate: leaseStartDate ? new Date(leaseStartDate) : null,
        leaseEndDate: leaseEndDate ? new Date(leaseEndDate) : null
      });
      successResponse(res, fleet, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateFleet(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const fleetId = req.params.fleetId as string;
      const {
        licenseeName,
        address1,
        address2,
        city,
        state,
        postalCode,
        country,
        phoneNumber,
        leaseStartDate,
        leaseEndDate,
        isActive
      } = req.body;

      const fleet = await FleetService.updateFleet(fleetId, {
        licenseeName,
        address1,
        address2,
        city,
        state,
        postalCode,
        country,
        phoneNumber,
        leaseStartDate: leaseStartDate !== undefined ? (leaseStartDate ? new Date(leaseStartDate) : null) : undefined,
        leaseEndDate: leaseEndDate !== undefined ? (leaseEndDate ? new Date(leaseEndDate) : null) : undefined,
        isActive
      });
      successResponse(res, fleet);
    } catch (error) {
      next(error);
    }
  }

  async deleteFleet(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const fleetId = req.params.fleetId as string;
      await FleetService.deleteFleet(fleetId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export default new FleetController();
