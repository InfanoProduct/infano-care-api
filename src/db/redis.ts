import Redis from "ioredis";
import { logger } from "../config/logger.js";

// ─── Mock Redis for Local Dev without Docker ─────────────────────────────────
class MockRedis {
  private store = new Map<string, { value: any; expiry?: number }>();

  async incr(key: string): Promise<number> {
    const item = this.store.get(key);
    const val = item ? parseInt(item.value) + 1 : 1;
    this.store.set(key, { ...item, value: val.toString() });
    return val;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (item) {
      item.expiry = Date.now() + seconds * 1000;
      return 1;
    }
    return 0;
  }

  async setex(key: string, seconds: number, value: string): Promise<string> {
    this.store.set(key, { value, expiry: Date.now() + seconds * 1000 });
    return "OK";
  }

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiry && item.expiry < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  on(event: string, callback: any) {
    if (event === "error") {
      // ignore
    }
  }

  // Add other methods as needed to satisfy the type or usage
  status = "ready";
  async connect() { return; }
  async disconnect() { return; }
}

const globalForRedis = globalThis as unknown as { redis: any | undefined };

function createRedisInstance() {
  if (process.env.REDIS_URL === "memory" || process.env.NODE_ENV === "test") {
    logger.info("Using in-memory MockRedis fallback");
    return new MockRedis();
  }

  try {
    const client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 1, // fail fast to trigger fallback if desired, or keep retry
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) {
           logger.error("Redis connection failed continuously. Falling back to memory storage.");
           return null; // stop retrying
        }
        return Math.min(times * 50, 2000);
      }
    });

    client.on("error", (err: any) => {
      logger.warn({ err: err.message }, "Redis connection issue - check if Redis is running.");
    });

    return client;
  } catch (e) {
    logger.error({ err: e }, "Failed to initialize Redis client. Using MockRedis.");
    return new MockRedis();
  }
}

export const redis: any = globalForRedis.redis ?? createRedisInstance();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
