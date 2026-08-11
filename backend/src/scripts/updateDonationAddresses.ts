import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function updateExistingDonations() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/foodbridge';
  console.log('[Script] Connecting to MongoDB:', uri);
  await mongoose.connect(uri);

  const { Donation } = await import('../models/Donation');

  const newAddress = 'Saveetha College of Architecture and Design (SCAD), Thandalam, Sriperumbudur, Tamil Nadu, India';
  const newCoords: [number, number] = [80.016108, 13.028344]; // [lng, lat]

  const result = await Donation.updateMany(
    {},
    {
      $set: {
        pickupAddress: newAddress,
        'location.coordinates': newCoords,
      },
    }
  );

  console.log(`\n✅ Updated ${result.modifiedCount} donation records to SCAD, Thandalam!\n`);
  await mongoose.disconnect();
}

updateExistingDonations().catch(console.error);
