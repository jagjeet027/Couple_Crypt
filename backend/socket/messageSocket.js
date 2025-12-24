import Message from '../models/message.js';
import { authenticateSocket } from '../middleware/auth.js';

export const initializeSocket = (io) => {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    socket.on('join-room', (roomCode) => {
      socket.join(roomCode);
    });

    socket.on('leave-room', (roomCode) => {
      socket.leave(roomCode);
    });

    socket.on('send-message', async (data) => {
      try {
        const { roomCode, message, messageType = 'text' } = data;
        const senderId = socket.user.id;

        const newMessage = new Message({
          roomId: roomCode,
          senderId,
          message,
          messageType,
          timestamp: new Date()
        });

        await newMessage.save();
        io.to(roomCode).emit('new-message', newMessage);

        socket.emit('message-sent', {
          success: true,
          messageId: newMessage._id
        });
      } catch (error) {
        socket.emit('message-error', {
          success: false,
          error: error.message
        });
      }
    });

    socket.on('typing', (data) => {
      const { roomCode, isTyping } = data;
      socket.to(roomCode).emit('user-typing', {
        userId: socket.user.id,
        isTyping
      });
    });

    socket.on('delete-message', async (data) => {
      try {
        const { messageId } = data;
        const userId = socket.user.id;

        const message = await Message.findById(messageId);
        if (message && message.senderId.toString() === userId.toString()) {
          await message.deleteMessage();

          io.to(message.roomId).emit('message-deleted', {
            messageId,
            deletedAt: message.deletedAt
          });
        }
      } catch (error) {
        socket.emit('message-error', {
          success: false,
          error: error.message
        });
      }
    });

    socket.on('edit-message', async (data) => {
      try {
        const { messageId, newMessage: newText } = data;
        const userId = socket.user.id;

        const message = await Message.findById(messageId);
        if (message && message.senderId.toString() === userId.toString() && message.messageType === 'text') {
          await message.editMessage(newText);

          io.to(message.roomId).emit('message-edited', {
            messageId,
            newMessage: newText,
            editedAt: message.editedAt
          });
        }
      } catch (error) {
        socket.emit('message-error', {
          success: false,
          error: error.message
        });
      }
    });

    socket.on('offer', async (data) => {
      try {
        const { roomCode, offer, callType } = data;
        
        socket.to(roomCode).emit('receive-offer', {
          senderId: socket.user.id,
          offer,
          callType
        });
        
        const callMessage = new Message({
          roomId: roomCode,
          senderId: socket.user.id,
          message: `${callType} call initiated`,
          messageType: 'call',
          callData: {
            callType,
            status: 'initiated'
          }
        });
        await callMessage.save();
        
      } catch (error) {
        socket.emit('call-error', { error: error.message });
      }
    });

    socket.on('answer', async (data) => {
      try {
        const { roomCode, answer } = data;
        
        socket.to(roomCode).emit('receive-answer', {
          senderId: socket.user.id,
          answer
        });
        
      } catch (error) {
        socket.emit('call-error', { error: error.message });
      }
    });

    socket.on('ice-candidate', (data) => {
      try {
        const { roomCode, candidate } = data;
        
        socket.to(roomCode).emit('receive-ice-candidate', {
          senderId: socket.user.id,
          candidate
        });
        
      } catch (error) {
        socket.emit('call-error', { error: error.message });
      }
    });

    socket.on('reject-call', async (data) => {
      try {
        const { roomCode } = data;
        socket.to(roomCode).emit('call-rejected');
      } catch (error) {
        socket.emit('call-error', { error: error.message });
      }
    });

    socket.on('call-end', async (data) => {
      try {
        const { roomCode, duration } = data;
        
        socket.to(roomCode).emit('call-ended', {
          endedBy: socket.user.id,
          duration
        });
        
        await Message.updateOne(
          { 
            roomId: roomCode, 
            'callData.status': { $in: ['initiated', 'accepted'] }
          },
          { 
            $set: { 
              'callData.status': 'ended',
              'callData.duration': duration,
              message: `Call ended (${Math.floor(duration/60)}:${(duration%60).toString().padStart(2,'0')})`
            }
          }
        );
        
      } catch (error) {
        socket.emit('call-error', { error: error.message });
      }
    });

    socket.on('disconnect', () => {
    });
  });

  return io;
};