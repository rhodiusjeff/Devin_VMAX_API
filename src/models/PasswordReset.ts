import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';
import { PasswordResetAttributes } from '../types';

interface PasswordResetCreationAttributes extends Optional<PasswordResetAttributes, 'id' | 'createdAt' | 'usedAt'> {}

class PasswordReset extends Model<PasswordResetAttributes, PasswordResetCreationAttributes> implements PasswordResetAttributes {
  public id!: string;
  public userId!: string;
  public tokenHash!: string;
  public expiresAt!: Date;
  public usedAt!: Date | null;
  public createdAt!: Date;
}

PasswordReset.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    tokenHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'token_hash'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'used_at'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at'
    }
  },
  {
    sequelize,
    tableName: 'password_resets',
    modelName: 'PasswordReset',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['token_hash'] },
      { fields: ['expires_at'] }
    ]
  }
);

export default PasswordReset;
