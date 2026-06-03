import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { getCustomers, createCustomer, getCustomer, updateCustomer, deleteCustomer } from './customer.controller';
import { validate } from '../../middleware/validate';
import Joi from 'joi';

const router = Router();
router.use(authenticate);

const customerSchema = Joi.object({
  shopId: Joi.string().required(),
  name: Joi.string().max(100).required(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).optional().allow(''),
  address: Joi.string().optional().allow(''),
});

const updateSchema = customerSchema.fork(['shopId', 'name'], (s) => s.optional());

/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: Customer management
 */
router.get('/', getCustomers);
router.post('/', validate(customerSchema), createCustomer);
router.get('/:id', getCustomer);
router.put('/:id', validate(updateSchema), updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;
