import mongoose from 'mongoose';

const loveRoomSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Love code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    // Updated to support both formats: 6-char (XXXXXX) and 12-char (XXXX-XXXX-XXXX)
    match: [/^([A-Z0-9]{6}|[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})$/, 'Invalid code format']
  },
  creator: {
    userId: {
      type: mongoose.Schema.Types.Mixed, // Changed from ObjectId to Mixed
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
      type: mongoose.Schema.Types.Mixed, // Changed from ObjectId to Mixed
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
    index: { expireAfterSeconds: 0 } // MongoDB TTL index for auto-deletion
  },
  roomId: {
    type: String,
    default: null,
    unique: true,
    sparse: true // Allow multiple null values
  },
  status: {
    type: String,
    enum: ['waiting', 'connected', 'expired', 'cancelled'],
    default: 'waiting'
  }
}, {
  timestamps: true
});

// Indexes for better performance
loveRoomSchema.index({ code: 1 });
loveRoomSchema.index({ 'creator.userId': 1 });
loveRoomSchema.index({ 'creator.email': 1 });
loveRoomSchema.index({ 'joiner.userId': 1 });
loveRoomSchema.index({ isActive: 1 });
loveRoomSchema.index({ expiresAt: 1 });
loveRoomSchema.index({ status: 1 });

// Pre-save middleware to generate roomId when room becomes active
loveRoomSchema.pre('save', function(next) {
  if (this.roomActive && !this.roomId) {
    this.roomId = `room_${this.code.replace(/-/g, '')}_${Date.now()}`;
  }
  
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

// Static method to generate unique code (supports both formats)
loveRoomSchema.statics.generateUniqueCode = async function(format = 'long') {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let isUnique = false;
  
  while (!isUnique) {
    code = '';
    
    if (format === 'short') {
      // Generate 6-character code for SecureRoomPortal
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
    } else {
      // Generate 12-character code with dashes (legacy format)
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

// Static method to generate 6-character code specifically for SecureRoomPortal
loveRoomSchema.statics.generateShortCode = async function() {
  return await this.generateUniqueCode('short');
};

// Updated: Get all user rooms (removed active-only restriction)
loveRoomSchema.statics.getUserRooms = async function(userId) {
  try {
    return await this.find({
      'creator.userId': userId
    }).sort({ createdAt: -1 });
  } catch (error) {
    console.error('Error in getUserRooms:', error);
    return [];
  }
};

// Static method to validate and get code
loveRoomSchema.statics.validateCode = async function(code) {
  // Normalize code format (remove spaces, convert to uppercase)
  const normalizedCode = code.trim().toUpperCase();
  
  const loveRoom = await this.findOne({ code: normalizedCode });
  
  if (!loveRoom) {
    return { valid: false, message: 'Invalid love code - Hearts not found' };
  }
  
  if (Date.now() > loveRoom.expiresAt) {
    // Update status to expired
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

// Instance method to connect hearts (updated to handle name parameter)
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

// Instance method to extend expiry time
loveRoomSchema.methods.extendExpiry = function(additionalDays = 30) {
  const additionalTime = additionalDays * 24 * 60 * 60 * 1000; // Convert to milliseconds
  this.expiresAt = new Date(this.expiresAt.getTime() + additionalTime);
  
  return this.save();
};

// Instance method to check if room is expired
loveRoomSchema.methods.isExpired = function() {
  return Date.now() > this.expiresAt;
};

// Instance method to get time remaining in milliseconds
loveRoomSchema.methods.getTimeRemaining = function() {
  return Math.max(0, this.expiresAt.getTime() - Date.now());
};

// Helper method to check if userId is ObjectId or string
loveRoomSchema.statics.isValidObjectId = function(id) {
  return mongoose.Types.ObjectId.isValid(id);
};

// Static method to clean up expired rooms (useful for maintenance)
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

// Virtual to get room age in days
loveRoomSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

// Virtual to get formatted code (adds dashes for display if it's a 6-char code)
loveRoomSchema.virtual('formattedCode').get(function() {
  if (this.code.length === 6) {
    return `${this.code.slice(0, 2)}-${this.code.slice(2, 4)}-${this.code.slice(4, 6)}`;
  }
  return this.code;
});

// Ensure virtuals are included in JSON output
loveRoomSchema.set('toJSON', { virtuals: true });
loveRoomSchema.set('toObject', { virtuals: true });

const LoveRoom = mongoose.model('LoveRoom', loveRoomSchema);

export default LoveRoom;