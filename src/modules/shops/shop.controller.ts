import { Response, NextFunction } from 'express';
import { Shop } from './shop.model';
import { AuthRequest } from '../../middleware/authenticate';
import { AppError } from '../../utils/AppError';

export const getShops = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shops = await Shop.find({ userId: req.user?._id, isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, data: shops });
  } catch (err) { next(err); }
};

export const createShop = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await Shop.create({ ...req.body, userId: req.user?._id });
    res.status(201).json({ success: true, data: shop });
  } catch (err) { next(err); }
};

export const updateShop = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await Shop.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!shop) throw new AppError('Shop not found', 404);
    res.json({ success: true, data: shop });
  } catch (err) { next(err); }
};

export const deleteShop = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await Shop.findOneAndUpdate(
      { _id: req.params.id, userId: req.user?._id },
      { isActive: false },
      { new: true }
    );
    if (!shop) throw new AppError('Shop not found', 404);
    res.json({ success: true, message: 'Shop deleted' });
  } catch (err) { next(err); }
};
