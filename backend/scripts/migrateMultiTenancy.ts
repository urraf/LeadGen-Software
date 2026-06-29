import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Campaign } from '../src/models/Campaign.js';
import { Lead } from '../src/models/Lead.js';
import { Message } from '../src/models/Message.js';
import { SearchLog } from '../src/models/SearchLog.js';
import { logger } from '../src/utils/logger.js';
import { env } from '../src/config/env.js';

async function runMigration() {
  logger.info('Starting Multi-Tenancy Data Migration...');

  try {
    await connectDatabase();

    // 1. Find Admin User
    const adminEmail = env.ADMIN_EMAIL.toLowerCase();
    const adminUser = await User.findOne({ email: adminEmail });

    if (!adminUser) {
      logger.error(`Admin user not found with email: ${adminEmail}. Please start the server once to seed the admin user.`);
      process.exit(1);
    }

    const adminId = adminUser._id;
    logger.info(`Found Admin User: ${adminId}`);

    // 2. Migrate Campaigns
    const campaignsResult = await Campaign.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: adminId } }
    );
    logger.info(`Migrated ${campaignsResult.modifiedCount} Campaigns.`);

    // 3. Migrate Leads
    const leadsResult = await Lead.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: adminId } }
    );
    logger.info(`Migrated ${leadsResult.modifiedCount} Leads.`);

    // 4. Migrate Messages
    const messagesResult = await Message.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: adminId } }
    );
    logger.info(`Migrated ${messagesResult.modifiedCount} Messages.`);

    // 5. Migrate SearchLogs
    const searchLogsResult = await SearchLog.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: adminId } }
    );
    logger.info(`Migrated ${searchLogsResult.modifiedCount} SearchLogs.`);

    logger.info('Migration completed successfully.');
  } catch (error) {
    logger.error('Migration failed:', error);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

runMigration();
