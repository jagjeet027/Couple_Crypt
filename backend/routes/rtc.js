import express from 'express';
import rtcController from '../controllers/rtcController.js';
import authenticateToken from '../middleware/auth.js'; // Your existing auth middleware

const router = express.Router();

// Initialize WebRTC session
router.post('/initialize', authenticateToken, rtcController.initializeRTC);

// Chat endpoints
router.post('/message/send', authenticateToken, rtcController.sendMessage);
router.get('/messages/:roomId/:userId', authenticateToken, rtcController.getChatHistory);

// WebRTC signaling endpoints
router.post('/signal', authenticateToken, rtcController.handleSignaling);

// Call management endpoints
router.post('/call/start', authenticateToken, rtcController.startCall);
router.post('/call/end', authenticateToken, rtcController.endCall);

// Room participants
router.get('/participants/:roomId/:userId', authenticateToken, rtcController.getRoomParticipants);

export default router;