import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import http from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';

import connectDB from './db/db.js';
import authRoutes from './routes/authRoutes.js';
import loveRoomRoutes from './routes/loveRoomRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import { initializeSocket } from './socket/messageSocket.js';

dotenv.config();

const app = express();

// Create HTTP server first
const server = http.createServer(app);

// FIXED: Updated CORS configuration
const allowedOrigins = [
  "https://lovevault.onrender.com", // Your frontend URL
  process.env.CLIENT_URL,
  "http://localhost:3000", // For local development
  "http://localhost:5173"  // For Vite dev server
].filter(Boolean);

console.log('Allowed Origins:', allowedOrigins); // Debug log

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
}));

// Add preflight handling
app.options('*', cors());

// Needed to get __dirname equivalent in ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connect to MongoDB
connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (for uploaded messages/files)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/love-room', loveRoomRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date(),
    uptime: process.uptime(),
    allowedOrigins: allowedOrigins
  });
});

// Initialize Socket.IO with message handling
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Initialize message socket handling
initializeSocket(io);

// Make io available globally for other parts of the app
app.set('io', io);

// Cleanup job for expired messages (runs every hour)
setInterval(async () => {
  try {
    console.log('Running cleanup job for expired messages...');
    // TTL index will handle most cleanup, but you can add additional logic here
    
    // Optional: Manual cleanup for very old messages
    const Message = (await import('./models/message.js')).default;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    await Message.deleteMany({
      deleted: true,
      deletedAt: { $lt: thirtyDaysAgo }
    });
    
    console.log('Cleanup job completed');
  } catch (error) {
    console.error('Cleanup job error:', error);
  }
}, 60 * 60 * 1000); // 1 hour

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'How are you here? This route does not exist.',
    timestamp: new Date()
  });
});

const PORT = process.env.PORT || 2004;

// Use server.listen instead of app.listen since we're using Socket.IO
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server initialized`);
  console.log(`Message system with auto-delete enabled`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
});

export { io };