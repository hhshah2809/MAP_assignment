import { Request, Response } from 'express';
import { shipmentService } from '../services/shipment.service';
import {
  createShipmentSchema,
  updateShipmentStatusSchema,
  updateShipmentAssignmentSchema,
  listShipmentsQuerySchema
} from '../validators/shipment.validator';
import { logger } from '../config/logger';

export class ShipmentController {
  async createShipment(req: Request, res: Response): Promise<void> {
    const parseResult = createShipmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.format()
      });
      return;
    }

    try {
      const shipment = await shipmentService.createShipment(parseResult.data);
      res.status(201).json({
        success: true,
        data: shipment
      });
    } catch (error: any) {
      logger.error({ err: error.message }, 'Failed to create shipment');
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  }

  async listShipments(req: Request, res: Response): Promise<void> {
    const parseResult = listShipmentsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.format()
      });
      return;
    }

    try {
      const result = await shipmentService.listShipments(parseResult.data);
      res.status(200).json({
        success: true,
        data: result.shipments,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error: any) {
      logger.error({ err: error.message }, 'Failed to list shipments');
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  }

  async getShipmentById(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    try {
      const result = await shipmentService.getShipmentById(id);
      if (!result) {
        res.status(404).json({
          success: false,
          error: `Shipment with id ${id} not found`
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          ...result.shipment,
          history: result.history
        }
      });
    } catch (error: any) {
      logger.error({ err: error.message, id }, 'Failed to get shipment');
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const parseResult = updateShipmentStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.format()
      });
      return;
    }

    try {
      const updated = await shipmentService.updateStatus(id, parseResult.data);
      res.status(200).json({
        success: true,
        data: updated
      });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({
        success: false,
        error: error.message
      });
    }
  }

  async updateAssignment(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const parseResult = updateShipmentAssignmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.format()
      });
      return;
    }

    try {
      const updated = await shipmentService.updateAssignment(id, parseResult.data);
      res.status(200).json({
        success: true,
        data: updated
      });
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const shipmentController = new ShipmentController();
