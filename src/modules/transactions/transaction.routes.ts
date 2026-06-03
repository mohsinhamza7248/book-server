import { Router } from 'express';
import { authenticate, requirePremium } from '../../middleware/authenticate';
import { getTransactions, createTransaction, deleteTransaction, getDashboardSummary, getReport } from './transaction.controller';
import { validate } from '../../middleware/validate';
import Joi from 'joi';

const router = Router();
router.use(authenticate);

const txSchema = Joi.object({
  customerId: Joi.string().required(),
  shopId: Joi.string().required(),
  type: Joi.string().valid('UDHAR', 'PAYMENT').required(),
  amount: Joi.number().positive().required(),
  notes: Joi.string().max(500).optional().allow(''),
});

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Udhar and Payment transactions
 */
router.get('/summary', getDashboardSummary);
router.get('/report', getReport);
router.get('/', getTransactions);
router.post('/', validate(txSchema), createTransaction);
router.delete('/:id', deleteTransaction);

export default router;
