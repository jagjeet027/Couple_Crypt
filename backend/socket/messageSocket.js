// socket/messageSocket.js
import Message from '../models/message.js';
import { authenticateSocket } from '../middleware/auth.js';

export const initializeSocket = (io) => {
  // Socket authentication middleware
  io.use(authenticateSocket);

  // Helper function to broadcast cleanup notification
  const broadcastAutoCleanup = (roomId) => {
    io.to(roomId).emit('messages-auto-cleaned', {
      roomId: roomId,
      message: 'Old messages were automatically removed to maintain chat performance'
    });
  };

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id, 'User ID:', socket.user?.id);

    // Join room
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    // Leave room
    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
      console.log(`User ${socket.id} left room ${roomId}`);
    });

    // Send message
    socket.on('send-message', async (data) => {
      try {
        const { roomId, message, messageType = 'text' } = data;
        const senderId = socket.user.id;

        const newMessage = new Message({
          roomId,
          senderId,
          message,
          messageType,
          timestamp: new Date()
        });

        await newMessage.save();

        // Emit to all users in the room
        io.to(roomId).emit('new-message', newMessage);

        // Send confirmation to sender
        socket.emit('message-sent', {
          success: true,
          messageId: newMessage._id
        });

        // Check if auto-deletion occurred and notify clients
        const currentMessageCount = await Message.countDocuments({ 
          roomId: roomId, 
          deleted: false 
        });
        
        if (currentMessageCount === 30) {
          // Auto-deletion occurred, refresh messages for all clients
          broadcastAutoCleanup(roomId);
        }

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message-error', {
          success: false,
          error: error.message
        });
      }
    });

    // Mark message as read
    socket.on('mark-read', async (data) => {
      try {
        const { messageId } = data;
        const userId = socket.user.id;
        
        const message = await Message.findById(messageId);
        if (message) {
          await message.markAsRead(userId);
          
          // Notify room about read status
          io.to(message.roomId).emit('message-read', {
            messageId,
            userId,
            readAt: new Date()
          });
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Mark image as viewed (auto-delete)
    socket.on('view-image', async (data) => {
      try {
        const { messageId } = data;
        const userId = socket.user.id;
        
        const message = await Message.findById(messageId);
        if (message && message.messageType === 'image') {
          await message.markAsViewed(userId);
          
          // Notify room if image was deleted
          if (message.deleted) {
            io.to(message.roomId).emit('image-deleted', {
              messageId,
              deletedAt: message.deletedAt
            });
          }
        }
      } catch (error) {
        console.error('Error viewing image:', error);
      }
    });

    // Delete message
    socket.on('delete-message', async (data) => {
      try {
        const { messageId } = data;
        const userId = socket.user.id;
        
        const message = await Message.findById(messageId);
        if (message && message.senderId.toString() === userId.toString()) {
          await message.deleteMessage();
          
          // Notify room about deletion
          io.to(message.roomId).emit('message-deleted', {
            messageId,
            deletedAt: message.deletedAt
          });
        }
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    });

    // Edit message
    socket.on('edit-message', async (data) => {
      try {
        const { messageId, newMessage } = data;
        const userId = socket.user.id;
        
        const message = await Message.findById(messageId);
        if (message && message.senderId.toString() === userId.toString() && message.messageType === 'text') {
          await message.editMessage(newMessage);
          
          // Notify room about edit
          io.to(message.roomId).emit('message-edited', {
            messageId,
            newMessage,
            editedAt: message.editedAt
          });
        }
      } catch (error) {
        console.error('Error editing message:', error);
      }
    });

    // User typing indicator
    socket.on('typing', (data) => {
      const { roomId, isTyping } = data;
      const userId = socket.user.id;
      
      socket.to(roomId).emit('user-typing', {
        userId,
        isTyping
      });
    });

    socket.on('start-call', async (data) => {
  try {
    const { roomId, callType, offer } = data;
    const callerId = socket.user.id;
    
    // Log call initiation
    const callMessage = new Message({
      roomId,
      senderId: callerId,
      message: `${callType === 'video' ? 'Video' : 'Voice'} call started`,
      messageType: 'call',
      callData: {
        callType,
        status: 'initiated',
        duration: 0
      },
      timestamp: new Date()
    });
    
    await callMessage.save();
    
    // Broadcast to other users in room
    socket.to(roomId).emit('incoming-call', {
      callerId,
      callerName: socket.user.name,
      callType,
      offer,
      callMessageId: callMessage._id
    });
    
    // Broadcast call message to room
    io.to(roomId).emit('new-message', callMessage);
    
  } catch (error) {
    console.error('Error starting call:', error);
  }
});

socket.on('accept-call', async (data) => {
  const { roomId, answer, callMessageId } = data;
  
  try {
    // Update call message status
    if (callMessageId) {
      await Message.findByIdAndUpdate(callMessageId, {
        'callData.status': 'accepted',
        message: `${callData?.callType === 'video' ? 'Video' : 'Voice'} call accepted`
      });
    }
    
    socket.to(roomId).emit('call-accepted', { answer });
  } catch (error) {
    console.error('Error accepting call:', error);
  }
});

socket.on('reject-call', async (data) => {
  const { roomId, callMessageId } = data;
  
  try {
    // Update call message status
    if (callMessageId) {
      await Message.findByIdAndUpdate(callMessageId, {
        'callData.status': 'rejected',
        'callData.endReason': 'rejected',
        message: 'Call declined'
      });
    }
    
    socket.to(roomId).emit('call-rejected');
  } catch (error) {
    console.error('Error rejecting call:', error);
  }
});

socket.on('end-call', async (data) => {
  const { roomId, duration, callMessageId } = data;
  
  try {
    // Update call message with duration
    if (callMessageId) {
      const durationText = duration ? ` - Duration: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}` : '';
      await Message.findByIdAndUpdate(callMessageId, {
        'callData.status': 'ended',
        'callData.duration': duration || 0,
        'callData.endReason': 'ended_by_caller',
        message: `Call ended${durationText}`
      });
    }
    
    socket.to(roomId).emit('call-ended');
  } catch (error) {
    console.error('Error ending call:', error);
  }
});

socket.on('ice-candidate', (data) => {
  const { roomId, candidate } = data;
  socket.to(roomId).emit('ice-candidate', { candidate });
});


    // Disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id, 'User ID:', socket.user?.id);
    });
  });

  return io;
};