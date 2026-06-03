import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscription extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  plan: 'free' | 'premium';
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySubscriptionId?: string;
  amount: number;
  currency: string;
  expiryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['free', 'premium'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'pending'],
      default: 'active',
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySubscriptionId: { type: String },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    expiryDate: { type: Date },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);
