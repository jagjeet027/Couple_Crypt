import express from 'express';
import loveRoomController from '../controllers/loveRoomController.js';

const router = express.Router();

// POST routes
router.post('/generate', loveRoomController.generateCode);
router.post('/join', loveRoomController.joinRoom);
router.post('/reset/:code', loveRoomController.resetCode);

// GET routes
router.get('/validate/:code', loveRoomController.validateCode);
router.get('/status/:roomCode', loveRoomController.getRoomStatus);

export default router;