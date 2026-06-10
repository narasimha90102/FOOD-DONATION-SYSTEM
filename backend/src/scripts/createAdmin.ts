/**
 * One-time Admin Account Seeder
 * Run: npx ts-node src/scripts/createAdmin.ts
 *
 * Creates a default FoodBridge AI admin account in the database.
 * Change the email/password below before running if needed.
 */
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ADMIN_EMAIL    = 'admin@foodbridge.ai';
const ADMIN_PASSWORD = 'Admin@FoodBridge2026';
const ADMIN_NAME     = 'FoodBridge Admin';

async function createAdmin() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/foodbridge';

  console.log('[Seeder] Connecting to MongoDB:', uri);
  await mongoose.connect(uri);

  // Dynamically load model after connection
  const { User } = await import('../models/User');

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`[Seeder] ⚠️  Admin account already exists: ${ADMIN_EMAIL}`);
    console.log(`[Seeder] Role: ${existing.role}`);
    await mongoose.disconnect();
    return;
  }

  const salt     = await bcrypt.genSalt(10);
  const hashed   = await bcrypt.hash(ADMIN_PASSWORD, salt);

  await User.create({
    name:       ADMIN_NAME,
    email:      ADMIN_EMAIL,
    password:   hashed,
    role:       'ADMIN',
    isVerified: true,
    trustScore: 100,
    location: {
      type: 'Point',
      coordinates: [0, 0],
    },
  });

  console.log('');
  console.log('✅  Admin account created successfully!');
  console.log('─────────────────────────────────────────');
  console.log(`   Email    : ${ADMIN_EMAIL}`);
  console.log(`   Password : ${ADMIN_PASSWORD}`);
  console.log(`   Role     : ADMIN`);
  console.log('─────────────────────────────────────────');
  console.log('Login at: http://localhost:3003/auth/login');
  console.log('');

  await mongoose.disconnect();
}

createAdmin().catch((err) => {
  console.error('[Seeder] ❌ Error:', err.message);
  process.exit(1);
});
