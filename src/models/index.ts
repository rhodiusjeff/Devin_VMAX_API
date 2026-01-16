import { Sequelize } from 'sequelize';
import config from '../config';

// Initialize Sequelize
export const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: 'mariadb',
    logging: config.nodeEnv === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      paranoid: true // Soft deletes
    }
  }
);

// Import models
import User from './User';
import Fleet from './Fleet';
import Regulator from './Regulator';
import Rental from './Rental';
import RentalHistory from './RentalHistory';
import Telemetry from './Telemetry';
import RefreshToken from './RefreshToken';
import PasswordReset from './PasswordReset';

// Define associations
User.belongsTo(Fleet, { foreignKey: 'fleetId', as: 'fleet' });
Fleet.hasMany(User, { foreignKey: 'fleetId', as: 'users' });

Regulator.belongsTo(Fleet, { foreignKey: 'fleetId', as: 'fleet' });
Fleet.hasMany(Regulator, { foreignKey: 'fleetId', as: 'regulators' });

Regulator.belongsTo(User, { foreignKey: 'ownerUserId', as: 'owner' });
User.hasMany(Regulator, { foreignKey: 'ownerUserId', as: 'ownedRegulators' });

Rental.belongsTo(Regulator, { foreignKey: 'regulatorId', as: 'regulator' });
Regulator.hasOne(Rental, { foreignKey: 'regulatorId', as: 'activeRental' });

Rental.belongsTo(Fleet, { foreignKey: 'fleetId', as: 'fleet' });
Fleet.hasMany(Rental, { foreignKey: 'fleetId', as: 'activeRentals' });

Rental.belongsTo(User, { foreignKey: 'checkedOutBy', as: 'checkedOutByUser' });
Rental.belongsTo(User, { foreignKey: 'checkedInBy', as: 'checkedInByUser' });

RentalHistory.belongsTo(Regulator, { foreignKey: 'regulatorId', as: 'regulator' });
RentalHistory.belongsTo(Fleet, { foreignKey: 'fleetId', as: 'fleet' });

Telemetry.belongsTo(Regulator, { foreignKey: 'regulatorId', as: 'regulator' });
Regulator.hasMany(Telemetry, { foreignKey: 'regulatorId', as: 'telemetry' });

RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });

PasswordReset.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(PasswordReset, { foreignKey: 'userId', as: 'passwordResets' });

// Export models
export {
  User,
  Fleet,
  Regulator,
  Rental,
  RentalHistory,
  Telemetry,
  RefreshToken,
  PasswordReset
};

// Database initialization
export async function initializeDatabase(force = false): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync all models
    await sequelize.sync({ force, alter: !force && config.nodeEnv === 'development' });
    console.log('Database models synchronized.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
}

export default sequelize;
