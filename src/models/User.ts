import { Schema, model } from 'mongoose';

// 1. Create a blueprint schema for our User document
const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true, // Prevents duplicate registrations with the same email
      lowercase: true, // Automatically converts emails to lowercase
      trim: true, // Removes accidental spaces before or after the text
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    isVerified: {
      type: Boolean,
      default: false, // Remains false until they enter their registration OTP
    },
    otp: {
      type: String,
      default: null, // Temporary container for registration or forgot password tokens
    },
    otpExpiresAt: {
      type: Date,
      default: null, // Makes sure OTPs expire after 5-10 minutes for safety
    },
    subscriptionPlan: {
      type: String,
      enum: ['none', 'basic', 'pro', 'max'], // Restricts input to only your 3 planned cards
      default: 'none',
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'inactive', 'expired'],
      default: 'inactive',
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt timestamps for us!
  }
);

// 2. Export the live Mongoose Model using our blueprint
export const User = model('User', userSchema);
