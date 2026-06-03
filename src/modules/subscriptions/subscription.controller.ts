import { Response, NextFunction, Request } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Subscription } from './subscription.model';
import { User } from '../users/user.model';
import { AuthRequest } from '../../middleware/authenticate';
import { AppError } from '../../utils/AppError';
import { logger } from '../../config/logger';

const getRazorpay = () => new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export const getPlans = async (_req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    data: [
      {
        id: 'free',
        name: 'Free / मुफ्त',
        price: 0,
        currency: 'INR',
        features: ['Up to 50 customers', 'Basic ledger tracking', 'Manual SMS reminders'],
        limitations: ['No auto-reminders', 'No PDF reports'],
      },
      {
        id: 'premium',
        name: 'Premium / प्रीमियम',
        price: 9900, // paise
        currency: 'INR',
        features: ['Unlimited customers', 'Automatic SMS/WhatsApp reminders', 'Professional PDF reports', 'Multi-device sync', 'Priority support'],
        razorpayPlanId: process.env.RAZORPAY_PREMIUM_PLAN_ID,
      },
    ],
  });
};

export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const razorpay = getRazorpay();
    const amount = Number(process.env.PREMIUM_MONTHLY_AMOUNT) || 9900;

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `udhar_${req.user?._id}_${Date.now()}`,
      notes: { userId: req.user?._id || '' },
    });

    // Create pending subscription record
    await Subscription.create({
      userId: req.user?._id,
      plan: 'premium',
      status: 'pending',
      razorpayOrderId: order.id,
      amount,
    });

    res.status(201).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) { next(err); }
};

export const verifyPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      throw new AppError('Payment verification failed. Invalid signature.', 400);
    }

    // Activate subscription
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    await Subscription.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { status: 'active', razorpayPaymentId: razorpay_payment_id, expiryDate },
    );

    await User.findByIdAndUpdate(req.user?._id, { subscriptionPlan: 'premium' });

    logger.info(`Premium activated for user ${req.user?._id}`);
    res.json({ success: true, message: 'Premium plan activated successfully! 🎉' });
  } catch (err) { next(err); }
};

export const handleWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const body = JSON.stringify(req.body);
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

    if (signature !== expectedSig) {
      throw new AppError('Invalid webhook signature', 400);
    }

    const { event, payload } = req.body;
    if (event === 'subscription.charged') {
      const subscriptionId = payload.subscription?.entity?.id;
      const sub = await Subscription.findOne({ razorpaySubscriptionId: subscriptionId });
      if (sub) {
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        await sub.updateOne({ status: 'active', expiryDate });
        logger.info(`Subscription renewed: ${subscriptionId}`);
      }
    } else if (event === 'subscription.cancelled') {
      const subscriptionId = payload.subscription?.entity?.id;
      const sub = await Subscription.findOne({ razorpaySubscriptionId: subscriptionId });
      if (sub) {
        await sub.updateOne({ status: 'cancelled' });
        await User.findByIdAndUpdate(sub.userId, { subscriptionPlan: 'free' });
        logger.info(`Subscription cancelled: ${subscriptionId}`);
      }
    }

    res.json({ success: true });
  } catch (err) { next(err); }
};
