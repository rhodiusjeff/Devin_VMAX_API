import { Op } from 'sequelize';
import { Regulator, Fleet, User, Rental, Telemetry } from '../models';
import { RegulatorStatus, RegulatorCreateInput, RegulatorUpdateInput, PaginationMeta, BatteryInfo, JwtPayload, UserRole } from '../types';
import { AppError } from '../middleware/errorHandler';

export interface RegulatorWithDetails {
  id: string;
  macAddress: string;
  barcode: string;
  status: RegulatorStatus;
  fleetId?: string | null;
  ownerUserId?: string | null;
  firmwareVersion: string;
  hardwareRevision: string;
  lastSeenAt?: string | null;
  purchasedAt?: string | null;
  purchaseSource?: string | null;
  createdAt: string;
  updatedAt: string;
  battery?: BatteryInfo;
  checkedOutTo?: {
    userId?: string;
    firstName: string;
    lastName: string;
    checkoutDateTime: string;
  } | null;
}

export class RegulatorService {
  async getRegulatorById(regulatorId: string, includeDetails = true): Promise<RegulatorWithDetails> {
    const regulator = await Regulator.findByPk(regulatorId, {
      include: [
        { model: Fleet, as: 'fleet', attributes: ['id', 'licenseeName'] },
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });
    
    if (!regulator) {
      throw new AppError('Regulator not found', 404, 'REGULATOR_NOT_FOUND');
    }

    let battery: BatteryInfo | undefined;
    let checkedOutTo: RegulatorWithDetails['checkedOutTo'] = null;

    if (includeDetails) {
      // Get latest telemetry for battery info
      const latestTelemetry = await Telemetry.findOne({
        where: { regulatorId },
        order: [['timestamp', 'DESC']]
      });

      if (latestTelemetry) {
        battery = {
          soc: latestTelemetry.soc,
          soh: latestTelemetry.soh,
          cycles: latestTelemetry.cycles,
          voltage_mV: latestTelemetry.voltage_mV || undefined,
          current_mA: latestTelemetry.current_mA || undefined,
          remainingCapacity_mAh: latestTelemetry.remainingCapacity_mAh || undefined,
          fullCapacity_mAh: latestTelemetry.fullCapacity_mAh || undefined,
          estimatedTimeToEmpty_minutes: latestTelemetry.estimatedTimeToEmpty_minutes || undefined
        };
      }

      // Get checkout info if checked out
      if (regulator.status === RegulatorStatus.CHECKED_OUT) {
        const rental = await Rental.findOne({
          where: { regulatorId, checkinDateTime: null }
        });

        if (rental) {
          checkedOutTo = {
            userId: rental.playerId || undefined,
            firstName: rental.firstName,
            lastName: rental.lastName,
            checkoutDateTime: rental.checkoutDateTime.toISOString()
          };
        }
      }
    }

    return {
      id: regulator.id,
      macAddress: regulator.macAddress,
      barcode: regulator.barcode,
      status: regulator.status,
      fleetId: regulator.fleetId,
      ownerUserId: regulator.ownerUserId,
      firmwareVersion: regulator.firmwareVersion,
      hardwareRevision: regulator.hardwareRevision,
      lastSeenAt: regulator.lastSeenAt?.toISOString() || null,
      purchasedAt: regulator.purchasedAt?.toISOString() || null,
      purchaseSource: regulator.purchaseSource,
      createdAt: regulator.createdAt.toISOString(),
      updatedAt: regulator.updatedAt.toISOString(),
      battery,
      checkedOutTo
    };
  }

  async getRegulators(
    page = 1,
    limit = 50,
    filters: {
      status?: RegulatorStatus;
      fleetId?: string;
      ownerUserId?: string;
      search?: string;
    } = {}
  ): Promise<{ regulators: RegulatorWithDetails[]; pagination: PaginationMeta }> {
    const where: Record<string, unknown> = { isActive: true };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.fleetId) {
      where.fleetId = filters.fleetId;
    }

    if (filters.ownerUserId) {
      where.ownerUserId = filters.ownerUserId;
    }

    if (filters.search) {
      where[Op.or as unknown as string] = [
        { macAddress: { [Op.like]: `%${filters.search}%` } },
        { barcode: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    const offset = (page - 1) * limit;
    const { count, rows } = await Regulator.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        { model: Fleet, as: 'fleet', attributes: ['id', 'licenseeName'] }
      ]
    });

    const regulatorsWithDetails = await Promise.all(
      rows.map(async (regulator) => {
        const latestTelemetry = await Telemetry.findOne({
          where: { regulatorId: regulator.id },
          order: [['timestamp', 'DESC']]
        });

        let battery: BatteryInfo | undefined;
        if (latestTelemetry) {
          battery = {
            soc: latestTelemetry.soc,
            soh: latestTelemetry.soh,
            cycles: latestTelemetry.cycles
          };
        }

        return {
          id: regulator.id,
          macAddress: regulator.macAddress,
          barcode: regulator.barcode,
          status: regulator.status,
          fleetId: regulator.fleetId,
          ownerUserId: regulator.ownerUserId,
          firmwareVersion: regulator.firmwareVersion,
          hardwareRevision: regulator.hardwareRevision,
          lastSeenAt: regulator.lastSeenAt?.toISOString() || null,
          purchasedAt: regulator.purchasedAt?.toISOString() || null,
          purchaseSource: regulator.purchaseSource,
          createdAt: regulator.createdAt.toISOString(),
          updatedAt: regulator.updatedAt.toISOString(),
          battery
        };
      })
    );

    return {
      regulators: regulatorsWithDetails,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  async getRegulatorsByFleet(
    fleetId: string,
    page = 1,
    limit = 50,
    status?: RegulatorStatus
  ): Promise<{ regulators: RegulatorWithDetails[]; pagination: PaginationMeta }> {
    return this.getRegulators(page, limit, { fleetId, status });
  }

  async getMyDevices(user: JwtPayload): Promise<{ regulators: RegulatorWithDetails[] }> {
    let regulators: Regulator[] = [];

    if (user.role === UserRole.FLEET_USER) {
      // Get checked-out regulator for fleet user
      const rental = await Rental.findOne({
        where: { checkinDateTime: null },
        include: [{
          model: Regulator,
          as: 'regulator',
          where: { fleetId: user.fleetId, isActive: true }
        }]
      });

      if (rental) {
        const regulator = await Regulator.findByPk(rental.regulatorId);
        if (regulator) {
          regulators = [regulator];
        }
      }
    } else if (user.role === UserRole.REG_OWNER) {
      // Get owned regulators
      regulators = await Regulator.findAll({
        where: { ownerUserId: user.userId, isActive: true }
      });
    } else if (user.role === UserRole.FLEET_MGR || user.role === UserRole.SUB_FLEET_MGR) {
      // Get all regulators in fleet
      regulators = await Regulator.findAll({
        where: { fleetId: user.fleetId, isActive: true }
      });
    }

    const regulatorsWithDetails = await Promise.all(
      regulators.map(async (regulator) => {
        const latestTelemetry = await Telemetry.findOne({
          where: { regulatorId: regulator.id },
          order: [['timestamp', 'DESC']]
        });

        let battery: BatteryInfo | undefined;
        if (latestTelemetry) {
          battery = {
            soc: latestTelemetry.soc,
            soh: latestTelemetry.soh,
            cycles: latestTelemetry.cycles
          };
        }

        let checkedOutTo: RegulatorWithDetails['checkedOutTo'] = null;
        if (regulator.status === RegulatorStatus.CHECKED_OUT) {
          const rental = await Rental.findOne({
            where: { regulatorId: regulator.id, checkinDateTime: null }
          });
          if (rental) {
            checkedOutTo = {
              userId: rental.playerId || undefined,
              firstName: rental.firstName,
              lastName: rental.lastName,
              checkoutDateTime: rental.checkoutDateTime.toISOString()
            };
          }
        }

        return {
          id: regulator.id,
          macAddress: regulator.macAddress,
          barcode: regulator.barcode,
          status: regulator.status,
          fleetId: regulator.fleetId,
          ownerUserId: regulator.ownerUserId,
          firmwareVersion: regulator.firmwareVersion,
          hardwareRevision: regulator.hardwareRevision,
          lastSeenAt: regulator.lastSeenAt?.toISOString() || null,
          purchasedAt: regulator.purchasedAt?.toISOString() || null,
          purchaseSource: regulator.purchaseSource,
          createdAt: regulator.createdAt.toISOString(),
          updatedAt: regulator.updatedAt.toISOString(),
          battery,
          checkedOutTo
        };
      })
    );

    return { regulators: regulatorsWithDetails };
  }

  async createRegulator(input: RegulatorCreateInput): Promise<RegulatorWithDetails> {
    // Check for duplicate MAC address
    const existingMac = await Regulator.findOne({ where: { macAddress: input.macAddress } });
    if (existingMac) {
      throw new AppError('MAC address already exists', 409, 'MAC_ADDRESS_EXISTS');
    }

    // Check for duplicate barcode
    const existingBarcode = await Regulator.findOne({ where: { barcode: input.barcode } });
    if (existingBarcode) {
      throw new AppError('Barcode already exists', 409, 'BARCODE_EXISTS');
    }

    // Validate fleet exists if provided
    if (input.fleetId) {
      const fleet = await Fleet.findByPk(input.fleetId);
      if (!fleet) {
        throw new AppError('Fleet not found', 404, 'FLEET_NOT_FOUND');
      }
    }

    const regulator = await Regulator.create({
      macAddress: input.macAddress,
      barcode: input.barcode,
      status: input.status || RegulatorStatus.WAREHOUSE,
      fleetId: input.fleetId || null,
      ownerUserId: input.ownerUserId || null,
      firmwareVersion: input.firmwareVersion,
      hardwareRevision: input.hardwareRevision
    });

    return {
      id: regulator.id,
      macAddress: regulator.macAddress,
      barcode: regulator.barcode,
      status: regulator.status,
      fleetId: regulator.fleetId,
      ownerUserId: regulator.ownerUserId,
      firmwareVersion: regulator.firmwareVersion,
      hardwareRevision: regulator.hardwareRevision,
      lastSeenAt: null,
      purchasedAt: null,
      purchaseSource: null,
      createdAt: regulator.createdAt.toISOString(),
      updatedAt: regulator.updatedAt.toISOString()
    };
  }

  async updateRegulator(regulatorId: string, input: RegulatorUpdateInput): Promise<RegulatorWithDetails> {
    const regulator = await Regulator.findByPk(regulatorId);
    
    if (!regulator) {
      throw new AppError('Regulator not found', 404, 'REGULATOR_NOT_FOUND');
    }

    // Validate fleet exists if provided
    if (input.fleetId) {
      const fleet = await Fleet.findByPk(input.fleetId);
      if (!fleet) {
        throw new AppError('Fleet not found', 404, 'FLEET_NOT_FOUND');
      }
    }

    await regulator.update({
      status: input.status ?? regulator.status,
      fleetId: input.fleetId !== undefined ? input.fleetId : regulator.fleetId,
      ownerUserId: input.ownerUserId !== undefined ? input.ownerUserId : regulator.ownerUserId,
      firmwareVersion: input.firmwareVersion ?? regulator.firmwareVersion,
      hardwareRevision: input.hardwareRevision ?? regulator.hardwareRevision,
      lastSeenAt: input.lastSeenAt !== undefined ? input.lastSeenAt : regulator.lastSeenAt,
      isActive: input.isActive !== undefined ? input.isActive : regulator.isActive
    });

    return this.getRegulatorById(regulatorId);
  }

  async deleteRegulator(regulatorId: string): Promise<void> {
    const regulator = await Regulator.findByPk(regulatorId);
    
    if (!regulator) {
      throw new AppError('Regulator not found', 404, 'REGULATOR_NOT_FOUND');
    }

    if (regulator.status === RegulatorStatus.CHECKED_OUT) {
      throw new AppError('Cannot delete regulator that is checked out', 409, 'REGULATOR_CHECKED_OUT');
    }

    // Soft delete
    await regulator.update({ isActive: false });
    await regulator.destroy();
  }

  async assignToFleet(regulatorId: string, fleetId: string): Promise<RegulatorWithDetails> {
    const regulator = await Regulator.findByPk(regulatorId);
    
    if (!regulator) {
      throw new AppError('Regulator not found', 404, 'REGULATOR_NOT_FOUND');
    }

    const fleet = await Fleet.findByPk(fleetId);
    if (!fleet) {
      throw new AppError('Fleet not found', 404, 'FLEET_NOT_FOUND');
    }

    if (regulator.status === RegulatorStatus.CHECKED_OUT) {
      throw new AppError('Cannot reassign regulator that is checked out', 409, 'REGULATOR_CHECKED_OUT');
    }

    await regulator.update({
      fleetId,
      status: RegulatorStatus.READY,
      ownerUserId: null // Remove individual ownership when assigned to fleet
    });

    return this.getRegulatorById(regulatorId);
  }

  async removeFromFleet(regulatorId: string): Promise<RegulatorWithDetails> {
    const regulator = await Regulator.findByPk(regulatorId);
    
    if (!regulator) {
      throw new AppError('Regulator not found', 404, 'REGULATOR_NOT_FOUND');
    }

    if (regulator.status === RegulatorStatus.CHECKED_OUT) {
      throw new AppError('Cannot remove regulator that is checked out', 409, 'REGULATOR_CHECKED_OUT');
    }

    await regulator.update({
      fleetId: null,
      status: RegulatorStatus.WAREHOUSE
    });

    return this.getRegulatorById(regulatorId);
  }
}

export default new RegulatorService();
