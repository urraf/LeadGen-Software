import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Lead } from '../models/Lead.js';
import { Types } from 'mongoose';

async function test() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to MongoDB');
  const docs = [{
    campaignId: new Types.ObjectId(),
    placeId: 'test-place-4',
    businessName: 'Test Business 4',
    category: 'test',
    phone: '+919999999996',
    address: 'Test Address',
    city: 'Delhi',
    googleMapsUrl: '',
    status: 'NEW'
  }];
  try {
    const result = await Lead.create(docs);
    console.log('Result:', result);
  } catch (err) {
    console.error('Error in create:', err);
  }
  process.exit(0);
}
test();
