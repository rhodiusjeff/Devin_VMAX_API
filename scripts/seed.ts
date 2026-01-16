import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { sequelize, User, Fleet, Regulator, Telemetry } from '../src/models';
import { UserRole, RegulatorStatus } from '../src/types';

async function seed() {
  console.log('Starting database seed...');

  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Sync models (this will create tables if they don't exist)
    await sequelize.sync({ force: true });
    console.log('Database tables created.');

    // Create password hash for all users (password: "Password123!")
    const passwordHash = await bcrypt.hash('Password123!', 12);

    // Create Admin User
    const adminUser = await User.create({
      id: uuidv4(),
      email: 'admin@vmax.com',
      passwordHash,
      role: UserRole.ADMIN,
      firstName: 'System',
      lastName: 'Administrator',
      phoneNumber: '+15551234567'
    });
    console.log(`Created admin user: ${adminUser.email}`);

    // Create Fleets
    const fleet1 = await Fleet.create({
      id: uuidv4(),
      licenseeName: 'Paintball Paradise',
      address1: '123 Main Street',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'USA',
      phoneNumber: '+15559876543',
      leaseStartDate: new Date('2025-01-01'),
      leaseEndDate: new Date('2026-12-31')
    });
    console.log(`Created fleet: ${fleet1.licenseeName}`);

    const fleet2 = await Fleet.create({
      id: uuidv4(),
      licenseeName: 'Extreme Paintball Arena',
      address1: '456 Oak Avenue',
      city: 'Dallas',
      state: 'TX',
      postalCode: '75201',
      country: 'USA',
      phoneNumber: '+15551112222'
    });
    console.log(`Created fleet: ${fleet2.licenseeName}`);

    // Create Fleet Manager for Fleet 1
    const fleetManager1 = await User.create({
      id: uuidv4(),
      email: 'manager@paintballparadise.com',
      passwordHash,
      role: UserRole.FLEET_MGR,
      fleetId: fleet1.id,
      firstName: 'John',
      lastName: 'Manager',
      phoneNumber: '+15553334444'
    });
    console.log(`Created fleet manager: ${fleetManager1.email}`);

    // Create Fleet User for Fleet 1
    const fleetUser1 = await User.create({
      id: uuidv4(),
      email: 'staff@paintballparadise.com',
      passwordHash,
      role: UserRole.FLEET_USER,
      fleetId: fleet1.id,
      firstName: 'Jane',
      lastName: 'Staff'
    });
    console.log(`Created fleet user: ${fleetUser1.email}`);

    // Create REG_OWNER user
    const regOwner = await User.create({
      id: uuidv4(),
      email: 'owner@example.com',
      passwordHash,
      role: UserRole.REG_OWNER,
      firstName: 'Bob',
      lastName: 'Owner',
      phoneNumber: '+15555556666'
    });
    console.log(`Created reg owner: ${regOwner.email}`);

    // Create Regulators for Fleet 1
    const regulators: Regulator[] = [];
    for (let i = 1; i <= 10; i++) {
      const regulator = await Regulator.create({
        id: uuidv4(),
        macAddress: `AA:BB:CC:DD:EE:${i.toString().padStart(2, '0')}`,
        barcode: `VMAX-${fleet1.id.substring(0, 8)}-${i.toString().padStart(4, '0')}`,
        status: i <= 7 ? RegulatorStatus.READY : (i === 8 ? RegulatorStatus.CHARGING : RegulatorStatus.MAINTENANCE),
        fleetId: fleet1.id,
        firmwareVersion: '2.1.0',
        hardwareRevision: 'R3'
      });
      regulators.push(regulator);
    }
    console.log(`Created ${regulators.length} regulators for ${fleet1.licenseeName}`);

    // Create Regulators for Fleet 2
    for (let i = 1; i <= 5; i++) {
      await Regulator.create({
        id: uuidv4(),
        macAddress: `11:22:33:44:55:${i.toString().padStart(2, '0')}`,
        barcode: `VMAX-${fleet2.id.substring(0, 8)}-${i.toString().padStart(4, '0')}`,
        status: RegulatorStatus.READY,
        fleetId: fleet2.id,
        firmwareVersion: '2.0.5',
        hardwareRevision: 'R2'
      });
    }
    console.log(`Created 5 regulators for ${fleet2.licenseeName}`);

    // Create a personally owned regulator
    const personalRegulator = await Regulator.create({
      id: uuidv4(),
      macAddress: 'FF:FF:FF:00:00:01',
      barcode: 'VMAX-PERSONAL-0001',
      status: RegulatorStatus.READY,
      ownerUserId: regOwner.id,
      firmwareVersion: '2.1.0',
      hardwareRevision: 'R3',
      purchasedAt: new Date('2025-06-15'),
      purchaseSource: 'Amazon'
    });
    console.log(`Created personal regulator for ${regOwner.email}`);

    // Create sample telemetry data for first regulator
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000); // Every hour for last 24 hours
      await Telemetry.create({
        id: uuidv4(),
        regulatorId: regulators[0].id,
        timestamp,
        soc: Math.max(20, 100 - i * 3), // Decreasing SOC
        soh: 95,
        cycles: 150,
        voltage_mV: 12400 - i * 50,
        current_mA: i < 12 ? -500 : 0, // Discharging for first 12 hours
        remainingCapacity_mAh: Math.max(1000, 5000 - i * 150),
        fullCapacity_mAh: 5000,
        temperature_C: 25 + Math.random() * 5,
        fanSpeed: i < 12 ? 5 : 0,
        uploadedAt: timestamp
      });
    }
    console.log(`Created 24 hours of telemetry data for regulator ${regulators[0].barcode}`);

    console.log('\n========================================');
    console.log('Database seeding completed successfully!');
    console.log('========================================\n');
    console.log('Test Accounts:');
    console.log('----------------------------------------');
    console.log('Admin:         admin@vmax.com');
    console.log('Fleet Manager: manager@paintballparadise.com');
    console.log('Fleet User:    staff@paintballparadise.com');
    console.log('Reg Owner:     owner@example.com');
    console.log('----------------------------------------');
    console.log('Password for all accounts: Password123!');
    console.log('----------------------------------------\n');

  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
