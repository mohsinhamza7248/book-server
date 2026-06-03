import mongoose from 'mongoose';
import { logger } from './logger';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not defined in environment variables');

  mongoose.connection.on('connected', () => logger.info('✅ MongoDB connected'));
  mongoose.connection.on('disconnected', () => logger.warn('⚠️  MongoDB disconnected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB error:', err));

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
}
