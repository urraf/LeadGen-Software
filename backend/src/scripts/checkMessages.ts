import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Message } from '../models/Message.js';

async function test() {
  await mongoose.connect(env.MONGODB_URI);
  const msgs = await Message.find({ leadId: '6a403d2d491cca696f6c9993' }).exec();
  console.log(`Found ${msgs.length} messages for lead`);
  for (const m of msgs) {
    console.log(`- type: ${m.type}, status: ${m.status}, createdAt: ${m.createdAt}`);
  }
  process.exit(0);
}
test();
