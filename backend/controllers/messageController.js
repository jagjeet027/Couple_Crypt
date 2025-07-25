// controllers/messageController.js
import Message from '../models/message.js';
import Room from '../models/loveRoom.js'; // Import Room model
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Secure file storage configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads/secure');
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate secure filename with room isolation
    const roomId = req.body.roomId;
    const userId = req.body.senderId;
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    
    // Format: roomId_userId_timestamp_random.ext
    const secureFilename = `${roomId}_${userId}_${timestamp}_${random}${ext}`;
    cb(null, secureFilename);
  }
});

// Enhanced file filter for security
const fileFilter = (req, file, cb) => {
  // Allowed file types with proper MIME type checking
  const allowedMimes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit (reduced from 10MB for security)
  },
  fileFilter: fileFilter
});

// Send a text message
export const sendMessage = async (req, res) => {
  try {
    const { roomId, senderId, message, messageType = 'text' } = req.body;

    if (!roomId || !senderId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Room ID, sender ID, and message are required'
      });
    }

    // Verify user has access to this room
    const room = await Room.findOne({ roomCode: roomId });
    if (!room || (!room.creatorId.includes(senderId) && !room.partnerId.includes(senderId))) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this room'
      });
    }

    const newMessage = new Message({
      roomId,
      senderId,
      message,
      messageType,
      timestamp: new Date()
    });

    await newMessage.save();

    // Emit to socket if available
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('new-message', newMessage);
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: error.message
    });
  }
};

// Send a file/image message with enhanced security
export const sendFileMessage = async (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ 
        success: false, 
        error: err.message || 'File upload failed' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    try {
      const { roomId, senderId } = req.body;
      
      if (!roomId || !senderId) {
        // Delete uploaded file if validation fails
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          error: 'Room ID and Sender ID are required'
        });
      }

      // Verify user access to room - ENHANCED SECURITY
      const room = await Room.findOne({ roomCode: roomId });
      if (!room || (!room.creatorId.includes(senderId) && !room.partnerId.includes(senderId))) {
        // Delete uploaded file if access denied
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(403).json({ 
          success: false,
          error: 'Access denied to this room' 
        });
      }

      // Determine message type based on file
      const isImage = req.file.mimetype.startsWith('image/');
      const messageType = isImage ? 'image' : 'file';

      // Create new message with enhanced security fields
      const newMessage = new Message({
        roomId,
        senderId,
        messageType,
        message: isImage ? `📷 ${req.file.originalname}` : `📎 ${req.file.originalname}`,
        fileName: req.file.filename, // This is the secure filename
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        timestamp: new Date(),
        readBy: [{ userId: senderId, readAt: new Date() }],
        deleted: false
      });

      // Save to database
      const savedMessage = await newMessage.save();
      
      // Get socket.io instance and emit to room
      const io = req.app.get('io');
      if (io) {
        // Emit new message to all users in the room
        io.to(roomId).emit('new-message', {
          _id: savedMessage._id,
          roomId: savedMessage.roomId,
          senderId: savedMessage.senderId,
          message: savedMessage.message,
          messageType: savedMessage.messageType,
          fileName: savedMessage.fileName,
          originalName: savedMessage.originalName,
          fileSize: savedMessage.fileSize,
          mimeType: savedMessage.mimeType,
          timestamp: savedMessage.timestamp,
          readBy: savedMessage.readBy
        });
        
        // Emit file upload confirmation
        io.to(roomId).emit('file-uploaded', {
          success: true,
          messageId: savedMessage._id,
          fileName: savedMessage.originalName
        });
      }

      // Log successful upload for security
      console.log(`File uploaded: ${req.file.filename} by user: ${senderId} in room: ${roomId}`);

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          _id: savedMessage._id,
          roomId: savedMessage.roomId,
          senderId: savedMessage.senderId,
          message: savedMessage.message,
          messageType: savedMessage.messageType,
          fileName: savedMessage.fileName,
          originalName: savedMessage.originalName,
          fileSize: savedMessage.fileSize,
          mimeType: savedMessage.mimeType,
          timestamp: savedMessage.timestamp,
          readBy: savedMessage.readBy
        }
      });

    } catch (error) {
      console.error('Error saving file message:', error);
      
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
          console.log('Cleaned up uploaded file after error');
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to save file message',
        details: error.message
      });
    }
  });
};

// Get messages for a room
export const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }

    const skip = (page - 1) * limit;

    const messages = await Message.find({ 
      roomId, 
      deleted: false 
    })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

    const totalMessages = await Message.countDocuments({ 
      roomId, 
      deleted: false 
    });

    res.status(200).json({
      success: true,
      data: {
        messages: messages.reverse(), // Reverse to show oldest first
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalMessages / limit),
          totalMessages,
          hasNext: page * limit < totalMessages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting messages',
      error: error.message
    });
  }
};

// Secure file access with enhanced security
export const getFile = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId, download } = req.query;

    if (!messageId || !userId) {
      return res.status(400).json({ error: 'Message ID and User ID are required' });
    }

    // Get message from database
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Verify user has access to this message - ENHANCED SECURITY
    const room = await Room.findOne({ roomCode: message.roomId });
    if (!room || (!room.creatorId.includes(userId) && !room.partnerId.includes(userId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Security: Check if file belongs to this room (filename should start with roomId)
    if (!message.fileName.startsWith(message.roomId)) {
      return res.status(403).json({ error: 'File access violation' });
    }

    // Check if file exists
    const filePath = message.filePath;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Set appropriate headers with security measures
    const filename = message.originalName || message.fileName;
    const ext = path.extname(filename).toLowerCase();
    
    if (download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    }
    
    // Set content type based on file extension
    res.setHeader('Content-Type', getContentType(ext));
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (err) => {
      console.error('Error streaming file:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    });

    // Log access for security audit
    console.log(`File accessed: ${message.fileName} by user: ${userId}`);

  } catch (error) {
    console.error('File access error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Content type helper function
const getContentType = (ext) => {
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  return types[ext] || 'application/octet-stream';
};

// Mark message as read
export const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    if (!messageId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Message ID and User ID are required'
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    await message.markAsRead(userId);

    res.status(200).json({
      success: true,
      message: 'Message marked as read'
    });

  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking message as read',
      error: error.message
    });
  }
};

// Mark image as viewed (will auto-delete)
export const markImageAsViewed = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    if (!messageId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Message ID and User ID are required'
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (message.messageType !== 'image') {
      return res.status(400).json({
        success: false,
        message: 'This is not an image message'
      });
    }

    await message.markAsViewed(userId);

    res.status(200).json({
      success: true,
      message: 'Image viewed and marked for deletion',
      data: {
        deleted: message.deleted,
        deletedAt: message.deletedAt
      }
    });

  } catch (error) {
    console.error('Error marking image as viewed:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking image as viewed',
      error: error.message
    });
  }
};

// Mark all messages in room as read
export const markRoomMessagesAsRead = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    if (!roomId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Room ID and User ID are required'
      });
    }

    await Message.markRoomMessagesAsRead(roomId, userId);

    res.status(200).json({
      success: true,
      message: 'All messages marked as read'
    });

  } catch (error) {
    console.error('Error marking room messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking room messages as read',
      error: error.message
    });
  }
};

// Delete a message
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    if (!messageId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Message ID and User ID are required'
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Only sender can delete their own message
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages'
      });
    }

    await message.deleteMessage();

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message',
      error: error.message
    });
  }
};

// Edit a message
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId, newMessage } = req.body;

    if (!messageId || !userId || !newMessage) {
      return res.status(400).json({
        success: false,
        message: 'Message ID, User ID, and new message are required'
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Only sender can edit their own message
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own messages'
      });
    }

    // Can't edit non-text messages
    if (message.messageType !== 'text') {
      return res.status(400).json({
        success: false,
        message: 'Only text messages can be edited'
      });
    }

    await message.editMessage(newMessage);

    res.status(200).json({
      success: true,
      message: 'Message edited successfully',
      data: message
    });

  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({
      success: false,
      message: 'Error editing message',
      error: error.message
    });
  }
};

// Get unread message count
export const getUnreadCount = async (req, res) => {
  try {
    const { roomId, userId } = req.params;

    if (!roomId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Room ID and User ID are required'
      });
    }

    const unreadCount = await Message.getUnreadCount(roomId, userId);

    res.status(200).json({
      success: true,
      data: {
        unreadCount
      }
    });

  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting unread count',
      error: error.message
    });
  }
};

// Cleanup old messages manually (for testing)
export const cleanupOldMessages = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }

    await Message.cleanupOldMessages(roomId);

    res.status(200).json({
      success: true,
      message: 'Old messages cleaned up successfully'
    });

  } catch (error) {
    console.error('Error cleaning up messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error cleaning up messages',
      error: error.message
    });
  }
};

// Auto cleanup old files (run periodically)
export const cleanupOldFiles = async () => {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads/secure');
    const files = await fs.promises.readdir(uploadsDir);
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const stats = await fs.promises.stat(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        await fs.promises.unlink(filePath);
        console.log(`Cleaned up old file: ${file}`);
      }
    }
  } catch (error) {
    console.error('File cleanup error:', error);
  }
};

// Initialize cleanup interval (call this in your main app file)
export const initializeCleanup = () => {
  // Run cleanup daily
  setInterval(cleanupOldFiles, 24 * 60 * 60 * 1000);
};