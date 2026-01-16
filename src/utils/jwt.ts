import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import config, { getAccessTokenExpirySeconds, getRefreshTokenExpirySeconds } from '../config';
import { JwtPayload, RefreshTokenPayload, UserRole } from '../types';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenFamily: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresAt: Date;
}

export function generateAccessToken(
  userId: string,
  email: string,
  role: UserRole,
  fleetId?: string | null,
  ownedRegulatorIds?: string[]
): string {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: email,
    userId,
    role,
    fleetId: fleetId || null,
    ownedRegulatorIds: ownedRegulatorIds || [],
    jti: uuidv4()
  };

  const options: SignOptions = {
    expiresIn: getAccessTokenExpirySeconds()
  };

  return jwt.sign(payload, config.jwt.secret, options);
}

export function generateRefreshToken(userId: string, email: string, tokenFamily?: string): { token: string; family: string } {
  const family = tokenFamily || uuidv4();
  
  const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
    sub: email,
    userId,
    tokenFamily: family
  };

  const options: SignOptions = {
    expiresIn: getRefreshTokenExpirySeconds()
  };

  const token = jwt.sign(payload, config.jwt.secret, options);

  return { token, family };
}

export function generateTokenPair(
  userId: string,
  email: string,
  role: UserRole,
  fleetId?: string | null,
  ownedRegulatorIds?: string[],
  existingTokenFamily?: string
): TokenPair {
  const accessToken = generateAccessToken(userId, email, role, fleetId, ownedRegulatorIds);
  const { token: refreshToken, family: tokenFamily } = generateRefreshToken(userId, email, existingTokenFamily);
  
  const accessTokenExpiresIn = getAccessTokenExpirySeconds();
  const refreshTokenExpiresAt = new Date(Date.now() + getRefreshTokenExpirySeconds() * 1000);

  return {
    accessToken,
    refreshToken,
    tokenFamily,
    accessTokenExpiresIn,
    refreshTokenExpiresAt
  };
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, config.jwt.secret) as RefreshTokenPayload;
}

export function decodeToken(token: string): JwtPayload | RefreshTokenPayload | null {
  try {
    return jwt.decode(token) as JwtPayload | RefreshTokenPayload;
  } catch {
    return null;
  }
}
