import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';
import { RentalAccessories } from '../types';

interface RentalHistoryAttributes {
  id: string;
  regulatorId: string;
  fleetId: string;
  playerId?: string | null;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  emailAddress?: string | null;
  checkoutDateTime: Date;
  checkinDateTime?: Date | null;
  accessories: RentalAccessories;
  checkinAccessories?: RentalAccessories | null;
  notes?: string | null;
  checkedOutBy: string;
  checkedInBy?: string | null;
  durationMinutes?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface RentalHistoryCreationAttributes extends Optional<RentalHistoryAttributes, 'id' | 'createdAt' | 'updatedAt' | 'checkinDateTime' | 'checkinAccessories' | 'notes' | 'checkedInBy' | 'playerId' | 'phoneNumber' | 'emailAddress' | 'durationMinutes'> {}

class RentalHistory extends Model<RentalHistoryAttributes, RentalHistoryCreationAttributes> implements RentalHistoryAttributes {
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
  public durationMinutes!: number | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

RentalHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    regulatorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'regulator_id'
    },
    fleetId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'fleet_id'
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
      field: 'checked_out_by'
    },
    checkedInBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'checked_in_by'
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'duration_minutes'
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
    tableName: 'rental_history',
    modelName: 'RentalHistory',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['regulator_id'] },
      { fields: ['fleet_id'] },
      { fields: ['checkout_date_time'] },
      { fields: ['checkin_date_time'] },
      { fields: ['player_id'] }
    ]
  }
);

export default RentalHistory;
