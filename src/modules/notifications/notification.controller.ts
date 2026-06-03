import { Response, NextFunction } from 'express';
import twilio from 'twilio';
import { Customer } from '../customers/customer.model';
import { AuthRequest } from '../../middleware/authenticate';
import { AppError } from '../../utils/AppError';
import { logger } from '../../config/logger';

const getTwilioClient = () =>
  twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const buildReminderMessage = (customerName: string, balance: number, shopName: string): string => {
  return `🙏 Namaste ${customerName}!

आपके ${shopName} में ₹${balance.toLocaleString('en-IN')} का udhar बाकी है।

Dear ${customerName}, you have an outstanding balance of ₹${balance.toLocaleString('en-IN')} at ${shopName}.

Please clear when convenient. Thank you!
— Powered by UdharBook`;
};

export const sendReminder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { customerId, channel = 'sms' } = req.body;
    const customer = await Customer.findOne({ _id: customerId, userId: req.user?._id, isDeleted: false });
    if (!customer) throw new AppError('Customer not found', 404);
    if (!customer.phone) throw new AppError('Customer has no phone number', 400);
    if (customer.balance <= 0) throw new AppError('Customer has no outstanding balance', 400);

    const message = buildReminderMessage(customer.name, customer.balance, 'your shop');
    const to = `+91${customer.phone}`;

    if (process.env.BYPASS_NOTIFICATIONS === 'true') {
      logger.info(`[BYPASS] Skip sending actual ${channel} reminder to ${to}. Message: ${message}`);
      res.json({ success: true, message: `Reminder bypassed via ${channel} (Test mode)` });
      return;
    }

    const client = getTwilioClient();
    await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
      body: message,
    });

    logger.info(`Reminder sent to ${customer.phone} via ${channel}`);
    res.json({ success: true, message: `Reminder sent via ${channel}` });
  } catch (err) { next(err); }
};

export const sendBulkReminders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { shopId, channel = 'sms' } = req.body;
    const customers = await Customer.find({
      shopId,
      userId: req.user?._id,
      isDeleted: false,
      balance: { $gt: 0 },
      phone: { $exists: true, $ne: '' },
    });

    const toNumbers = customers.map(c => `+91${c.phone}`);

    if (process.env.BYPASS_NOTIFICATIONS === 'true') {
      logger.info(`[BYPASS] Skip sending actual bulk ${channel} reminders to ${toNumbers.join(', ')}`);
      res.json({ success: true, message: `Bypassed ${customers.length} reminders via ${channel} (Test mode)`, sent: customers.length, failed: 0 });
      return;
    }

    const client = getTwilioClient();
    const results = await Promise.allSettled(
      customers.map(async (customer) => {
        const message = buildReminderMessage(customer.name, customer.balance, 'your shop');
        const to = `+91${customer.phone}`;
        return client.messages.create({ from: process.env.TWILIO_PHONE_NUMBER, to, body: message });
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    res.json({ success: true, message: `Sent ${sent} reminders, ${failed} failed`, sent, failed });
  } catch (err) { next(err); }
};
