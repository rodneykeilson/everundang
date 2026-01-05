import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";
import invitationsRouter from "./routes/invitations.js";
import giftsRouter from "./routes/gifts.js";
import analyticsRouter from "./routes/analytics.js";
import exportsRouter from "./routes/exports.js";
import { FRONTEND_ORIGINS, FRONTEND_URL, PORT } from "./config.js";
import { initDatabase, pool } from "./db.js";
import { rateLimiters, getRateLimitStats } from "./middleware/rateLimit.js";
import { requestLogger } from "./middleware/audit.js";
import { getAuditStats, getSecurityLogs } from "./repositories/audit.js";
import { getAllCacheStats, clearAllCaches } from "./utils/cache.js";

const isProduction = process.env.NODE_ENV === "production";

async function main() {
  await initDatabase();

  const app = express();

  // Trust proxy for proper IP detection behind reverse proxies (Render, etc.)
  app.set("trust proxy", 1);
  app.set("etag", false);

  // Security headers via helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", ...FRONTEND_ORIGINS],
          fontSrc: ["'self'", "https:", "data:"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: isProduction ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false, // Allow embedding for invitation previews
      hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
    })
  );

  // Gzip compression for responses
  app.use(compression());

  // Disable caching for API responses
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api/")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
    next();
  });

  app.use(cors({ origin: FRONTEND_ORIGINS, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));
  app.use(requestLogger);

  // Apply general rate limiting to all API routes
  app.use("/api", rateLimiters.general);

  // Enhanced health check with database connectivity
  app.get("/health", async (_req: Request, res: Response) => {
    try {
      const dbStart = Date.now();
      await pool.query("SELECT 1");
      const dbLatency = Date.now() - dbStart;
      
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        database: {
          status: "connected",
          latencyMs: dbLatency,
        },
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
      });
    } catch (error) {
      res.status(503).json({
        status: "degraded",
        timestamp: new Date().toISOString(),
        database: {
          status: "disconnected",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  });

  // Rate limit statistics endpoint (admin only)
  app.get("/api/stats/rate-limits", rateLimiters.admin, (_req: Request, res: Response) => {
    const stats = getRateLimitStats();
    res.json(stats);
  });

  // Audit statistics endpoint (admin only)
  app.get("/api/stats/audit", rateLimiters.admin, async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await getAuditStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  // Security logs endpoint (admin only)
  app.get("/api/stats/security", rateLimiters.admin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await getSecurityLogs(limit);
      res.json({ logs });
    } catch (error) {
      next(error);
    }
  });

  // Cache statistics endpoint (admin only)
  app.get("/api/stats/cache", rateLimiters.admin, (_req: Request, res: Response) => {
    const stats = getAllCacheStats();
    res.json(stats);
  });

  // Clear all caches endpoint (admin only)
  app.post("/api/stats/cache/clear", rateLimiters.admin, (_req: Request, res: Response) => {
    clearAllCaches();
    res.json({ success: true, message: "All caches cleared" });
  });

  app.use("/api/invitations", invitationsRouter);
  app.use("/api/gifts", giftsRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/exports", exportsRouter);

  // 404 handler for unknown API routes
  app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({ message: "Endpoint not found" });
  });

  // Global error handler with proper logging
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const errorId = Date.now().toString(36);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    
    // Log full error details server-side
    console.error(`[${errorId}] Error on ${req.method} ${req.path}:`, err);
    
    // Send sanitized error to client
    if (!res.headersSent) {
      res.status(500).json({
        message: isProduction ? "Internal server error" : errorMessage,
        errorId,
      });
    }
  });

  app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}${isProduction ? " (production)" : " (development)"}`);
  });
}

main().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
