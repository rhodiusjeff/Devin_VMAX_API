import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface Config {
  nodeEnv: string;
  port: number;
  host: string;
  db: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  jwt: {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
  };
  ws: {
    port: number;
  };
  logLevel: string;
}

function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiry format: ${expiry}`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 60 * 60 * 24;
    default: throw new Error(`Unknown time unit: ${unit}`);
  }
}

export function getAccessTokenExpirySeconds(): number {
  return parseExpiry(config.jwt.accessTokenExpiry);
}

export function getRefreshTokenExpirySeconds(): number {
  return parseExpiry(config.jwt.refreshTokenExpiry);
}

export const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8080', 10),
  host: process.env.HOST || '0.0.0.0',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    name: process.env.DB_NAME || 'vmax_api',
    user: process.env.DB_USER || 'vmax_user',
    password: process.env.DB_PASSWORD || 'vmax_password',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
  },
  ws: {
    port: parseInt(process.env.WS_PORT || '8081', 10),
  },
  logLevel: process.env.LOG_LEVEL || 'debug',
};

export default config;
