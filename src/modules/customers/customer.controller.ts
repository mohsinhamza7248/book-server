import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Customer } from './customer.model';
import { AuthRequest } from '../../middleware/authenticate';
import { AppError } from '../../utils/AppError';
import { emitToShop } from '../../config/socket';

export const getCustomers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { shopId, search, page = 1, limit = 50 } = req.query;
    if (!shopId) throw new AppError('shopId is required', 400);

    const filter: Record<string, unknown> = {
      shopId: new mongoose.Types.ObjectId(shopId as string),
      userId: req.user?._id,
      isDeleted: false,
    };

    if (search) {
      filter.$or = [
        { name: { $regex: search as string, $options: 'i' } },
        { phone: { $regex: search as string, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [customers, total] = await Promise.all([
      Customer.find(filter).sort({ lastTransactionAt: -1, name: 1 }).skip(skip).limit(Number(limit)),
      Customer.countDocuments(filter),
    ]);

    // Summary
    const you_get = customers.filter(c => c.balance > 0).reduce((s, c) => s + c.balance, 0);
    const you_give = customers.filter(c => c.balance < 0).reduce((s, c) => s + Math.abs(c.balance), 0);

    res.json({
      success: true,
      data: customers,
      summary: { you_get, you_give },
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) { next(err); }
};

export const createCustomer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customer = await Customer.create({ ...req.body, userId: req.user?._id });
    emitToShop(customer.shopId.toString(), 'customer:created', customer);
    res.status(201).json({ success: true, data: customer });
  } catch (err) { next(err); }
};

export const getCustomer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, userId: req.user?._id, isDeleted: false });
    if (!customer) throw new AppError('Customer not found', 404);
    res.json({ success: true, data: customer });
  } catch (err) { next(err); }
};

export const updateCustomer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, phone, address } = req.body;
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?._id, isDeleted: false },
      { name, phone, address },
      { new: true, runValidators: true }
    );
    if (!customer) throw new AppError('Customer not found', 404);
    emitToShop(customer.shopId.toString(), 'customer:updated', customer);
    res.json({ success: true, data: customer });
  } catch (err) { next(err); }
};

export const deleteCustomer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?._id },
      { isDeleted: true },
      { new: true }
    );
    if (!customer) throw new AppError('Customer not found', 404);
    emitToShop(customer.shopId.toString(), 'customer:deleted', { customerId: customer._id });
    res.json({ success: true, message: 'Customer deleted' });
  } catch (err) { next(err); }
};
