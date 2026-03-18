import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { prisma } from "./db/client.js";

async function bootstrap() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info("Database connection established.");

    const server = app.listen(env.PORT, () => {
      logger.info(`Server running on http://localhost:${env.PORT}`);
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
