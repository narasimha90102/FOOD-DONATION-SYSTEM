import { Schema, model } from 'mongoose';
import { INotification } from '../types';

const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'NEW_DONATION',
        'DONATION_ACCEPTED',
        'PICKUP_STARTED',
        'DELIVERY_COMPLETED',
        'EXPIRY_WARNING',
        'VERIFICATION_UPDATE',
        'CHAT',
      ],
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    relatedId: {
      type: Schema.Types.ObjectId, // Could point to Donation or Chat ID depending on type
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
NotificationSchema.index({ recipient: 1 });
NotificationSchema.index({ read: 1 });

export const Notification = model<INotification>('Notification', NotificationSchema);
export default Notification;
