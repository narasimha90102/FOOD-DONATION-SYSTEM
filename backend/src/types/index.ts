import { Document, Types } from 'mongoose';

export type UserRole = 'DONOR' | 'NGO' | 'ADMIN' | 'VOLUNTEER';
export type NGOVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NONE';
export type DonationStatus =
  | 'PENDING'
  | 'AI_SCREENING'
  | 'APPROVED'
  | 'NGO_MATCHED'
  | 'NGO_ACCEPTED'
  | 'VOLUNTEER_ASSIGNED'
  | 'GOING_TO_PICKUP'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'DISTRIBUTED'
  | 'REDISTRIBUTED_TO_BENEFICIARIES'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

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
  phoneNumber?: string;
  isBlocked: boolean;
  volunteerAvailability?: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  volunteerStatus?: 'ACTIVE' | 'INACTIVE';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  status?: 'pending' | 'active' | 'rejected';
  matchPassword(enteredPassword: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDonation extends Document {
  donor: Types.ObjectId | string | IUser;
  ngo?: Types.ObjectId | string | IUser;
  volunteer?: Types.ObjectId | string | IUser;
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
  destinationAddress?: string;
  destinationLocation?: {
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
  distribution?: {
    distributedQuantity: number;
    beneficiariesCount: number;
    distributionDate: Date;
    location: string;
    remainingQuantity: number;
    notes?: string;
  };
  cancelledBy?: Types.ObjectId | string | IUser;
  cancelledByRole?: 'DONOR' | 'NGO' | 'ADMIN' | 'VOLUNTEER';
  cancellationReason?: string;
  cancellationProof?: string;
  cancelledAt?: Date;
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
  type:
    | 'NEW_DONATION'
    | 'DONATION_ACCEPTED'
    | 'DONATION_CANCELLED'
    | 'PICKUP_STARTED'
    | 'DELIVERY_COMPLETED'
    | 'EXPIRY_WARNING'
    | 'VERIFICATION_UPDATE'
    | 'TRUST_SCORE_UPDATE'
    | 'CHAT';
  read: boolean;
  relatedId?: Types.ObjectId | string;
  recipientRole?: string;
  relatedType?: string;
  navigationRoute?: string;
  createdAt: Date;
  updatedAt: Date;
}
