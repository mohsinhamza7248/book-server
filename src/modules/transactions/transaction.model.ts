import mongoose, { Document, Schema } from 'mongoose';

export type TransactionType = 'UDHAR' | 'PAYMENT';

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: TransactionType;
  amount: number;
  notes?: string;
  balanceAfter: number;  // running balance snapshot
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    shopId: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['UDHAR', 'PAYMENT'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Amount must be at least ₹1'],
    },
    notes: { type: String, trim: true, maxlength: 500 },
    balanceAfter: { type: Number, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

transactionSchema.index({ shopId: 1, createdAt: -1 });
transactionSchema.index({ customerId: 1, createdAt: -1 });
transactionSchema.index({ shopId: 1, type: 1, createdAt: -1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
