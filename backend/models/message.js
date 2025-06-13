// models/message.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId or string (for session-based IDs)
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000 // Limit message length
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  // For file/image messages
  fileUrl: {
    type: String
  },
  fileName: {
    type: String
  },
  fileSize: {
    type: Number
  },
  // For system messages (call notifications, etc.)
  systemData: {
    type: mongoose.Schema.Types.Mixed
  },
  // Message status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  // Read receipts
  readBy: [{
    userId: mongoose.Schema.Types.Mixed,
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
messageSchema.index({ roomId: 1, timestamp: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ timestamp: -1 });

// Instance methods
messageSchema.methods.markAsRead = function(userId) {
  const existingRead = this.readBy.find(read => 
    read.userId.toString() === userId.toString()
  );
  
  if (!existingRead) {
    this.readBy.push({ userId, readAt: new Date() });
    this.status = 'read';
  }
  
  return this.save();
};

messageSchema.methods.editMessage = function(newMessage) {
  this.message = newMessage;
  this.edited = true;
  this.editedAt = new Date();
  return this.save();
};

messageSchema.methods.deleteMessage = function() {
  this.deleted = true;
  this.deletedAt = new Date();
  this.message = 'This message was deleted';
  return this.save();
};

// Static methods
messageSchema.statics.getUnreadCount = function(roomId, userId) {
  return this.countDocuments({
    roomId,
    senderId: { $ne: userId },
    'readBy.userId': { $ne: userId }
  });
};

messageSchema.statics.markRoomMessagesAsRead = function(roomId, userId) {
  return this.updateMany(
    {
      roomId,
      senderId: { $ne: userId },
      'readBy.userId': { $ne: userId }
    },
    {
      $push: { readBy: { userId, readAt: new Date() } },
      $set: { status: 'read' }
    }
  );
};

messageSchema.statics.getLastMessage = function(roomId) {
  return this.findOne({ roomId, deleted: false })
    .sort({ timestamp: -1 })
    .lean();
};

// Virtual for formatted timestamp
messageSchema.virtual('formattedTime').get(function() {
  return this.timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Virtual for checking if message is from today
messageSchema.virtual('isToday').get(function() {
  const today = new Date();
  const messageDate = this.timestamp;
  return today.toDateString() === messageDate.toDateString();
});

// Transform function to control JSON output
messageSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const Message = mongoose.model('Message', messageSchema);

export default Message;