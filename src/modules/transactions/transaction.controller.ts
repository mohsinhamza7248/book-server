import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Transaction } from './transaction.model';
import { Customer } from '../customers/customer.model';
import { AuthRequest } from '../../middleware/authenticate';
import { AppError } from '../../utils/AppError';
import { emitToShop } from '../../config/socket';

export const getTransactions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { customerId, shopId, page = 1, limit = 30 } = req.query;
    if (!shopId && !customerId) throw new AppError('shopId or customerId is required', 400);

    const filter: Record<string, unknown> = { userId: req.user?._id, isDeleted: false };
    if (customerId) filter.customerId = new mongoose.Types.ObjectId(customerId as string);
    if (shopId) filter.shopId = new mongoose.Types.ObjectId(shopId as string);

    const skip = (Number(page) - 1) * Number(limit);
    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('customerId', 'name phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) { next(err); }
};

export const createTransaction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { customerId, shopId, type, amount, notes } = req.body;

    const customer = await Customer.findOne({ _id: customerId, isDeleted: false });
    if (!customer) throw new AppError('Customer not found', 404);

    // Calculate new balance
    const delta = type === 'UDHAR' ? amount : -amount;
    const newBalance = customer.balance + delta;

    // Create transaction record
    const [transaction] = await Transaction.create([{
      customerId,
      shopId,
      userId: req.user?._id,
      type,
      amount,
      notes,
      balanceAfter: newBalance,
    }]);

    // Update customer balance
    await Customer.findByIdAndUpdate(
      customerId,
      { balance: newBalance, lastTransactionAt: new Date() }
    );

    const populatedTx = await transaction.populate('customerId', 'name phone');
    emitToShop(shopId, 'transaction:created', populatedTx);

    res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    next(err);
  }
};

export const deleteTransaction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user?._id, isDeleted: false });
    if (!tx) throw new AppError('Transaction not found', 404);

    // Reverse the balance effect
    const delta = tx.type === 'UDHAR' ? -tx.amount : tx.amount;
    await Customer.findByIdAndUpdate(tx.customerId, { $inc: { balance: delta } });
    await Transaction.findByIdAndUpdate(tx._id, { isDeleted: true });

    emitToShop(tx.shopId.toString(), 'transaction:deleted', {
      transactionId: tx._id,
      customerId: tx.customerId,
      amount: tx.amount,
      type: tx.type,
    });

    res.json({ success: true, message: 'Transaction deleted and balance reversed' });
  } catch (err) {
    next(err);
  }
};

export const getDashboardSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { shopId } = req.query;
    if (!shopId) throw new AppError('shopId is required', 400);

    const shopObjId = new mongoose.Types.ObjectId(shopId as string);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const [summary] = await Transaction.aggregate([
      { $match: { shopId: shopObjId, userId: new mongoose.Types.ObjectId(req.user!._id), isDeleted: false } },
      {
        $group: {
          _id: null,
          totalUdhar: { $sum: { $cond: [{ $eq: ['$type', 'UDHAR'] }, '$amount', 0] } },
          totalPayments: { $sum: { $cond: [{ $eq: ['$type', 'PAYMENT'] }, '$amount', 0] } },
          todayUdhar: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'UDHAR'] }, { $gte: ['$createdAt', todayStart] }] }, '$amount', 0] } },
          todayPayments: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'PAYMENT'] }, { $gte: ['$createdAt', todayStart] }] }, '$amount', 0] } },
        },
      },
    ]);

    const totalPending = await Customer.aggregate([
      { $match: { shopId: shopObjId, isDeleted: false, balance: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$balance' } } },
    ]);

    res.json({
      success: true,
      data: {
        totalUdhar: summary?.totalUdhar || 0,
        totalPayments: summary?.totalPayments || 0,
        pending: totalPending[0]?.total || 0,
        todayTotal: (summary?.todayUdhar || 0) + (summary?.todayPayments || 0),
      },
    });
  } catch (err) { next(err); }
};

export const getReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { shopId, period = 'monthly' } = req.query;
    if (!shopId) throw new AppError('shopId is required', 400);

    const now = new Date();
    let startDate: Date;
    let groupFormat: string;

    if (period === 'weekly') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      groupFormat = '%Y-%m-%d';
    } else if (period === 'yearly') {
      startDate = new Date(now.getFullYear(), 0, 1);
      groupFormat = '%Y-%m';
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      groupFormat = '%Y-%m-%d';
    }

    const data = await Transaction.aggregate([
      {
        $match: {
          shopId: new mongoose.Types.ObjectId(shopId as string),
          userId: new mongoose.Types.ObjectId(req.user!._id),
          isDeleted: false,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { date: { $dateToString: { format: groupFormat, date: '$createdAt' } }, type: '$type' },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    res.json({ success: true, data, period, startDate });
  } catch (err) { next(err); }
};
