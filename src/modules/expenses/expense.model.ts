import mongoose, { Document, Schema } from 'mongoose';

export type ExpenseCategory = 'RENT' | 'ELECTRICITY' | 'SALARY' | 'STOCK' | 'OTHER';

export interface IExpense extends Document {
  _id: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  category: ExpenseCategory;
  amount: number;
  notes?: string;
  date: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
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
    category: {
      type: String,
      enum: ['RENT', 'ELECTRICITY', 'SALARY', 'STOCK', 'OTHER'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Amount must be at least ₹1'],
    },
    notes: { type: String, trim: true, maxlength: 500 },
    date: { type: Date, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

expenseSchema.index({ shopId: 1, date: -1 });
expenseSchema.index({ shopId: 1, category: 1, date: -1 });

export const Expense = mongoose.model<IExpense>('Expense', expenseSchema);
