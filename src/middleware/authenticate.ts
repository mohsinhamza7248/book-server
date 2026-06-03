import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../modules/users/user.model';
import { AppError } from '../utils/AppError';

export interface AuthRequest extends Request {
  user?: {
    _id: string;
    phone: string;
    subscriptionPlan: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Please log in.', 401);
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new AppError('Server configuration error', 500);

    const decoded = jwt.verify(token, secret) as { userId: string };
    const user = await User.findById(decoded.userId).select('-__v');

    if (!user) throw new AppError('User not found or token is invalid.', 401);

    req.user = {
      _id: user._id.toString(),
      phone: user.phone,
      subscriptionPlan: user.subscriptionPlan,
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new AppError('Session expired. Please log in again.', 401));
    } else if (err instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid authentication token.', 401));
    } else {
      next(err);
    }
  }
};

export const requirePremium = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (req.user?.subscriptionPlan !== 'premium') {
    next(new AppError('This feature requires a Premium subscription. Upgrade to continue.', 403));
    return;
  }
  next();
};
