import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { prisma } from "./db/client.js";
import { initTrackerJobs } from "./jobs/tracker.cron.js";
import { initParentJobs } from "./jobs/parent.cron.js";
import { Server } from "socket.io";
import { setupExpertSocket } from "./modules/expert/socket.service.js";
import { setupPeerLineSocket } from "./modules/peerline/peerline.socket.js";
import { setupEventsSocket } from "./modules/events/events.socket.js";
import { setupFriendsSocket } from "./modules/friends/friends.socket.js";

const MAX_DB_RETRIES = 10;
const BASE_RETRY_DELAY_MS = 2000; // 2 seconds, doubles each attempt, capped at 30s

async function connectWithRetry(attempt = 1): Promise<void> {
  try {
    await prisma.$connect();
    const dbUrl = new URL(env.DATABASE_URL);
    logger.info(
      `Database connection established: ${dbUrl.hostname}${dbUrl.port ? ":" + dbUrl.port : ""}${dbUrl.pathname}`,
    );
  } catch (error) {
    if (attempt >= MAX_DB_RETRIES) {
      logger.error({ err: error }, `Database connection failed after ${MAX_DB_RETRIES} attempts. Giving up.`);
      process.exit(1);
    }
    const delayMs = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1), 30_000);
    logger.warn(`Database unreachable (attempt ${attempt}/${MAX_DB_RETRIES}). Retrying in ${delayMs / 1000}s...`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return connectWithRetry(attempt + 1);
  }
}

async function bootstrap() {
  try {
    // Test database connection with retry
    await connectWithRetry();

    // Initialize background jobs
    initTrackerJobs();
    initParentJobs();

    const server = app.listen(env.PORT, "0.0.0.0", () => {
      logger.info(`Server running on http://0.0.0.0:${env.PORT} (LAN accessible)`);
      logger.info(`Swagger docs available at http://localhost:${env.PORT}/api-docs`);
    });

    // Initialize Socket.io for Real-time Expert Chat
    const io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    setupExpertSocket(io);
    setupPeerLineSocket(io);
    setupEventsSocket(io);
    setupFriendsSocket(io);
    logger.info("Socket.io initialized and attached to Expert Chat, PeerLine, Events, and Friends.");

    const shutdown = async () => {
      logger.info("Gracefully shutting down...");
      io.close(); // Close socket server
      server.close(async () => {
        await prisma.$disconnect();
        logger.info("Server and database connections closed.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
    console.log("[HEARTBEAT] Server bootstrap completed successfully.");
  } catch (error) {
    logger.error({ err: error }, "Failed to start server:");
    process.exit(1);
  }
}

bootstrap();
