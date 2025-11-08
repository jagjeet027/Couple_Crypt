import express from 'express';
import messageController from '../controllers/messageController.js';
import { authenticate } from '../middleware/auth.js';

const {
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
} = messageController;

const router = express.Router();

// Send text message
router.post('/send', authenticate, sendMessage);

// Send file/image message
router.post('/send-file', authenticate, sendFileMessage);

// Get messages for a room
router.get('/room/:roomId', authenticate, getMessages);

// Mark specific message as read
router.put('/mark-read/:messageId', authenticate, markMessageAsRead);

// Mark image as viewed (auto-delete)
router.put('/view-image/:messageId', authenticate, markImageAsViewed);

// Mark all messages in room as read
router.put('/mark-read-all/:roomId', authenticate, markRoomMessagesAsRead);

// Edit a message
router.put('/edit/:messageId', authenticate, editMessage);

// Delete a message
router.delete('/:messageId', authenticate, deleteMessage);

// Get unread message count
router.get('/unread/:roomId/:userId', authenticate, getUnreadCount);

// Get file/image (public access - no auth required)
router.get('/file/:messageId', getFile);

// Manual cleanup (for testing purposes)
router.post('/cleanup/:roomId', authenticate, cleanupOldMessages);

export default router;