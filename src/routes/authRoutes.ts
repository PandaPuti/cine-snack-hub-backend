import jwt from 'jsonwebtoken'; // 1. Add this import at the very top of the file!
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { sendEmail } from '../services/emailService.js'; // 1. Import our email service

const router = Router();

// @route   POST /api/auth/register
// @desc    Register a new user and email an activation OTP
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
       res.status(400).json({ success: false, message: 'Please provide both email and password.' });
       return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
       res.status(400).json({ success: false, message: 'An account with this email already exists.' });
       return;
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiryTime = new Date(Date.now() + 10 * 60 * 1000);

    // Create user profile
    await User.create({
      email,
      password: hashedPassword,
      otp: generatedOtp,
      otpExpiresAt: otpExpiryTime,
    });

    // 2. Dispatch Welcome Verification Email asynchronously
    await sendEmail({
      to: email,
      subject: 'Welcome to CineSnackHub! Verify Your Account🍿',
      text: `Welcome onboard! Your 6-digit verification code is: ${generatedOtp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #e50914;">Welcome to CineSnackHub! 🍿</h2>
          <p>Thank you for signing up. Let's get your cinematic journey started!</p>
          <p>Your one-time verification code is:</p>
          <h1 style="background: #f4f4f4; padding: 10px; display: inline-block; letter-spacing: 4px; color: #333;">${generatedOtp}</h1>
          <p style="color: #777; font-size: 12px;">This code is valid for exactly 10 minutes.</p>
        </div>
      `,
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully! A verification OTP has been sent straight to your email inbox.',
    });

  } catch (error) {
    console.error('Registration processing error:', error);
    res.status(500).json({ success: false, message: 'Internal server registration failure.' });
  }
});

// @route   POST /api/auth/verify-otp
router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

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
      res.status(400).json({ success: false, message: 'Your OTP has expired. Please request a new one.' });
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

    res.status(200).json({
      success: true,
      message: 'Account verified successfully! Welcome to CineSnackHub. 🎉',
    });

  } catch (error) {
    console.error('OTP Verification error:', error);
    res.status(500).json({ success: false, message: 'Internal server verification failure.' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user and generate a secure session token
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Please provide both email and password.' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({ 
        success: false, 
        message: 'Your account is not verified yet. Please verify your email using your OTP first.' 
      });
      return;
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    // 2. Generate a secure JWT Token
    // We embed the user's ID inside it and make it expire in 3 days
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '3d' }
    );

    // 3. Return the token to the client alongside user data
    res.status(200).json({
      success: true,
      message: 'Login successful! Welcome back to CineSnackHub. 🍿',
      token, // <-- The client will save this string to stay logged in
      user: {
        id: user._id,
        email: user.email,
        subscriptionPlan: user.subscriptionPlan,
      }
    });

  } catch (error) {
    console.error('Login processing error:', error);
    res.status(500).json({ success: false, message: 'Internal server login failure.' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Generate and email a recovery OTP for a forgotten password
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: 'Please provide an email address.' });
      return;
    }

    const user = await User.findOne({ email });
    
    if (user) {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiryTime = new Date(Date.now() + 10 * 60 * 1000);

      user.otp = generatedOtp;
      user.otpExpiresAt = expiryTime;
      await user.save();

      // 3. Dispatch Password Recovery Email asynchronously
      await sendEmail({
        to: email,
        subject: 'Reset Your CineSnackHub Password 🔐',
        text: `You requested a password reset. Your 6-digit recovery code is: ${generatedOtp}.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
            <h2 style="color: #e50914;">Password Recovery Request</h2>
            <p>We received a request to reset your password. Use the code below to complete your recovery:</p>
            <h1 style="background: #f4f4f4; padding: 10px; display: inline-block; letter-spacing: 4px; color: #e50914;">${generatedOtp}</h1>
            <p style="color: #777; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    }

    res.status(200).json({
      success: true,
      message: 'If that email matches an account, a recovery OTP has been sent.',
    });

  } catch (error) {
    console.error('Forgot password processing failure:', error);
    res.status(500).json({ success: false, message: 'Internal server processing error.' });
  }
});

// @route   POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      res.status(400).json({ success: false, message: 'Please fill in all recovery fields.' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ success: false, message: 'Invalid or expired password reset parameters.' });
      return;
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      res.status(400).json({ success: false, message: 'Recovery window has expired. Request a new OTP.' });
      return;
    }

    if (user.otp !== otp) {
      res.status(400).json({ success: false, message: 'Incorrect recovery OTP code.' });
      return;
    }

    const saltRounds = 10;
    user.password = await bcrypt.hash(newPassword, saltRounds);

    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully! You can now log in with your new credentials. 🔐',
    });

  } catch (error) {
    console.error('Reset password processing failure:', error);
    res.status(500).json({ success: false, message: 'Internal server recovery failure.' });
  }
});

export default router;
