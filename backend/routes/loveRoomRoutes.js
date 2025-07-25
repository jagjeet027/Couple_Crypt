import express from 'express';
import loveRoomController from '../controllers/loveRoomController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// Health check endpoint (no auth required)
router.get('/health', loveRoomController.healthCheck);

// Room management endpoints
router.post('/rooms/create', authenticateToken, loveRoomController.createRoom);
router.post('/rooms/join', authenticateToken, loveRoomController.joinRoom);
router.get('/rooms/status/:roomId', authenticateToken, loveRoomController.getRoomStatus);

// User rooms endpoint - ADD THIS MISSING ROUTE
router.get('/users/:userId/rooms', authenticateToken, loveRoomController.getUserRooms);

// Code validation and reset
router.get('/validate/:code', loveRoomController.validateCode);
router.post('/reset/:code', authenticateToken, loveRoomController.resetCode);

// Legacy endpoints (backward compatibility)
router.post('/generate', authenticateToken, loveRoomController.generateCode);
router.post('/join', authenticateToken, loveRoomController.joinLegacyRoom);

export default router;