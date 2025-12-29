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
const server = http.createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://couple-crypt-q6us.onrender.com/auth',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
}));

app.options('*', cors());

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/love-room', loveRoomRoutes);
app.use('/api/messages', messageRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

initializeSocket(io);
app.set('io', io);

setInterval(async () => {
  try {
    const LoveRoom = (await import('./models/loveRoom.js')).default;
    await LoveRoom.cleanupExpiredRooms();
  } catch (error) {
    console.error('Cleanup error:', error.message);
  }
}, 60 * 60 * 1000);

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.get('/', (req, res) => {
  res.send('Welcome to the Couple Crypt API');
});

const PORT = process.env.PORT || 2004;

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Socket.IO initialized`);
  console.log(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

export { io };