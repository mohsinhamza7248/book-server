import { Response, NextFunction } from 'express';
import { User } from './user.model';
import { AuthRequest } from '../../middleware/authenticate';
import { AppError } from '../../utils/AppError';

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id).select('-__v');
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

export const updateMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, profileImage } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      { name, profileImage },
      { new: true, runValidators: true }
    ).select('-__v');
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};
