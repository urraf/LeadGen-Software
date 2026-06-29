import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { env } from '../config/env.js';

async function seed(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const users = [{ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }];

    for (const { email, password } of users) {
      const normalizedEmail = email.toLowerCase();
      const existingUser = await User.findOne({ email: normalizedEmail });

      if (existingUser) {
        const hashedPassword = await bcrypt.hash(password, 12);
        existingUser.password = hashedPassword;
        await existingUser.save();
        console.log(`✅ User updated: ${normalizedEmail}`);
      } else {
        const hashedPassword = await bcrypt.hash(password, 12);
        await User.create({
          email: normalizedEmail,
          password: hashedPassword,
        });
        console.log(`✅ User created: ${normalizedEmail}`);
      }
    }

    console.log(`✅ Admin user seeded`);
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
