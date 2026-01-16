import { Request } from 'express';

// User Roles
export enum UserRole {
  ADMIN = 'ADMIN',
  SUB_ADMIN = 'SUB_ADMIN',
  FLEET_MGR = 'FLEET_MGR',
  SUB_FLEET_MGR = 'SUB_FLEET_MGR',
  FLEET_USER = 'FLEET_USER',
  REG_OWNER = 'REG_OWNER',
  ONBOARDING = 'ONBOARDING',
  UNIT_TESTER = 'UNIT_TESTER'
}

// Regulator Status
export enum RegulatorStatus {
  WAREHOUSE = 'WAREHOUSE',
  READY = 'READY',
  CHECKED_OUT = 'CHECKED_OUT',
  CHARGING = 'CHARGING',
  MAINTENANCE = 'MAINTENANCE'
}

// JWT Payload
export interface JwtPayload {
  sub: string;
  userId: string;
  role: UserRole;
  fleetId?: string | null;
  ownedRegulatorIds?: string[];
  iat: number;
  exp: number;
  jti: string;
}

export interface RefreshTokenPayload {
  sub: string;
  userId: string;
  tokenFamily: string;
  iat: number;
  exp: number;
}

// Extended Request with user info
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
  meta: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiMeta {
  timestamp: string;
  requestId?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// User Types
export interface UserAttributes {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  fleetId?: string | null;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
  deletedAt?: Date | null;
}

export interface UserCreateInput {
  email: string;
  password: string;
  role: UserRole;
  fleetId?: string | null;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
}

export interface UserUpdateInput {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
  role?: UserRole;
  fleetId?: string | null;
  isActive?: boolean;
}

export interface UserPublic {
  id: string;
  email: string;
  role: UserRole;
  fleetId?: string | null;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
}

// Fleet Types
export interface FleetAttributes {
  id: string;
  licenseeName: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber?: string | null;
  leaseStartDate?: Date | null;
  leaseEndDate?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface FleetCreateInput {
  licenseeName: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber?: string | null;
  leaseStartDate?: Date | null;
  leaseEndDate?: Date | null;
}

export interface FleetUpdateInput {
  licenseeName?: string;
  address1?: string;
  address2?: string | null;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phoneNumber?: string | null;
  leaseStartDate?: Date | null;
  leaseEndDate?: Date | null;
  isActive?: boolean;
}

// Regulator Types
export interface RegulatorAttributes {
  id: string;
  macAddress: string;
  barcode: string;
  status: RegulatorStatus;
  fleetId?: string | null;
  ownerUserId?: string | null;
  firmwareVersion: string;
  hardwareRevision: string;
  lastSeenAt?: Date | null;
  purchasedAt?: Date | null;
  purchaseSource?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface RegulatorCreateInput {
  macAddress: string;
  barcode: string;
  status?: RegulatorStatus;
  fleetId?: string | null;
  ownerUserId?: string | null;
  firmwareVersion: string;
  hardwareRevision: string;
}

export interface RegulatorUpdateInput {
  status?: RegulatorStatus;
  fleetId?: string | null;
  ownerUserId?: string | null;
  firmwareVersion?: string;
  hardwareRevision?: string;
  lastSeenAt?: Date | null;
  isActive?: boolean;
}

// Battery Info
export interface BatteryInfo {
  soc: number;
  soh: number;
  cycles: number;
  voltage_mV?: number;
  current_mA?: number;
  remainingCapacity_mAh?: number;
  fullCapacity_mAh?: number;
  estimatedTimeToEmpty_minutes?: number;
}

// Rental Types
export interface RentalAttributes {
  id: string;
  regulatorId: string;
  fleetId: string;
  playerId?: string | null;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  emailAddress?: string | null;
  checkoutDateTime: Date;
  checkinDateTime?: Date | null;
  accessories: RentalAccessories;
  checkinAccessories?: RentalAccessories | null;
  notes?: string | null;
  checkedOutBy: string;
  checkedInBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RentalAccessories {
  usbcCable?: boolean;
  battery?: boolean;
  gasket?: boolean;
  faceShield?: boolean;
  nozzlesHoses?: boolean;
}

export interface CheckoutInput {
  playerId?: string | null;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  emailAddress?: string | null;
  accessories: RentalAccessories;
}

export interface CheckinInput {
  rentalId: string;
  accessories: RentalAccessories;
  notes?: string | null;
  status?: RegulatorStatus;
}

// Telemetry Types
export interface TelemetryAttributes {
  id: string;
  regulatorId: string;
  timestamp: Date;
  soc: number;
  soh: number;
  cycles: number;
  voltage_mV?: number | null;
  current_mA?: number | null;
  remainingCapacity_mAh?: number | null;
  fullCapacity_mAh?: number | null;
  estimatedTimeToEmpty_minutes?: number | null;
  temperature_C?: number | null;
  fanSpeed?: number | null;
  uploadedAt: Date;
  createdAt: Date;
}

export interface TelemetryInput {
  timestamp: string;
  soc: number;
  soh: number;
  cycles: number;
  voltage_mV?: number | null;
  current_mA?: number | null;
  remainingCapacity_mAh?: number | null;
  fullCapacity_mAh?: number | null;
  estimatedTimeToEmpty_minutes?: number | null;
  temperature_C?: number | null;
  fanSpeed?: number | null;
}

export interface TelemetryBatchInput {
  telemetryBatch: TelemetryInput[];
}

// Refresh Token Types
export interface RefreshTokenAttributes {
  id: string;
  userId: string;
  tokenHash: string;
  tokenFamily: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
}

// Password Reset Types
export interface PasswordResetAttributes {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

// WebSocket Event Types
export type WebSocketEventType = 
  | 'REGULATOR_STATUS_CHANGED'
  | 'REGULATOR_CHECKED_OUT'
  | 'REGULATOR_CHECKED_IN'
  | 'FLEET_UPDATED'
  | 'TELEMETRY_RECEIVED'
  | 'CONNECTED'
  | 'SUBSCRIBED'
  | 'UNSUBSCRIBED'
  | 'ERROR'
  | 'PONG';

export interface WebSocketEvent {
  type: WebSocketEventType;
  payload: unknown;
  timestamp: string;
}

export interface WebSocketSubscription {
  channel: string;
  fleetId?: string;
  regulatorId?: string;
}

// Auth Types
export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserPublic;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
}

export interface TokenRefreshInput {
  refreshToken: string;
}

export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}
