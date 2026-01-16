import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';
import { UserAttributes, UserRole } from '../types';

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'deletedAt' | 'isActive'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public passwordHash!: string;
  public role!: UserRole;
  public fleetId!: string | null;
  public firstName!: string;
  public lastName!: string;
  public phoneNumber!: string | null;
  public isActive!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;
  public lastLoginAt!: Date | null;
  public deletedAt!: Date | null;

  // Helper method to get public user data
  public toPublic() {
    return {
      id: this.id,
      email: this.email,
      role: this.role,
      fleetId: this.fleetId,
      firstName: this.firstName,
      lastName: this.lastName,
      phoneNumber: this.phoneNumber,
      createdAt: this.createdAt.toISOString(),
      lastLoginAt: this.lastLoginAt?.toISOString() || null
    };
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash'
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
      defaultValue: UserRole.REG_OWNER
    },
    fleetId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'fleet_id',
      references: {
        model: 'fleets',
        key: 'id'
      }
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'first_name'
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'last_name'
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'phone_number'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at'
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login_at'
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    }
  },
  {
    sequelize,
    tableName: 'users',
    modelName: 'User',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['email'] },
      { fields: ['fleet_id'] },
      { fields: ['role'] },
      { fields: ['is_active'] }
    ]
  }
);

export default User;
