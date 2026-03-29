import pino from "pino";
import { env, isProd } from "./env.js";

// Cache breaker: 2026-03-28-force-rebuild-v1

const transports = [];

// Local console transport
if (!isProd) {
  transports.push({
    target: "pino-pretty",
    options: {
      colorize: true,
    },
    level: env.LOG_LEVEL,
  });
} else {
  transports.push({
    target: "pino/file",
    options: { destination: 1 }, // 1 is stdout
    level: env.LOG_LEVEL,
  });
}

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: {
    target: isProd ? "pino/file" : "pino-pretty",
    options: isProd ? { destination: 1 } : { colorize: true },
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.refreshToken",
      "req.body.token",
    ],
    remove: true,
  },
});

