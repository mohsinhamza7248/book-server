import mongoose, { Document, Schema } from 'mongoose';

export interface IShop extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  shopName: string;
  address?: string;
  businessCategory?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const shopSchema = new Schema<IShop>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    shopName: {
      type: String,
      required: [true, 'Shop name is required'],
      trim: true,
      maxlength: [150, 'Shop name cannot exceed 150 characters'],
    },
    address: { type: String, trim: true },
    businessCategory: {
      type: String,
      enum: ['kirana', 'medical', 'dairy', 'electronics', 'clothing', 'other'],
      default: 'kirana',
    },
    phone: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

shopSchema.index({ userId: 1, shopName: 1 });

export const Shop = mongoose.model<IShop>('Shop', shopSchema);
