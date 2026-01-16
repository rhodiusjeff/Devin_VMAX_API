import { generateAccessToken, generateRefreshToken, generateTokenPair, verifyAccessToken, verifyRefreshToken, decodeToken } from '../../src/utils/jwt';
import { UserRole } from '../../src/types';

describe('JWT Utilities', () => {
  const testUserId = '123e4567-e89b-12d3-a456-426614174000';
  const testEmail = 'test@example.com';
  const testRole = UserRole.FLEET_MGR;
  const testFleetId = '987fcdeb-51a2-3bc4-d567-890123456789';

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(testUserId, testEmail, testRole, testFleetId);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include correct claims in the token', () => {
      const token = generateAccessToken(testUserId, testEmail, testRole, testFleetId, ['reg-1', 'reg-2']);
      const payload = verifyAccessToken(token);
      
      expect(payload.sub).toBe(testEmail);
      expect(payload.userId).toBe(testUserId);
      expect(payload.role).toBe(testRole);
      expect(payload.fleetId).toBe(testFleetId);
      expect(payload.ownedRegulatorIds).toEqual(['reg-1', 'reg-2']);
      expect(payload.jti).toBeDefined();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const { token, family } = generateRefreshToken(testUserId, testEmail);
      
      expect(token).toBeDefined();
      expect(family).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should use provided token family', () => {
      const existingFamily = 'existing-family-id';
      const { token, family } = generateRefreshToken(testUserId, testEmail, existingFamily);
      
      expect(family).toBe(existingFamily);
      
      const payload = verifyRefreshToken(token);
      expect(payload.tokenFamily).toBe(existingFamily);
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const tokenPair = generateTokenPair(testUserId, testEmail, testRole, testFleetId);
      
      expect(tokenPair.accessToken).toBeDefined();
      expect(tokenPair.refreshToken).toBeDefined();
      expect(tokenPair.tokenFamily).toBeDefined();
      expect(tokenPair.accessTokenExpiresIn).toBeGreaterThan(0);
      expect(tokenPair.refreshTokenExpiresAt).toBeInstanceOf(Date);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const token = generateAccessToken(testUserId, testEmail, testRole, testFleetId);
      const payload = verifyAccessToken(token);
      
      expect(payload.userId).toBe(testUserId);
      expect(payload.role).toBe(testRole);
    });

    it('should throw for an invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const { token } = generateRefreshToken(testUserId, testEmail);
      const payload = verifyRefreshToken(token);
      
      expect(payload.userId).toBe(testUserId);
      expect(payload.tokenFamily).toBeDefined();
    });

    it('should throw for an invalid token', () => {
      expect(() => verifyRefreshToken('invalid-token')).toThrow();
    });
  });

  describe('decodeToken', () => {
    it('should decode a token without verification', () => {
      const token = generateAccessToken(testUserId, testEmail, testRole, testFleetId);
      const payload = decodeToken(token);
      
      expect(payload).not.toBeNull();
      expect((payload as { userId: string }).userId).toBe(testUserId);
    });

    it('should return null for an invalid token', () => {
      const payload = decodeToken('not-a-valid-jwt');
      expect(payload).toBeNull();
    });
  });
});
