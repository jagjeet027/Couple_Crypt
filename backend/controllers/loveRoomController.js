import LoveRoom from '../models/loveRoom.js';
import User from '../models/users.js';
import mongoose from 'mongoose';

// Updated: 30 days expiration time
const CODE_EXPIRY_TIME = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

const loveRoomController = {
  // Create room endpoint that matches SecureRoomPortal expectations
  createRoom : async (req, res) => {
    try {
      const { code, creatorEmail, creatorName, userId } = req.body;

      if (!code || !creatorEmail || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Code, creator email, and user ID are required'
        });
      }

      // Check if code already exists
      const codeExists = await LoveRoom.findOne({ code: code.toUpperCase() });
      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: 'Code already exists. Please try again.'
        });
      }

      // Create new room (no active room check - multiple rooms allowed)
      const loveRoom = new LoveRoom({
        code: code.toUpperCase(),
        creator: {
          userId: userId,
          email: creatorEmail.toLowerCase(),
          name: creatorName || creatorEmail.split('@')[0]
        },
        expiresAt: new Date(Date.now() + CODE_EXPIRY_TIME), // 30 days from now
        status: 'waiting'
      });

      await loveRoom.save();

      res.status(201).json({
        success: true,
        message: 'Love room created successfully',
        data: {
          code: loveRoom.code,
          roomId: loveRoom._id,
          expiresAt: loveRoom.expiresAt,
          status: loveRoom.status
        }
      });

    } catch (error) {
      console.error('Error creating room:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  joinRoom : async (req, res) => {
    try {
      const { code, userEmail, userName, userId } = req.body;

      if (!code || !userEmail || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Code, user email, and user ID are required'
        });
      }

      // Validate the code using the model's static method
      const validation = await LoveRoom.validateCode(code);
      
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message
        });
      }

      const loveRoom = validation.loveRoom;

      // Check if user is trying to join their own room
      if (loveRoom.creator.userId.toString() === userId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'You cannot join your own room'
        });
      }

      // Check if room already has a joiner
      if (loveRoom.joiner && loveRoom.joiner.userId) {
        return res.status(400).json({
          success: false,
          message: 'Room is already full'
        });
      }

      // Connect the joiner to the room
      await loveRoom.connectHearts(
        userId,
        userEmail.toLowerCase(),
        userName || userEmail.split('@')[0]
      );

      res.json({
        success: true,
        message: 'Successfully joined the love room',
        data: {
          roomId: loveRoom.roomId,
          code: loveRoom.code,
          status: loveRoom.status,
          creator: {
            name: loveRoom.creator.name,
            email: loveRoom.creator.email
          },
          joiner: {
            name: loveRoom.joiner.name,
            email: loveRoom.joiner.email
          }
        }
      });

    } catch (error) {
      console.error('Error joining room:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  getUserRooms: async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Decode the userId in case it was URL encoded
    const decodedUserId = decodeURIComponent(userId);

    // Find rooms where user is either creator or joiner
    const rooms = await LoveRoom.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { 'creator.userId': decodedUserId },
            { 'creator.email': decodedUserId },
            { 'joiner.userId': decodedUserId },
            { 'joiner.email': decodedUserId }
          ]
        }
      ]
    }).sort({ createdAt: -1 });

    const roomsData = rooms.map(room => {
      const timeRemaining = room.expiresAt.getTime() - Date.now();
      return {
        _id: room._id,
        code: room.code,
        status: room.status,
        isActive: room.isActive,
        createdAt: room.createdAt,
        expiresAt: room.expiresAt,
        timeRemaining: Math.max(0, timeRemaining),
        creator: room.creator,
        joiner: room.joiner
      };
    });

    res.json({
      success: true,
      message: 'User rooms retrieved successfully',
      data: roomsData
    });

  } catch (error) {
    console.error('Error getting user rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
},
  // Legacy generate code endpoint (keeping for backward compatibility)
  generateCode: async (req, res) => {
    try {
      const { userId, creatorId, creatorEmail } = req.body;
      
      // Use userId if provided, otherwise use creatorId for backward compatibility
      const actualCreatorId = userId || creatorId;
      const actualCreatorEmail = creatorEmail || `user_${actualCreatorId}@lovevault.local`;

      if (!actualCreatorId) {
        return res.status(400).json({
          success: false,
          message: 'Creator ID is required'
        });
      }

      // Only validate MongoDB ObjectIds against User model
      if (mongoose.Types.ObjectId.isValid(actualCreatorId)) {
        const user = await User.findById(actualCreatorId);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }
      }

      // Generate unique code (no active room check)
      const code = await LoveRoom.generateUniqueCode();

      // Create new love room
      const loveRoom = new LoveRoom({
        code,
        creator: {
          userId: actualCreatorId,
          email: actualCreatorEmail
        },
        expiresAt: new Date(Date.now() + CODE_EXPIRY_TIME)
      });

      await loveRoom.save();

      res.json({
        success: true,
        message: 'Love code generated successfully',
        data: {
          code,
          expiresAt: loveRoom.expiresAt,
          createdAt: loveRoom.createdAt,
          timeRemaining: CODE_EXPIRY_TIME
        }
      });

    } catch (error) {
      console.error('Error generating code:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // Legacy join room endpoint (keeping for backward compatibility)
  joinLegacyRoom: async (req, res) => {
    try {
      const { code, userId, joinerId, joinerEmail } = req.body;
      
      // Use userId if provided, otherwise use joinerId for backward compatibility
      const actualJoinerId = userId || joinerId;
      const actualJoinerEmail = joinerEmail || `user_${actualJoinerId}@lovevault.local`;

      if (!code || !actualJoinerId) {
        return res.status(400).json({
          success: false,
          message: 'Code and joiner ID are required'
        });
      }

      // Only validate MongoDB ObjectIds against User model
      if (mongoose.Types.ObjectId.isValid(actualJoinerId)) {
        const joiner = await User.findById(actualJoinerId);
        if (!joiner) {
          return res.status(404).json({
            success: false,
            message: 'Joiner user not found'
          });
        }
      }

      // Validate code
      const validation = await LoveRoom.validateCode(code);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message
        });
      }

      const loveRoom = validation.loveRoom;
      if (loveRoom.creator.userId.toString() === actualJoinerId.toString() || 
          loveRoom.creator.email === actualJoinerEmail) {
        return res.status(403).json({
          success: false,
          message: 'Cannot join your own room - Share code with your love'
        });
      }

      // Check if room is already connected
      if (loveRoom.status === 'connected' && loveRoom.joiner.userId) {
        return res.status(400).json({
          success: false,
          message: 'Room is already connected to another user'
        });
      }

      // Connect hearts
      await loveRoom.connectHearts(actualJoinerId, actualJoinerEmail);

      res.json({
        success: true,
        message: 'Hearts connected successfully',
        data: {
          roomId: loveRoom.roomId,
          code: loveRoom.code,
          creator: {
            userId: loveRoom.creator.userId,
            email: loveRoom.creator.email
          },
          joiner: {
            userId: actualJoinerId,
            email: actualJoinerEmail
          },
          connectedAt: loveRoom.joiner.joinedAt,
          creatorId: loveRoom.creator.userId,
          joinerId: actualJoinerId
        }
      });

    } catch (error) {
      console.error('Error joining room:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // Get room status endpoint
  getRoomStatus: async (req, res) => {
    try {
      const { roomId } = req.params;
      const { userId } = req.query;

      if (!roomId) {
        return res.status(400).json({
          success: false,
          message: 'Room ID is required'
        });
      }

      const loveRoom = await LoveRoom.findOne({
        $or: [
          { roomId: roomId },
          { code: roomId.toUpperCase() }
        ]
      });

      if (!loveRoom) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      // Check if user has access to this room
      if (userId) {
        const hasAccess = loveRoom.creator.userId.toString() === userId.toString() ||
                         loveRoom.joiner?.userId?.toString() === userId.toString();
        
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to this room'
          });
        }
      }

      const timeRemaining = loveRoom.expiresAt.getTime() - Date.now();

      res.json({
        success: true,
        message: 'Room status retrieved successfully',
        data: {
          roomId: loveRoom.roomId,
          code: loveRoom.code,
          status: loveRoom.status,
          isActive: loveRoom.isActive,
          createdAt: loveRoom.createdAt,
          expiresAt: loveRoom.expiresAt,
          timeRemaining: Math.max(0, timeRemaining),
          creator: {
            userId: loveRoom.creator.userId,
            email: loveRoom.creator.email,
            name: loveRoom.creator.name
          },
          joiner: loveRoom.joiner ? {
            userId: loveRoom.joiner.userId,
            email: loveRoom.joiner.email,
            name: loveRoom.joiner.name,
            joinedAt: loveRoom.joiner.joinedAt
          } : null
        }
      });

    } catch (error) {
      console.error('Error getting room status:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // Health check endpoint for connection status
  healthCheck: async (req, res) => {
    try {
      res.json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        success: false,
        message: 'Server health check failed'
      });
    }
  },

  resetCode: async (req, res) => {
    try {
      const { code } = req.params;
      const { userId } = req.body; // Frontend sends userId in body

      if (!code || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Code and user ID are required'
        });
      }

      // Find the room
      const loveRoom = await LoveRoom.findOne({ 
        code: code.toUpperCase(),
        isActive: true 
      });

      if (!loveRoom) {
        return res.status(404).json({
          success: false,
          message: 'Room not found or already inactive'
        });
      }

      // Verify user is the creator
      if (loveRoom.creator.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Only room creator can reset the code'
        });
      }

      // Deactivate the room
      loveRoom.isActive = false;
      loveRoom.status = 'expired';
      await loveRoom.save();

      res.json({
        success: true,
        message: 'Love code reset successfully',
        data: {
          code: loveRoom.code,
          resetAt: new Date()
        }
      });

    } catch (error) {
      console.error('Error resetting code:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  validateCode: async (req, res) => {
    try {
      const { code } = req.params;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Code is required'
        });
      }

      const validation = await LoveRoom.validateCode(code);
      
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message
        });
      }

      const loveRoom = validation.loveRoom;
      const timeRemaining = loveRoom.expiresAt.getTime() - Date.now();

      res.json({
        success: true,
        message: 'Code is valid',
        data: {
          code: loveRoom.code,
          isActive: loveRoom.isActive,
          status: loveRoom.status,
          createdAt: loveRoom.createdAt,
          expiresAt: loveRoom.expiresAt,
          timeRemaining: Math.max(0, timeRemaining),
          creator: {
            email: loveRoom.creator.email,
            name: loveRoom.creator.name
          }
        }
      });

    } catch (error) {
      console.error('Error validating code:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
};

export default loveRoomController;