import { Router } from 'express';
import UserController from '../controllers/UserController';
import { authenticate, requireAdmin, requireAdminOrSubAdmin } from '../middleware/auth';
import { validate, emailValidation, passwordValidation, firstNameValidation, lastNameValidation, phoneNumberValidation, roleValidation, uuidParamValidation, paginationValidation, fleetIdValidation } from '../middleware/validation';
import { body } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/users/me
router.get('/me', UserController.getMe);

// PUT /api/v1/users/me
router.put(
  '/me',
  validate([
    body('firstName').optional().trim().isLength({ min: 1, max: 100 }),
    body('lastName').optional().trim().isLength({ min: 1, max: 100 }),
    phoneNumberValidation
  ]),
  UserController.updateMe
);

// GET /api/v1/users
router.get(
  '/',
  requireAdminOrSubAdmin,
  validate(paginationValidation),
  UserController.getUsers
);

// POST /api/v1/users
router.post(
  '/',
  requireAdmin,
  validate([
    emailValidation,
    passwordValidation,
    roleValidation,
    fleetIdValidation,
    firstNameValidation,
    lastNameValidation,
    phoneNumberValidation
  ]),
  UserController.createUser
);

// GET /api/v1/users/:userId
router.get(
  '/:userId',
  requireAdminOrSubAdmin,
  validate([uuidParamValidation('userId')]),
  UserController.getUserById
);

// PUT /api/v1/users/:userId
router.put(
  '/:userId',
  requireAdmin,
  validate([
    uuidParamValidation('userId'),
    body('firstName').optional().trim().isLength({ min: 1, max: 100 }),
    body('lastName').optional().trim().isLength({ min: 1, max: 100 }),
    phoneNumberValidation,
    body('role').optional().isIn(['ADMIN', 'SUB_ADMIN', 'FLEET_MGR', 'SUB_FLEET_MGR', 'FLEET_USER', 'REG_OWNER', 'ONBOARDING', 'UNIT_TESTER']),
    fleetIdValidation,
    body('isActive').optional().isBoolean()
  ]),
  UserController.updateUser
);

// DELETE /api/v1/users/:userId
router.delete(
  '/:userId',
  requireAdmin,
  validate([uuidParamValidation('userId')]),
  UserController.deleteUser
);

export default router;
