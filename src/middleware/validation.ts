import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain, body, param, query } from 'express-validator';
import { validationError } from '../utils/response';
import { UserRole, RegulatorStatus } from '../types';

export function validate(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
      return;
    }

    const formattedErrors = errors.array().map(err => ({
      field: 'path' in err ? err.path : 'unknown',
      message: err.msg
    }));

    validationError(res, formattedErrors);
  };
}

// Common validation chains
export const emailValidation = body('email')
  .isEmail()
  .withMessage('Must be a valid email address')
  .normalizeEmail();

export const passwordValidation = body('password')
  .isLength({ min: 8, max: 128 })
  .withMessage('Password must be between 8 and 128 characters')
  .matches(/[A-Z]/)
  .withMessage('Password must contain at least one uppercase letter')
  .matches(/[a-z]/)
  .withMessage('Password must contain at least one lowercase letter')
  .matches(/[0-9]/)
  .withMessage('Password must contain at least one number')
  .matches(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/)
  .withMessage('Password must contain at least one special character');

export const newPasswordValidation = body('newPassword')
  .isLength({ min: 8, max: 128 })
  .withMessage('Password must be between 8 and 128 characters')
  .matches(/[A-Z]/)
  .withMessage('Password must contain at least one uppercase letter')
  .matches(/[a-z]/)
  .withMessage('Password must contain at least one lowercase letter')
  .matches(/[0-9]/)
  .withMessage('Password must contain at least one number')
  .matches(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/)
  .withMessage('Password must contain at least one special character');

export const firstNameValidation = body('firstName')
  .trim()
  .isLength({ min: 1, max: 100 })
  .withMessage('First name must be between 1 and 100 characters');

export const lastNameValidation = body('lastName')
  .trim()
  .isLength({ min: 1, max: 100 })
  .withMessage('Last name must be between 1 and 100 characters');

export const phoneNumberValidation = body('phoneNumber')
  .optional({ nullable: true })
  .matches(/^\+?[1-9]\d{1,14}$/)
  .withMessage('Must be a valid phone number');

export const roleValidation = body('role')
  .isIn(Object.values(UserRole))
  .withMessage(`Role must be one of: ${Object.values(UserRole).join(', ')}`);

export const uuidParamValidation = (paramName: string) =>
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} must be a valid UUID`);

export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt()
];

export const macAddressValidation = body('macAddress')
  .matches(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/)
  .withMessage('Must be a valid MAC address (format: XX:XX:XX:XX:XX:XX)');

export const barcodeValidation = body('barcode')
  .trim()
  .isLength({ min: 1, max: 50 })
  .withMessage('Barcode must be between 1 and 50 characters');

export const regulatorStatusValidation = body('status')
  .optional()
  .isIn(Object.values(RegulatorStatus))
  .withMessage(`Status must be one of: ${Object.values(RegulatorStatus).join(', ')}`);

export const fleetIdValidation = body('fleetId')
  .optional({ nullable: true })
  .isUUID()
  .withMessage('Fleet ID must be a valid UUID');

export const accessoriesValidation = body('accessories')
  .isObject()
  .withMessage('Accessories must be an object');

export const telemetryValidation = [
  body('timestamp')
    .isISO8601()
    .withMessage('Timestamp must be a valid ISO 8601 date'),
  body('soc')
    .isInt({ min: 0, max: 100 })
    .withMessage('SOC must be between 0 and 100'),
  body('soh')
    .isInt({ min: 0, max: 100 })
    .withMessage('SOH must be between 0 and 100'),
  body('cycles')
    .isInt({ min: 0 })
    .withMessage('Cycles must be a non-negative integer'),
  body('voltage_mV')
    .optional({ nullable: true })
    .isInt()
    .withMessage('Voltage must be an integer'),
  body('current_mA')
    .optional({ nullable: true })
    .isInt()
    .withMessage('Current must be an integer'),
  body('temperature_C')
    .optional({ nullable: true })
    .isFloat()
    .withMessage('Temperature must be a number'),
  body('fanSpeed')
    .optional({ nullable: true })
    .isInt({ min: 0, max: 10 })
    .withMessage('Fan speed must be between 0 and 10')
];

export const telemetryBatchValidation = [
  body('telemetryBatch')
    .isArray({ min: 1, max: 1000 })
    .withMessage('Telemetry batch must be an array with 1-1000 items'),
  body('telemetryBatch.*.timestamp')
    .isISO8601()
    .withMessage('Each timestamp must be a valid ISO 8601 date'),
  body('telemetryBatch.*.soc')
    .isInt({ min: 0, max: 100 })
    .withMessage('Each SOC must be between 0 and 100'),
  body('telemetryBatch.*.soh')
    .isInt({ min: 0, max: 100 })
    .withMessage('Each SOH must be between 0 and 100'),
  body('telemetryBatch.*.cycles')
    .isInt({ min: 0 })
    .withMessage('Each cycles value must be a non-negative integer')
];
