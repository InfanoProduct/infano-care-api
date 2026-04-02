import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { prisma } from "./db/client.js";
import { initTrackerJobs } from "./jobs/tracker.cron.js";

async function bootstrap() {
  try {
    // Test database connection
    await prisma.$connect();
    const dbUrl = new URL(env.DATABASE_URL);
    logger.info(
      `Database connection established: ${dbUrl.hostname}${dbUrl.port ? ":" + dbUrl.port : ""}${dbUrl.pathname}`,
    );

    // Initialize background jobs
    initTrackerJobs();

    const server = app.listen(env.PORT, "0.0.0.0", () => {
      logger.info(`Server running on http://0.0.0.0:${env.PORT} (LAN accessible)`);
      logger.info(`Swagger docs available at http://localhost:${env.PORT}/api-docs`);
    });

    const shutdown = async () => {
      logger.info("Gracefully shutting down...");
      server.close(async () => {
        await prisma.$disconnect();
        logger.info("Server and database connections closed.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    logger.error({ err: error }, "Failed to start server:");
    process.exit(1);
  }
}

bootstrap();
