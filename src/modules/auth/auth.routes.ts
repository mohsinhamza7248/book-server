import { Router } from 'express';
import { sendOtp, verifyOtp, refreshToken, testLogin, register, login } from './auth.controller';
import { validate } from '../../middleware/validate';
import Joi from 'joi';

const router = Router();

const verifySchema = Joi.object({
  idToken: Joi.string().required(),
  name: Joi.string().max(100).optional(),
});

const testLoginSchema = Joi.object({
  phone: Joi.string().required(),
  name: Joi.string().max(100).optional(),
});

const registerSchema = Joi.object({
  name: Joi.string().max(100).required().messages({
    'string.empty': 'Name is required',
  }),
  phone: Joi.string().required().messages({
    'string.empty': 'Phone number is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'string.empty': 'Password is required',
  }),
});

const loginSchema = Joi.object({
  phone: Joi.string().required().messages({
    'string.empty': 'Phone number is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'string.empty': 'Password is required',
  }),
});

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */
router.post('/send-otp', sendOtp);
router.post('/verify-otp', validate(verifySchema), verifyOtp);
router.post('/refresh-token', refreshToken);
router.post('/test-login', validate(testLoginSchema), testLogin);
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

export default router;
