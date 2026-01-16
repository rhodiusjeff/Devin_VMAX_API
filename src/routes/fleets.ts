import { Router } from 'express';
import FleetController from '../controllers/FleetController';
import UserController from '../controllers/UserController';
import RegulatorController from '../controllers/RegulatorController';
import { authenticate, requireAdmin, requireAdminOrSubAdmin, requireFleetAccess } from '../middleware/auth';
import { validate, uuidParamValidation, paginationValidation } from '../middleware/validation';
import { body, query } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/fleets
router.get(
  '/',
  requireAdminOrSubAdmin,
  validate([
    ...paginationValidation,
    query('search').optional().isString()
  ]),
  FleetController.getFleets
);

// POST /api/v1/fleets
router.post(
  '/',
  requireAdmin,
  validate([
    body('licenseeName').trim().isLength({ min: 1, max: 255 }).withMessage('Licensee name is required'),
    body('address1').trim().isLength({ min: 1, max: 255 }).withMessage('Address is required'),
    body('address2').optional({ nullable: true }).trim().isLength({ max: 255 }),
    body('city').trim().isLength({ min: 1, max: 100 }).withMessage('City is required'),
    body('state').trim().isLength({ min: 1, max: 100 }).withMessage('State is required'),
    body('postalCode').trim().isLength({ min: 1, max: 20 }).withMessage('Postal code is required'),
    body('country').optional().trim().isLength({ max: 100 }),
    body('phoneNumber').optional({ nullable: true }).matches(/^\+?[1-9]\d{1,14}$/),
    body('leaseStartDate').optional({ nullable: true }).isISO8601(),
    body('leaseEndDate').optional({ nullable: true }).isISO8601()
  ]),
  FleetController.createFleet
);

// GET /api/v1/fleets/:fleetId
router.get(
  '/:fleetId',
  requireFleetAccess,
  validate([uuidParamValidation('fleetId')]),
  FleetController.getFleetById
);

// PUT /api/v1/fleets/:fleetId
router.put(
  '/:fleetId',
  requireAdmin,
  validate([
    uuidParamValidation('fleetId'),
    body('licenseeName').optional().trim().isLength({ min: 1, max: 255 }),
    body('address1').optional().trim().isLength({ min: 1, max: 255 }),
    body('address2').optional({ nullable: true }).trim().isLength({ max: 255 }),
    body('city').optional().trim().isLength({ min: 1, max: 100 }),
    body('state').optional().trim().isLength({ min: 1, max: 100 }),
    body('postalCode').optional().trim().isLength({ min: 1, max: 20 }),
    body('country').optional().trim().isLength({ max: 100 }),
    body('phoneNumber').optional({ nullable: true }).matches(/^\+?[1-9]\d{1,14}$/),
    body('leaseStartDate').optional({ nullable: true }).isISO8601(),
    body('leaseEndDate').optional({ nullable: true }).isISO8601(),
    body('isActive').optional().isBoolean()
  ]),
  FleetController.updateFleet
);

// DELETE /api/v1/fleets/:fleetId
router.delete(
  '/:fleetId',
  requireAdmin,
  validate([uuidParamValidation('fleetId')]),
  FleetController.deleteFleet
);

// GET /api/v1/fleets/:fleetId/users
router.get(
  '/:fleetId/users',
  requireFleetAccess,
  validate([
    uuidParamValidation('fleetId'),
    ...paginationValidation
  ]),
  UserController.getFleetUsers
);

// GET /api/v1/fleets/:fleetId/regulators
router.get(
  '/:fleetId/regulators',
  requireFleetAccess,
  validate([
    uuidParamValidation('fleetId'),
    ...paginationValidation,
    query('status').optional().isIn(['WAREHOUSE', 'READY', 'CHECKED_OUT', 'CHARGING', 'MAINTENANCE'])
  ]),
  RegulatorController.getFleetRegulators
);

// GET /api/v1/fleets/:fleetId/rentals/active
router.get(
  '/:fleetId/rentals/active',
  requireFleetAccess,
  validate([
    uuidParamValidation('fleetId'),
    ...paginationValidation
  ]),
  RegulatorController.getActiveRentals
);

// GET /api/v1/fleets/:fleetId/rentals/history
router.get(
  '/:fleetId/rentals/history',
  requireFleetAccess,
  validate([
    uuidParamValidation('fleetId'),
    ...paginationValidation,
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('playerId').optional().isString()
  ]),
  RegulatorController.getRentalHistory
);

export default router;
