import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types';

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Please enter a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please enter an email'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please enter a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['DONOR', 'NGO', 'ADMIN'],
      default: 'DONOR',
    },
    profilePicture: {
      type: String,
      default: '',
    },
    // Authentication / Verification
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationCode: String,
    verificationCodeExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    
    // Impact Points & Metrics (for Donors)
    impactPoints: {
      type: Number,
      default: 0,
    },
    mealsSaved: {
      type: Number,
      default: 0,
    },
    co2Reduction: {
      type: Number, // In kilograms
      default: 0.0,
    },
    activeStreak: {
      type: Number,
      default: 0,
    },
    lastDonationDate: {
      type: Date,
    },

    // Rating System (NGO can rate Donor, Donor can rate NGO)
    ratings: [
      {
        raterId: { type: Schema.Types.ObjectId, ref: 'User' },
        score: { type: Number, required: true, min: 1, max: 5 },
        comment: String,
        createdAt: { type: Date, default: Date.now }
      }
    ],
    ratingAverage: {
      type: Number,
      default: 5.0,
    },
    
    // Trust Score (Dynamic: 0 - 100)
    trustScore: {
      type: Number,
      default: 85, // Default average trust score
    },

    // NGO Specific Attributes
    ngoVerificationStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'NONE'],
      default: function(this: any) {
        return this.role === 'NGO' ? 'PENDING' : 'NONE';
      },
    },
    ngoDocumentUrl: {
      type: String,
      default: '',
    },
    businessRegistrationNumber: {
      type: String,
      default: '',
    },
    ngoCapacity: {
      type: Number, // Estimated meals they can manage daily
      default: 100,
    },
    ngoAcceptedCategories: {
      type: [String],
      default: ['Veg Meal', 'Non-Veg Meal', 'Dry Rations', 'Bakery', 'Fruits', 'Vegetables'],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    address: {
      type: String,
      default: '',
    },
    phoneNumber: {
      type: String,
      default: '',
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
UserSchema.index({ location: '2dsphere' });

UserSchema.pre('save', async function (this: any, next) {
  if (!this.isModified('password')) {
    return next();
  }
  if (!this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
UserSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = model<IUser>('User', UserSchema);
export default User;
