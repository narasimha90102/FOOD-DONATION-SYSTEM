import dotenv from 'dotenv';
import path from 'path';

// Load .env file with override enabled to refresh cached terminal envs
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

export const env = {
  PORT: parseInt(process.env.PORT || '5003', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/foodbridge',
  JWT_SECRET: process.env.JWT_SECRET || 'local_development_jwt_access_key_foodbridge_2026_xYz',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'local_development_jwt_refresh_key_foodbridge_2026_aBc',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '1h',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '7d',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '2525', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@foodbridge.org',
  FROM_NAME: process.env.FROM_NAME || 'FoodBridge AI',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3003',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3003/auth/login',
};
