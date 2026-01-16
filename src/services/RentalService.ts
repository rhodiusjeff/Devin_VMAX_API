import { Op } from 'sequelize';
import { Rental, RentalHistory, Regulator } from '../models';
import { RegulatorStatus, CheckoutInput, CheckinInput, PaginationMeta, RentalAccessories } from '../types';
import { AppError } from '../middleware/errorHandler';
import WebSocketService from '../websocket/WebSocketService';

export interface RentalDetails {
  rentalId: string;
  regulatorId: string;
  barcode: string;
  fleetId: string;
  playerId?: string | null;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  emailAddress?: string | null;
  checkoutDateTime: string;
  checkinDateTime?: string | null;
  duration_minutes?: number;
  accessories: RentalAccessories;
  checkinAccessories?: RentalAccessories | null;
  notes?: string | null;
  status: RegulatorStatus;
}

export class RentalService {
  async checkout(
    regulatorId: string,
    fleetId: string,
    checkedOutBy: string,
    input: CheckoutInput
  ): Promise<RentalDetails> {
    const regulator = await Regulator.findByPk(regulatorId);
    
    if (!regulator) {
      throw new AppError('Regulator not found', 404, 'REGULATOR_NOT_FOUND');
    }

    if (regulator.fleetId !== fleetId) {
      throw new AppError('Regulator not in your fleet', 403, 'REGULATOR_NOT_IN_FLEET');
    }

    if (regulator.status !== RegulatorStatus.READY) {
      throw new AppError(`Regulator is not available for checkout (status: ${regulator.status})`, 400, 'REGULATOR_NOT_READY');
    }

    const checkoutDateTime = new Date();

    // Create rental record
    const rental = await Rental.create({
      regulatorId,
      fleetId,
      playerId: input.playerId || null,
      firstName: input.firstName,
      lastName: input.lastName,
      phoneNumber: input.phoneNumber || null,
      emailAddress: input.emailAddress || null,
      checkoutDateTime,
      accessories: input.accessories,
      checkedOutBy
    });

    // Create rental history record
    await RentalHistory.create({
      regulatorId,
      fleetId,
      playerId: input.playerId || null,
      firstName: input.firstName,
      lastName: input.lastName,
      phoneNumber: input.phoneNumber || null,
      emailAddress: input.emailAddress || null,
      checkoutDateTime,
      accessories: input.accessories,
      checkedOutBy
    });

    // Update regulator status
    await regulator.update({ status: RegulatorStatus.CHECKED_OUT });

    // Send WebSocket notification
    WebSocketService.broadcastToFleet(fleetId, {
      type: 'REGULATOR_CHECKED_OUT',
      payload: {
        regulatorId,
        barcode: regulator.barcode,
        playerId: input.playerId,
        firstName: input.firstName,
        lastName: input.lastName,
        checkoutDateTime: checkoutDateTime.toISOString()
      },
      timestamp: new Date().toISOString()
    });

    return {
      rentalId: rental.id,
      regulatorId,
      barcode: regulator.barcode,
      fleetId,
      playerId: input.playerId,
      firstName: input.firstName,
      lastName: input.lastName,
      phoneNumber: input.phoneNumber,
      emailAddress: input.emailAddress,
      checkoutDateTime: checkoutDateTime.toISOString(),
      accessories: input.accessories,
      status: RegulatorStatus.CHECKED_OUT
    };
  }

  async checkin(
    regulatorId: string,
    fleetId: string,
    checkedInBy: string,
    input: CheckinInput
  ): Promise<RentalDetails> {
    const regulator = await Regulator.findByPk(regulatorId);
    
    if (!regulator) {
      throw new AppError('Regulator not found', 404, 'REGULATOR_NOT_FOUND');
    }

    if (regulator.fleetId !== fleetId) {
      throw new AppError('Regulator not in your fleet', 403, 'REGULATOR_NOT_IN_FLEET');
    }

    const rental = await Rental.findOne({
      where: { id: input.rentalId, regulatorId, checkinDateTime: null }
    });

    if (!rental) {
      throw new AppError('Active rental not found', 404, 'RENTAL_NOT_FOUND');
    }

    const checkinDateTime = new Date();
    const durationMinutes = Math.round((checkinDateTime.getTime() - rental.checkoutDateTime.getTime()) / 60000);

    // Determine new status
    const newStatus = input.status || RegulatorStatus.CHARGING;

    // Update rental record
    await rental.update({
      checkinDateTime,
      checkinAccessories: input.accessories,
      notes: input.notes || null,
      checkedInBy
    });

    // Update rental history
    await RentalHistory.update(
      {
        checkinDateTime,
        checkinAccessories: input.accessories,
        notes: input.notes || null,
        checkedInBy,
        durationMinutes
      },
      {
        where: {
          regulatorId,
          fleetId,
          checkoutDateTime: rental.checkoutDateTime,
          checkinDateTime: null
        }
      }
    );

    // Update regulator status
    await regulator.update({ status: newStatus });

    // Delete the active rental record (it's now in history)
    await rental.destroy();

    // Send WebSocket notification
    WebSocketService.broadcastToFleet(fleetId, {
      type: 'REGULATOR_CHECKED_IN',
      payload: {
        regulatorId,
        barcode: regulator.barcode,
        checkinDateTime: checkinDateTime.toISOString(),
        durationMinutes,
        newStatus
      },
      timestamp: new Date().toISOString()
    });

    return {
      rentalId: input.rentalId,
      regulatorId,
      barcode: regulator.barcode,
      fleetId,
      playerId: rental.playerId,
      firstName: rental.firstName,
      lastName: rental.lastName,
      checkoutDateTime: rental.checkoutDateTime.toISOString(),
      checkinDateTime: checkinDateTime.toISOString(),
      duration_minutes: durationMinutes,
      accessories: rental.accessories,
      checkinAccessories: input.accessories,
      notes: input.notes,
      status: newStatus
    };
  }

  async getActiveRentals(
    fleetId: string,
    page = 1,
    limit = 50
  ): Promise<{ rentals: RentalDetails[]; pagination: PaginationMeta }> {
    const offset = (page - 1) * limit;
    
    const { count, rows } = await Rental.findAndCountAll({
      where: { fleetId, checkinDateTime: null },
      limit,
      offset,
      order: [['checkoutDateTime', 'DESC']],
      include: [{ model: Regulator, as: 'regulator', attributes: ['barcode'] }]
    });

    const rentals = rows.map(rental => {
      const durationMinutes = Math.round((new Date().getTime() - rental.checkoutDateTime.getTime()) / 60000);
      return {
        rentalId: rental.id,
        regulatorId: rental.regulatorId,
        barcode: (rental as unknown as { regulator: { barcode: string } }).regulator?.barcode || '',
        fleetId: rental.fleetId,
        playerId: rental.playerId,
        firstName: rental.firstName,
        lastName: rental.lastName,
        phoneNumber: rental.phoneNumber,
        emailAddress: rental.emailAddress,
        checkoutDateTime: rental.checkoutDateTime.toISOString(),
        duration_minutes: durationMinutes,
        accessories: rental.accessories,
        status: RegulatorStatus.CHECKED_OUT
      };
    });

    return {
      rentals,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  async getRentalHistory(
    fleetId: string,
    page = 1,
    limit = 50,
    filters: {
      startDate?: string;
      endDate?: string;
      playerId?: string;
    } = {}
  ): Promise<{ rentals: RentalDetails[]; pagination: PaginationMeta }> {
    const where: Record<string, unknown> = { fleetId };

    if (filters.startDate) {
      where.checkoutDateTime = { [Op.gte]: new Date(filters.startDate) };
    }

    if (filters.endDate) {
      where.checkinDateTime = { 
        ...(where.checkinDateTime as object || {}),
        [Op.lte]: new Date(filters.endDate) 
      };
    }

    if (filters.playerId) {
      where.playerId = filters.playerId;
    }

    const offset = (page - 1) * limit;
    
    const { count, rows } = await RentalHistory.findAndCountAll({
      where,
      limit,
      offset,
      order: [['checkoutDateTime', 'DESC']],
      include: [{ model: Regulator, as: 'regulator', attributes: ['barcode'] }]
    });

    const rentals = rows.map(rental => ({
      rentalId: rental.id,
      regulatorId: rental.regulatorId,
      barcode: (rental as unknown as { regulator: { barcode: string } }).regulator?.barcode || '',
      fleetId: rental.fleetId,
      playerId: rental.playerId,
      firstName: rental.firstName,
      lastName: rental.lastName,
      phoneNumber: rental.phoneNumber,
      emailAddress: rental.emailAddress,
      checkoutDateTime: rental.checkoutDateTime.toISOString(),
      checkinDateTime: rental.checkinDateTime?.toISOString() || null,
      duration_minutes: rental.durationMinutes || undefined,
      accessories: rental.accessories,
      checkinAccessories: rental.checkinAccessories,
      notes: rental.notes,
      status: rental.checkinDateTime ? RegulatorStatus.CHARGING : RegulatorStatus.CHECKED_OUT
    }));

    return {
      rentals,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }
}

export default new RentalService();
