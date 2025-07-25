import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/users.js';

// Generate JWT Token with 1 week expiry
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d', // Changed from '30d' to '7d' (1 week)
  });
};

// @desc    Register user
// @route   POST /api/auth/signup
// @access  Public
export const signup = async (req, res) => {
  try {
    const { username, email, password, gender, age } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email or username already exists' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Handle profile image
    let profileImagePath = null;
    if (req.file) {
      profileImagePath = `/uploads/${req.file.filename}`;
    }

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      gender,
      age: parseInt(age),
      profileImage: profileImagePath,
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          gender: user.gender,
          age: user.age,
          profileImage: user.profileImage,
        },
        // Add token expiry info for client
        tokenExpiresIn: '7 days'
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during signup',
      error: error.message 
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          gender: user.gender,
          age: user.age,
          profileImage: user.profileImage,
        },
        // Add token expiry info for client
        tokenExpiresIn: '7 days'
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
      error: error.message 
    });
  }
};

// @desc    Sign out user
// @route   POST /api/auth/signout
// @access  Private (requires authentication)
export const signout = async (req, res) => {
  try {
    // req.user is available from the authenticateToken middleware
    const userId = req.user._id;
    
    console.log(`User ${userId} signed out successfully`);
    
    // Since we're using JWT tokens (stateless), we can't invalidate them on the server side
    // The client will handle removing the token from storage
    // In a production app, you might want to implement a token blacklist in Redis or database
    
    res.status(200).json({
      success: true,
      message: 'Signed out successfully',
      data: {
        userId: userId
      }
    });
  } catch (error) {
    console.error('SignOut error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during sign out',
      error: error.message 
    });
  }
};

// @desc    Verify token and get user info
// @route   GET /api/auth/verify
// @access  Private
export const verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Token not provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    res.status(200).json({ 
      success: true, 
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token not found' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findOne({
      _id: decoded.id,
      refreshToken,
      refreshTokenExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      accessToken,
      expiresIn: '1h'
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};