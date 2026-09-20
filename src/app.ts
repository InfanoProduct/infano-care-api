import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorHandler } from "./common/middleware/errorHandler.js";
import authRoutes from "./modules/auth/auth.routes.js";
import consentRoutes from "./modules/consent/consent.routes.js";
import onboardingRoutes from "./modules/onboarding/onboarding.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import trackerRoutes from "./modules/tracker/tracker.routes.js";
import questRoutes from "./modules/quest/quest.routes.js";
import chatRoutes from "./modules/chat/chat.routes.js";
import expertRoutes from "./modules/expert/expert.routes.js";
import communityRoutes from "./modules/community/community.routes.js";
import peerlineRoutes from "./modules/peerline/peerline.routes.js";
import eventRoutes from "./modules/events/events.routes.js";
import safetyRoutes from "./modules/safety/safety.routes.js";
import friendsRoutes from "./modules/friends/friends.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import blogRoutes from "./modules/blog/blog.routes.js";
import shopRoutes from "./modules/shop/shop.routes.js";
import mindfulRoutes from "./modules/mindful/mindful.routes.js";
import enquiryRoutes from "./modules/enquiry/enquiry.routes.js";
import programsRoutes from "./modules/programs/programs.routes.js";
import parentRoutes from "./modules/parent/parent.routes.js";
import teenRouter from "./modules/teen/teen.routes.js";
import schoolRoutes from "./modules/school/school.routes.js";
import journalRoutes from "./modules/journal/journal.routes.js";
import lmsRoutes from "./modules/lms/lms.routes.js";
import creativeJourneyRoutes from "./modules/creative-journey/creative-journey.routes.js";
import swaggerUi from "swagger-ui-express";
import { getSwaggerSpec } from "./config/swagger.js";

import { requestLogger } from "./common/middleware/requestLogger.js";

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
// ── Raw-body capture for PayPal webhooks ──────────────────────────────────────
// IMPORTANT: Must be registered BEFORE express.json() so the raw Buffer is
// preserved for PayPal's signature verification API call.
// Only applies to the PayPal webhook path.
app.use(
  "/api/shop/webhook/paypal",
  express.raw({ type: "application/json" }),
  (req: any, _res: any, next: any) => {
    req.rawBody = req.body as Buffer; // Buffer from express.raw()
    req.body = {};                    // reset so downstream code sees empty object
    next();
  }
);

app.use(compression());
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));

// Clear, formatted HTTP request & response logger with timing and error insights
app.use(requestLogger);

// Swagger Documentation (lazy-loaded on first request to speed up server boot)
app.use(
  "/api-docs",
  swaggerUi.serve,
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    swaggerUi.setup(getSwaggerSpec())(req, res, next);
  }
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/auth/consent", consentRoutes);
app.use("/api/consent", consentRoutes);
app.use("/parent/consent", consentRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/user", userRoutes);
app.use("/api/tracker", trackerRoutes);
app.use("/api/quest", questRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/expert", expertRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/peerline", peerlineRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/safety", safetyRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/mindful", mindfulRoutes);
app.use("/api/enquiry", enquiryRoutes);
app.use("/api/programs", programsRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/teen", teenRouter);
app.use("/api/school", schoolRoutes);
app.use("/api/journal", journalRoutes);
app.use("/api/lms", lmsRoutes);
app.use("/api/creative-journey", creativeJourneyRoutes);
app.use("/uploads", express.static(path.resolve(process.env.UPLOAD_PATH || "uploads")));


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
app.get(["/health", "/api/health"], (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

export default app;
