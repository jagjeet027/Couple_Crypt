import mongoose from 'mongoose';

const loveRoomSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Love code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^([A-Z0-9]{6}|[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})$/, 'Invalid code format']
  },
  creator: {
    userId: {
      type: mongoose.Schema.Types.Mixed, 
      required: [true, 'Creator user ID is required']
    },
    email: {
      type: String,
      required: [true, 'Creator email is required'],
      trim: true,
      lowercase: true
    },
    name: {
      type: String,
      trim: true,
      default: function() {
        return this.email ? this.email.split('@')[0] : 'Unknown';
      }
    }
  },
  joiner: {
    userId: {
      type: mongoose.Schema.Types.Mixed, 
      default: null
    },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true
    },
    name: {
      type: String,
      trim: true,
      default: null
    },
    joinedAt: {
      type: Date,
      default: null
    }
  },
  lastActiveAt: {
    type: Date,
    default: null
  },
  sessionDuration: {
    type: Number,
    default: 0
  },
  isSessionActive: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  roomActive: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  status: {
    type: String,
    enum: ['waiting', 'connected', 'expired', 'cancelled'],
    default: 'waiting'
  }
}, {
  timestamps: true
});

// ============ IMPORTANT: Fix the roomId issue ============
// Remove the unique sparse index on roomId since it causes duplicate null errors
// Instead, we'll use the code as the unique identifier (which is already unique)

// Indexes for better performance
loveRoomSchema.index({ code: 1 });
loveRoomSchema.index({ 'creator.userId': 1 });
loveRoomSchema.index({ 'creator.email': 1 });
loveRoomSchema.index({ 'joiner.userId': 1 });
loveRoomSchema.index({ isActive: 1 });
loveRoomSchema.index({ expiresAt: 1 });
loveRoomSchema.index({ status: 1 });

// Remove this index if it exists in your database!
// loveRoomSchema.index({ roomId: 1 }, { unique: true, sparse: true });
// Instead use compound index for better query performance
loveRoomSchema.index({ code: 1, status: 1 });

// Pre-save middleware
loveRoomSchema.pre('save', function(next) {
  // Don't generate roomId - use code as identifier
  // This prevents the null roomId duplicate key issue
  
  // Auto-generate creator name if not provided
  if (this.creator && this.creator.email && !this.creator.name) {
    this.creator.name = this.creator.email.split('@')[0];
  }
  
  // Auto-generate joiner name if not provided but email exists
  if (this.joiner && this.joiner.email && !this.joiner.name) {
    this.joiner.name = this.joiner.email.split('@')[0];
  }
  
  next();
});

// Static method to generate unique code
loveRoomSchema.statics.generateUniqueCode = async function(format = 'long') {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let isUnique = false;
  
  while (!isUnique) {
    code = '';
    
    if (format === 'short') {
      // Generate 6-character code
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
    } else {
      // Generate 12-character code with dashes
      for (let i = 0; i < 12; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
        if (i === 3 || i === 7) code += '-';
      }
    }
    
    // Check if code already exists
    const existingCode = await this.findOne({ code });
    if (!existingCode) {
      isUnique = true;
    }
  }
  
  return code;
};

// Static method to generate short code (6 chars)
loveRoomSchema.statics.generateShortCode = async function() {
  return await this.generateUniqueCode('short');
};

// Static method to validate and get code
loveRoomSchema.statics.validateCode = async function(code) {
  const normalizedCode = code.trim().toUpperCase();
  
  const loveRoom = await this.findOne({ code: normalizedCode });
  
  if (!loveRoom) {
    return { valid: false, message: 'Invalid love code - Hearts not found' };
  }
  
  if (Date.now() > loveRoom.expiresAt) {
    loveRoom.status = 'expired';
    loveRoom.isActive = false;
    await loveRoom.save();
    return { valid: false, message: 'Code expired - Ask for new code' };
  }
  
  if (!loveRoom.isActive) {
    return { valid: false, message: 'Code is no longer active' };
  }
  
  if (loveRoom.status === 'connected') {
    return { valid: false, message: 'Room is already connected' };
  }
  
  if (loveRoom.status === 'expired') {
    return { valid: false, message: 'Code has expired' };
  }
  
  if (loveRoom.status === 'cancelled') {
    return { valid: false, message: 'Room has been cancelled' };
  }
  
  return { valid: true, loveRoom };
};

// Instance method to connect hearts
loveRoomSchema.methods.connectHearts = function(joinerId, joinerEmail, joinerName = null) {
  this.joiner.userId = joinerId;
  this.joiner.email = joinerEmail;
  this.joiner.name = joinerName || (joinerEmail ? joinerEmail.split('@')[0] : 'Unknown');
  this.joiner.joinedAt = new Date();
  this.isActive = false;
  this.roomActive = true;
  this.status = 'connected';
  
  return this.save();
};

// Instance method to cancel room
loveRoomSchema.methods.cancelRoom = function() {
  this.isActive = false;
  this.status = 'cancelled';
  
  return this.save();
};

// Instance method to extend expiry
loveRoomSchema.methods.extendExpiry = function(additionalDays = 30) {
  const additionalTime = additionalDays * 24 * 60 * 60 * 1000;
  this.expiresAt = new Date(this.expiresAt.getTime() + additionalTime);
  
  return this.save();
};

// Instance method to check if expired
loveRoomSchema.methods.isExpired = function() {
  return Date.now() > this.expiresAt;
};

// Instance method to get time remaining
loveRoomSchema.methods.getTimeRemaining = function() {
  return Math.max(0, this.expiresAt.getTime() - Date.now());
};

// Static method to validate ObjectId
loveRoomSchema.statics.isValidObjectId = function(id) {
  return mongoose.Types.ObjectId.isValid(id);
};

// Static method to get user rooms
loveRoomSchema.statics.getUserRooms = async function(userId) {
  try {
    return await this.find({
      $or: [
        { 'creator.userId': userId },
        { 'joiner.userId': userId }
      ]
    }).sort({ createdAt: -1 });
  } catch (error) {
    console.error('Error in getUserRooms:', error);
    return [];
  }
};

// Static method to cleanup expired rooms
loveRoomSchema.statics.cleanupExpiredRooms = async function() {
  try {
    const result = await this.updateMany(
      { 
        expiresAt: { $lt: new Date() },
        status: { $ne: 'expired' }
      },
      { 
        $set: { 
          status: 'expired',
          isActive: false,
          roomActive: false
        }
      }
    );
    
    console.log(`Cleaned up ${result.modifiedCount} expired rooms`);
    return result;
  } catch (error) {
    console.error('Error cleaning up expired rooms:', error);
    throw error;
  }
};

// Virtual for canResumeSession
loveRoomSchema.virtual('canResumeSession').get(function() {
  if (!this.lastActiveAt || !this.isSessionActive) return false;
  const hoursSinceActive = (Date.now() - this.lastActiveAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceActive < 24;
});

// Instance method to update session activity
loveRoomSchema.methods.updateSessionActivity = function() {
  this.lastActiveAt = new Date();
  this.isSessionActive = true;
  return this.save();
};

// Virtual for room age in days
loveRoomSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

// Virtual for formatted code
loveRoomSchema.virtual('formattedCode').get(function() {
  if (this.code.length === 6) {
    return `${this.code.slice(0, 2)}-${this.code.slice(2, 4)}-${this.code.slice(4, 6)}`;
  }
  return this.code;
});

// Set virtuals in JSON output
loveRoomSchema.set('toJSON', { virtuals: true });
loveRoomSchema.set('toObject', { virtuals: true });

const LoveRoom = mongoose.model('LoveRoom', loveRoomSchema);

export default LoveRoom;