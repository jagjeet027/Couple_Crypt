import mongoose from 'mongoose';

const loveRoomSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Love code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Invalid code format']
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

// Compound index for checking active codes by user
loveRoomSchema.index({ 'creator.userId': 1, isActive: 1 });

// Pre-save middleware to generate roomId when room becomes active
loveRoomSchema.pre('save', function(next) {
  if (this.roomActive && !this.roomId) {
    this.roomId = `room_${this.code}_${Date.now()}`;
  }
  next();
});

// Static method to generate unique code
loveRoomSchema.statics.generateUniqueCode = async function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let isUnique = false;
  
  while (!isUnique) {
    code = '';
    for (let i = 0; i < 12; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
      if (i === 3 || i === 7) code += '-';
    }
    
    // Check if code already exists
    const existingCode = await this.findOne({ code });
    if (!existingCode) {
      isUnique = true;
    }
  }
  
  return code;
};

// Static method to find active code by user - Updated to handle mixed types
loveRoomSchema.statics.findActiveCodeByUser = async function(userId) {
  try {
    return await this.findOne({
      'creator.userId': userId, // This now works with both ObjectId and string
      isActive: true,
      status: 'waiting'
    });
  } catch (error) {
    console.error('Error in findActiveCodeByUser:', error);
    return null;
  }
};

// Static method to validate and get code
loveRoomSchema.statics.validateCode = async function(code) {
  const loveRoom = await this.findOne({ code });
  
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
  
  if (!loveRoom.isActive || loveRoom.status !== 'waiting') {
    return { valid: false, message: 'Code already used or expired' };
  }
  
  return { valid: true, loveRoom };
};

// Instance method to connect hearts
loveRoomSchema.methods.connectHearts = function(joinerId, joinerEmail) {
  this.joiner.userId = joinerId;
  this.joiner.email = joinerEmail;
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

// Helper method to check if userId is ObjectId or string
loveRoomSchema.statics.isValidObjectId = function(id) {
  return mongoose.Types.ObjectId.isValid(id);
};

const LoveRoom = mongoose.model('LoveRoom', loveRoomSchema);

export default LoveRoom;