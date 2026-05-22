import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGINS: z.string().default(''),

  DATABASE_URL: z.string().url(),
  DATABASE_URL_TEST: z.string().url().optional(),

  REDIS_URL: z.string().url(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),

  AUTH_THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  AUTH_THROTTLE_LIMIT: z.coerce.number().int().positive().default(5),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // LLM provider keys — all optional. LLM Router falls back to Mock if none configured.
  GROQ_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  // WhatsApp provider selection: mock | twilio | meta | dialog360
  WHATSAPP_PROVIDER: z.enum(['mock', 'twilio', 'meta', 'dialog360']).default('mock'),
  WHATSAPP_WEBHOOK_SECRET: z.string().optional(),

  // Twilio
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),

  // Meta Cloud API
  META_PHONE_NUMBER_ID: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),
  META_VERIFY_TOKEN: z.string().optional(),

  // 360dialog
  DIALOG360_API_KEY: z.string().optional(),
  DIALOG360_BASE_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
