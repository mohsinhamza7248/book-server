import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Expense } from './expense.model';
import { AuthRequest } from '../../middleware/authenticate';
import { AppError } from '../../utils/AppError';

// GET /expenses?shopId=&period=today|weekly|monthly|all&page=&limit=
export const getExpenses = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { shopId, period = 'monthly', page = 1, limit = 50 } = req.query;
    if (!shopId) throw new AppError('shopId is required', 400);

    const filter: Record<string, unknown> = {
      shopId: new mongoose.Types.ObjectId(shopId as string),
      userId: req.user?._id,
      isDeleted: false,
    };

    const now = new Date();
    if (period === 'today') {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      filter.date = { $gte: start };
    } else if (period === 'weekly') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filter.date = { $gte: start };
    } else if (period === 'monthly') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      filter.date = { $gte: start };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [expenses, total] = await Promise.all([
      Expense.find(filter).sort({ date: -1 }).skip(skip).limit(Number(limit)),
      Expense.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: expenses,
      pagination: { page: Number(page), limit: Number(limit), total },
    });
  } catch (err) { next(err); }
};

// GET /expenses/summary?shopId=
export const getExpenseSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { shopId } = req.query;
    if (!shopId) throw new AppError('shopId is required', 400);

    const shopObjId = new mongoose.Types.ObjectId(shopId as string);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [monthlySummary, categoryBreakdown] = await Promise.all([
      Expense.aggregate([
        {
          $match: {
            shopId: shopObjId,
            userId: new mongoose.Types.ObjectId(req.user!._id),
            isDeleted: false,
            date: { $gte: monthStart },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Expense.aggregate([
        {
          $match: {
            shopId: shopObjId,
            userId: new mongoose.Types.ObjectId(req.user!._id),
            isDeleted: false,
            date: { $gte: monthStart },
          },
        },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        monthlyTotal: monthlySummary[0]?.total || 0,
        monthlyCount: monthlySummary[0]?.count || 0,
        categoryBreakdown,
      },
    });
  } catch (err) { next(err); }
};

// POST /expenses
export const createExpense = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { shopId, category, amount, notes, date } = req.body;
    if (!shopId || !category || !amount || !date) throw new AppError('shopId, category, amount, and date are required', 400);

    const expense = await Expense.create({
      shopId,
      userId: req.user?._id,
      category,
      amount: Number(amount),
      notes,
      date: new Date(date),
    });

    res.status(201).json({ success: true, data: expense });
  } catch (err) { next(err); }
};

// DELETE /expenses/:id
export const deleteExpense = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, userId: req.user?._id, isDeleted: false });
    if (!expense) throw new AppError('Expense not found', 404);

    await Expense.findByIdAndUpdate(expense._id, { isDeleted: true });
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) { next(err); }
};
