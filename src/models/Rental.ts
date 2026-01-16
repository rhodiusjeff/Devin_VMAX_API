import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';
import { RentalAttributes, RentalAccessories } from '../types';

interface RentalCreationAttributes extends Optional<RentalAttributes, 'id' | 'createdAt' | 'updatedAt' | 'checkinDateTime' | 'checkinAccessories' | 'notes' | 'checkedInBy' | 'playerId' | 'phoneNumber' | 'emailAddress'> {}

class Rental extends Model<RentalAttributes, RentalCreationAttributes> implements RentalAttributes {
  public id!: string;
  public regulatorId!: string;
  public fleetId!: string;
  public playerId!: string | null;
  public firstName!: string;
  public lastName!: string;
  public phoneNumber!: string | null;
  public emailAddress!: string | null;
  public checkoutDateTime!: Date;
  public checkinDateTime!: Date | null;
  public accessories!: RentalAccessories;
  public checkinAccessories!: RentalAccessories | null;
  public notes!: string | null;
  public checkedOutBy!: string;
  public checkedInBy!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Rental.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    regulatorId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'regulator_id',
      references: {
        model: 'regulators',
        key: 'id'
      }
    },
    fleetId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'fleet_id',
      references: {
        model: 'fleets',
        key: 'id'
      }
    },
    playerId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'player_id'
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
    emailAddress: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'email_address'
    },
    checkoutDateTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'checkout_date_time'
    },
    checkinDateTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'checkin_date_time'
    },
    accessories: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    },
    checkinAccessories: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'checkin_accessories'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    checkedOutBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'checked_out_by',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    checkedInBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'checked_in_by',
      references: {
        model: 'users',
        key: 'id'
      }
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
    }
  },
  {
    sequelize,
    tableName: 'r01_regulator_rentals',
    modelName: 'Rental',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['regulator_id'] },
      { fields: ['fleet_id'] },
      { fields: ['checkout_date_time'] },
      { fields: ['player_id'] }
    ]
  }
);

export default Rental;
