import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { getShops, createShop, updateShop, deleteShop } from './shop.controller';
import { validate } from '../../middleware/validate';
import Joi from 'joi';

const router = Router();
router.use(authenticate);

const shopSchema = Joi.object({
  shopName: Joi.string().max(150).required(),
  address: Joi.string().optional(),
  businessCategory: Joi.string().valid('kirana','medical','dairy','electronics','clothing','other').optional(),
  phone: Joi.string().optional(),
});

const updateSchema = shopSchema.fork(['shopName'], (s) => s.optional());

/**
 * @swagger
 * tags:
 *   name: Shops
 *   description: Multi-shop management
 */
router.get('/', getShops);
router.post('/', validate(shopSchema), createShop);
router.put('/:id', validate(updateSchema), updateShop);
router.delete('/:id', deleteShop);

export default router;
