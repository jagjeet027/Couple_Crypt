// rtcController.js
import LoveRoom from '../models/loveRoom.js';
import Message from '../models/message.js'; // You'll need to create this model
import User from '../models/users.js';

const rtcController = {
  // Initialize WebRTC session for a room
  initializeRTC: async (req, res) => {
    try {
      const { roomId, userId } = req.body;

      if (!roomId || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Room ID and User ID are required'
        });
      }

      // Verify room exists and user has access
      const loveRoom = await LoveRoom.findOne({ roomId });
      if (!loveRoom) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      // Check if user is part of this room
      const isCreator = loveRoom.creator.userId.toString() === userId.toString();
      const isJoiner = loveRoom.joiner.userId && 
                      loveRoom.joiner.userId.toString() === userId.toString();

      if (!isCreator && !isJoiner) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to room'
        });
      }

      // Check if room is connected
      if (loveRoom.status !== 'connected') {
        return res.status(400).json({
          success: false,
          message: 'Room is not connected yet'
        });
      }

      res.json({
        success: true,
        message: 'RTC session initialized',
        data: {
          roomId: loveRoom.roomId,
          userRole: isCreator ? 'creator' : 'joiner',
          participants: {
            creator: {
              id: loveRoom.creator.userId,
              email: loveRoom.creator.email
            },
            joiner: {
              id: loveRoom.joiner.userId,
              email: loveRoom.joiner.email
            }
          }
        }
      });

    } catch (error) {
      console.error('Error initializing RTC:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // Send chat message
  sendMessage: async (req, res) => {
    try {
      const { roomId, senderId, message, messageType = 'text' } = req.body;

      if (!roomId || !senderId || !message) {
        return res.status(400).json({
          success: false,
          message: 'Room ID, sender ID, and message are required'
        });
      }

      // Verify room and user access
      const loveRoom = await LoveRoom.findOne({ roomId });
      if (!loveRoom || loveRoom.status !== 'connected') {
        return res.status(400).json({
          success: false,
          message: 'Room not found or not connected'
        });
      }

      // Verify sender is part of room
      const isValidSender = loveRoom.creator.userId.toString() === senderId.toString() ||
                           (loveRoom.joiner.userId && 
                            loveRoom.joiner.userId.toString() === senderId.toString());

      if (!isValidSender) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to send message'
        });
      }

      // Create and save message
      const newMessage = new Message({
        roomId,
        senderId,
        message,
        messageType,
        timestamp: new Date()
      });

      await newMessage.save();

      // Get sender info
      let senderInfo = null;
      if (loveRoom.creator.userId.toString() === senderId.toString()) {
        senderInfo = {
          id: loveRoom.creator.userId,
          email: loveRoom.creator.email,
          role: 'creator'
        };
      } else {
        senderInfo = {
          id: loveRoom.joiner.userId,
          email: loveRoom.joiner.email,
          role: 'joiner'
        };
      }

      const messageData = {
        messageId: newMessage._id,
        roomId,
        sender: senderInfo,
        message,
        messageType,
        timestamp: newMessage.timestamp
      };

      res.json({
        success: true,
        message: 'Message sent successfully',
        data: messageData
      });

    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // Get chat history
  getChatHistory: async (req, res) => {
    try {
      const { roomId, userId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      if (!roomId || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Room ID and User ID are required'
        });
      }

      // Verify room and user access
      const loveRoom = await LoveRoom.findOne({ roomId });
      if (!loveRoom) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      const isAuthorized = loveRoom.creator.userId.toString() === userId.toString() ||
                          (loveRoom.joiner.userId && 
                           loveRoom.joiner.userId.toString() === userId.toString());

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access'
        });
      }

      // Get messages with pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const messages = await Message.find({ roomId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Add sender info to messages
      const messagesWithSenderInfo = messages.map(msg => {
        let senderInfo = null;
        if (loveRoom.creator.userId.toString() === msg.senderId.toString()) {
          senderInfo = {
            id: loveRoom.creator.userId,
            email: loveRoom.creator.email,
            role: 'creator'
          };
        } else {
          senderInfo = {
            id: loveRoom.joiner.userId,
            email: loveRoom.joiner.email,
            role: 'joiner'
          };
        }

        return {
          messageId: msg._id,
          sender: senderInfo,
          message: msg.message,
          messageType: msg.messageType,
          timestamp: msg.timestamp
        };
      });

      res.json({
        success: true,
        message: 'Chat history retrieved',
        data: {
          messages: messagesWithSenderInfo.reverse(), // Reverse to show oldest first
          pagination: {
            currentPage: parseInt(page),
            limit: parseInt(limit),
            totalMessages: await Message.countDocuments({ roomId })
          }
        }
      });

    } catch (error) {
      console.error('Error getting chat history:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // Handle WebRTC signaling (offer, answer, ice candidates)
  handleSignaling: async (req, res) => {
    try {
      const { roomId, userId, signalType, signalData } = req.body;

      if (!roomId || !userId || !signalType || !signalData) {
        return res.status(400).json({
          success: false,
          message: 'All signaling parameters are required'
        });
      }

      // Verify room and user access
      const loveRoom = await LoveRoom.findOne({ roomId });
      if (!loveRoom || loveRoom.status !== 'connected') {
        return res.status(400).json({
          success: false,
          message: 'Room not found or not connected'
        });
      }

      const isAuthorized = loveRoom.creator.userId.toString() === userId.toString() ||
                          (loveRoom.joiner.userId && 
                           loveRoom.joiner.userId.toString() === userId.toString());

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access'
        });
      }

      // Determine recipient
      let recipientId = null;
      if (loveRoom.creator.userId.toString() === userId.toString()) {
        recipientId = loveRoom.joiner.userId;
      } else {
        recipientId = loveRoom.creator.userId;
      }

      const signalingData = {
        roomId,
        senderId: userId,
        recipientId,
        signalType, // 'offer', 'answer', 'ice-candidate', 'call-request', 'call-accept', 'call-reject', 'call-end'
        signalData,
        timestamp: new Date()
      };

      res.json({
        success: true,
        message: 'Signaling data processed',
        data: signalingData
      });

    } catch (error) {
      console.error('Error handling signaling:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // Start video/audio call
  startCall: async (req, res) => {
    try {
      const { roomId, callerId, callType = 'video' } = req.body; // callType: 'video' or 'audio'

      if (!roomId || !callerId) {
        return res.status(400).json({
          success: false,
          message: 'Room ID and caller ID are required'
        });
      }

      // Verify room and user access
      const loveRoom = await LoveRoom.findOne({ roomId });
      if (!loveRoom || loveRoom.status !== 'connected') {
        return res.status(400).json({
          success: false,
          message: 'Room not found or not connected'
        });
      }

      const isAuthorized = loveRoom.creator.userId.toString() === callerId.toString() ||
                          (loveRoom.joiner.userId && 
                           loveRoom.joiner.userId.toString() === callerId.toString());

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to start call'
        });
      }

      // Determine recipient
      let recipientId = null;
      if (loveRoom.creator.userId.toString() === callerId.toString()) {
        recipientId = loveRoom.joiner.userId;
      } else {
        recipientId = loveRoom.creator.userId;
      }

      const callData = {
        roomId,
        callerId,
        recipientId,
        callType,
        status: 'ringing',
        startedAt: new Date()
      };

      res.json({
        success: true,
        message: `${callType} call initiated`,
        data: callData
      });

    } catch (error) {
      console.error('Error starting call:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // End call
  endCall: async (req, res) => {
    try {
      const { roomId, userId } = req.body;

      if (!roomId || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Room ID and User ID are required'
        });
      }

      // Verify room and user access
      const loveRoom = await LoveRoom.findOne({ roomId });
      if (!loveRoom) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      const isAuthorized = loveRoom.creator.userId.toString() === userId.toString() ||
                          (loveRoom.joiner.userId && 
                           loveRoom.joiner.userId.toString() === userId.toString());

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to end call'
        });
      }

      const callEndData = {
        roomId,
        userId,
        endedAt: new Date(),
        status: 'ended'
      };

      res.json({
        success: true,
        message: 'Call ended successfully',
        data: callEndData
      });

    } catch (error) {
      console.error('Error ending call:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // Get room participants for call
  getRoomParticipants: async (req, res) => {
    try {
      const { roomId, userId } = req.params;

      // Verify room and user access
      const loveRoom = await LoveRoom.findOne({ roomId });
      if (!loveRoom || loveRoom.status !== 'connected') {
        return res.status(400).json({
          success: false,
          message: 'Room not found or not connected'
        });
      }

      const isAuthorized = loveRoom.creator.userId.toString() === userId.toString() ||
                          (loveRoom.joiner.userId && 
                           loveRoom.joiner.userId.toString() === userId.toString());

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access'
        });
      }

      const participants = {
        creator: {
          id: loveRoom.creator.userId,
          email: loveRoom.creator.email,
          role: 'creator'
        },
        joiner: {
          id: loveRoom.joiner.userId,
          email: loveRoom.joiner.email,
          role: 'joiner'
        }
      };

      res.json({
        success: true,
        message: 'Participants retrieved',
        data: {
          roomId,
          participants,
          totalParticipants: 2
        }
      });

    } catch (error) {
      console.error('Error getting participants:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
};

export default rtcController;