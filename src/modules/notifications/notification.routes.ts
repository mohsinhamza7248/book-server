import { Router } from 'express';
import { authenticate, requirePremium } from '../../middleware/authenticate';
import { sendReminder, sendBulkReminders } from './notification.controller';
import { validate } from '../../middleware/validate';
import Joi from 'joi';

const router = Router();
router.use(authenticate);

const reminderSchema = Joi.object({
  customerId: Joi.string().required(),
  channel: Joi.string().valid('whatsapp', 'sms').default('whatsapp'),
});

const bulkSchema = Joi.object({
  shopId: Joi.string().required(),
  channel: Joi.string().valid('whatsapp', 'sms').default('whatsapp'),
});

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: WhatsApp and SMS reminders
 */
router.post('/send-reminder', validate(reminderSchema), sendReminder);
router.post('/send-bulk', requirePremium, validate(bulkSchema), sendBulkReminders);

export default router;
