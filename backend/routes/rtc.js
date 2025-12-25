// // routes/rtc.js
// import express from 'express';
// import rtcController from '../controllers/rtcController.js';

// const router = express.Router();

// // RTC endpoints
// router.post('/initialize', rtcController.initializeRTC);
// router.post('/send-message', rtcController.sendMessage);
// router.get('/messages/:roomId/:userId', rtcController.getChatHistory);
// router.post('/signaling', rtcController.handleSignaling);
// router.post('/call/start', rtcController.startCall);
// router.post('/call/end', rtcController.endCall);
// router.get('/participants/:roomId/:userId', rtcController.getRoomParticipants);
// router.get('/status/:roomId/:userId', rtcController.getRoomStatus);

// export default router;