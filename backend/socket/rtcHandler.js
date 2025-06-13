// socket/rtcHandler.js
import LoveRoom from '../models/loveRoom.js';
import Message from '../models/message.js';

class RTCSocketHandler {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // userId -> socketId
    this.userRooms = new Map(); // socketId -> roomId
    this.roomUsers = new Map(); // roomId -> Set of userIds
  }

  handleConnection(socket) {
    console.log(`User connected: ${socket.id}`);

    // Join room
    socket.on('join-room', async (data) => {
      try {
        const { roomId, userId, token } = data;
        
        // Verify room access (you can add JWT verification here)
        const loveRoom = await LoveRoom.findOne({ roomId });
        if (!loveRoom || loveRoom.status !== 'connected') {
          socket.emit('error', { message: 'Room not found or not connected' });
          return;
        }

        // Check if user is authorized for this room
        const isAuthorized = loveRoom.creator.userId.toString() === userId.toString() ||
                            (loveRoom.joiner.userId && 
                             loveRoom.joiner.userId.toString() === userId.toString());

        if (!isAuthorized) {
          socket.emit('error', { message: 'Unauthorized access to room' });
          return;
        }

        // Join socket room
        socket.join(roomId);
        
        // Track user connections
        this.connectedUsers.set(userId.toString(), socket.id);
        this.userRooms.set(socket.id, roomId);
        
        if (!this.roomUsers.has(roomId)) {
          this.roomUsers.set(roomId, new Set());
        }
        this.roomUsers.get(roomId).add(userId.toString());

        // Notify user joined
        socket.emit('joined-room', { 
          roomId, 
          userId,
          participants: Array.from(this.roomUsers.get(roomId))
        });

        // Notify other user in room
        socket.to(roomId).emit('user-joined', { 
          userId,
          participants: Array.from(this.roomUsers.get(roomId))
        });

        console.log(`User ${userId} joined room ${roomId}`);

      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle chat messages
    socket.on('send-message', async (data) => {
      try {
        const { roomId, senderId, message, messageType = 'text' } = data;
        
        // Verify room access
        const loveRoom = await LoveRoom.findOne({ roomId });
        if (!loveRoom || loveRoom.status !== 'connected') {
          socket.emit('error', { message: 'Room not found or not connected' });
          return;
        }

        // Save message to database
        const newMessage = new Message({
          roomId,
          senderId,
          message,
          messageType,
          timestamp: new Date()
        });

        await newMessage.save();

        // Get sender info
        let senderInfo = null;
        if (loveRoom.creator.userId.toString() === senderId.toString()) {
          senderInfo = {
            id: loveRoom.creator.userId,
            email: loveRoom.creator.email,
            role: 'creator'
          };
        } else {
          senderInfo = {
            id: loveRoom.joiner.userId,
            email: loveRoom.joiner.email,
            role: 'joiner'
          };
        }

        const messageData = {
          messageId: newMessage._id,
          roomId,
          sender: senderInfo,
          message,
          messageType,
          timestamp: newMessage.timestamp
        };

        // Broadcast message to room
        this.io.to(roomId).emit('new-message', messageData);

        console.log(`Message sent in room ${roomId} by ${senderId}`);

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing-start', (data) => {
      const { roomId, userId } = data;
      socket.to(roomId).emit('user-typing', { userId, typing: true });
    });

    socket.on('typing-stop', (data) => {
      const { roomId, userId } = data;
      socket.to(roomId).emit('user-typing', { userId, typing: false });
    });

    // Handle WebRTC signaling
    socket.on('webrtc-signal', (data) => {
      const { roomId, recipientId, signalType, signalData } = data;
      
      // Find recipient socket
      const recipientSocketId = this.connectedUsers.get(recipientId.toString());
      
      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit('webrtc-signal', {
          senderId: data.senderId,
          signalType,
          signalData
        });
      }
    });

    // Handle call requests
    socket.on('call-request', async (data) => {
      try {
        const { roomId, callerId, recipientId, callType } = data;
        
        // Verify room access
        const loveRoom = await LoveRoom.findOne({ roomId });
        if (!loveRoom || loveRoom.status !== 'connected') {
          socket.emit('error', { message: 'Room not found or not connected' });
          return;
        }

        const recipientSocketId = this.connectedUsers.get(recipientId.toString());
        
        if (recipientSocketId) {
          this.io.to(recipientSocketId).emit('incoming-call', {
            callerId,
            callType,
            roomId
          });

          // Also notify caller that request was sent
          socket.emit('call-request-sent', {
            recipientId,
            callType,
            roomId
          });
        } else {
          socket.emit('error', { message: 'Recipient is not online' });
        }

      } catch (error) {
        console.error('Error handling call request:', error);
        socket.emit('error', { message: 'Failed to initiate call' });
      }
    });

    // Handle call acceptance
    socket.on('call-accept', (data) => {
      const { callerId, roomId } = data;
      const callerSocketId = this.connectedUsers.get(callerId.toString());
      
      if (callerSocketId) {
        this.io.to(callerSocketId).emit('call-accepted', {
          roomId,
          acceptedBy: data.acceptedBy
        });
      }
    });

    // Handle call rejection
    socket.on('call-reject', (data) => {
      const { callerId, roomId, reason = 'declined' } = data;
      const callerSocketId = this.connectedUsers.get(callerId.toString());
      
      if (callerSocketId) {
        this.io.to(callerSocketId).emit('call-rejected', {
          roomId,
          reason,
          rejectedBy: data.rejectedBy
        });
      }
    });

    // Handle call end
    socket.on('call-end', (data) => {
      const { roomId, endedBy } = data;
      
      // Notify all users in room that call ended
      socket.to(roomId).emit('call-ended', {
        roomId,
        endedBy,
        endedAt: new Date()
      });
    });

    // Handle offer (WebRTC)
    socket.on('offer', (data) => {
      const { roomId, recipientId, offer } = data;
      const recipientSocketId = this.connectedUsers.get(recipientId.toString());
      
      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit('offer', {
          senderId: data.senderId,
          offer
        });
      }
    });

    // Handle answer (WebRTC)
    socket.on('answer', (data) => {
      const { recipientId, answer } = data;
      const recipientSocketId = this.connectedUsers.get(recipientId.toString());
      
      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit('answer', {
          senderId: data.senderId,
          answer
        });
      }
    });

    // Handle ICE candidates
    socket.on('ice-candidate', (data) => {
      const { recipientId, candidate } = data;
      const recipientSocketId = this.connectedUsers.get(recipientId.toString());
      
      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit('ice-candidate', {
          senderId: data.senderId,
          candidate
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      
      const roomId = this.userRooms.get(socket.id);
      
      if (roomId) {
        // Find userId by socketId
        let disconnectedUserId = null;
        for (const [userId, socketId] of this.connectedUsers.entries()) {
          if (socketId === socket.id) {
            disconnectedUserId = userId;
            break;
          }
        }

        if (disconnectedUserId) {
          // Remove user from tracking
          this.connectedUsers.delete(disconnectedUserId);
          this.userRooms.delete(socket.id);
          
          if (this.roomUsers.has(roomId)) {
            this.roomUsers.get(roomId).delete(disconnectedUserId);
          }

          // Notify other users in room
          socket.to(roomId).emit('user-left', {
            userId: disconnectedUserId,
            leftAt: new Date()
          });

          // If call was in progress, end it
          socket.to(roomId).emit('call-ended', {
            roomId,
            endedBy: disconnectedUserId,
            reason: 'user-disconnected',
            endedAt: new Date()
          });
        }
      }
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });
  }

  // Method to get online users in a room
  getOnlineUsers(roomId) {
    return this.roomUsers.get(roomId) || new Set();
  }

  // Method to check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId.toString());
  }

  // Method to send notification to specific user
  sendToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId.toString());
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  // Method to send notification to room
  sendToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }
}

export default RTCSocketHandler;