import jwt from 'jsonwebtoken';
import User from '../models/users.js';

// Token generation helper function
export const generateToken = (user) => {
  const payload = {
    id: user._id || user.id,
    userId: user._id || user.id,
    email: user.email,
    role: user.role
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'your-secret-key',
    { 
      expiresIn: '30d' // 30 days expiration
    }
  );
};

// Refresh token generation (30 days expiration)
export const generateRefreshToken = (user) => {
  const payload = {
    id: user._id || user.id,
    userId: user._id || user.id,
    type: 'refresh'
  };

  return jwt.sign(
    payload,
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || 'your-refresh-secret-key',
    { 
      expiresIn: '30d' // 30 days expiration
    }
  );
};

// Main JWT authentication middleware with database lookup - handles 30 day tokens
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token (30 days validity)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user from database
    const user = await User.findById(decoded.userId || decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired - token validity is 30 days'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Lightweight JWT authentication (no database lookup) - handles 30 day tokens
export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify JWT token (30 days validity)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Add user info to request
    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      role: decoded.role,
      ...decoded
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired - token validity is 30 days'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Session-based authentication middleware
export const authenticateSession = (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      req.user = {
        id: req.session.user.id,
        email: req.session.user.email,
        role: req.session.user.role,
        ...req.session.user
      };
      next();
    } else {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.'
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Flexible authentication (JWT first, then session fallback) - JWT tokens have 30 day validity
export const authenticateFlexible = async (req, res, next) => {
  try {
    // Try JWT first (30 days validity)
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = {
          id: decoded.id || decoded.userId,
          email: decoded.email,
          role: decoded.role,
          ...decoded
        };
        return next();
      } catch (jwtError) {
        // JWT failed, try session fallback
        console.log('JWT auth failed (30 day token expired or invalid), trying session auth');
      }
    }
    
    // Try session authentication
    if (req.session && req.session.user) {
      req.user = {
        id: req.session.user.id,
        email: req.session.user.email,
        role: req.session.user.role,
        ...req.session.user
      };
      return next();
    }
    
    // Both authentication methods failed
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Socket.IO authentication middleware - generates 30 day token if needed
export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || 
                  socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    socket.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      role: decoded.role,
      ...decoded
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired - token validity is 30 days'));
    }
    
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Authentication error: Invalid token'));
    }
    
    next(new Error('Authentication error: Token verification failed'));
  }
};

// Role-based authorization middleware
export const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Login helper function - use this when logging in users
export const loginUser = async (user) => {
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);
  
  return {
    token,
    refreshToken,
    user: {
      id: user._id || user.id,
      email: user.email,
      role: user.role
    }
  };
};

// Token refresh endpoint helper
export const refreshAccessToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(
      refreshToken, 
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || 'your-refresh-secret-key'
    );
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    // Get user from database
    const user = await User.findById(decoded.id || decoded.userId).select('-password');
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Generate new access token
    const newToken = generateToken(user);
    
    return {
      token: newToken,
      user: {
        id: user._id || user.id,
        email: user.email,
        role: user.role
      }
    };
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

// Default export (main authentication middleware)
export default authenticateToken;