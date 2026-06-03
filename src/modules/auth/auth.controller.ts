import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';
import { User } from '../users/user.model';
import { Shop } from '../shops/shop.model';
import { initFirebase } from '../../config/firebase';
import { AppError } from '../../utils/AppError';

initFirebase();

const signToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ userId }, secret, { expiresIn } as jwt.SignOptions);
};

/**
 * @swagger
 * /auth/send-otp:
 *   post:
 *     summary: Send OTP to phone number (handled by Firebase on client)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *     responses:
 *       200:
 *         description: OTP sent successfully (managed by Firebase client SDK)
 */
export const sendOtp = async (
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  // OTP sending is handled client-side by Firebase SDK.
  // This endpoint just confirms the server is ready.
  res.json({ success: true, message: 'Please use Firebase SDK to send OTP on the client.' });
};

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify Firebase ID token and issue JWT
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: JWT issued
 *       401:
 *         description: Invalid token
 */
export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { idToken, name } = req.body;
    if (!idToken) throw new AppError('Firebase ID token is required', 400);

    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const phone = decodedToken.phone_number;
    if (!phone) throw new AppError('Phone number not found in token', 400);

    // Find or create user
    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({
        phone,
        name: name || '',
        subscriptionPlan: 'free',
      });
      // Create default shop
      await Shop.create({
        userId: user._id,
        shopName: name ? `${name.trim()}'s Shop` : 'My Shop',
        businessCategory: 'kirana',
      });
    }

    const token = signToken(user._id.toString());

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          _id: user._id,
          phone: user.phone,
          name: user.name,
          subscriptionPlan: user.subscriptionPlan,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh JWT token
 *     tags: [Auth]
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.body;
    if (!token) throw new AppError('Token is required', 400);

    const secret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, secret, { ignoreExpiration: true }) as { userId: string };

    const user = await User.findById(decoded.userId);
    if (!user) throw new AppError('User not found', 404);

    const newToken = signToken(user._id.toString());
    res.json({ success: true, data: { token: newToken } });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /auth/test-login:
 *   post:
 *     summary: Testing login to directly get JWT token (Development/Testing only)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+919999999999"
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Test Login successful
 *       403:
 *         description: Forbidden in production
 */
export const testLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_TEST_LOGIN !== 'true') {
      throw new AppError('Test login is disabled in production', 403);
    }

    const { phone, name } = req.body;
    if (!phone) throw new AppError('Phone number is required', 400);

    // Find or create user
    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({
        phone,
        name: name || 'Test User',
        subscriptionPlan: 'free',
      });
      // Create default shop
      await Shop.create({
        userId: user._id,
        shopName: name ? `${name.trim()}'s Shop` : 'Demo Shop',
        businessCategory: 'kirana',
      });
    }

    const token = signToken(user._id.toString());

    res.status(200).json({
      success: true,
      message: 'Test Login successful (Bypassed OTP)',
      data: {
        token,
        user: {
          _id: user._id,
          phone: user.phone,
          name: user.name,
          subscriptionPlan: user.subscriptionPlan,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user with name, phone, and password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone, password]
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Phone number already exists or invalid data
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) {
      throw new AppError('Name, phone, and password are required', 400);
    }

    // Format phone to include +91 prefix
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('+91')) {
      const cleaned = formattedPhone.replace(/\D/g, '');
      const last10 = cleaned.slice(-10);
      formattedPhone = `+91${last10}`;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phone: formattedPhone });
    if (existingUser) {
      throw new AppError('A user with this phone number already exists', 400);
    }

    // Create user (password will be hashed pre-save)
    const user = await User.create({
      name: name.trim(),
      phone: formattedPhone,
      password,
      subscriptionPlan: 'free',
    });

    // Create default shop for new registered user
    await Shop.create({
      userId: user._id,
      shopName: `${name.trim()}'s Shop`,
      businessCategory: 'kirana',
    });

    const token = signToken(user._id.toString());

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          _id: user._id,
          phone: user.phone,
          name: user.name,
          subscriptionPlan: user.subscriptionPlan,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in with phone number and password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, password]
 *             properties:
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid phone number or password
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      throw new AppError('Phone number and password are required', 400);
    }

    // Format phone to include +91 prefix
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('+91')) {
      const cleaned = formattedPhone.replace(/\D/g, '');
      const last10 = cleaned.slice(-10);
      formattedPhone = `+91${last10}`;
    }

    // Find user and explicitly select password field
    const user = await User.findOne({ phone: formattedPhone }).select('+password');
    if (!user || !user.password) {
      throw new AppError('Invalid phone number or password', 401);
    }

    // Verify password
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid phone number or password', 401);
    }

    const token = signToken(user._id.toString());

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          _id: user._id,
          phone: user.phone,
          name: user.name,
          subscriptionPlan: user.subscriptionPlan,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
