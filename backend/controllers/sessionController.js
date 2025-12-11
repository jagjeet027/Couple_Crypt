// ============ BACKEND: sessionController.js (Updated) ============
import LoveRoom from '../models/loveRoom.js';

export const getActiveSessions = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Find all connected rooms where user is either creator or joiner
    const sessions = await LoveRoom.find({
      $or: [
        { 'creator.userId': userId },
        { 'joiner.userId': userId }
      ],
      status: 'connected',
      isActive: true
    }).select('code creator joiner status createdAt lastActiveAt').sort({ createdAt: -1 });

    const activeSessions = sessions.filter(room => {
      if (room.isExpired()) {
        return false;
      }
      return room.status === 'connected' && room.creator.userId && room.joiner.userId;
    });

    const formattedSessions = activeSessions.map(session => ({
      code: session.code,
      creator: {
        userId: session.creator.userId,
        email: session.creator.email,
        name: session.creator.name
      },
      joiner: {
        userId: session.joiner.userId,
        email: session.joiner.email,
        name: session.joiner.name
      },
      status: session.status,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt || session.createdAt,
      isCreator: session.creator.userId.toString() === userId.toString()
    }));

    res.json({
      success: true,
      data: {
        sessions: formattedSessions,
        total: formattedSessions.length
      }
    });
  } catch (error) {
    console.error('Error getting active sessions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch active sessions'
    });
  }
};

export const resumeSession = async (req, res) => {
  try {
    const { code } = req.params;
    const { userId } = req.body;

    if (!code || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Code and user ID are required'
      });
    }

    const room = await LoveRoom.findOne({ code: code.toUpperCase() });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (room.isExpired()) {
      room.status = 'expired';
      room.isActive = false;
      await room.save();

      return res.status(410).json({
        success: false,
        message: 'Session has expired'
      });
    }

    if (room.status !== 'connected') {
      return res.status(400).json({
        success: false,
        message: 'Session is not active'
      });
    }

    // Verify user is part of this room
    const isAuthorized = 
      room.creator.userId.toString() === userId.toString() ||
      (room.joiner.userId && room.joiner.userId.toString() === userId.toString());

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this session'
      });
    }

    // Update last active time
    room.lastActiveAt = new Date();
    await room.save();

    res.json({
      success: true,
      message: 'Session resumed successfully',
      data: {
        code: room.code,
        creator: room.creator,
        joiner: room.joiner,
        status: room.status,
        createdAt: room.createdAt
      }
    });
  } catch (error) {
    console.error('Error resuming session:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to resume session'
    });
  }
};

export const deleteSession = async (req, res) => {
  try {
    const { code } = req.params;
    const { userId } = req.body;

    if (!code || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Code and user ID are required'
      });
    }

    const room = await LoveRoom.findOne({ code: code.toUpperCase() });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Verify user is the creator
    if (room.creator.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only room creator can delete the session'
      });
    }

    // Delete the room
    await LoveRoom.deleteOne({ _id: room._id });

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete session'
    });
  }
};