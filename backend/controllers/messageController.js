import Message from '../models/message.js';
import fs from 'fs';
import path from 'path';

const sendMessage = async (req, res) => {
  try {
    const { roomId, message, messageType = 'text', replyTo } = req.body;
    const senderId = req.user.id || req.user._id;

    if (!roomId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Room ID and message required'
      });
    }

    const messageData = {
      roomId,
      senderId,
      message,
      messageType,
      timestamp: new Date()
    };

    // Add replyTo if present
    if (replyTo && replyTo.messageId) {
      messageData.replyTo = {
        messageId: replyTo.messageId,
        message: replyTo.message,
        senderId: replyTo.senderId
      };
    }

    const newMessage = new Message(messageData);
    await newMessage.save();

    res.status(201).json({
      success: true,
      message: 'Message sent',
      data: newMessage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const sendFileMessage = async (req, res) => {
  try {
    const { roomId, fileName, messageType = 'file', replyTo } = req.body;
    const senderId = req.user.id || req.user._id;

    if (!roomId || !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Room ID and file required'
      });
    }

    const messageData = {
      roomId,
      senderId,
      message: fileName || req.file.originalname,
      messageType: messageType === 'image' ? 'image' : 'file',
      fileUrl: `/uploads/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      timestamp: new Date()
    };

    // Add replyTo if present
    if (replyTo) {
      try {
        const parsedReplyTo = typeof replyTo === 'string' ? JSON.parse(replyTo) : replyTo;
        if (parsedReplyTo.messageId) {
          messageData.replyTo = {
            messageId: parsedReplyTo.messageId,
            message: parsedReplyTo.message,
            senderId: parsedReplyTo.senderId
          };
        }
      } catch (e) {
        console.error('Error parsing replyTo:', e);
      }
    }

    const newMessage = new Message(messageData);
    await newMessage.save();

    res.status(201).json({
      success: true,
      message: 'File sent',
      data: newMessage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, before } = req.query;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'Room ID required'
      });
    }

    let query = { roomId, deleted: false };
    
    // Pagination support
    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ timestamp: 1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        messages,
        count: messages.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id || req.user._id;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: 'Message ID required'
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

    res.json({
      success: true,
      message: 'Message marked as read',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const markImageAsViewed = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id || req.user._id;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: 'Message ID required'
      });
    }

    const message = await Message.findById(messageId);

    if (!message || message.messageType !== 'image') {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    await message.markAsViewed(userId);

    res.json({
      success: true,
      message: 'Image marked as viewed',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const markRoomMessagesAsRead = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id || req.user._id;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'Room ID required'
      });
    }

    await Message.markRoomMessagesAsRead(roomId, userId);

    res.json({
      success: true,
      message: 'Room messages marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id || req.user._id;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: 'Message ID required'
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Can only delete own messages'
      });
    }

    if (message.filePath && fs.existsSync(message.filePath)) {
      try {
        fs.unlinkSync(message.filePath);
      } catch (err) {
        console.error('File deletion error:', err.message);
      }
    }

    await message.deleteMessage();

    res.json({
      success: true,
      message: 'Message deleted',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { newMessage } = req.body;
    const userId = req.user.id || req.user._id;

    if (!messageId || !newMessage) {
      return res.status(400).json({
        success: false,
        message: 'Message ID and new message text required'
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Can only edit own messages'
      });
    }

    if (message.messageType !== 'text') {
      return res.status(400).json({
        success: false,
        message: 'Can only edit text messages'
      });
    }

    await message.editMessage(newMessage);

    res.json({
      success: true,
      message: 'Message edited',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const { roomId, userId } = req.params;

    if (!roomId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Room ID and user ID required'
      });
    }

    const count = await Message.getUnreadCount(roomId, userId);

    res.json({
      success: true,
      data: {
        unreadCount: count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const cleanupOldMessages = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'Room ID required'
      });
    }

    await Message.cleanupOldMessages(roomId);

    res.json({
      success: true,
      message: 'Old messages cleaned up'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getFile = async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: 'Message ID required'
      });
    }

    const message = await Message.findById(messageId);

    if (!message || !message.fileUrl) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    if (message.messageType === 'image' && message.deleted) {
      return res.status(410).json({
        success: false,
        message: 'Image has been deleted'
      });
    }

    const filePath = path.join(process.cwd(), message.filePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    res.download(filePath, message.fileName);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export default {
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
};