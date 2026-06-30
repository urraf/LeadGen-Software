import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { catchAsync, AppError } from '../utils/helpers.js';
import type { AuthRequest } from '../middlewares/authMiddleware.js';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// In Electron (localhost), cookies must be sameSite=strict, secure=false
// In cloud deployment (cross-origin), cookies need sameSite=none, secure=true
const isCrossOrigin = process.env.CORS_MODE === 'cross-origin';

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: isCrossOrigin,
    sameSite: (isCrossOrigin ? 'none' : 'strict') as 'none' | 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

function generateAccessToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  const accessToken = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  // Store refresh token in DB
  user.refreshToken = refreshToken;
  await user.save();

  // Set refresh token in HttpOnly cookie
  res.cookie('refreshToken', refreshToken, getCookieOptions());

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
      },
    },
  });
});

export const refresh = catchAsync(async (req: Request, res: Response) => {
  // Try to get refresh token from cookie first, then body
  const refreshToken =
    req.cookies?.refreshToken ||
    req.body?.refreshToken;

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 401);
  }

  let decoded: { userId: string };
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string };
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await User.findById(decoded.userId);
  if (!user || user.refreshToken !== refreshToken) {
    throw new AppError('Invalid refresh token', 401);
  }

  // Rotate tokens
  const newAccessToken = generateAccessToken(user._id.toString());
  const newRefreshToken = generateRefreshToken(user._id.toString());

  user.refreshToken = newRefreshToken;
  await user.save();

  res.cookie('refreshToken', newRefreshToken, getCookieOptions());

  res.json({
    success: true,
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
  });
});

export const logout = catchAsync(async (req: AuthRequest, res: Response) => {
  if (req.userId) {
    await User.findByIdAndUpdate(req.userId, { $unset: { refreshToken: 1 } });
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isCrossOrigin,
    sameSite: (isCrossOrigin ? 'none' : 'strict') as 'none' | 'strict',
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

export const me = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId).select('-password -refreshToken');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    data: { user },
  });
});

export const updateProfile = catchAsync(async (req: AuthRequest, res: Response) => {
  const { name, password } = req.body;
  const user = await User.findById(req.userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (name !== undefined) {
    user.name = name;
  }

  if (password) {
    user.password = await bcrypt.hash(password, 12);
  }

  await user.save();

  const userResponse = {
    id: user._id,
    email: user.email,
    name: user.name,
  };

  res.json({
    success: true,
    data: { user: userResponse },
    message: 'Profile updated successfully',
  });
});

// ─── Register (for multi-user Electron setup) ────────────────────
export const register = catchAsync(async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('An account with this email already exists', 409);
  }

  // Create new user
  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({
    email: email.toLowerCase(),
    password: hashedPassword,
    name: name || undefined,
  });

  const accessToken = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  user.refreshToken = refreshToken;
  await user.save();

  res.cookie('refreshToken', refreshToken, getCookieOptions());

  res.status(201).json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    },
    message: 'Account created successfully',
  });
});

