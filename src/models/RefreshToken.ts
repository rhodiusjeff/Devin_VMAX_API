import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';
import { RefreshTokenAttributes } from '../types';

interface RefreshTokenCreationAttributes extends Optional<RefreshTokenAttributes, 'id' | 'createdAt' | 'revokedAt'> {}

class RefreshToken extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes> implements RefreshTokenAttributes {
  public id!: string;
  public userId!: string;
  public tokenHash!: string;
  public tokenFamily!: string;
  public expiresAt!: Date;
  public revokedAt!: Date | null;
  public createdAt!: Date;
}

RefreshToken.init(
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
    tokenFamily: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'token_family'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'revoked_at'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at'
    }
  },
  {
    sequelize,
    tableName: 'refresh_tokens',
    modelName: 'RefreshToken',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['token_hash'] },
      { fields: ['token_family'] },
      { fields: ['expires_at'] }
    ]
  }
);

export default RefreshToken;
