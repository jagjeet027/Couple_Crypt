import express from 'express';
import loveRoomController from '../controllers/loveRoomController.js';
import { getActiveSessions, resumeSession, deleteSession } from '../controllers/sessionController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

router.get('/health', loveRoomController.healthCheck);

// Create room - NO restrictions on how many rooms a user can create
router.post('/rooms/create', authenticateToken, loveRoomController.createRoom);

router.post('/rooms/join', authenticateToken, loveRoomController.joinRoom);

router.get('/rooms/status/:roomId', authenticateToken, loveRoomController.getRoomStatus);

router.get('/users/:userId/rooms', authenticateToken, loveRoomController.getUserRooms);

router.get('/validate/:code', loveRoomController.validateCode);

router.post('/reset/:code', authenticateToken, loveRoomController.resetCode);

router.delete('/rooms/:roomId', authenticateToken, loveRoomController.resetCode);

// Active Sessions Routes
router.get('/sessions/active/:userId', authenticateToken, getActiveSessions);
router.post('/sessions/resume/:code', authenticateToken, resumeSession);
router.post('/sessions/delete/:code', authenticateToken, deleteSession);

export default router;
