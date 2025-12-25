// // controllers/rtcController.js
// import jwt from 'jsonwebtoken';
// import LoveRoom from '../models/loveRoom.js';
// import Message from '../models/message.js';

// const rtcController = {
//   // Initialize RTC session
//   initializeRTC: async (req, res) => {
//     try {
//       const { roomId, userId } = req.body;
      
//       if (!roomId || !userId) {
//         return res.status(400).json({
//           success: false,
//           message: 'roomId and userId are required'
//         });
//       }

//       // Verify room exists in database
//       const loveRoom = await LoveRoom.findOne({ roomId });
//       if (!loveRoom) {
//         return res.status(404).json({
//           success: false,
//           message: 'Room not found'
//         });
//       }

//       // Check if room is active
//       if (loveRoom.status !== 'connected') {
//         return res.status(400).json({
//           success: false,
//           message: 'Room is not connected'
//         });
//       }

//       // Verify user is authorized for this room
//       const isAuthorized = loveRoom.creator.userId.toString() === userId.toString() ||
//                           (loveRoom.joiner.userId && 
//                            loveRoom.joiner.userId.toString() === userId.toString());

//       if (!isAuthorized) {
//         return res.status(403).json({
//           success: false,
//           message: 'Unauthorized access to room'
//         });
//       }

//       // Get RTC handler from app
//       const rtcHandler = req.app.get('rtcHandler');
//       const onlineUsers = rtcHandler.getOnlineUsers(roomId);

//       console.log(`User ${userId} initialized RTC for room ${roomId}`);

//       res.json({
//         success: true,
//         message: 'RTC session initialized successfully',
//         data: {
//           roomId,
//           userId,
//           onlineParticipants: Array.from(onlineUsers),
//           participantCount: onlineUsers.size,
//           sessionId: `${roomId}_${userId}_${Date.now()}`,
//           roomData: {
//             creator: loveRoom.creator,
//             joiner: loveRoom.joiner,
//             status: loveRoom.status
//           }
//         }
//       });

//     } catch (error) {
//       console.error('Error initializing RTC:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to initialize RTC session',
//         error: error.message
//       });
//     }
//   },

//   // Send message via HTTP API (mainly for fallback)
//   sendMessage: async (req, res) => {
//     try {
//       const { roomId, senderId, message, messageType = 'text' } = req.body;

//       if (!roomId || !senderId || !message) {
//         return res.status(400).json({
//           success: false,
//           message: 'roomId, senderId, and message are required'
//         });
//       }

//       // Verify room exists and user is authorized
//       const loveRoom = await LoveRoom.findOne({ roomId });
//       if (!loveRoom || loveRoom.status !== 'connected') {
//         return res.status(404).json({
//           success: false,
//           message: 'Room not found or not connected'
//         });
//       }

//       // Check authorization
//       const isAuthorized = loveRoom.creator.userId.toString() === senderId.toString() ||
//                           (loveRoom.joiner.userId && 
//                            loveRoom.joiner.userId.toString() === senderId.toString());

//       if (!isAuthorized) {
//         return res.status(403).json({
//           success: false,
//           message: 'Unauthorized to send message in this room'
//         });
//       }

//       // Save message to database
//       const newMessage = new Message({
//         roomId,
//         senderId,
//         message,
//         messageType,
//         timestamp: new Date()
//       });

//       await newMessage.save();

//       // Get sender info
//       let senderInfo = null;
//       if (loveRoom.creator.userId.toString() === senderId.toString()) {
//         senderInfo = {
//           id: loveRoom.creator.userId,
//           email: loveRoom.creator.email,
//           role: 'creator'
//         };
//       } else {
//         senderInfo = {
//           id: loveRoom.joiner.userId,
//           email: loveRoom.joiner.email,
//           role: 'joiner'
//         };
//       }

//       const messageData = {
//         messageId: newMessage._id,
//         roomId,
//         sender: senderInfo,
//         message,
//         messageType,
//         timestamp: newMessage.timestamp
//       };

//       // Broadcast message via RTC handler
//       const rtcHandler = req.app.get('rtcHandler');
//       rtcHandler.sendToRoom(roomId, 'new-message', messageData);

//       console.log(`Message sent in room ${roomId}:`, messageData);

//       res.json({
//         success: true,
//         message: 'Message sent successfully',
//         data: messageData
//       });

//     } catch (error) {
//       console.error('Error sending message:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to send message',
//         error: error.message
//       });
//     }
//   },

//   // Get chat history
//   getChatHistory: async (req, res) => {
//     try {
//       const { roomId, userId } = req.params;
//       const { page = 1, limit = 50 } = req.query;

//       if (!roomId || !userId) {
//         return res.status(400).json({
//           success: false,
//           message: 'roomId and userId are required'
//         });
//       }

//       // Verify room exists and user is authorized
//       const loveRoom = await LoveRoom.findOne({ roomId });
//       if (!loveRoom) {
//         return res.status(404).json({
//           success: false,
//           message: 'Room not found'
//         });
//       }

//       // Check authorization
//       const isAuthorized = loveRoom.creator.userId.toString() === userId.toString() ||
//                           (loveRoom.joiner.userId && 
//                            loveRoom.joiner.userId.toString() === userId.toString());

//       if (!isAuthorized) {
//         return res.status(403).json({
//           success: false,
//           message: 'Unauthorized access to chat history'
//         });
//       }

//       // Get messages from database with pagination
//       const skip = (parseInt(page) - 1) * parseInt(limit);
//       const messages = await Message.find({ roomId })
//         .sort({ timestamp: -1 })
//         .skip(skip)
//         .limit(parseInt(limit))
//         .lean();

//       // Get total count for pagination
//       const totalCount = await Message.countDocuments({ roomId });

//       // Format messages with sender info
//       const formattedMessages = messages.map(msg => {
//         let senderInfo = null;
//         if (loveRoom.creator.userId.toString() === msg.senderId.toString()) {
//           senderInfo = {
//             id: loveRoom.creator.userId,
//             email: loveRoom.creator.email,
//             role: 'creator'
//           };
//         } else {
//           senderInfo = {
//             id: loveRoom.joiner.userId,
//             email: loveRoom.joiner.email,
//             role: 'joiner'
//           };
//         }

//         return {
//           messageId: msg._id,
//           roomId: msg.roomId,
//           sender: senderInfo,
//           message: msg.message,
//           messageType: msg.messageType,
//           timestamp: msg.timestamp
//         };
//       }).reverse(); // Reverse to get chronological order

//       res.json({
//         success: true,
//         message: 'Chat history retrieved successfully',
//         data: {
//           messages: formattedMessages,
//           pagination: {
//             currentPage: parseInt(page),
//             totalPages: Math.ceil(totalCount / parseInt(limit)),
//             totalCount,
//             hasNext: skip + parseInt(limit) < totalCount,
//             hasPrev: parseInt(page) > 1
//           }
//         }
//       });

//     } catch (error) {
//       console.error('Error getting chat history:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to get chat history',
//         error: error.message
//       });
//     }
//   },

//   // Handle WebRTC signaling via HTTP (fallback)
//   handleSignaling: async (req, res) => {
//     try {
//       const { roomId, senderId, recipientId, signalType, signalData } = req.body;

//       if (!roomId || !senderId || !signalType || !signalData) {
//         return res.status(400).json({
//           success: false,
//           message: 'roomId, senderId, signalType, and signalData are required'
//         });
//       }

//       // Verify room exists
//       const loveRoom = await LoveRoom.findOne({ roomId });
//       if (!loveRoom || loveRoom.status !== 'connected') {
//         return res.status(404).json({
//           success: false,
//           message: 'Room not found or not connected'
//         });
//       }

//       // Send signal via RTC handler
//       const rtcHandler = req.app.get('rtcHandler');
      
//       if (recipientId) {
//         // Send to specific user
//         const sent = rtcHandler.sendToUser(recipientId, 'webrtc-signal', {
//           senderId,
//           signalType,
//           signalData
//         });

//         if (!sent) {
//           return res.status(404).json({
//             success: false,
//             message: 'Recipient is not online'
//           });
//         }
//       } else {
//         // Broadcast to room
//         rtcHandler.sendToRoom(roomId, 'webrtc-signal', {
//           senderId,
//           signalType,
//           signalData
//         });
//       }

//       console.log(`Signaling for room ${roomId}:`, { senderId, signalType, recipientId });

//       res.json({
//         success: true,
//         message: 'Signal processed successfully'
//       });

//     } catch (error) {
//       console.error('Error handling signaling:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to handle signaling',
//         error: error.message
//       });
//     }
//   },

//   // Start call via HTTP API
//   startCall: async (req, res) => {
//     try {
//       const { roomId, callerId, recipientId, callType } = req.body;

//       if (!roomId || !callerId || !callType) {
//         return res.status(400).json({
//           success: false,
//           message: 'roomId, callerId, and callType are required'
//         });
//       }

//       // Verify room exists
//       const loveRoom = await LoveRoom.findOne({ roomId });
//       if (!loveRoom || loveRoom.status !== 'connected') {
//         return res.status(404).json({
//           success: false,
//           message: 'Room not found or not connected'
//         });
//       }

//       // Check authorization
//       const isAuthorized = loveRoom.creator.userId.toString() === callerId.toString() ||
//                           (loveRoom.joiner.userId && 
//                            loveRoom.joiner.userId.toString() === callerId.toString());

//       if (!isAuthorized) {
//         return res.status(403).json({
//           success: false,
//           message: 'Unauthorized to start call in this room'
//         });
//       }

//       const rtcHandler = req.app.get('rtcHandler');

//       // Check if recipient is online
//       if (recipientId && !rtcHandler.isUserOnline(recipientId)) {
//         return res.status(404).json({
//           success: false,
//           message: 'Recipient is not online'
//         });
//       }

//       const callData = {
//         callId: `${roomId}_${Date.now()}`,
//         roomId,
//         callerId,
//         recipientId,
//         callType,
//         startTime: new Date(),
//         status: 'initiating'
//       };

//       // Send call request via RTC handler
//       if (recipientId) {
//         rtcHandler.sendToUser(recipientId, 'incoming-call', {
//           callId: callData.callId,
//           callerId,
//           callType,
//           roomId
//         });
//       } else {
//         rtcHandler.sendToRoom(roomId, 'incoming-call', {
//           callId: callData.callId,
//           callerId,
//           callType,
//           roomId
//         });
//       }

//       console.log(`Call initiated in room ${roomId}:`, callData);

//       res.json({
//         success: true,
//         message: 'Call initiated successfully',
//         data: callData
//       });

//     } catch (error) {
//       console.error('Error starting call:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to start call',
//         error: error.message
//       });
//     }
//   },

//   // End call via HTTP API
//   endCall: async (req, res) => {
//     try {
//       const { roomId, userId, reason = 'ended' } = req.body;

//       if (!roomId || !userId) {
//         return res.status(400).json({
//           success: false,
//           message: 'roomId and userId are required'
//         });
//       }

//       // Verify room exists
//       const loveRoom = await LoveRoom.findOne({ roomId });
//       if (!loveRoom) {
//         return res.status(404).json({
//           success: false,
//           message: 'Room not found'
//         });
//       }

//       // End call via RTC handler
//       const rtcHandler = req.app.get('rtcHandler');
//       rtcHandler.sendToRoom(roomId, 'call-ended', {
//         roomId,
//         endedBy: userId,
//         reason,
//         endedAt: new Date()
//       });

//       console.log(`Call ended in room ${roomId} by user ${userId}`);

//       res.json({
//         success: true,
//         message: 'Call ended successfully',
//         data: {
//           roomId,
//           endedBy: userId,
//           reason,
//           endTime: new Date()
//         }
//       });

//     } catch (error) {
//       console.error('Error ending call:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to end call',
//         error: error.message
//       });
//     }
//   },

//   // Get room participants
//   getRoomParticipants: async (req, res) => {
//     try {
//       const { roomId, userId } = req.params;

//       if (!roomId || !userId) {
//         return res.status(400).json({
//           success: false,
//           message: 'roomId and userId are required'
//         });
//       }

//       // Verify room exists
//       const loveRoom = await LoveRoom.findOne({ roomId });
//       if (!loveRoom) {
//         return res.status(404).json({
//           success: false,
//           message: 'Room not found'
//         });
//       }

//       // Check authorization
//       const isAuthorized = loveRoom.creator.userId.toString() === userId.toString() ||
//                           (loveRoom.joiner.userId && 
//                            loveRoom.joiner.userId.toString() === userId.toString());

//       if (!isAuthorized) {
//         return res.status(403).json({
//           success: false,
//           message: 'Unauthorized access to room participants'
//         });
//       }

//       // Get online users from RTC handler
//       const rtcHandler = req.app.get('rtcHandler');
//       const onlineUsers = rtcHandler.getOnlineUsers(roomId);

//       // Prepare participant data
//       const participants = [];
      
//       // Add creator
//       participants.push({
//         userId: loveRoom.creator.userId,
//         email: loveRoom.creator.email,
//         role: 'creator',
//         isOnline: rtcHandler.isUserOnline(loveRoom.creator.userId.toString())
//       });

//       // Add joiner if exists
//       if (loveRoom.joiner.userId) {
//         participants.push({
//           userId: loveRoom.joiner.userId,
//           email: loveRoom.joiner.email,
//           role: 'joiner',
//           isOnline: rtcHandler.isUserOnline(loveRoom.joiner.userId.toString())
//         });
//       }

//       res.json({
//         success: true,
//         message: 'Participants retrieved successfully',
//         data: {
//           participants,
//           onlineCount: onlineUsers.size,
//           totalCount: participants.length,
//           roomStatus: loveRoom.status
//         }
//       });

//     } catch (error) {
//       console.error('Error getting participants:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to get participants',
//         error: error.message
//       });
//     }
//   },

//   // Get room status
//   getRoomStatus: async (req, res) => {
//     try {
//       const { roomId, userId } = req.params;

//       if (!roomId || !userId) {
//         return res.status(400).json({
//           success: false,
//           message: 'roomId and userId are required'
//         });
//       }

//       // Verify room exists
//       const loveRoom = await LoveRoom.findOne({ roomId });
//       if (!loveRoom) {
//         return res.status(404).json({
//           success: false,
//           message: 'Room not found'
//         });
//       }

//       // Check authorization
//       const isAuthorized = loveRoom.creator.userId.toString() === userId.toString() ||
//                           (loveRoom.joiner.userId && 
//                            loveRoom.joiner.userId.toString() === userId.toString());

//       if (!isAuthorized) {
//         return res.status(403).json({
//           success: false,
//           message: 'Unauthorized access to room status'
//         });
//       }

//       // Get online users from RTC handler
//       const rtcHandler = req.app.get('rtcHandler');
//       const onlineUsers = rtcHandler.getOnlineUsers(roomId);

//       res.json({
//         success: true,
//         message: 'Room status retrieved successfully',
//         data: {
//           roomId: loveRoom.roomId,
//           status: loveRoom.status,
//           creator: loveRoom.creator,
//           joiner: loveRoom.joiner,
//           createdAt: loveRoom.createdAt,
//           connectedAt: loveRoom.connectedAt,
//           onlineUsers: Array.from(onlineUsers),
//           onlineCount: onlineUsers.size
//         }
//       });

//     } catch (error) {
//       console.error('Error getting room status:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to get room status',
//         error: error.message
//       });
//     }
//   }
// };

// export default rtcController;

