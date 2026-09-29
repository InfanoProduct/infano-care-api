import pino from "pino";
import { env, isProd } from "./env.js";

// Cache breaker: 2026-03-29-fix-v1

/**
 * Configure pino logger based on environment.
 * In development (local), we use pino-pretty for readable logs.
 * In production or remote environments, we use standard JSON logging (stdout)
 * which can be picked up by Docker logging drivers (GELF/Graylog).
 */

const getTransport = () => {
  // If explicitly requested GELF and pino-gelf is available
  if (env.LOG_DRIVER === "gelf") {
    return {
      target: "pino-gelf/transport",
      options: {
        host: env.GRAYLOG_HOST || "localhost",
        port: env.GRAYLOG_PORT || 12201,
      },
    };
  }

  // If JSON logging is explicitly requested or running in production (and not set to pretty)
  if (env.LOG_DRIVER === "json" || (isProd && env.LOG_DRIVER !== "pretty")) {
    return undefined;
  }

  // Use clean pretty printing without noisy pid, hostname, or timestamp metadata
  try {
    return {
      target: "pino-pretty",
      options: {
        colorize: true,
        ignore: "pid,hostname,time",
        singleLine: true,
      },
    };
  } catch {
    return undefined;
  }
};

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: getTransport(),
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
