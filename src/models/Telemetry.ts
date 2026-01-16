import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';
import { TelemetryAttributes } from '../types';

interface TelemetryCreationAttributes extends Optional<TelemetryAttributes, 'id' | 'createdAt' | 'voltage_mV' | 'current_mA' | 'remainingCapacity_mAh' | 'fullCapacity_mAh' | 'estimatedTimeToEmpty_minutes' | 'temperature_C' | 'fanSpeed'> {}

class Telemetry extends Model<TelemetryAttributes, TelemetryCreationAttributes> implements TelemetryAttributes {
  public id!: string;
  public regulatorId!: string;
  public timestamp!: Date;
  public soc!: number;
  public soh!: number;
  public cycles!: number;
  public voltage_mV!: number | null;
  public current_mA!: number | null;
  public remainingCapacity_mAh!: number | null;
  public fullCapacity_mAh!: number | null;
  public estimatedTimeToEmpty_minutes!: number | null;
  public temperature_C!: number | null;
  public fanSpeed!: number | null;
  public uploadedAt!: Date;
  public createdAt!: Date;
}

Telemetry.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    regulatorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'regulator_id',
      references: {
        model: 'regulators',
        key: 'id'
      }
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false
    },
    soc: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 100
      }
    },
    soh: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 100
      }
    },
    cycles: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    voltage_mV: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'voltage_mv'
    },
    current_mA: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'current_ma'
    },
    remainingCapacity_mAh: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'remaining_capacity_mah'
    },
    fullCapacity_mAh: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'full_capacity_mah'
    },
    estimatedTimeToEmpty_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'estimated_time_to_empty_minutes'
    },
    temperature_C: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'temperature_c'
    },
    fanSpeed: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'fan_speed',
      validate: {
        min: 0,
        max: 10
      }
    },
    uploadedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'uploaded_at'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at'
    }
  },
  {
    sequelize,
    tableName: 'telemetry',
    modelName: 'Telemetry',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['regulator_id'] },
      { fields: ['timestamp'] },
      { fields: ['regulator_id', 'timestamp'] },
      { fields: ['uploaded_at'] }
    ]
  }
);

export default Telemetry;
