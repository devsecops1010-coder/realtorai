import { execSync } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as dotenv from 'dotenv';

export default async function globalSetup() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  const testUrl = process.env.DATABASE_URL_TEST;
  if (!testUrl) {
    throw new Error('DATABASE_URL_TEST is required for e2e tests');
  }
  process.env.DATABASE_URL = testUrl;
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  // No webhook secret in tests so the Mock WhatsApp provider accepts any request.
  // Set BEFORE dotenv loads — dotenv's default (override: false) leaves our empty value in place.
  process.env.WHATSAPP_WEBHOOK_SECRET = '';

  const apiRoot = path.resolve(__dirname, '..');
  execSync('npx prisma migrate deploy', {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'inherit',
  });
}
