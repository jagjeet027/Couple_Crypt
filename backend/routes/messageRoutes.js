import express from 'express';
import messageController from '../controllers/messageController.js';
import { authenticate } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, nameWithoutExt + '-' + uniqueSuffix + ext);
  }
});

// File filter for security
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, documents, videos, and audio files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// ==================== MESSAGE ROUTES ====================

// Send text message (with optional reply)
router.post('/send', authenticate, sendMessage);

// Send file/image message (with optional reply)
router.post('/send-file', authenticate, upload.single('file'), sendFileMessage);

// Get messages for a room (with pagination support)
// Query params: limit (default 50), before (timestamp for pagination)
router.get('/room/:roomId', authenticate, getMessages);

// Mark specific message as read
router.put('/mark-read/:messageId', authenticate, markMessageAsRead);

// Mark image as viewed (triggers auto-delete for images)
router.put('/view-image/:messageId', authenticate, markImageAsViewed);

// Mark all messages in room as read
router.put('/mark-read-all/:roomId', authenticate, markRoomMessagesAsRead);

// Edit a message (text messages only)
router.put('/edit/:messageId', authenticate, editMessage);

// Delete a message (soft delete)
router.delete('/:messageId', authenticate, deleteMessage);

// Get unread message count for a room
router.get('/unread/:roomId/:userId', authenticate, getUnreadCount);

// Get file/image by message ID (public access)
router.get('/file/:messageId', getFile);

// Manual cleanup of old messages (for testing/admin purposes)
router.post('/cleanup/:roomId', authenticate, cleanupOldMessages);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 50MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message
    });
  } else if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next();
});

export default router;