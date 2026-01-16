import { User, RefreshToken, PasswordReset, Regulator } from '../models';
import { hashPassword, verifyPassword, generateRandomToken, hashToken, validatePasswordStrength } from '../utils/password';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import { UserRole, LoginResponse, TokenRefreshResponse, UserPublic } from '../types';
import { AppError } from '../middleware/errorHandler';

export class AuthService {
  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await User.findOne({ where: { email, isActive: true } });
    
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Get owned regulator IDs for REG_OWNER
    let ownedRegulatorIds: string[] = [];
    if (user.role === UserRole.REG_OWNER) {
      const ownedRegulators = await Regulator.findAll({
        where: { ownerUserId: user.id, isActive: true },
        attributes: ['id']
      });
      ownedRegulatorIds = ownedRegulators.map(r => r.id);
    }

    // Generate tokens
    const tokenPair = generateTokenPair(
      user.id,
      user.email,
      user.role,
      user.fleetId,
      ownedRegulatorIds
    );

    // Store refresh token hash
    await RefreshToken.create({
      userId: user.id,
      tokenHash: hashToken(tokenPair.refreshToken),
      tokenFamily: tokenPair.tokenFamily,
      expiresAt: tokenPair.refreshTokenExpiresAt
    });

    // Update last login
    await user.update({ lastLoginAt: new Date() });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      tokenType: 'Bearer',
      expiresIn: tokenPair.accessTokenExpiresIn,
      user: user.toPublic()
    };
  }

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phoneNumber?: string | null
  ): Promise<{ user: UserPublic; message: string }> {
    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.errors.join('. '), 422, 'WEAK_PASSWORD');
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email,
      passwordHash,
      role: UserRole.REG_OWNER,
      firstName,
      lastName,
      phoneNumber: phoneNumber || null
    });

    // In a real app, we would send a verification email here
    console.log(`[EMAIL MOCK] Verification email would be sent to ${email}`);

    return {
      user: user.toPublic(),
      message: 'Registration successful. Please verify your email.'
    };
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    
    const token = await RefreshToken.findOne({
      where: { userId, tokenHash, revokedAt: null }
    });

    if (token) {
      await token.update({ revokedAt: new Date() });
    }
  }

  async refreshTokens(refreshToken: string): Promise<TokenRefreshResponse> {
    // Verify the refresh token
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    const tokenHash = hashToken(refreshToken);
    
    // Find the stored token
    const storedToken = await RefreshToken.findOne({
      where: { tokenHash, userId: payload.userId }
    });

    if (!storedToken) {
      throw new AppError('Refresh token not found', 401, 'INVALID_REFRESH_TOKEN');
    }

    if (storedToken.revokedAt) {
      // Token reuse detected - revoke all tokens in the family
      await RefreshToken.update(
        { revokedAt: new Date() },
        { where: { tokenFamily: storedToken.tokenFamily } }
      );
      throw new AppError('Refresh token has been revoked', 403, 'TOKEN_REVOKED');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new AppError('Refresh token has expired', 401, 'TOKEN_EXPIRED');
    }

    // Get user
    const user = await User.findByPk(payload.userId);
    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401, 'USER_NOT_FOUND');
    }

    // Get owned regulator IDs for REG_OWNER
    let ownedRegulatorIds: string[] = [];
    if (user.role === UserRole.REG_OWNER) {
      const ownedRegulators = await Regulator.findAll({
        where: { ownerUserId: user.id, isActive: true },
        attributes: ['id']
      });
      ownedRegulatorIds = ownedRegulators.map(r => r.id);
    }

    // Revoke old token
    await storedToken.update({ revokedAt: new Date() });

    // Generate new token pair (same family for rotation)
    const tokenPair = generateTokenPair(
      user.id,
      user.email,
      user.role,
      user.fleetId,
      ownedRegulatorIds,
      storedToken.tokenFamily
    );

    // Store new refresh token
    await RefreshToken.create({
      userId: user.id,
      tokenHash: hashToken(tokenPair.refreshToken),
      tokenFamily: tokenPair.tokenFamily,
      expiresAt: tokenPair.refreshTokenExpiresAt
    });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      tokenType: 'Bearer',
      expiresIn: tokenPair.accessTokenExpiresIn
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await User.findOne({ where: { email, isActive: true } });
    
    // Always return success to prevent email enumeration
    if (!user) {
      console.log(`[EMAIL MOCK] Password reset requested for non-existent email: ${email}`);
      return { message: 'Password reset email sent if account exists' };
    }

    // Generate reset token
    const resetToken = generateRandomToken();
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing reset tokens
    await PasswordReset.update(
      { usedAt: new Date() },
      { where: { userId: user.id, usedAt: null } }
    );

    // Create new reset token
    await PasswordReset.create({
      userId: user.id,
      tokenHash,
      expiresAt
    });

    // In a real app, we would send an email here
    console.log(`[EMAIL MOCK] Password reset email would be sent to ${email}`);
    console.log(`[EMAIL MOCK] Reset token: ${resetToken}`);

    return { message: 'Password reset email sent if account exists' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const tokenHash = hashToken(token);
    
    const resetRecord = await PasswordReset.findOne({
      where: { tokenHash, usedAt: null }
    });

    if (!resetRecord) {
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
    }

    if (resetRecord.expiresAt < new Date()) {
      throw new AppError('Reset token has expired', 400, 'TOKEN_EXPIRED');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.errors.join('. '), 422, 'WEAK_PASSWORD');
    }

    // Update password
    const passwordHash = await hashPassword(newPassword);
    await User.update(
      { passwordHash },
      { where: { id: resetRecord.userId } }
    );

    // Mark token as used
    await resetRecord.update({ usedAt: new Date() });

    // Revoke all refresh tokens for this user
    await RefreshToken.update(
      { revokedAt: new Date() },
      { where: { userId: resetRecord.userId, revokedAt: null } }
    );

    return { message: 'Password reset successful' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.errors.join('. '), 422, 'WEAK_PASSWORD');
    }

    // Update password
    const passwordHash = await hashPassword(newPassword);
    await user.update({ passwordHash });

    return { message: 'Password updated successfully' };
  }
}

export default new AuthService();
