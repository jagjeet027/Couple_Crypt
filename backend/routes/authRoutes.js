import express from 'express';
import multer from 'multer';
import path from 'path';
import { signup, login, signout,refreshToken } from '../controllers/authController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Public Routes
router.post('/signup', upload.single('profileImage'), signup);
router.post('/login', login);
router.post('/refresh-token', refreshToken);

// Protected Routes - requires authentication
router.post('/signout', authenticateToken, signout);

export default router;