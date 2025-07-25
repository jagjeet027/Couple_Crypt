// routes/messageRoutes.js
import express from 'express';
import {
  sendMessage,
  sendFileMessage,
  getMessages,
  markMessageAsRead,
  markImageAsViewed,
  markRoomMessagesAsRead,
  deleteMessage,
  editMessage,
  getUnreadCount,
  cleanupOldMessages,
  getFile
} from '../controllers/messageController.js';
import { authenticate } from '../middleware/auth.js'; // Assuming you have auth middleware

const router = express.Router();

// Send text message
router.post('/send', authenticate, sendMessage);

// Send file/image message
router.post('/send-file', authenticate, sendFileMessage)
// Get messages for a room
router.get('/room/:roomId', authenticate, getMessages);

// Mark specific message as read
router.put('/read/:messageId', authenticate, markMessageAsRead);

// Mark image as viewed (auto-delete)
router.put('/view-image/:messageId', authenticate, markImageAsViewed);

// Mark all messages in room as read
router.put('/read-all/:roomId', authenticate, markRoomMessagesAsRead);

// Delete a message
router.delete('/:messageId', authenticate, deleteMessage);

// Edit a message
router.put('/edit/:messageId', authenticate, editMessage);

// Get unread message count
router.get('/unread/:roomId/:userId', authenticate, getUnreadCount);

// Manual cleanup (for testing purposes)
router.post('/cleanup/:roomId', authenticate, cleanupOldMessages);

// Get file/image
router.get('/file/:messageId', getFile);

export default router;