import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';
import { RegulatorAttributes, RegulatorStatus } from '../types';

interface RegulatorCreationAttributes extends Optional<RegulatorAttributes, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'fleetId' | 'ownerUserId' | 'lastSeenAt' | 'purchasedAt' | 'purchaseSource' | 'status'> {}

class Regulator extends Model<RegulatorAttributes, RegulatorCreationAttributes> implements RegulatorAttributes {
  public id!: string;
  public macAddress!: string;
  public barcode!: string;
  public status!: RegulatorStatus;
  public fleetId!: string | null;
  public ownerUserId!: string | null;
  public firmwareVersion!: string;
  public hardwareRevision!: string;
  public lastSeenAt!: Date | null;
  public purchasedAt!: Date | null;
  public purchaseSource!: string | null;
  public isActive!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
}

Regulator.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    macAddress: {
      type: DataTypes.STRING(17),
      allowNull: false,
      unique: true,
      field: 'mac_address',
      validate: {
        is: /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/
      }
    },
    barcode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.ENUM(...Object.values(RegulatorStatus)),
      allowNull: false,
      defaultValue: RegulatorStatus.WAREHOUSE
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
    ownerUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'owner_user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    firmwareVersion: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'firmware_version'
    },
    hardwareRevision: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'hardware_revision'
    },
    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_seen_at'
    },
    purchasedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'purchased_at'
    },
    purchaseSource: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'purchase_source'
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    }
  },
  {
    sequelize,
    tableName: 'regulators',
    modelName: 'Regulator',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['mac_address'] },
      { unique: true, fields: ['barcode'] },
      { fields: ['fleet_id'] },
      { fields: ['owner_user_id'] },
      { fields: ['status'] },
      { fields: ['is_active'] }
    ]
  }
);

export default Regulator;
