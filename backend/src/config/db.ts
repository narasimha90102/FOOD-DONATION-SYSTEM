import mongoose from 'mongoose';
import { env } from './env';

export const connectDB = async (): Promise<void> => {
  // Disable command buffering so queries fail fast if DB is disconnected
  mongoose.set('bufferCommands', false);

  mongoose.connection.on('disconnected', () => {
    console.warn('[Database] ⚠️ MongoDB disconnected. Attempting auto-reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[Database] 🔄 MongoDB reconnected successfully.');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[Database] ❌ MongoDB connection error:', err?.message || err);
  });

  const attemptConnect = async (attempt: number = 1): Promise<void> => {
    try {
      const conn = await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        bufferCommands: false,
      } as any);
      console.log(`[Database] ✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error: any) {
      console.error(`[Database] ❌ Connection attempt ${attempt} failed:`, error?.message || error);

      if (attempt >= 5) {
        console.warn(`[Database] ⚠️  Could not connect after ${attempt} attempts.`);
        console.warn(`[Database] 🔴 Check MongoDB Atlas Network Access — whitelist your IP or use 0.0.0.0/0`);
        return;
      }

      console.log(`[Database] Retrying in 3 seconds... (attempt ${attempt + 1}/5)`);
      await new Promise(r => setTimeout(r, 3000));
      return attemptConnect(attempt + 1);
    }
  };

  await attemptConnect();
};


