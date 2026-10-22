import { Router } from 'express';
import { shipmentController } from '../controllers/shipment.controller';

const router = Router();

// Create shipment manually or via system
router.post('/', shipmentController.createShipment.bind(shipmentController));

// List shipments with pagination & filters
router.get('/', shipmentController.listShipments.bind(shipmentController));

// Get shipment by ID
router.get('/:id', shipmentController.getShipmentById.bind(shipmentController));

// Update shipment status
router.patch('/:id/status', shipmentController.updateStatus.bind(shipmentController));

// Update carrier & truck assignment
router.patch('/:id/assignment', shipmentController.updateAssignment.bind(shipmentController));

export default router;
