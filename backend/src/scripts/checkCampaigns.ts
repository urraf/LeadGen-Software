import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Campaign } from '../models/Campaign.js';

async function test() {
  await mongoose.connect(env.MONGODB_URI);
  const camps = await Campaign.find({}).sort({createdAt: -1}).limit(5).exec();
  for (const c of camps) {
    console.log(`- ${c.name} (status: ${c.status}, created: ${c.createdAt})`);
  }
  process.exit(0);
}
test();
