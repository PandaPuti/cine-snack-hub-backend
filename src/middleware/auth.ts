import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface AuthedRequest extends Request {
  userId?: string;
}

// Expects the header:  Authorization: Bearer <token>
export const requireAuth = (req: AuthedRequest, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ success: false, message: 'Please log in to continue.' });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is missing in .env');
    res.status(500).json({ success: false, message: 'Server is not configured correctly.' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as jwt.JwtPayload;
    req.userId = String(payload.userId);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Your session has expired. Please log in again.' });
  }
};