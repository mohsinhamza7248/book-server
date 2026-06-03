import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { getMe, updateMe } from './user.controller';
import { validate } from '../../middleware/validate';
import Joi from 'joi';

const router = Router();
router.use(authenticate);

const updateSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  profileImage: Joi.string().uri().optional(),
});

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile management
 */
router.get('/me', getMe);
router.put('/me', validate(updateSchema), updateMe);

export default router;
