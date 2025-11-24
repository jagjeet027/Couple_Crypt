import LoveRoom from '../models/loveRoom.js';

export const getActiveSessions = async (req, res) => {
  try {
    const { userId } = req.params;

    const sessions = await LoveRoom.find({
      $or: [
        { 'creator.userId': userId },
        { 'joiner.userId': userId }
      ],
      status: 'connected',
      isSessionActive: true,
      $expr: {
        $lt: [
          { $subtract: [new Date(), '$lastActiveAt'] },
          86400000 // 24 hours in milliseconds
        ]
      }
    }).select('code status creator joiner lastActiveAt canResumeSession');

    res.json({
      success: true,
      data: {
        sessions,
        count: sessions.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const resumeSession = async (req, res) => {
  try {
    const { code } = req.params;
    const { userId } = req.body;

    const room = await LoveRoom.findOne({ code: code.toUpperCase() });

    if (!room || room.status !== 'connected') {
      return res.status(404).json({
        success: false,
        message: 'Session not found or expired'
      });
    }

    if (!room.canResumeSession) {
      return res.status(410).json({
        success: false,
        message: 'Session expired (older than 24 hours)'
      });
    }

    // Verify user is part of this room
    const isAuthorized = 
      room.creator.userId.toString() === userId.toString() ||
      room.joiner.userId?.toString() === userId.toString();

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to resume this session'
      });
    }

    await room.updateSessionActivity();

    res.json({
      success: true,
      message: 'Session resumed',
      data: {
        code: room.code,
        creator: room.creator,
        joiner: room.joiner,
        status: room.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};