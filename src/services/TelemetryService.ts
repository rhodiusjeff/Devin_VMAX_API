import { Op } from 'sequelize';
import { Telemetry, Regulator } from '../models';
import { TelemetryInput, PaginationMeta } from '../types';
import { AppError } from '../middleware/errorHandler';
import WebSocketService from '../websocket/WebSocketService';

export interface TelemetryRecord {
  id: string;
  regulatorId: string;
  timestamp: string;
  soc: number;
  soh: number;
  cycles: number;
  voltage_mV?: number | null;
  current_mA?: number | null;
  remainingCapacity_mAh?: number | null;
  fullCapacity_mAh?: number | null;
  estimatedTimeToEmpty_minutes?: number | null;
  temperature_C?: number | null;
  fanSpeed?: number | null;
  uploadedAt: string;
}

export class TelemetryService {
  async uploadTelemetry(
    regulatorId: string,
    input: TelemetryInput
  ): Promise<{ message: string; recordsCreated: number }> {
    const regulator = await Regulator.findByPk(regulatorId);
    
    if (!regulator) {
      throw new AppError('Regulator not found', 404, 'REGULATOR_NOT_FOUND');
    }

    const uploadedAt = new Date();

    await Telemetry.create({
      regulatorId,
      timestamp: new Date(input.timestamp),
      soc: input.soc,
      soh: input.soh,
      cycles: input.cycles,
      voltage_mV: input.voltage_mV || null,
      current_mA: input.current_mA || null,
      remainingCapacity_mAh: input.remainingCapacity_mAh || null,
      fullCapacity_mAh: input.fullCapacity_mAh || null,
      estimatedTimeToEmpty_minutes: input.estimatedTimeToEmpty_minutes || null,
      temperature_C: input.temperature_C || null,
      fanSpeed: input.fanSpeed || null,
      uploadedAt
    });

    // Update regulator's lastSeenAt
    await regulator.update({ lastSeenAt: new Date(input.timestamp) });

    // Send WebSocket notification if regulator is in a fleet
    if (regulator.fleetId) {
      WebSocketService.broadcastToFleet(regulator.fleetId, {
        type: 'TELEMETRY_RECEIVED',
        payload: {
          regulatorId,
          timestamp: input.timestamp,
          soc: input.soc,
          soh: input.soh
        },
        timestamp: new Date().toISOString()
      });
    }

    return { message: 'Telemetry uploaded successfully', recordsCreated: 1 };
  }

  async uploadTelemetryBatch(
    regulatorId: string,
    batch: TelemetryInput[]
  ): Promise<{ message: string; recordsCreated: number }> {
    const regulator = await Regulator.findByPk(regulatorId);
    
    if (!regulator) {
      throw new AppError('Regulator not found', 404, 'REGULATOR_NOT_FOUND');
    }

    if (batch.length === 0) {
      return { message: 'No telemetry records to upload', recordsCreated: 0 };
    }

    if (batch.length > 1000) {
      throw new AppError('Batch size exceeds maximum of 1000 records', 400, 'BATCH_TOO_LARGE');
    }

    const uploadedAt = new Date();

    const records = batch.map(input => ({
      regulatorId,
      timestamp: new Date(input.timestamp),
      soc: input.soc,
      soh: input.soh,
      cycles: input.cycles,
      voltage_mV: input.voltage_mV || null,
      current_mA: input.current_mA || null,
      remainingCapacity_mAh: input.remainingCapacity_mAh || null,
      fullCapacity_mAh: input.fullCapacity_mAh || null,
      estimatedTimeToEmpty_minutes: input.estimatedTimeToEmpty_minutes || null,
      temperature_C: input.temperature_C || null,
      fanSpeed: input.fanSpeed || null,
      uploadedAt
    }));

    await Telemetry.bulkCreate(records);

    // Update regulator's lastSeenAt with the most recent timestamp
    const latestTimestamp = batch.reduce((latest, record) => {
      const recordTime = new Date(record.timestamp);
      return recordTime > latest ? recordTime : latest;
    }, new Date(0));

    await regulator.update({ lastSeenAt: latestTimestamp });

    // Send WebSocket notification if regulator is in a fleet
    if (regulator.fleetId) {
      const latestRecord = batch[batch.length - 1];
      WebSocketService.broadcastToFleet(regulator.fleetId, {
        type: 'TELEMETRY_RECEIVED',
        payload: {
          regulatorId,
          recordsUploaded: batch.length,
          latestTimestamp: latestRecord.timestamp,
          latestSoc: latestRecord.soc,
          latestSoh: latestRecord.soh
        },
        timestamp: new Date().toISOString()
      });
    }

    return { message: 'Telemetry batch uploaded successfully', recordsCreated: batch.length };
  }

  async getTelemetry(
    regulatorId: string,
    page = 1,
    limit = 100,
    filters: {
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{ telemetry: TelemetryRecord[]; pagination: PaginationMeta }> {
    const regulator = await Regulator.findByPk(regulatorId);
    
    if (!regulator) {
      throw new AppError('Regulator not found', 404, 'REGULATOR_NOT_FOUND');
    }

    const where: Record<string, unknown> = { regulatorId };

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        (where.timestamp as Record<string, unknown>)[Op.gte as unknown as string] = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (where.timestamp as Record<string, unknown>)[Op.lte as unknown as string] = new Date(filters.endDate);
      }
    }

    const offset = (page - 1) * limit;
    
    const { count, rows } = await Telemetry.findAndCountAll({
      where,
      limit,
      offset,
      order: [['timestamp', 'DESC']]
    });

    const telemetry = rows.map(record => ({
      id: record.id,
      regulatorId: record.regulatorId,
      timestamp: record.timestamp.toISOString(),
      soc: record.soc,
      soh: record.soh,
      cycles: record.cycles,
      voltage_mV: record.voltage_mV,
      current_mA: record.current_mA,
      remainingCapacity_mAh: record.remainingCapacity_mAh,
      fullCapacity_mAh: record.fullCapacity_mAh,
      estimatedTimeToEmpty_minutes: record.estimatedTimeToEmpty_minutes,
      temperature_C: record.temperature_C,
      fanSpeed: record.fanSpeed,
      uploadedAt: record.uploadedAt.toISOString()
    }));

    return {
      telemetry,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  async getLatestTelemetry(regulatorId: string): Promise<TelemetryRecord | null> {
    const regulator = await Regulator.findByPk(regulatorId);
    
    if (!regulator) {
      throw new AppError('Regulator not found', 404, 'REGULATOR_NOT_FOUND');
    }

    const record = await Telemetry.findOne({
      where: { regulatorId },
      order: [['timestamp', 'DESC']]
    });

    if (!record) {
      return null;
    }

    return {
      id: record.id,
      regulatorId: record.regulatorId,
      timestamp: record.timestamp.toISOString(),
      soc: record.soc,
      soh: record.soh,
      cycles: record.cycles,
      voltage_mV: record.voltage_mV,
      current_mA: record.current_mA,
      remainingCapacity_mAh: record.remainingCapacity_mAh,
      fullCapacity_mAh: record.fullCapacity_mAh,
      estimatedTimeToEmpty_minutes: record.estimatedTimeToEmpty_minutes,
      temperature_C: record.temperature_C,
      fanSpeed: record.fanSpeed,
      uploadedAt: record.uploadedAt.toISOString()
    };
  }
}

export default new TelemetryService();
