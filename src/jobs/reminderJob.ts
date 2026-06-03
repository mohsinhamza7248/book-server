import cron from 'node-cron';
import { Customer } from '../modules/customers/customer.model';
import { logger } from '../config/logger';
import twilio from 'twilio';

// Run daily at 10:00 AM IST
cron.schedule('30 4 * * *', async () => {
  logger.info('🔔 Running daily reminder cron job...');
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    // Find all customers with outstanding balance and a phone number
    const customers = await Customer.find({
      isDeleted: false,
      balance: { $gt: 500 }, // Only remind for balances > ₹500
      phone: { $exists: true, $ne: '' },
    }).populate('shopId', 'shopName');

    logger.info(`Found ${customers.length} customers to remind`);

    let sent = 0;
    let failed = 0;

    for (const customer of customers) {
      try {
        const shopName = (customer.shopId as any)?.shopName || 'your shop';
        const message = `🙏 ${customer.name} ji, ${shopName} mein ₹${customer.balance.toLocaleString('en-IN')} udhar baaki hai. Kripa karke jaldi bhugtaan karein. Thank you! — UdharBook`;
        
        if (process.env.BYPASS_NOTIFICATIONS === 'true') {
          logger.info(`[BYPASS] Skip sending cron WhatsApp reminder to +91${customer.phone}: ${message}`);
        } else {
          await client.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `+91${customer.phone}`,
            body: message,
          });
        }
        sent++;
      } catch {
        failed++;
      }
    }

    logger.info(`Daily reminders: ${sent} sent, ${failed} failed`);
  } catch (err) {
    logger.error('Reminder cron job failed:', err);
  }
}, {
  timezone: 'Asia/Kolkata',
});

logger.info('📅 Daily reminder cron job scheduled (10:00 AM IST)');
