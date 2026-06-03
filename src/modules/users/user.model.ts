import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  phone: string;
  name: string;
  password?: string;
  profileImage?: string;
  subscriptionPlan: 'free' | 'premium';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      match: [/^\+91[6-9]\d{9}$/, 'Please enter a valid Indian mobile number with +91'],
    },
    name: {
      type: String,
      default: '',
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    password: {
      type: String,
      select: false,
    },
    profileImage: { type: String },
    subscriptionPlan: {
      type: String,
      enum: ['free', 'premium'],
      default: 'free',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password pre-save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const bcrypt = require('bcryptjs');
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err: any) {
    next(err);
  }
});

userSchema.index({ phone: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
