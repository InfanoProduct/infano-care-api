import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorHandler } from "./common/middleware/errorHandler.js";
import authRoutes      from "./modules/auth/auth.routes.js";
import consentRoutes   from "./modules/consent/consent.routes.js";
import onboardingRoutes from "./modules/onboarding/onboarding.routes.js";
import userRoutes      from "./modules/user/user.routes.js";
import trackerRoutes   from "./modules/tracker/tracker.routes.js";
import learningRoutes  from "./modules/learning/learning.routes.js";
import questRoutes     from "./modules/quest/quest.routes.js";
import chatRoutes      from "./modules/chat/chat.routes.js";
import expertRoutes    from "./modules/expert/expert.routes.js";
import communityRoutes from "./modules/community/community.routes.js";
import peerlineRoutes  from "./modules/peerline/peerline.routes.js";
import eventRoutes     from "./modules/events/events.routes.js";
import safetyRoutes    from "./modules/safety/safety.routes.js";
import adminRoutes     from "./modules/admin/admin.routes.js";
import blogRoutes      from "./modules/blog/blog.routes.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";

const app = express();

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "upgrade-insecure-requests": null,
      },
    },
  })
);
app.use(cors({ origin: "*" }));
app.use(compression());
app.use(express.json());
app.use(pinoHttp({ logger }));
logger.info({ allowedOrigins: env.ALLOWED_ORIGINS }, "CORS configuration");

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",        authRoutes);
app.use("/api/auth/consent", consentRoutes);
app.use("/api/onboarding",  onboardingRoutes);
app.use("/api/user",        userRoutes);
app.use("/api/tracker",     trackerRoutes);
app.use("/api/learning",    learningRoutes);
app.use("/api/quest",       questRoutes);
app.use("/api/chat",        chatRoutes);
app.use("/api/expert",      expertRoutes);
app.use("/api/community",   communityRoutes);
app.use("/api/peerline",    peerlineRoutes);
app.use("/api/events",      eventRoutes);
app.use("/api/safety",      safetyRoutes);
app.use("/api/admin",       adminRoutes);
app.use("/api/blog",        blogRoutes);
app.use("/uploads",         express.static("uploads"));


/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health Check
 *     description: Returns the health status of the API.
 *     responses:
 *       200:
 *         description: API is healthy.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

export default app;
