import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/users.js';
import nodemailer from 'nodemailer';

// Configure Email Transporter - EXPLICIT CONFIG FOR GMAIL
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER || 'jagjeetjaiswal027@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'zkwsxeqyazrtghnu',
  },
  connectionTimeout: 10000,
  socketTimeout: 10000,
});

// Verify email connection on startup
const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email service verified and ready to send messages');
    return true;
  } catch (error) {
    console.error('❌ Email service connection error:', error.message);
    console.error('   Host:', process.env.EMAIL_SERVICE || 'gmail');
    console.error('   User:', process.env.EMAIL_USER);
    console.error('   Please check your EMAIL credentials in .env file');
    return false;
  }
};

// Run verification on import
verifyEmailConnection();

// Generate JWT Token with 30 day expiry
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'jasusA80', {
    expiresIn: '30d',
  });
};

// Generate password reset token (expires in 24 hours)
const generateResetToken = (userId) => {
  return jwt.sign({ userId, type: 'reset' }, process.env.JWT_SECRET || 'jasusA80', {
    expiresIn: '24h',
  });
};

// Send welcome email
const sendWelcomeEmail = async (email, username) => {
  try {
    const mailOptions = {
      from: `"SecureRoomPortal" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Welcome to SecureRoomPortal (CoupletCrypt) - Account Successfully Registered!',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🔐 SecureRoomPortal</h1>
              <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Secure Couple Communication Platform</p>
            </div>
            
            <div style="padding: 30px;">
              <h2 style="color: #333; text-align: center; margin-top: 0;">Welcome to CoupletCrypt, ${username}! 💖</h2>
              
              <p style="color: #555; line-height: 1.6; margin: 20px 0; font-size: 16px;">
                Congratulations! Your account has been successfully created on <strong>SecureRoomPortal</strong>.
              </p>
              
              <div style="background: #f0f4ff; border-left: 4px solid #667eea; padding: 16px; margin: 25px 0; border-radius: 4px;">
                <h3 style="color: #667eea; margin-top: 0; font-size: 16px;">✓ Account Details:</h3>
                <p style="margin: 8px 0; color: #555; font-size: 14px;"><strong>Username:</strong> ${username}</p>
                <p style="margin: 8px 0; color: #555; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 8px 0; color: #555; font-size: 14px;"><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">✓ Active</span></p>
              </div>
              
              <h3 style="color: #333; margin-top: 25px; font-size: 16px;">What You Can Do Now:</h3>
              <ul style="color: #555; line-height: 1.8; padding-left: 20px; font-size: 14px;">
                <li>✅ Access your secure messaging platform</li>
                <li>🔐 Enjoy end-to-end encrypted conversations</li>
                <li>💾 Store memories in your encrypted vault</li>
                <li>🎮 Experience adventure mode with your partner</li>
                <li>🛡️ Benefit from military-grade AES-256 protection</li>
              </ul>
              
              <div style="background: #fff3cd; border-radius: 4px; padding: 14px; margin: 25px 0; border-left: 4px solid #ffc107; font-size: 14px;">
                <p style="color: #856404; margin: 0;"><strong>🔒 Security Tip:</strong> We will never ask for your password. Keep it safe!</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 14px;">
                  Start Your Adventure
                </a>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © 2025 SecureRoomPortal (CoupletCrypt) • Your love, encrypted forever 💖<br>
                Need help? Contact us at support@secureroomportal.com
              </p>
            </div>
          </div>
        </div>
      `,
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error.message);
    return false;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, username, resetToken) => {
  try {
    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth?page=resetpassword&token=${resetToken}`;
    
    const mailOptions = {
      from: `"SecureRoomPortal" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Password Reset Request - SecureRoomPortal',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🔐 SecureRoomPortal</h1>
            </div>
            
            <div style="padding: 30px;">
              <h2 style="color: #333; text-align: center; margin-top: 0;">Password Reset Request</h2>
              
              <p style="color: #555; line-height: 1.6; margin: 20px 0; font-size: 16px;">
                Hi ${username},
              </p>
              
              <p style="color: #555; line-height: 1.6; margin: 20px 0; font-size: 16px;">
                We received a request to reset the password for your SecureRoomPortal account. If you didn't make this request, you can safely ignore this email.
              </p>
              
              <div style="background: #fff3cd; border-radius: 4px; padding: 14px; margin: 25px 0; border-left: 4px solid #ffc107; font-size: 14px;">
                <p style="color: #856404; margin: 0;"><strong>⏰ Time Sensitive:</strong> This link expires in 24 hours.</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                  Reset Your Password
                </a>
              </div>
              
              <p style="color: #666; font-size: 13px; text-align: center; margin: 20px 0; word-break: break-all;">
                Or copy this link:<br>
                <span style="color: #667eea; font-family: monospace; background: #f0f4ff; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 8px; font-size: 12px;">
                  ${resetLink}
                </span>
              </p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              
              <div style="background: #f0f4ff; border-radius: 4px; padding: 14px; margin: 20px 0;">
                <h3 style="color: #667eea; margin-top: 0; font-size: 14px;">🔒 Security Tips:</h3>
                <ul style="color: #555; line-height: 1.8; margin: 10px 0; padding-left: 20px; font-size: 13px;">
                  <li>Never share this link with anyone</li>
                  <li>We will never ask for your password via email</li>
                  <li>Always verify the sender's email address</li>
                  <li>This link will expire in 24 hours</li>
                </ul>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © 2025 SecureRoomPortal (CoupletCrypt) • Your love, encrypted forever 💖<br>
                Need help? Contact us at support@secureroomportal.com
              </p>
            </div>
          </div>
        </div>
      `,
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error.message);
    throw error;
  }
};

// @desc    Register user
// @route   POST /api/auth/signup
// @access  Public
export const signup = async (req, res) => {
  try {
    const { username, email, password, gender, age } = req.body;

    if (!username || !email || !password || !gender || !age) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required: username, email, password, gender, age' 
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid email address' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      return res.status(400).json({ 
        success: false, 
        message: 'Age must be between 13 and 120' 
      });
    }

    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ 
          success: false, 
          message: 'User with this email already exists' 
        });
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'Username already taken' 
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let profileImagePath = null;
    if (req.file) {
      profileImagePath = `/uploads/${req.file.filename}`;
    }

    const user = new User({
      username,
      email,
      password: hashedPassword,
      gender,
      age: ageNum,
      profileImage: profileImagePath,
    });

    await user.save();

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, username).catch(err => {
      console.error('Welcome email send failed:', err.message);
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Check your email for welcome message.',
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
        tokenExpiresIn: '30 days'
      },
    });
  } catch (error) {
    console.error('❌ Signup error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ 
        success: false, 
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` 
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        message: messages.join(', ') 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error during signup',
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

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
        tokenExpiresIn: '30 days'
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
    });
  }
};

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'No account found with this email address' 
      });
    }

    // Generate reset token (24 hours expiry)
    const resetToken = generateResetToken(user._id);

    // Save reset token to database
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    // Send password reset email
    try {
      await sendPasswordResetEmail(email, user.username, resetToken);
    } catch (emailError) {
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
      await user.save();
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please check your email configuration.',
        error: emailError.message
      });
    }

    res.json({
      success: true,
      message: 'Password reset link sent to your email! Check your inbox. Link expires in 24 hours.',
      data: {
        email: email
      }
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.',
      error: error.message
    });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'jasusA80');
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(400).json({ 
          success: false, 
          message: 'Reset link has expired. Please request a new one.' 
        });
      }
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid reset link' 
      });
    }

    // Find user and verify token in database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Double-check token validity with stored token
    if (user.resetToken !== token || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Reset link is invalid or has expired. Please request a new one.' 
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully! You can now login with your new password.',
    });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during password reset',
    });
  }
};

// @desc    Sign out user
// @route   POST /api/auth/signout
// @access  Private
export const signout = async (req, res) => {
  try {
    const userId = req.user._id;
    
    res.status(200).json({
      success: true,
      message: 'Signed out successfully',
      data: {
        userId: userId
      }
    });
  } catch (error) {
    console.error('❌ SignOut error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during sign out',
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jasusA80');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ 
      success: true, 
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        gender: user.gender,
        age: user.age,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    console.error('❌ Token verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token not found' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'jagusA80');
    const user = await User.findOne({
      _id: decoded.id,
      refreshToken,
      refreshTokenExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'jasusA80',
      { expiresIn: '30d' }
    );

    res.status(200).json({
      accessToken,
      expiresIn: '30 days'
    });
  } catch (error) {
    console.error('❌ Error refreshing token:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { username, age, gender } = req.body;

    // Validate inputs
    if (!username || !age || !gender) {
      return res.status(400).json({
        success: false,
        message: 'Username, age, and gender are required'
      });
    }

    // Validate age
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      return res.status(400).json({
        success: false,
        message: 'Age must be between 13 and 120'
      });
    }

    // Validate gender
    if (!['male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({
        success: false,
        message: 'Gender must be male, female, or other'
      });
    }

    // Check if username is already taken by another user
    const existingUsername = await User.findOne({
      username,
      _id: { $ne: userId }
    });

    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken'
      });
    }

    // Prepare update object
    const updateData = {
      username,
      age: ageNum,
      gender
    };

    // Handle profile image upload
    if (req.file) {
      updateData.profileImage = `/uploads/${req.file.filename}`;
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email,
          gender: updatedUser.gender,
          age: updatedUser.age,
          profileImage: updatedUser.profileImage
        }
      }
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during profile update'
    });
  }
};

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          gender: user.gender,
          age: user.age,
          profileImage: user.profileImage,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile'
    });
  }
};
