import mongoose from 'mongoose';
import config from '../config.js';
// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1); // Exit process with failure
  }
};
// Export the connectDB function
export default connectDB;