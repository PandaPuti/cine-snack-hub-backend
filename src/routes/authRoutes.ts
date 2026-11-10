import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { User } from '../models/User.js';
import { sendEmail } from '../services/emailService.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();
router.use(authLimiter);

const OTP_TTL_MS = 10 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;
const SALT_ROUNDS = 10;

// crypto.randomInt is secure; Math.random is not.
const generateOtp = (): string => randomInt(100000, 1000000).toString();

const normalizeEmail = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const otpEmailHtml = (heading: string, intro: string, otp: string, footer: string): string => `
  <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
    <h2 style="color: #e50914;">${heading}</h2>
    <p>${intro}</p>
    <h1 style="background: #f4f4f4; padding: 10px; display: inline-block; letter-spacing: 4px; color: #333;">${otp}</h1>
    <p style="color: #777; font-size: 12px;">${footer}</p>
  </div>
`;

// @route   POST /api/auth/register
// @desc    Create an account (or restart verification for an unverified one) and email an OTP
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Please provide both email and password.' });
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({ success: false, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
      return;
    }

    const existing = await User.findOne({ email });
    if (existing?.isVerified) {
      res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

    if (existing) {
      // Registered earlier but never verified (e.g. the email failed). Let them start over.
      existing.password = hashedPassword;
      existing.otp = otp;
      existing.otpExpiresAt = otpExpiresAt;
      await existing.save();
    } else {
      await User.create({ email, password: hashedPassword, otp, otpExpiresAt });
    }

    const sent = await sendEmail({
      to: email,
      subject: 'Welcome to CineSnackHub! Verify Your Account 🍿',
      text: `Your 6-digit verification code is: ${otp}. It expires in 10 minutes.`,
      html: otpEmailHtml(
        'Welcome to CineSnackHub! 🍿',
        'Thanks for signing up. Your one-time verification code is:',
        otp,
        'This code is valid for 10 minutes.'
      ),
    });

    if (!sent) {
      res.status(502).json({
        success: false,
        message: 'We could not send the verification email. Please try again in a moment.',
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Account created! A verification code has been sent to your email.',
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      return;
    }
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Internal server registration failure.' });
  }
});

// @route   POST /api/auth/verify-otp
router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';

    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'Please provide both email and OTP.' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ success: false, message: 'Account not found.' });
      return;
    }
    if (user.isVerified) {
      res.status(400).json({ success: false, message: 'This account is already verified. Please log in.' });
      return;
    }
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      res.status(400).json({ success: false, message: 'Your OTP has expired. Please register again to get a new one.' });
      return;
    }
    if (user.otp !== otp) {
      res.status(400).json({ success: false, message: 'Invalid OTP code. Please check and try again.' });
      return;
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    res.status(200).json({ success: true, message: 'Account verified! Welcome to CineSnackHub. 🎉' });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ success: false, message: 'Internal server verification failure.' });
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Please provide both email and password.' });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is missing in .env');
      res.status(500).json({ success: false, message: 'Server is not configured correctly.' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    // Checked after the password so strangers can't probe which emails are unverified.
    if (!user.isVerified) {
      res.status(403).json({
        success: false,
        message: 'Your account is not verified yet. Please verify your email with the OTP first.',
      });
      return;
    }

    const token = jwt.sign({ userId: user._id }, secret, { expiresIn: '3d' });

    res.status(200).json({
      success: true,
      message: 'Login successful! Welcome back to CineSnackHub. 🍿',
      token,
      user: { id: user._id, email: user.email, subscriptionPlan: user.subscriptionPlan },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server login failure.' });
  }
});

// @route   POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      res.status(400).json({ success: false, message: 'Please provide an email address.' });
      return;
    }

    const user = await User.findOne({ email });

    // Only verified accounts get a reset code. The response is identical either way.
    if (user && user.isVerified) {
      const otp = generateOtp();
      user.otp = otp;
      user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
      await user.save();

      const sent = await sendEmail({
        to: email,
        subject: 'Reset Your CineSnackHub Password 🔐',
        text: `Your 6-digit recovery code is: ${otp}. It expires in 10 minutes.`,
        html: otpEmailHtml(
          'Password Recovery Request',
          'Use the code below to reset your password:',
          otp,
          "If you didn't request this, you can safely ignore this email."
        ),
      });
      if (!sent) console.error(`Password reset email failed for ${email}`);
    }

    res.status(200).json({
      success: true,
      message: 'If that email matches an account, a recovery code has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Internal server processing error.' });
  }
});

// @route   POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!email || !otp || !newPassword) {
      res.status(400).json({ success: false, message: 'Please fill in all recovery fields.' });
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({ success: false, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
      return;
    }

    const user = await User.findOne({ email });
    if (!user || !user.isVerified) {
      res.status(400).json({ success: false, message: 'Invalid or expired password reset details.' });
      return;
    }
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      res.status(400).json({ success: false, message: 'Recovery code has expired. Request a new one.' });
      return;
    }
    if (user.otp !== otp) {
      res.status(400).json({ success: false, message: 'Incorrect recovery code.' });
      return;
    }

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated! You can now log in with your new password. 🔐',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Internal server recovery failure.' });
  }
});

export default router;