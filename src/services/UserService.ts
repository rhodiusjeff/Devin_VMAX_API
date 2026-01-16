import { Op } from 'sequelize';
import { User, Fleet } from '../models';
import { hashPassword, validatePasswordStrength } from '../utils/password';
import { UserRole, UserPublic, UserCreateInput, UserUpdateInput, PaginationMeta } from '../types';
import { AppError } from '../middleware/errorHandler';

export class UserService {
  async getUserById(userId: string): Promise<UserPublic> {
    const user = await User.findByPk(userId, {
      include: [{ model: Fleet, as: 'fleet', attributes: ['id', 'licenseeName'] }]
    });
    
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return user.toPublic();
  }

  async getUsers(
    page = 1,
    limit = 50,
    filters: {
      role?: UserRole;
      fleetId?: string;
      search?: string;
    } = {}
  ): Promise<{ users: UserPublic[]; pagination: PaginationMeta }> {
    const where: Record<string, unknown> = { isActive: true };

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.fleetId) {
      where.fleetId = filters.fleetId;
    }

    if (filters.search) {
      where[Op.or as unknown as string] = [
        { firstName: { [Op.like]: `%${filters.search}%` } },
        { lastName: { [Op.like]: `%${filters.search}%` } },
        { email: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    const offset = (page - 1) * limit;
    const { count, rows } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [{ model: Fleet, as: 'fleet', attributes: ['id', 'licenseeName'] }]
    });

    return {
      users: rows.map(user => user.toPublic()),
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  async getUsersByFleet(
    fleetId: string,
    page = 1,
    limit = 50
  ): Promise<{ users: UserPublic[]; pagination: PaginationMeta }> {
    return this.getUsers(page, limit, { fleetId });
  }

  async createUser(input: UserCreateInput): Promise<UserPublic> {
    // Check if email already exists
    const existingUser = await User.findOne({ where: { email: input.email } });
    if (existingUser) {
      throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(input.password);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.errors.join('. '), 422, 'WEAK_PASSWORD');
    }

    // Validate fleet exists if provided
    if (input.fleetId) {
      const fleet = await Fleet.findByPk(input.fleetId);
      if (!fleet) {
        throw new AppError('Fleet not found', 404, 'FLEET_NOT_FOUND');
      }
    }

    // Create user
    const passwordHash = await hashPassword(input.password);
    const user = await User.create({
      email: input.email,
      passwordHash,
      role: input.role,
      fleetId: input.fleetId || null,
      firstName: input.firstName,
      lastName: input.lastName,
      phoneNumber: input.phoneNumber || null
    });

    return user.toPublic();
  }

  async updateUser(userId: string, input: UserUpdateInput): Promise<UserPublic> {
    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Validate fleet exists if provided
    if (input.fleetId) {
      const fleet = await Fleet.findByPk(input.fleetId);
      if (!fleet) {
        throw new AppError('Fleet not found', 404, 'FLEET_NOT_FOUND');
      }
    }

    await user.update({
      firstName: input.firstName ?? user.firstName,
      lastName: input.lastName ?? user.lastName,
      phoneNumber: input.phoneNumber !== undefined ? input.phoneNumber : user.phoneNumber,
      role: input.role ?? user.role,
      fleetId: input.fleetId !== undefined ? input.fleetId : user.fleetId,
      isActive: input.isActive !== undefined ? input.isActive : user.isActive
    });

    return user.toPublic();
  }

  async updateProfile(userId: string, input: { firstName?: string; lastName?: string; phoneNumber?: string | null }): Promise<UserPublic> {
    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    await user.update({
      firstName: input.firstName ?? user.firstName,
      lastName: input.lastName ?? user.lastName,
      phoneNumber: input.phoneNumber !== undefined ? input.phoneNumber : user.phoneNumber
    });

    return user.toPublic();
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Soft delete
    await user.update({ isActive: false });
    await user.destroy(); // This will set deletedAt due to paranoid: true
  }
}

export default new UserService();
