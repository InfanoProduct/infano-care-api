import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorHandler } from "./common/middleware/errorHandler.js";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import trackerRoutes from "./modules/tracker/tracker.routes.js";
import learningRoutes from "./modules/learning/learning.routes.js";
import questRoutes from "./modules/quest/quest.routes.js";

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: env.ALLOWED_ORIGINS }));
app.use(compression());
app.use(express.json());
app.use(pinoHttp({ logger }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/tracker", trackerRoutes);
app.use("/api/learning", learningRoutes);
app.use("/api/quest", questRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

export default app;
