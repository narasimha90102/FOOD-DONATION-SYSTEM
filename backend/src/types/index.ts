import { Document, Types } from 'mongoose';

export type UserRole = 'DONOR' | 'NGO' | 'ADMIN';
export type NGOVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NONE';
export type DonationStatus = 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED' | 'COMPLETED';

export interface IRating {
  raterId: Types.ObjectId | string;
  score: number;
  comment?: string;
  createdAt: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  profilePicture: string;
  isVerified: boolean;
  verificationCode?: string;
  verificationCodeExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  impactPoints: number;
  mealsSaved: number;
  co2Reduction: number;
  activeStreak: number;
  lastDonationDate?: Date;
  ratings: IRating[];
  ratingAverage: number;
  trustScore: number;
  ngoVerificationStatus: NGOVerificationStatus;
  ngoDocumentUrl: string;
  businessRegistrationNumber: string;
  ngoCapacity: number;
  ngoAcceptedCategories: string[];
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  address: string;
  isBlocked: boolean;
  matchPassword(enteredPassword: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDonation extends Document {
  donor: Types.ObjectId | string | IUser;
  ngo?: Types.ObjectId | string | IUser;
  foodName: string;
  foodCategory: string;
  quantity: number;
  unit: string;
  preparationTime: Date;
  estimatedExpiryTime: Date;
  storageCondition: 'ambient' | 'refrigerated' | 'frozen';
  pickupAddress: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  foodImages: string[];
  specialInstructions?: string;
  status: DonationStatus;
  statusHistory: Array<{
    status: DonationStatus;
    updatedAt: Date;
    updatedBy: Types.ObjectId | string;
  }>;
  aiSafeWindowHours?: number;
  aiFreshnessScore?: number;
  aiRiskLevel?: 'safe' | 'warning' | 'danger';
  aiRecommendation?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage {
  sender: Types.ObjectId | string;
  text: string;
  imageUrl?: string;
  seen: boolean;
  createdAt: Date;
}

export interface IChat extends Document {
  donation: Types.ObjectId | string | IDonation;
  donor: Types.ObjectId | string | IUser;
  ngo: Types.ObjectId | string | IUser;
  messages: IMessage[];
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotification extends Document {
  recipient: Types.ObjectId | string;
  title: string;
  message: string;
  type: 'NEW_DONATION' | 'DONATION_ACCEPTED' | 'PICKUP_STARTED' | 'DELIVERY_COMPLETED' | 'EXPIRY_WARNING' | 'VERIFICATION_UPDATE' | 'CHAT';
  read: boolean;
  relatedId?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}
