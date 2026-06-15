/**
 * One-time Admin Account Seeder
 * Run: npx ts-node --project tsconfig.json src/scripts/createAdmin.ts
 *
 * NOTE: Do NOT manually hash the password here.
 * The User model pre('save') hook handles hashing automatically.
 * Pre-hashing + save hook = double hash = login always fails.
 */
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ADMIN_EMAIL    = 'admin@foodbridge.ai';
const ADMIN_PASSWORD = 'Admin@FoodBridge2026';
const ADMIN_NAME     = 'FoodBridge Admin';

async function createAdmin() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/foodbridge';

  console.log('[Seeder] Connecting to MongoDB:', uri);
  await mongoose.connect(uri);

  const { User } = await import('../models/User');

  // Delete existing (possibly broken / double-hashed) admin first
  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log('[Seeder] Found existing admin — deleting and recreating...');
    await User.deleteOne({ email: ADMIN_EMAIL });
  }

  // Pass PLAIN text — the pre("save") hook hashes it exactly once
  await User.create({
    name:       ADMIN_NAME,
    email:      ADMIN_EMAIL,
    password:   ADMIN_PASSWORD,
    role:       'ADMIN',
    isVerified: true,
    trustScore: 100,
    location: { type: 'Point', coordinates: [0, 0] },
  });

  console.log('\n✅  Admin account created successfully!');
  console.log('─────────────────────────────────────────');
  console.log(`   Email    : ${ADMIN_EMAIL}`);
  console.log(`   Password : ${ADMIN_PASSWORD}`);
  console.log(`   Role     : ADMIN`);
  console.log('─────────────────────────────────────────\n');

  await mongoose.disconnect();
}

createAdmin().catch((err) => {
  console.error('[Seeder] ❌ Error:', err.message);
  process.exit(1);
});
