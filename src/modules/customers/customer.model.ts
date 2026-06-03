import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  _id: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  address?: string;
  balance: number;  // positive = customer owes you (udhar), negative = you owe customer
  lastTransactionAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
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
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number'],
    },
    address: { type: String, trim: true },
    balance: { type: Number, default: 0 },
    lastTransactionAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

customerSchema.index({ shopId: 1, name: 'text', phone: 1 });
customerSchema.index({ shopId: 1, isDeleted: 1 });

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);
