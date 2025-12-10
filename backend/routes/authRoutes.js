import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { 
  signup, 
  login, 
  signout, 
  verifyToken, 
  refreshToken, 
  forgotPassword, 
  resetPassword,
  updateProfile, 
  getProfile 
} from '../controllers/authController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `File upload error: ${error.message}`
    });
  }
  
  if (error.message.includes('Only image files')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

// ============ AUTH ROUTES ============

// Signup with profile image
router.post('/signup', upload.single('profileImage'), handleMulterError, signup);

// Login
router.post('/login', login);

// Signout
router.post('/signout', authenticateToken, signout);

// Verify Token
router.get('/verify', verifyToken);

// Refresh Token
router.post('/refresh', refreshToken);

// Forgot Password
router.post('/forgot-password', forgotPassword);

// Reset Password
router.post('/reset-password', resetPassword);

// ============ PROFILE ROUTES ============

// Get current user profile
router.get('/user/profile', authenticateToken, getProfile);

// Update user profile
router.put('/user/update-profile', authenticateToken, upload.single('profileImage'), handleMulterError, updateProfile);

export default router;