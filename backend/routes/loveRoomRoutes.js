import express from 'express';
import loveRoomController from '../controllers/loveRoomController.js';
import { getActiveSessions, resumeSession } from '../controllers/sessionController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

router.get('/health', loveRoomController.healthCheck);

router.post('/rooms/create', authenticateToken, loveRoomController.createRoom);

router.post('/rooms/join', authenticateToken, loveRoomController.joinRoom);

router.get('/rooms/status/:roomId', authenticateToken, loveRoomController.getRoomStatus);

router.get('/users/:userId/rooms', authenticateToken, loveRoomController.getUserRooms);

router.get('/validate/:code', loveRoomController.validateCode);

router.post('/reset/:code', authenticateToken, loveRoomController.resetCode);

router.delete('/rooms/:roomId', authenticateToken, loveRoomController.resetCode);

router.get('/sessions/active/:userId', authenticateToken, getActiveSessions);
router.post('/sessions/resume/:code', authenticateToken, resumeSession);

export default router;