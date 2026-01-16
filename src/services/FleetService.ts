import { Op } from 'sequelize';
import { Fleet, Regulator, Rental } from '../models';
import { FleetCreateInput, FleetUpdateInput, PaginationMeta, RegulatorStatus } from '../types';
import { AppError } from '../middleware/errorHandler';

export interface FleetWithCounts {
  id: string;
  licenseeName: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber?: string | null;
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  regulatorCount: number;
  activeRentals: number;
  availableRentals: number;
  createdAt: string;
}

export class FleetService {
  async getFleetById(fleetId: string): Promise<FleetWithCounts> {
    const fleet = await Fleet.findByPk(fleetId);
    
    if (!fleet) {
      throw new AppError('Fleet not found', 404, 'FLEET_NOT_FOUND');
    }

    const counts = await this.getFleetCounts(fleetId);

    return {
      id: fleet.id,
      licenseeName: fleet.licenseeName,
      address1: fleet.address1,
      address2: fleet.address2,
      city: fleet.city,
      state: fleet.state,
      postalCode: fleet.postalCode,
      country: fleet.country,
      phoneNumber: fleet.phoneNumber,
      leaseStartDate: fleet.leaseStartDate?.toISOString().split('T')[0] || null,
      leaseEndDate: fleet.leaseEndDate?.toISOString().split('T')[0] || null,
      regulatorCount: counts.regulatorCount,
      activeRentals: counts.activeRentals,
      availableRentals: counts.availableRentals,
      createdAt: fleet.createdAt.toISOString()
    };
  }

  async getFleets(
    page = 1,
    limit = 50,
    search?: string
  ): Promise<{ fleets: FleetWithCounts[]; pagination: PaginationMeta }> {
    const where: Record<string, unknown> = { isActive: true };

    if (search) {
      where[Op.or as unknown as string] = [
        { licenseeName: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;
    const { count, rows } = await Fleet.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const fleetsWithCounts = await Promise.all(
      rows.map(async (fleet) => {
        const counts = await this.getFleetCounts(fleet.id);
        return {
          id: fleet.id,
          licenseeName: fleet.licenseeName,
          address1: fleet.address1,
          address2: fleet.address2,
          city: fleet.city,
          state: fleet.state,
          postalCode: fleet.postalCode,
          country: fleet.country,
          phoneNumber: fleet.phoneNumber,
          leaseStartDate: fleet.leaseStartDate?.toISOString().split('T')[0] || null,
          leaseEndDate: fleet.leaseEndDate?.toISOString().split('T')[0] || null,
          regulatorCount: counts.regulatorCount,
          activeRentals: counts.activeRentals,
          availableRentals: counts.availableRentals,
          createdAt: fleet.createdAt.toISOString()
        };
      })
    );

    return {
      fleets: fleetsWithCounts,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  async createFleet(input: FleetCreateInput): Promise<FleetWithCounts> {
    const fleet = await Fleet.create({
      licenseeName: input.licenseeName,
      address1: input.address1,
      address2: input.address2 || null,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      country: input.country,
      phoneNumber: input.phoneNumber || null,
      leaseStartDate: input.leaseStartDate || null,
      leaseEndDate: input.leaseEndDate || null
    });

    return {
      id: fleet.id,
      licenseeName: fleet.licenseeName,
      address1: fleet.address1,
      address2: fleet.address2,
      city: fleet.city,
      state: fleet.state,
      postalCode: fleet.postalCode,
      country: fleet.country,
      phoneNumber: fleet.phoneNumber,
      leaseStartDate: fleet.leaseStartDate?.toISOString().split('T')[0] || null,
      leaseEndDate: fleet.leaseEndDate?.toISOString().split('T')[0] || null,
      regulatorCount: 0,
      activeRentals: 0,
      availableRentals: 0,
      createdAt: fleet.createdAt.toISOString()
    };
  }

  async updateFleet(fleetId: string, input: FleetUpdateInput): Promise<FleetWithCounts> {
    const fleet = await Fleet.findByPk(fleetId);
    
    if (!fleet) {
      throw new AppError('Fleet not found', 404, 'FLEET_NOT_FOUND');
    }

    await fleet.update({
      licenseeName: input.licenseeName ?? fleet.licenseeName,
      address1: input.address1 ?? fleet.address1,
      address2: input.address2 !== undefined ? input.address2 : fleet.address2,
      city: input.city ?? fleet.city,
      state: input.state ?? fleet.state,
      postalCode: input.postalCode ?? fleet.postalCode,
      country: input.country ?? fleet.country,
      phoneNumber: input.phoneNumber !== undefined ? input.phoneNumber : fleet.phoneNumber,
      leaseStartDate: input.leaseStartDate !== undefined ? input.leaseStartDate : fleet.leaseStartDate,
      leaseEndDate: input.leaseEndDate !== undefined ? input.leaseEndDate : fleet.leaseEndDate,
      isActive: input.isActive !== undefined ? input.isActive : fleet.isActive
    });

    const counts = await this.getFleetCounts(fleetId);

    return {
      id: fleet.id,
      licenseeName: fleet.licenseeName,
      address1: fleet.address1,
      address2: fleet.address2,
      city: fleet.city,
      state: fleet.state,
      postalCode: fleet.postalCode,
      country: fleet.country,
      phoneNumber: fleet.phoneNumber,
      leaseStartDate: fleet.leaseStartDate?.toISOString().split('T')[0] || null,
      leaseEndDate: fleet.leaseEndDate?.toISOString().split('T')[0] || null,
      regulatorCount: counts.regulatorCount,
      activeRentals: counts.activeRentals,
      availableRentals: counts.availableRentals,
      createdAt: fleet.createdAt.toISOString()
    };
  }

  async deleteFleet(fleetId: string): Promise<void> {
    const fleet = await Fleet.findByPk(fleetId);
    
    if (!fleet) {
      throw new AppError('Fleet not found', 404, 'FLEET_NOT_FOUND');
    }

    // Check for active rentals
    const activeRentals = await Rental.count({ where: { fleetId } });
    if (activeRentals > 0) {
      throw new AppError('Cannot delete fleet with active rentals', 409, 'ACTIVE_RENTALS_EXIST');
    }

    // Check for assigned regulators
    const assignedRegulators = await Regulator.count({ where: { fleetId, isActive: true } });
    if (assignedRegulators > 0) {
      throw new AppError('Cannot delete fleet with assigned regulators', 409, 'REGULATORS_ASSIGNED');
    }

    // Soft delete
    await fleet.update({ isActive: false });
    await fleet.destroy();
  }

  private async getFleetCounts(fleetId: string): Promise<{ regulatorCount: number; activeRentals: number; availableRentals: number }> {
    const regulatorCount = await Regulator.count({
      where: { fleetId, isActive: true }
    });

    const activeRentals = await Rental.count({
      where: { fleetId, checkinDateTime: null }
    });

    const availableRentals = await Regulator.count({
      where: { fleetId, isActive: true, status: RegulatorStatus.READY }
    });

    return { regulatorCount, activeRentals, availableRentals };
  }
}

export default new FleetService();
