import fs from 'fs';
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system', 'call'],
    default: 'text'
  },
  // 👇 REPLY FEATURE - NEW FIELD
  replyTo: {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    message: {
      type: String,
      maxlength: 1000
    },
    senderId: {
      type: mongoose.Schema.Types.Mixed
    }
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
  fileUrl: {
    type: String
  },
  fileName: {
    type: String
  },
  fileSize: {
    type: Number
  },
  filePath: {
    type: String,
  },
  mimeType: {
    type: String
  },
  systemData: {
    type: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  readBy: [{
    userId: mongoose.Schema.Types.Mixed,
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  autoDeleteAt: {
    type: Date
  },
  callData: {
    callType: {
      type: String,
      enum: ['audio', 'video']
    },
    duration: Number,
    status: {
      type: String,
      enum: ['initiated', 'accepted', 'rejected', 'ended', 'missed'],
      default: 'initiated'
    },
    endReason: {
      type: String,
      enum: ['ended_by_caller', 'ended_by_receiver', 'missed', 'rejected']
    }
  },
  viewedBy: [{
    userId: mongoose.Schema.Types.Mixed,
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ roomId: 1, timestamp: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ timestamp: -1 });
messageSchema.index({ autoDeleteAt: 1 });
messageSchema.index({ autoDeleteAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware
messageSchema.pre('save', async function(next) {
  if (this.messageType === 'image' && this.isNew) {
    this.autoDeleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  next();
});

messageSchema.post('save', async function(doc) {
  try {
    const messageCount = await this.constructor.countDocuments({ 
      roomId: doc.roomId, 
      deleted: false 
    });
    
    if (messageCount > 30) {
      const messagesToDelete = messageCount - 30;
      const oldestMessages = await this.constructor.find({ 
        roomId: doc.roomId, 
        deleted: false 
      })
      .sort({ timestamp: 1 })
      .limit(messagesToDelete)
      .select('_id fileUrl filePath');
      
      const messageIds = oldestMessages.map(msg => msg._id);
      
      for (const message of oldestMessages) {
        if (message.filePath && fs.existsSync(message.filePath)) {
          try {
            fs.unlinkSync(message.filePath);
          } catch (error) {
            console.error('Error deleting file:', error);
          }
        }
      }
      
      await this.constructor.deleteMany({ _id: { $in: messageIds } });
      console.log(`Hard deleted ${messagesToDelete} old messages from room ${doc.roomId}`);
    }
  } catch (error) {
    console.error('Error in post-save middleware:', error);
  }
});

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

messageSchema.methods.markAsViewed = async function(userId) {
  const existingView = this.viewedBy.find(view => 
    view.userId.toString() === userId.toString()
  );
  
  if (!existingView) {
    this.viewedBy.push({ userId, viewedAt: new Date() });
    
    if (this.messageType === 'image' && this.senderId.toString() !== userId.toString()) {
      this.deleted = true;
      this.deletedAt = new Date();
      this.message = 'This image was automatically deleted after viewing';
    }
    
    return this.save();
  }
  
  return this;
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
    'readBy.userId': { $ne: userId },
    deleted: false
  });
};

messageSchema.statics.markRoomMessagesAsRead = function(roomId, userId) {
  return this.updateMany(
    {
      roomId,
      senderId: { $ne: userId },
      'readBy.userId': { $ne: userId },
      deleted: false
    },
    {
      $push: { readBy: { userId, readAt: new Date() } },
      $set: { status: 'read' }
    }
  );
};

messageSchema.statics.createCallMessage = function(roomId, senderId, callType, callerName) {
  return this.create({
    roomId,
    senderId,
    messageType: 'call',
    message: `${callType} call ${callType === 'video' ? '📹' : '📞'}`,
    callData: {
      callType,
      status: 'initiated',
      callerId: senderId,
      callerName: callerName || 'Partner'
    }
  });
};

messageSchema.methods.updateCallStatus = function(status, userId, additionalData = {}) {
  this.callData.status = status;
  
  switch(status) {
    case 'accepted':
      this.callData.acceptedBy = userId;
      this.callData.acceptedAt = new Date();
      if (additionalData.answer) {
        this.callData.answer = additionalData.answer;
      }
      break;
    case 'rejected':
    case 'timeout':
      this.callData.rejectedBy = userId;
      this.callData.rejectedAt = new Date();
      this.callData.endReason = status;
      break;
    case 'ended':
      this.callData.endedBy = userId;
      this.callData.endedAt = new Date();
      this.callData.endReason = 'ended_by_caller';
      if (additionalData.duration) {
        this.callData.duration = additionalData.duration;
      }
      break;
  }
  
  return this.save();
};

messageSchema.statics.getLastMessage = function(roomId) {
  return this.findOne({ roomId, deleted: false })
    .sort({ timestamp: -1 })
    .lean();
};

messageSchema.statics.cleanupOldMessages = async function(roomId) {
  const messageCount = await this.countDocuments({ 
    roomId, 
    deleted: false 
  });
  
  if (messageCount > 30) {
    const messagesToDelete = messageCount - 30;
    const oldestMessages = await this.find({ 
      roomId, 
      deleted: false 
    })
    .sort({ timestamp: 1 })
    .limit(messagesToDelete)
    .select('_id fileUrl filePath');
    
    const messageIds = oldestMessages.map(msg => msg._id);
    
    for (const message of oldestMessages) {
      if (message.filePath && fs.existsSync(message.filePath)) {
        try {
          fs.unlinkSync(message.filePath);
        } catch (error) {
          console.error('Error deleting file:', error);
        }
      }
    }
    
    return this.deleteMany({ _id: { $in: messageIds } });
  }
};

// Virtuals
messageSchema.virtual('formattedTime').get(function() {
  return this.timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
});

messageSchema.virtual('isToday').get(function() {
  const today = new Date();
  const messageDate = this.timestamp;
  return today.toDateString() === messageDate.toDateString();
});

messageSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    if (ret.messageType === 'image' && ret.deleted) {
      delete ret.fileUrl;
      delete ret.fileName;
    }
    return ret;
  }
});

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

export default Message;