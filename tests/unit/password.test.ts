import { hashPassword, verifyPassword, generateRandomToken, hashToken, validatePasswordStrength } from '../../src/utils/password';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify a correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword('WrongPassword123!', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('generateRandomToken', () => {
    it('should generate a random token of default length', () => {
      const token = generateRandomToken();
      
      expect(token).toBeDefined();
      expect(token.length).toBe(64); // 32 bytes = 64 hex characters
    });

    it('should generate a random token of specified length', () => {
      const token = generateRandomToken(16);
      
      expect(token).toBeDefined();
      expect(token.length).toBe(32); // 16 bytes = 32 hex characters
    });

    it('should generate unique tokens', () => {
      const token1 = generateRandomToken();
      const token2 = generateRandomToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashToken', () => {
    it('should hash a token', () => {
      const token = 'test-token-123';
      const hash = hashToken(token);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(token);
      expect(hash.length).toBe(64); // SHA256 = 64 hex characters
    });

    it('should produce consistent hashes for the same token', () => {
      const token = 'test-token-123';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept a strong password', () => {
      const result = validatePasswordStrength('StrongPass123!');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject a password that is too short', () => {
      const result = validatePasswordStrength('Sh0rt!');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject a password without uppercase', () => {
      const result = validatePasswordStrength('lowercase123!');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject a password without lowercase', () => {
      const result = validatePasswordStrength('UPPERCASE123!');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject a password without numbers', () => {
      const result = validatePasswordStrength('NoNumbers!');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject a password without special characters', () => {
      const result = validatePasswordStrength('NoSpecial123');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should return multiple errors for a very weak password', () => {
      const result = validatePasswordStrength('weak');
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
