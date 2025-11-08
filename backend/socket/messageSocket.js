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

    socket.on('start-call', async (data) => {
      try {
        const { roomCode, callType, offer } = data;
        const callerId = socket.user.id;

        const callMessage = new Message({
          roomId: roomCode,
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

        socket.to(roomCode).emit('incoming-call', {
          callerId,
          callerName: socket.user.email,
          callType,
          offer,
          callMessageId: callMessage._id
        });

        io.to(roomCode).emit('new-message', callMessage);

      } catch (error) {
        socket.emit('message-error', {
          success: false,
          error: error.message
        });
      }
    });

    socket.on('accept-call', async (data) => {
      try {
        const { roomCode, answer, callMessageId } = data;

        if (callMessageId) {
          await Message.findByIdAndUpdate(callMessageId, {
            'callData.status': 'accepted',
            message: 'Call accepted'
          });
        }

        socket.to(roomCode).emit('call-accepted', { answer });
      } catch (error) {
        socket.emit('message-error', {
          success: false,
          error: error.message
        });
      }
    });

    socket.on('reject-call', async (data) => {
      try {
        const { roomCode, callMessageId } = data;

        if (callMessageId) {
          await Message.findByIdAndUpdate(callMessageId, {
            'callData.status': 'rejected',
            'callData.endReason': 'rejected',
            message: 'Call declined'
          });
        }

        socket.to(roomCode).emit('call-rejected');
      } catch (error) {
        socket.emit('message-error', {
          success: false,
          error: error.message
        });
      }
    });

    socket.on('end-call', async (data) => {
      try {
        const { roomCode, duration, callMessageId } = data;

        if (callMessageId) {
          const durationText = duration ? ` - Duration: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}` : '';
          await Message.findByIdAndUpdate(callMessageId, {
            'callData.status': 'ended',
            'callData.duration': duration || 0,
            'callData.endReason': 'ended_by_caller',
            message: `Call ended${durationText}`
          });
        }

        socket.to(roomCode).emit('call-ended');
      } catch (error) {
        socket.emit('message-error', {
          success: false,
          error: error.message
        });
      }
    });

    socket.on('ice-candidate', (data) => {
      const { roomCode, candidate } = data;
      socket.to(roomCode).emit('ice-candidate', { candidate });
    });

    socket.on('webrtc-signal', (data) => {
      const { roomCode, signalType, signalData } = data;
      socket.to(roomCode).emit('webrtc-signal', {
        senderId: socket.user.id,
        signalType,
        signalData
      });
    });

    socket.on('disconnect', () => {
    });
  });

  return io;
};