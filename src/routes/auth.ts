import { Router } from 'express';
import AuthController from '../controllers/AuthController';
import { authenticate } from '../middleware/auth';
import { validate, emailValidation, passwordValidation, newPasswordValidation, firstNameValidation, lastNameValidation, phoneNumberValidation } from '../middleware/validation';
import { body } from 'express-validator';

const router = Router();

// POST /api/v1/auth/login
router.post(
  '/login',
  validate([
    emailValidation,
    body('password').notEmpty().withMessage('Password is required')
  ]),
  AuthController.login
);

// POST /api/v1/auth/register
router.post(
  '/register',
  validate([
    emailValidation,
    passwordValidation,
    firstNameValidation,
    lastNameValidation,
    phoneNumberValidation
  ]),
  AuthController.register
);

// POST /api/v1/auth/logout
router.post(
  '/logout',
  authenticate,
  validate([
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
  ]),
  AuthController.logout
);

// POST /api/v1/auth/refresh
router.post(
  '/refresh',
  validate([
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
  ]),
  AuthController.refresh
);

// POST /api/v1/auth/forgot-password
router.post(
  '/forgot-password',
  validate([emailValidation]),
  AuthController.forgotPassword
);

// POST /api/v1/auth/reset-password
router.post(
  '/reset-password',
  validate([
    body('token').notEmpty().withMessage('Reset token is required'),
    newPasswordValidation
  ]),
  AuthController.resetPassword
);

// POST /api/v1/auth/change-password
router.post(
  '/change-password',
  authenticate,
  validate([
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    newPasswordValidation
  ]),
  AuthController.changePassword
);

export default router;
