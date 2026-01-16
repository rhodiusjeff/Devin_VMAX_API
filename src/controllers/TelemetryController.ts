import { Response, NextFunction } from 'express';
import TelemetryService from '../services/TelemetryService';
import RegulatorService from '../services/RegulatorService';
import { AuthenticatedRequest } from '../types';
import { successResponse, forbidden, paginatedResponse } from '../utils/response';
import { canAccessRegulator } from '../middleware/auth';

export class TelemetryController {
  async uploadTelemetry(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const regulatorId = req.params.regulatorId as string;
      
      // Get regulator to check access
      const regulator = await RegulatorService.getRegulatorById(regulatorId, false);
      
      if (!canAccessRegulator(req.user!, regulator.fleetId || null, regulator.ownerUserId || null)) {
        forbidden(res, 'You cannot upload telemetry for this regulator');
        return;
      }

      // Check if it's a batch upload or single record
      if (req.body.telemetryBatch) {
        const result = await TelemetryService.uploadTelemetryBatch(regulatorId, req.body.telemetryBatch);
        successResponse(res, result, 201);
      } else {
        const result = await TelemetryService.uploadTelemetry(regulatorId, req.body);
        successResponse(res, result, 201);
      }
    } catch (error) {
      next(error);
    }
  }

  async getTelemetry(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const regulatorId = req.params.regulatorId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      // Get regulator to check access
      const regulator = await RegulatorService.getRegulatorById(regulatorId, false);
      
      if (!canAccessRegulator(req.user!, regulator.fleetId || null, regulator.ownerUserId || null)) {
        forbidden(res, 'You cannot access telemetry for this regulator');
        return;
      }

      const result = await TelemetryService.getTelemetry(regulatorId, page, limit, { startDate, endDate });
      paginatedResponse(res, { telemetry: result.telemetry }, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getLatestTelemetry(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const regulatorId = req.params.regulatorId as string;

      // Get regulator to check access
      const regulator = await RegulatorService.getRegulatorById(regulatorId, false);
      
      if (!canAccessRegulator(req.user!, regulator.fleetId || null, regulator.ownerUserId || null)) {
        forbidden(res, 'You cannot access telemetry for this regulator');
        return;
      }

      const telemetry = await TelemetryService.getLatestTelemetry(regulatorId);
      successResponse(res, { telemetry });
    } catch (error) {
      next(error);
    }
  }
}

export default new TelemetryController();
