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
      // Remove session usage since it's causing transaction errors with standalone MongoDB
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

        // For session-based IDs, we don't validate against User model
        // Only validate if it looks like a MongoDB ObjectId
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

    // Validate if code exists and is active
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
    },

    // NEW: Get room status endpoint for polling
    getRoomStatus: async (req, res) => {
      try {
        const { code } = req.params;

        if (!code) {
          return res.status(400).json({
            success: false,
            message: 'Code is required'
          });
        }

        const loveRoom = await LoveRoom.findOne({ code: code.toUpperCase() });
        
        if (!loveRoom) {
          return res.status(404).json({
            success: false,
            message: 'Room not found'
          });
        }

        // Check if room is expired
        if (loveRoom.expiresAt && new Date() > loveRoom.expiresAt) {
          return res.status(400).json({
            success: false,
            message: 'Room has expired'
          });
        }

        const timeRemaining = loveRoom.expiresAt ? loveRoom.expiresAt.getTime() - Date.now() : 0;
        const userCount = loveRoom.joiner?.userId ? 2 : 1;

        const responseData = {
          code: loveRoom.code,
          status: loveRoom.status,
          isActive: loveRoom.isActive,
          roomActive: loveRoom.roomActive,
          userCount: userCount,
          timeRemaining: Math.max(0, timeRemaining),
          creator: {
            userId: loveRoom.creator.userId,
            email: loveRoom.creator.email
          }
        };

        // Include joiner info if available
        if (loveRoom.joiner?.userId) {
          responseData.joiner = {
            userId: loveRoom.joiner.userId,
            email: loveRoom.joiner.email,
            joinedAt: loveRoom.joiner.joinedAt
          };
          responseData.partner = {
            name: 'Your Love',
            id: loveRoom.joiner.userId
          };
        }

        res.json({
          success: true,
          message: 'Room status retrieved',
          data: responseData
        });

      } catch (error) {
        console.error('Error getting room status:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    },

    // Get user's active codes
    getUserActiveCodes: async (req, res) => {
      try {
        const { userId } = req.params;

        if (!userId) {
          return res.status(400).json({
            success: false,
            message: 'User ID is required'
          });
        }

        // Use direct string/mixed comparison instead of ObjectId casting
        const activeCodes = await LoveRoom.find({
          'creator.userId': userId,
          isActive: true,
          status: 'waiting'
        }).sort({ createdAt: -1 });

        res.json({
          success: true,
          message: 'User active codes retrieved',
          data: {
            totalCodes: activeCodes.length,
            codes: activeCodes.map(room => ({
              code: room.code,
              createdAt: room.createdAt,
              expiresAt: room.expiresAt,
              timeRemaining: Math.max(0, room.expiresAt.getTime() - Date.now()),
              status: room.status
            }))
          }
        });

      } catch (error) {
        console.error('Error getting user active codes:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    },

    // Get all active codes (for admin/debugging)
    getActiveCodes: async (req, res) => {
      try {
        // Don't populate since userId can be string or ObjectId
        const activeCodes = await LoveRoom.find({
          isActive: true
        }).sort({ createdAt: -1 });

        const formattedCodes = activeCodes.map(room => ({
          code: room.code,
          creator: {
            userId: room.creator.userId,
            email: room.creator.email
          },
          joiner: room.joiner.userId ? {
            userId: room.joiner.userId,
            email: room.joiner.email,
            joinedAt: room.joiner.joinedAt
          } : null,
          status: room.status,
          isActive: room.isActive,
          roomActive: room.roomActive,
          createdAt: room.createdAt,
          expiresAt: room.expiresAt,
          timeRemaining: Math.max(0, room.expiresAt.getTime() - Date.now())
        }));

        res.json({
          success: true,
          message: 'Active codes retrieved',
          data: {
            totalCodes: formattedCodes.length,
            codes: formattedCodes
          }
        });

      } catch (error) {
        console.error('Error getting active codes:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    },

    // Reset/cancel a specific code
    resetCode: async (req, res) => {
      try {
        const { code } = req.params;
        const { creatorId, userId } = req.body;
        
        // Use userId if provided, otherwise use creatorId for backward compatibility
        const actualCreatorId = userId || creatorId;

        if (!code || !actualCreatorId) {
          return res.status(400).json({
            success: false,
            message: 'Code and creator ID are required'
          });
        }

        const loveRoom = await LoveRoom.findOne({ code });
        if (!loveRoom) {
          return res.status(404).json({
            success: false,
            message: 'Code not found'
          });
        }

        // Verify creator - convert both to string for comparison
        if (loveRoom.creator.userId.toString() !== actualCreatorId.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Unauthorized - Only creator can reset code'
          });
        }

        await loveRoom.cancelRoom();

        res.json({
          success: true,
          message: 'Code cancelled successfully'
        });

      } catch (error) {
        console.error('Error resetting code:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    },

    // Get room info
    getRoomInfo: async (req, res) => {
      try {
        const { roomId } = req.params;

        // Don't populate since userId can be string or ObjectId
        const loveRoom = await LoveRoom.findOne({ roomId });

        if (!loveRoom) {
          return res.status(404).json({
            success: false,
            message: 'Room not found'
          });
        }

        const roomData = {
          roomId: loveRoom.roomId,
          code: loveRoom.code,
          status: loveRoom.status,
          creator: {
            id: loveRoom.creator.userId,
            email: loveRoom.creator.email
          },
          joiner: loveRoom.joiner.userId ? {
            id: loveRoom.joiner.userId,
            email: loveRoom.joiner.email,
            joinedAt: loveRoom.joiner.joinedAt
          } : null,
          createdAt: loveRoom.createdAt,
          active: loveRoom.roomActive
        };

        res.json({
          success: true,
          message: 'Room info retrieved',
          data: roomData
        });

      } catch (error) {
        console.error('Error getting room info:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    },

    // New method to check room status for chat navigation
    checkRoomStatus: async (req, res) => {
      try {
        const { roomId, userId } = req.params;

        const loveRoom = await LoveRoom.findOne({ roomId });

        if (!loveRoom) {
          return res.status(404).json({
            success: false,
            message: 'Room not found'
          });
        }

        // Check if user is part of this room - convert to string for comparison
        const isCreator = loveRoom.creator.userId.toString() === userId.toString();
        const isJoiner = loveRoom.joiner.userId && loveRoom.joiner.userId.toString() === userId.toString();

        if (!isCreator && !isJoiner) {
          return res.status(403).json({
            success: false,
            message: 'Unauthorized access to room'
          });
        }

        res.json({
          success: true,
          message: 'Room status retrieved',
          data: {
            roomId: loveRoom.roomId,
            status: loveRoom.status,
            isActive: loveRoom.isActive,
            roomActive: loveRoom.roomActive,
            userRole: isCreator ? 'creator' : 'joiner',
            canChat: loveRoom.status === 'connected' && loveRoom.roomActive
          }
        });

      } catch (error) {
        console.error('Error checking room status:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  };

  export default loveRoomController;