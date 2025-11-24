import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [20, 'Username cannot exceed 20 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['male', 'female', 'other']
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [13, 'Age must be at least 13'],
    max: [120, 'Age cannot exceed 120']
  },
  profileImage: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  resetToken: {
    type: String,
    default: undefined
  },
  resetTokenExpiry: {
    type: Date,
    default: undefined
  }
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ resetToken: 1 });

const User = mongoose.model('User', userSchema);

export default User;