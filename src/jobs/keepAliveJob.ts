import cron from 'node-cron';
import http from 'http';
import https from 'https';
import { logger } from '../config/logger';

const url = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL;

if (url) {
  // Schedule to run every 5 minutes
  cron.schedule('*/4 * * * *', () => {
    const pingUrl = `${url.replace(/\/$/, '')}/health`;
    logger.info(`Pinging server health endpoint: ${pingUrl}`);

    const protocol = pingUrl.startsWith('https') ? https : http;

    protocol.get(pingUrl, (res) => {
      if (res.statusCode === 200) {
        logger.info(`Keep-alive ping successful (Status: ${res.statusCode})`);
      } else {
        logger.warn(`Keep-alive ping returned non-200 status: ${res.statusCode}`);
      }
    }).on('error', (err) => {
      logger.error('Keep-alive ping failed with error:', err);
    });
  });

  logger.info(`📅 Keep-alive cron job initialized to ping: ${url}`);
} else {
  logger.warn('⚠️ Keep-alive cron job NOT scheduled: Neither BACKEND_URL nor RENDER_EXTERNAL_URL environment variable is defined.');
}
