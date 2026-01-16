import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';
import { FleetAttributes } from '../types';

interface FleetCreationAttributes extends Optional<FleetAttributes, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isActive' | 'address2' | 'phoneNumber' | 'leaseStartDate' | 'leaseEndDate'> {}

class Fleet extends Model<FleetAttributes, FleetCreationAttributes> implements FleetAttributes {
  public id!: string;
  public licenseeName!: string;
  public address1!: string;
  public address2!: string | null;
  public city!: string;
  public state!: string;
  public postalCode!: string;
  public country!: string;
  public phoneNumber!: string | null;
  public leaseStartDate!: Date | null;
  public leaseEndDate!: Date | null;
  public isActive!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;

  // Virtual fields for counts (populated via queries)
  public regulatorCount?: number;
  public activeRentals?: number;
  public availableRentals?: number;
}

Fleet.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    licenseeName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'licensee_name'
    },
    address1: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'address_1'
    },
    address2: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'address_2'
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    postalCode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'postal_code'
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'USA'
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'phone_number'
    },
    leaseStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'lease_start_date'
    },
    leaseEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'lease_end_date'
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
    tableName: 'fleets',
    modelName: 'Fleet',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['licensee_name'] },
      { fields: ['city'] },
      { fields: ['is_active'] }
    ]
  }
);

export default Fleet;
