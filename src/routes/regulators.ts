import { Router } from 'express';
import RegulatorController from '../controllers/RegulatorController';
import TelemetryController from '../controllers/TelemetryController';
import { authenticate, requireAdmin, requireAdminOrSubAdmin, requireFleetAccess } from '../middleware/auth';
import { validate, uuidParamValidation, paginationValidation, macAddressValidation, barcodeValidation, regulatorStatusValidation, fleetIdValidation, accessoriesValidation } from '../middleware/validation';
import { body, query } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/regulators/my-devices
router.get('/my-devices', RegulatorController.getMyDevices);

// GET /api/v1/regulators
router.get(
  '/',
  requireAdminOrSubAdmin,
  validate([
    ...paginationValidation,
    query('status').optional().isIn(['WAREHOUSE', 'READY', 'CHECKED_OUT', 'CHARGING', 'MAINTENANCE']),
    query('fleetId').optional().isUUID(),
    query('ownerUserId').optional().isUUID(),
    query('search').optional().isString()
  ]),
  RegulatorController.getRegulators
);

// POST /api/v1/regulators
router.post(
  '/',
  requireAdmin,
  validate([
    macAddressValidation,
    barcodeValidation,
    regulatorStatusValidation,
    fleetIdValidation,
    body('ownerUserId').optional({ nullable: true }).isUUID(),
    body('firmwareVersion').trim().isLength({ min: 1, max: 20 }).withMessage('Firmware version is required'),
    body('hardwareRevision').trim().isLength({ min: 1, max: 20 }).withMessage('Hardware revision is required')
  ]),
  RegulatorController.createRegulator
);

// GET /api/v1/regulators/:regulatorId
router.get(
  '/:regulatorId',
  validate([uuidParamValidation('regulatorId')]),
  RegulatorController.getRegulatorById
);

// PUT /api/v1/regulators/:regulatorId
router.put(
  '/:regulatorId',
  requireAdmin,
  validate([
    uuidParamValidation('regulatorId'),
    regulatorStatusValidation,
    fleetIdValidation,
    body('ownerUserId').optional({ nullable: true }).isUUID(),
    body('firmwareVersion').optional().trim().isLength({ min: 1, max: 20 }),
    body('hardwareRevision').optional().trim().isLength({ min: 1, max: 20 }),
    body('isActive').optional().isBoolean()
  ]),
  RegulatorController.updateRegulator
);

// DELETE /api/v1/regulators/:regulatorId
router.delete(
  '/:regulatorId',
  requireAdmin,
  validate([uuidParamValidation('regulatorId')]),
  RegulatorController.deleteRegulator
);

// POST /api/v1/regulators/:regulatorId/assign-fleet
router.post(
  '/:regulatorId/assign-fleet',
  requireAdmin,
  validate([
    uuidParamValidation('regulatorId'),
    body('fleetId').isUUID().withMessage('Fleet ID is required')
  ]),
  RegulatorController.assignToFleet
);

// POST /api/v1/regulators/:regulatorId/remove-fleet
router.post(
  '/:regulatorId/remove-fleet',
  requireAdmin,
  validate([uuidParamValidation('regulatorId')]),
  RegulatorController.removeFromFleet
);

// POST /api/v1/regulators/:regulatorId/checkout
router.post(
  '/:regulatorId/checkout',
  requireFleetAccess,
  validate([
    uuidParamValidation('regulatorId'),
    body('playerId').optional({ nullable: true }).isString(),
    body('firstName').trim().isLength({ min: 1, max: 100 }).withMessage('First name is required'),
    body('lastName').trim().isLength({ min: 1, max: 100 }).withMessage('Last name is required'),
    body('phoneNumber').optional({ nullable: true }).matches(/^\+?[1-9]\d{1,14}$/),
    body('emailAddress').optional({ nullable: true }).isEmail(),
    accessoriesValidation
  ]),
  RegulatorController.checkout
);

// POST /api/v1/regulators/:regulatorId/checkin
router.post(
  '/:regulatorId/checkin',
  requireFleetAccess,
  validate([
    uuidParamValidation('regulatorId'),
    body('rentalId').isUUID().withMessage('Rental ID is required'),
    accessoriesValidation,
    body('notes').optional({ nullable: true }).isString(),
    body('status').optional().isIn(['READY', 'CHARGING', 'MAINTENANCE'])
  ]),
  RegulatorController.checkin
);

// POST /api/v1/regulators/:regulatorId/telemetry
router.post(
  '/:regulatorId/telemetry',
  validate([
    uuidParamValidation('regulatorId'),
    // Allow either single telemetry or batch
    body('telemetryBatch').optional().isArray({ min: 1, max: 1000 }),
    body('timestamp').optional().isISO8601(),
    body('soc').optional().isInt({ min: 0, max: 100 }),
    body('soh').optional().isInt({ min: 0, max: 100 }),
    body('cycles').optional().isInt({ min: 0 })
  ]),
  TelemetryController.uploadTelemetry
);

// GET /api/v1/regulators/:regulatorId/telemetry
router.get(
  '/:regulatorId/telemetry',
  validate([
    uuidParamValidation('regulatorId'),
    ...paginationValidation,
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ]),
  TelemetryController.getTelemetry
);

// GET /api/v1/regulators/:regulatorId/telemetry/latest
router.get(
  '/:regulatorId/telemetry/latest',
  validate([uuidParamValidation('regulatorId')]),
  TelemetryController.getLatestTelemetry
);

export default router;
