import { Response, NextFunction } from 'express';
import RegulatorService from '../services/RegulatorService';
import RentalService from '../services/RentalService';
import { AuthenticatedRequest, RegulatorStatus } from '../types';
import { successResponse, forbidden, paginatedResponse, badRequest } from '../utils/response';
import { canAccessFleet, canAccessRegulator } from '../middleware/auth';

export class RegulatorController {
  async getRegulators(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const status = req.query.status as RegulatorStatus | undefined;
      const fleetId = req.query.fleetId as string | undefined;
      const ownerUserId = req.query.ownerUserId as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await RegulatorService.getRegulators(page, limit, { status, fleetId, ownerUserId, search });
      paginatedResponse(res, { regulators: result.regulators }, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getRegulatorById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const regulatorId = req.params.regulatorId as string;
      const regulator = await RegulatorService.getRegulatorById(regulatorId);

      // Check access
      if (!canAccessRegulator(req.user!, regulator.fleetId || null, regulator.ownerUserId || null)) {
        forbidden(res, 'You cannot access this regulator');
        return;
      }

      successResponse(res, regulator);
    } catch (error) {
      next(error);
    }
  }

  async getMyDevices(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await RegulatorService.getMyDevices(req.user!);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createRegulator(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { macAddress, barcode, status, fleetId, ownerUserId, firmwareVersion, hardwareRevision } = req.body;

      const regulator = await RegulatorService.createRegulator({
        macAddress,
        barcode,
        status,
        fleetId,
        ownerUserId,
        firmwareVersion,
        hardwareRevision
      });
      successResponse(res, regulator, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateRegulator(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const regulatorId = req.params.regulatorId as string;
      const { status, fleetId, ownerUserId, firmwareVersion, hardwareRevision, isActive } = req.body;

      const regulator = await RegulatorService.updateRegulator(regulatorId, {
        status,
        fleetId,
        ownerUserId,
        firmwareVersion,
        hardwareRevision,
        isActive
      });
      successResponse(res, regulator);
    } catch (error) {
      next(error);
    }
  }

  async deleteRegulator(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const regulatorId = req.params.regulatorId as string;
      await RegulatorService.deleteRegulator(regulatorId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async assignToFleet(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const regulatorId = req.params.regulatorId as string;
      const { fleetId } = req.body;

      if (!fleetId) {
        badRequest(res, 'Fleet ID is required');
        return;
      }

      const regulator = await RegulatorService.assignToFleet(regulatorId, fleetId);
      successResponse(res, regulator);
    } catch (error) {
      next(error);
    }
  }

  async removeFromFleet(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const regulatorId = req.params.regulatorId as string;
      const regulator = await RegulatorService.removeFromFleet(regulatorId);
      successResponse(res, regulator);
    } catch (error) {
      next(error);
    }
  }

  async getFleetRegulators(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const fleetId = req.params.fleetId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const status = req.query.status as RegulatorStatus | undefined;

      // Check access
      if (!canAccessFleet(req.user!, fleetId)) {
        forbidden(res, 'You cannot access regulators in this fleet');
        return;
      }

      const result = await RegulatorService.getRegulatorsByFleet(fleetId, page, limit, status);
      paginatedResponse(res, { regulators: result.regulators }, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async checkout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const regulatorId = req.params.regulatorId as string;
      const { playerId, firstName, lastName, phoneNumber, emailAddress, accessories } = req.body;

      // Get regulator to check fleet
      const regulator = await RegulatorService.getRegulatorById(regulatorId);
      
      if (!regulator.fleetId) {
        badRequest(res, 'Regulator is not assigned to a fleet');
        return;
      }

      // Check fleet access
      if (!canAccessFleet(req.user!, regulator.fleetId)) {
        forbidden(res, 'You cannot checkout regulators from this fleet');
        return;
      }

      const result = await RentalService.checkout(
        regulatorId,
        regulator.fleetId,
        req.user!.userId,
        { playerId, firstName, lastName, phoneNumber, emailAddress, accessories }
      );
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async checkin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const regulatorId = req.params.regulatorId as string;
      const { rentalId, accessories, notes, status } = req.body;

      // Get regulator to check fleet
      const regulator = await RegulatorService.getRegulatorById(regulatorId);
      
      if (!regulator.fleetId) {
        badRequest(res, 'Regulator is not assigned to a fleet');
        return;
      }

      // Check fleet access
      if (!canAccessFleet(req.user!, regulator.fleetId)) {
        forbidden(res, 'You cannot checkin regulators to this fleet');
        return;
      }

      const result = await RentalService.checkin(
        regulatorId,
        regulator.fleetId,
        req.user!.userId,
        { rentalId, accessories, notes, status }
      );
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getActiveRentals(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const fleetId = req.params.fleetId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      // Check access
      if (!canAccessFleet(req.user!, fleetId)) {
        forbidden(res, 'You cannot access rentals in this fleet');
        return;
      }

      const result = await RentalService.getActiveRentals(fleetId, page, limit);
      paginatedResponse(res, { rentals: result.rentals }, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getRentalHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const fleetId = req.params.fleetId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const playerId = req.query.playerId as string | undefined;

      // Check access
      if (!canAccessFleet(req.user!, fleetId)) {
        forbidden(res, 'You cannot access rental history in this fleet');
        return;
      }

      const result = await RentalService.getRentalHistory(fleetId, page, limit, { startDate, endDate, playerId });
      paginatedResponse(res, { rentals: result.rentals }, result.pagination);
    } catch (error) {
      next(error);
    }
  }
}

export default new RegulatorController();
