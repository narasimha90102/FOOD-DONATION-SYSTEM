import mongoose from 'mongoose';
import { env } from './env';

export const connectDB = async (): Promise<void> => {
  const attemptConnect = async (attempt: number = 1): Promise<void> => {
    try {
      const conn = await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 10000,
        family: 4,
      } as any);
      console.log(`[Database] ✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error: any) {
      console.error(`[Database] ❌ Connection attempt ${attempt} failed:`, error?.message || error);

      if (attempt >= 3) {
        console.warn(`[Database] ⚠️  Could not connect after ${attempt} attempts.`);
        console.warn(`[Database] 🔴 Check MongoDB Atlas Network Access — whitelist your IP or use 0.0.0.0/0`);
        console.warn(`[Database] 🟡 Server will continue running without database. API calls will fail until DB is reachable.`);
        // Do NOT exit — let the server run so other endpoints can still respond
        return;
      }

      console.log(`[Database] Retrying in 5 seconds... (attempt ${attempt + 1}/3)`);
      await new Promise(r => setTimeout(r, 5000));
      return attemptConnect(attempt + 1);
    }
  };

  await attemptConnect();
};
