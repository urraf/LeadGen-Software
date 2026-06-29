import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters'),
  JWT_REFRESH_SECRET: z.string().min(10, 'JWT_REFRESH_SECRET must be at least 10 characters'),
  // Initial admin user (seeded on first run)
  ADMIN_EMAIL: z.string().email('ADMIN_EMAIL must be a valid email'),
  ADMIN_PASSWORD: z.string().min(6, 'ADMIN_PASSWORD must be at least 6 characters'),
  MONGODB_URI: z.string().url('MONGODB_URI must be a valid connection string').or(z.string().startsWith('mongodb')),
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  SERPAPI_API_KEY: z.string().optional(),

  WHATSAPP_SESSION_PATH: z.string().default('./.wwebjs_auth'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  // SMTP (optional — for email outreach)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  const formatted = parsed.error.format();
  for (const [key, value] of Object.entries(formatted)) {
    if (key === '_errors') continue;
    const errors = (value as { _errors: string[] })._errors;
    if (errors.length > 0) {
      console.error(`  ${key}: ${errors.join(', ')}`);
    }
  }
  process.exit(1);
}

export const env = parsed.data;
