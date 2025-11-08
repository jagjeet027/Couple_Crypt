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

    const code = await LoveRoom.generateShortCode();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const newRoom = new LoveRoom({
      code,
      creator: {
        userId,
        email: creatorEmail,
        name: creatorName || creatorEmail.split('@')[0]
      },
      isActive: true,
      expiresAt
    });

    await newRoom.save();

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: {
        code,
        roomId: newRoom._id,
        expiresAt,
        timeRemaining: expiresAt.getTime() - Date.now()
      }
    });
  } catch (error) {
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

    const validation = await LoveRoom.validateCode(code);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    const loveRoom = validation.loveRoom;

    if (loveRoom.creator.userId.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Creator cannot join their own room'
      });
    }

    if (loveRoom.joiner.userId) {
      return res.status(400).json({
        success: false,
        message: 'Room already has two members'
      });
    }

    await loveRoom.connectHearts(userId, userEmail, userName);

    res.status(200).json({
      success: true,
      message: 'Joined room successfully',
      data: {
        roomId: loveRoom._id,
        code: loveRoom.code,
        creator: loveRoom.creator,
        joiner: loveRoom.joiner,
        status: loveRoom.status
      }
    });
  } catch (error) {
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

    const room = await LoveRoom.findOne({ code: roomId.toUpperCase() });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    if (room.isExpired()) {
      room.status = 'expired';
      room.isActive = false;
      await room.save();

      return res.status(410).json({
        success: false,
        error: 'Room has expired'
      });
    }

    const isCreator = room.creator.userId.toString() === userId;
    const isJoiner = room.joiner.userId && room.joiner.userId.toString() === userId;

    if (!isCreator && !isJoiner) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this room'
      });
    }

    const timeRemaining = room.getTimeRemaining();

    res.json({
      success: true,
      data: {
        code: room.code,
        status: room.status,
        creator: room.creator,
        joiner: room.joiner,
        timeRemaining,
        expiresAt: room.expiresAt,
        isConnected: room.status === 'connected'
      }
    });
  } catch (error) {
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

    const rooms = await LoveRoom.find({
      $or: [
        { 'creator.userId': userId },
        { 'joiner.userId': userId }
      ]
    }).sort({ createdAt: -1 });

    const activeRooms = rooms.filter(room => {
      if (room.isExpired()) {
        return false;
      }
      return room.isActive;
    });

    res.json({
      success: true,
      data: {
        rooms: activeRooms,
        total: activeRooms.length
      }
    });
  } catch (error) {
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

    const validation = await LoveRoom.validateCode(code);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    res.json({
      success: true,
      message: 'Code is valid'
    });
  } catch (error) {
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

    const room = await LoveRoom.findOne({ code: code.toUpperCase() });

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

    await room.cancelRoom();

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
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