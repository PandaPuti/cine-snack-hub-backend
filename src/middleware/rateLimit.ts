import rateLimit from 'express-rate-limit';

// Login, register, OTP and password reset routes.
// 6-digit OTPs are only safe if guessing is slow.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please wait a few minutes and try again.' },
});

// Every AI search costs money, so cap it per IP.
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'You are searching too fast. Please wait a moment.' },
});