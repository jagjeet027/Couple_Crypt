// server.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Server } from 'socket.io';
import http from 'http';
import mongoose from 'mongoose';

import connectDB from './db/db.js';
import authRoutes from './routes/authRoutes.js';
import loveRoomRoutes from './routes/loveRoomRoutes.js';
import rtcRoutes from './routes/rtc.js';
import RTCSocketHandler from './socket/rtcHandler.js';

dotenv.config();

const app = express();

// Create HTTP server first
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5174",
  "http://localhost:5173", // In case you switch ports
  process.env.CLIENT_URL
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Needed to get __dirname equivalent in ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connect to MongoDB
connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/love-room', loveRoomRoutes);
app.use('/api/rtc', rtcRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

const rtcHandler = new RTCSocketHandler(io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  rtcHandler.handleConnection(socket);
});

// Make rtcHandler available globally for other parts of the app
app.set('rtcHandler', rtcHandler);

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
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 2004;

// Use server.listen instead of app.listen since we're using Socket.IO
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
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

export { io, rtcHandler };