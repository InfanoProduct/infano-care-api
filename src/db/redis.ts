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
  const isMemoryMode = process.env.REDIS_URL === "memory" || process.env.NODE_ENV === "test";
  let client: any;
  let useFallback = isMemoryMode;
  const mock = new MockRedis();

  if (!isMemoryMode) {
    try {
      client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
        maxRetriesPerRequest: 1, 
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > 3) {
            logger.error("Redis connection failed. Falling back to memory storage.");
            useFallback = true;
            return null; // stop retrying
          }
          return Math.min(times * 100, 3000);
        }
      });

      client.on("error", (err: any) => {
        // Only log warning, the retryStrategy handles the permanent fallback
        logger.warn({ err: err.message }, "Redis connection issue.");
      });

      client.on("end", () => {
        logger.error("Redis client connection closed permanently. Operating in memory-only mode.");
        useFallback = true;
      });
    } catch (e) {
      logger.error({ err: e }, "Failed to initialize Redis client. Falling back to memory.");
      useFallback = true;
    }
  }

  // Return a proxy that switches between the real client and the mock
  return new Proxy({}, {
    get: (_, prop: string) => {
      const activeClient = useFallback ? mock : (client || mock);
      
      if (prop === "status") return activeClient.status;
      if (prop === "on") return activeClient.on?.bind(activeClient);

      const value = activeClient[prop];
      if (typeof value === "function") {
        return async (...args: any[]) => {
          try {
            const result = value.apply(activeClient, args);
            // ioredis methods return promises or can be awaited
            return await result;
          } catch (err: any) {
            // If we hit a connection error, switch to fallback and retry once
            const isConnError = 
              err.message.includes("Connection is closed") || 
              err.message.includes("max retries") ||
              err.message.includes("ECONNREFUSED");

            if (!useFallback && isConnError) {
              logger.error({ err: err.message }, "Redis operation failed. Switching to in-memory fallback.");
              useFallback = true;
              const fallbackMethod = (mock as any)[prop];
              if (typeof fallbackMethod === "function") {
                return fallbackMethod.apply(mock, args);
              }
            }
            throw err;
          }
        };
      }
      return value;
    }
  });
}

export const redis: any = globalForRedis.redis ?? createRedisInstance();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
