import { Schema, model } from 'mongoose';
import { IChat } from '../types';

const MessageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    seen: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const ChatSchema = new Schema<IChat>(
  {
    donation: {
      type: Schema.Types.ObjectId,
      ref: 'Donation',
      required: true,
    },
    donor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ngo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    messages: [MessageSchema],
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ChatSchema.index({ donation: 1 });
ChatSchema.index({ donor: 1, ngo: 1 });

export const Chat = model<IChat>('Chat', ChatSchema);
export default Chat;
