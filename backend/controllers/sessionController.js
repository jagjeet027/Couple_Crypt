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

    // ✅ Find all CONNECTED rooms where user is creator or joiner
    const sessions = await LoveRoom.find({
      $or: [
        { 'creator.userId': userId.toString() },
        { 'joiner.userId': userId.toString() }
      ],
      status: 'connected',
      isActive: false // Connected rooms have isActive = false
    }).select('code creator joiner status createdAt lastActiveAt').sort({ lastActiveAt: -1 });

    // ✅ Filter out expired and ensure joiner exists
    const activeSessions = sessions.filter(room => {
      if (room.isExpired()) {
        return false;
      }
      // Only include if both creator and joiner exist
      return room.status === 'connected' && 
             room.creator.userId && 
             room.joiner.userId;
    });

    // ✅ Format sessions properly
    const formattedSessions = activeSessions.map(session => ({
      code: session.code,
      roomId: session._id.toString(),
      creator: {
        userId: session.creator.userId.toString(),
        email: session.creator.email,
        name: session.creator.name
      },
      joiner: {
        userId: session.joiner.userId.toString(),
        email: session.joiner.email,
        name: session.joiner.name
      },
      status: session.status,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt || session.createdAt,
      isCreator: session.creator.userId.toString() === userId.toString()
    }));

    console.log('✅ Active sessions found:', formattedSessions.length);

    res.json({
      success: true,
      data: {
        sessions: formattedSessions,
        total: formattedSessions.length
      }
    });
  } catch (error) {
    console.error('❌ Error getting active sessions:', error);
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

    const normalizedCode = code.trim().toUpperCase();
    const room = await LoveRoom.findOne({ code: normalizedCode });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // ✅ Check if expired
    if (room.isExpired()) {
      room.status = 'expired';
      room.isActive = false;
      await room.save();
      return res.status(410).json({
        success: false,
        message: 'Session has expired'
      });
    }

    // ✅ Check if still connected
    if (room.status !== 'connected') {
      return res.status(400).json({
        success: false,
        message: 'Session is not active'
      });
    }

    // ✅ Verify user is part of this room
    const isAuthorized = 
      room.creator.userId.toString() === userId.toString() ||
      (room.joiner?.userId && room.joiner.userId.toString() === userId.toString());

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this session'
      });
    }

    // ✅ Update last active time
    room.lastActiveAt = new Date();
    await room.save();

    console.log('✅ Session resumed:', code);

    res.json({
      success: true,
      message: 'Session resumed successfully',
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
          name: room.joiner.name
        } : null,
        createdAt: room.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Error resuming session:', error);
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

    const normalizedCode = code.trim().toUpperCase();
    const room = await LoveRoom.findOne({ code: normalizedCode });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // ✅ Only creator can delete
    if (room.creator.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only room creator can delete the session'
      });
    }

    // ✅ Delete the room
    await LoveRoom.deleteOne({ _id: room._id });

    console.log('✅ Session deleted:', code);

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting session:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete session'
    });
  }
};