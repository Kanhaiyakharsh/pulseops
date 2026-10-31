import mongoose from 'mongoose';
import type { Logger } from 'pino';

export async function connectMongo(uri: string, logger: Logger): Promise<void> {
  mongoose.set('strictQuery', true);
  mongoose.connection.on('error', (err: unknown) => {
    logger.error({ err }, 'MongoDB connection error');
  });
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000, maxPoolSize: 10 });
  logger.info({ database: mongoose.connection.name }, 'MongoDB connected');
}

export async function pingMongo(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB is not connected');
  }
  await db.admin().ping();
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}
