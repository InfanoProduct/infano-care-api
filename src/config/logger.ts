import pino from "pino";
import { env, isProd } from "./env.js";

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

// Graylog GELF transport
/*
if (env.GRAYLOG_HOST) {
  transports.push({
    target: "pino-gelf",
    options: {
      host: env.GRAYLOG_HOST,
      port: env.GRAYLOG_PORT,
      protocol: "udp", // default GELF
    },
    level: env.LOG_LEVEL,
  });
}
*/

export const logger = pino({
  level: env.LOG_LEVEL,
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
  transport: {
    targets: transports,
  },
});

