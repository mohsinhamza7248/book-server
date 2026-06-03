import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { getPlans, createOrder, verifyPayment, handleWebhook } from './subscription.controller';
import { validate } from '../../middleware/validate';
import Joi from 'joi';

const router = Router();

const verifySchema = Joi.object({
  razorpay_order_id: Joi.string().required(),
  razorpay_payment_id: Joi.string().required(),
  razorpay_signature: Joi.string().required(),
});

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: SaaS subscription management
 */
router.get('/plans', getPlans);
router.post('/webhook', handleWebhook); // Must be before authenticate
router.use(authenticate);
router.post('/create-order', createOrder);
router.post('/verify-payment', validate(verifySchema), verifyPayment);

export default router;
