import express from 'express';
import loveRoomController from '../controllers/loveRoomController.js';

const router = express.Router();

router.post('/generate', loveRoomController.generateCode);
router.post('/join', loveRoomController.joinRoom);
router.get('/validate/:code', loveRoomController.validateCode);
router.get('/status/:code', loveRoomController.getRoomStatus);
router.get('/room/:roomId', loveRoomController.getRoomInfo);
router.delete('/reset/:code', loveRoomController.resetCode);
router.get('/user/:userId/codes', loveRoomController.getUserActiveCodes);
router.get('/admin/codes', loveRoomController.getActiveCodes);
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Love Room API is working',
    timestamp: new Date().toISOString()
  });
});

export default router;
