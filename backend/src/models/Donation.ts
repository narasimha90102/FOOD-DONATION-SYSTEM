import { Schema, model } from 'mongoose';
import { IDonation } from '../types';

const DonationSchema = new Schema<IDonation>(
  {
    donor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Donation must have a donor'],
    },
    ngo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    foodName: {
      type: String,
      required: [true, 'Please provide food name'],
      trim: true,
    },
    foodCategory: {
      type: String,
      required: [true, 'Please select food category'],
      enum: ['Veg Meal', 'Non-Veg Meal', 'Dry Rations', 'Bakery', 'Fruits', 'Vegetables', 'Other'],
    },
    quantity: {
      type: Number,
      required: [true, 'Please provide quantity'],
      min: [0.1, 'Quantity must be positive'],
    },
    unit: {
      type: String,
      required: [true, 'Please specify unit (e.g. kg, servings, items)'],
      trim: true,
    },
    preparationTime: {
      type: Date,
      required: [true, 'Please specify preparation date/time'],
    },
    estimatedExpiryTime: {
      type: Date,
      required: [true, 'Please specify estimated expiry date/time'],
    },
    storageCondition: {
      type: String,
      enum: ['ambient', 'refrigerated', 'frozen'],
      default: 'ambient',
    },
    pickupAddress: {
      type: String,
      required: [true, 'Please enter pickup address'],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Please specify GPS coordinates'],
      },
    },
    foodImages: {
      type: [String],
      default: [],
    },
    specialInstructions: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'DELIVERED', 'COMPLETED'],
      default: 'PENDING',
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        updatedAt: { type: Date, default: Date.now },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    // AI analysis cache
    aiSafeWindowHours: {
      type: Number,
    },
    aiFreshnessScore: {
      type: Number,
    },
    aiRiskLevel: {
      type: String,
      enum: ['safe', 'warning', 'danger'],
    },
    aiRecommendation: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Geo Indexes
DonationSchema.index({ location: '2dsphere' });
DonationSchema.index({ donor: 1 });
DonationSchema.index({ ngo: 1 });
DonationSchema.index({ status: 1 });

export const Donation = model<IDonation>('Donation', DonationSchema);
export default Donation;
