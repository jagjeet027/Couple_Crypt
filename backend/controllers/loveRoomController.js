import LoveRoom from '../models/loveRoom.js';
import User from '../models/users.js';
import mongoose from 'mongoose';

// Code expiration time (10 minutes)
const CODE_EXPIRY_TIME = 10 * 60 * 1000;

const loveRoomController = {
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

      // Check if user already has an active code
      const existingCode = await LoveRoom.findActiveCodeByUser(actualCreatorId);
      if (existingCode) {
        return res.status(200).json({
          success: true,
          message: 'Active code already exists',
          data: {
            code: existingCode.code,
            expiresAt: existingCode.expiresAt,
            createdAt: existingCode.createdAt,
            timeRemaining: Math.max(0, existingCode.expiresAt.getTime() - Date.now())
          }
        });
      }

      // Generate unique code
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

  joinRoom: async (req, res) => {
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

  getRoomStatus: async () => {
  try {
    const response = await apiCall(`/love-room/status/${roomId}?userId=${userId}`);
    if (!response.ok) {
      console.error('Room status check failed:', response.status);
      // Handle different error codes
      if (response.status === 404) {
        // Room doesn't exist - maybe recreate or redirect
      }
    }
  } catch (error) {
    console.error('API call failed:', error);
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
            email: loveRoom.creator.email
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