import LoveRoom from '../models/loveRoom.js';

const createRoom = async (req, res) => {
  try {
    const { creatorEmail, creatorName, userId } = req.body;

    if (!creatorEmail || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Email and user ID required'
      });
    }

    // Generate unique code
    const code = await LoveRoom.generateShortCode();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const newRoom = new LoveRoom({
      code: code.toUpperCase(), // ✅ Ensure uppercase
      creator: {
        userId: userId.toString(), // ✅ Convert to string
        email: creatorEmail.toLowerCase(),
        name: creatorName || creatorEmail.split('@')[0]
      },
      joiner: {
        userId: null,
        email: null,
        name: null,
        joinedAt: null
      },
      isActive: true,
      status: 'waiting',
      expiresAt
    });

    await newRoom.save();

    console.log('✅ Room created:', {
      code: newRoom.code,
      creatorId: newRoom.creator.userId,
      status: newRoom.status
    });

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: {
        code: newRoom.code,
        roomId: newRoom._id.toString(),
        expiresAt: newRoom.expiresAt,
        timeRemaining: expiresAt.getTime() - Date.now(),
        status: newRoom.status,
        creator: newRoom.creator
      }
    });
  } catch (error) {
    console.error('❌ Room creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create room'
    });
  }
};

const joinRoom = async (req, res) => {
  try {
    const { code, userEmail, userName, userId } = req.body;

    if (!code || !userEmail || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Code, email, and user ID required'
      });
    }

    // ✅ Normalize code
    const normalizedCode = code.trim().toUpperCase();
    console.log('Attempting to join room with code:', normalizedCode);

    // Find room by exact code match
    const loveRoom = await LoveRoom.findOne({ code: normalizedCode });

    if (!loveRoom) {
      return res.status(404).json({
        success: false,
        message: 'Room not found - Invalid code'
      });
    }

    // Check if room is expired
    if (loveRoom.isExpired()) {
      loveRoom.status = 'expired';
      loveRoom.isActive = false;
      await loveRoom.save();
      return res.status(410).json({
        success: false,
        message: 'Room has expired'
      });
    }

    // Check if room is still waiting (not already connected)
    if (loveRoom.status === 'connected') {
      return res.status(400).json({
        success: false,
        message: 'Room is already connected by 2 members'
      });
    }

    // Prevent creator from joining own room
    if (loveRoom.creator.userId.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Creator cannot join their own room'
      });
    }

    // Check if room already has a joiner
    if (loveRoom.joiner && loveRoom.joiner.userId) {
      return res.status(400).json({
        success: false,
        message: 'Room already has a joiner'
      });
    }

    // ✅ Update joiner info
    loveRoom.joiner = {
      userId: userId.toString(),
      email: userEmail.toLowerCase(),
      name: userName || userEmail.split('@')[0],
      joinedAt: new Date()
    };
    loveRoom.status = 'connected';
    loveRoom.isActive = false; // Room is now full
    await loveRoom.save();

    console.log('✅ User joined room:', {
      code: loveRoom.code,
      joinerId: loveRoom.joiner.userId
    });

    res.status(200).json({
      success: true,
      message: 'Joined room successfully',
      data: {
        roomId: loveRoom._id.toString(),
        code: loveRoom.code,
        status: loveRoom.status,
        creator: {
          userId: loveRoom.creator.userId.toString(),
          email: loveRoom.creator.email,
          name: loveRoom.creator.name
        },
        joiner: {
          userId: loveRoom.joiner.userId.toString(),
          email: loveRoom.joiner.email,
          name: loveRoom.joiner.name,
          joinedAt: loveRoom.joiner.joinedAt
        }
      }
    });
  } catch (error) {
    console.error('❌ Join room error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to join room'
    });
  }
};

const getRoomStatus = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.query;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        error: 'Room code required'
      });
    }

    // ✅ Handle both code and ID queries
    const normalizedCode = roomId.trim().toUpperCase();
    
    let room = null;
    
    // Try by code first
    room = await LoveRoom.findOne({ code: normalizedCode });
    
    // Try by ID if not found
    if (!room) {
      room = await LoveRoom.findById(normalizedCode);
    }

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Check if expired
    if (room.isExpired()) {
      room.status = 'expired';
      room.isActive = false;
      await room.save();
      return res.status(410).json({
        success: false,
        error: 'Room has expired'
      });
    }

    // Verify authorization if userId provided
    if (userId) {
      const isCreator = room.creator.userId.toString() === userId.toString();
      const isJoiner = room.joiner?.userId?.toString() === userId.toString();

      if (!isCreator && !isJoiner) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this room'
        });
      }
    }

    const timeRemaining = room.getTimeRemaining();

    res.json({
      success: true,
      data: {
        code: room.code,
        roomId: room._id.toString(),
        status: room.status,
        creator: {
          userId: room.creator.userId.toString(),
          email: room.creator.email,
          name: room.creator.name
        },
        joiner: room.joiner?.userId ? {
          userId: room.joiner.userId.toString(),
          email: room.joiner.email,
          name: room.joiner.name,
          joinedAt: room.joiner.joinedAt
        } : null,
        timeRemaining,
        expiresAt: room.expiresAt,
        isConnected: room.status === 'connected',
        createdAt: room.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Get room status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get room status'
    });
  }
};

const getUserRooms = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID required'
      });
    }

    // ✅ Find rooms where user is creator or joiner
    const rooms = await LoveRoom.find({
      $or: [
        { 'creator.userId': userId.toString() },
        { 'joiner.userId': userId.toString() }
      ]
    }).sort({ createdAt: -1 });

    const activeRooms = rooms.filter(room => {
      if (room.isExpired()) {
        return false;
      }
      return room.status === 'connected' && room.joiner?.userId;
    });

    const formattedRooms = activeRooms.map(room => ({
      code: room.code,
      roomId: room._id.toString(),
      status: room.status,
      creator: {
        userId: room.creator.userId.toString(),
        email: room.creator.email,
        name: room.creator.name
      },
      joiner: room.joiner?.userId ? {
        userId: room.joiner.userId.toString(),
        email: room.joiner.email,
        name: room.joiner.name
      } : null,
      createdAt: room.createdAt,
      lastActiveAt: room.lastActiveAt || room.createdAt,
      isCreator: room.creator.userId.toString() === userId.toString()
    }));

    res.json({
      success: true,
      data: {
        rooms: formattedRooms,
        total: formattedRooms.length
      }
    });
  } catch (error) {
    console.error('❌ Get user rooms error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user rooms'
    });
  }
};

const validateCode = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code required'
      });
    }

    const normalizedCode = code.trim().toUpperCase();
    const validation = await LoveRoom.validateCode(normalizedCode);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    res.json({
      success: true,
      message: 'Code is valid',
      data: {
        code: validation.loveRoom.code,
        status: validation.loveRoom.status,
        creatorName: validation.loveRoom.creator.name
      }
    });
  } catch (error) {
    console.error('❌ Validate code error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Validation failed'
    });
  }
};

const resetCode = async (req, res) => {
  try {
    const { code } = req.params;
    const { userId } = req.body;

    if (!code || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Code and user ID required'
      });
    }

    const normalizedCode = code.trim().toUpperCase();
    const room = await LoveRoom.findOne({ code: normalizedCode });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (room.creator.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only creator can delete room'
      });
    }

    await LoveRoom.deleteOne({ _id: room._id });

    console.log('✅ Room deleted:', room.code);

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete room error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete room'
    });
  }
};

const healthCheck = (req, res) => {
  res.json({
    success: true,
    message: 'Love Room service is healthy'
  });
};

export default {
  createRoom,
  joinRoom,
  getRoomStatus,
  getUserRooms,
  validateCode,
  resetCode,
  healthCheck
};