import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  PG_SSL: z
    .string()
    .optional()
    .transform((v) => (v ?? "false").toLowerCase() === "true"),
  ALLOWED_ORIGINS: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  SMS_PROVIDER: z.string().optional().default("mock"),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  TWOFACTOR_API_KEY: z.string().optional(),
  GRAYLOG_HOST: z.string().optional(),
  GRAYLOG_PORT: z.coerce.number().int().positive().optional().default(12201),
  LOG_DRIVER: z.enum(["pretty", "gelf", "json"]).optional().default("json"),
  CRYPTO_KEY: z.string().length(64).default("0".repeat(64)), // 32 bytes in hex
  JWT_ACCESS_SECRET: z.string().default("infano_access_secret_dev"),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);

export const isProd = env.NODE_ENV === "production";
