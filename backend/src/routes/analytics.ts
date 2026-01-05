/**
 * Event Analytics API Routes
 * 
 * Provides endpoints for accessing invitation analytics and insights.
 * Includes RSVP trends, engagement metrics, and attendance predictions.
 * 
 * @module routes/analytics
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import {
  getRsvpTrends,
  getDailyActivity,
  getResponseTimeAnalysis,
  getEngagementMetrics,
  getAttendancePrediction,
  getAnalyticsDashboard,
  getGlobalActivity,
} from "../repositories/analytics.js";
import { getInvitationById } from "../repositories/invitations.js";
import { requireOwnerOrAdmin } from "../middleware/auth.js";
import { rateLimiters } from "../middleware/rateLimit.js";

const router = Router();

/**
 * GET /api/analytics/global/activity
 * Get global activity for the landing page pulse (public)
 */
router.get(
  "/global/activity",
  rateLimiters.general,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const activity = await getGlobalActivity();
      res.json(activity);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Query parameter schemas
 */
const daysQuerySchema = z.object({
  days: z.string().optional().transform(val => val ? parseInt(val, 10) : 30),
});

/**
 * GET /api/analytics/:invitationId/dashboard
 * Get complete analytics dashboard for an invitation (owner only)
 */
router.get(
  "/:invitationId/dashboard",
  requireOwnerOrAdmin,
  rateLimiters.read,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = req.ownerContext?.invitation ?? await getInvitationById(req.params.invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      const dashboard = await getAnalyticsDashboard(invitation.id, invitation.capacity);
      
      res.json({
        invitationId: invitation.id,
        slug: invitation.slug,
        ...dashboard,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/:invitationId/trends
 * Get RSVP trends over time (owner only)
 */
router.get(
  "/:invitationId/trends",
  requireOwnerOrAdmin,
  rateLimiters.read,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = req.ownerContext?.invitation ?? await getInvitationById(req.params.invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      const query = daysQuerySchema.parse(req.query);
      const trends = await getRsvpTrends(invitation.id, query.days);
      
      res.json({ trends });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", issues: error.issues });
      }
      next(error);
    }
  }
);

/**
 * GET /api/analytics/:invitationId/activity
 * Get daily activity summary (owner only)
 */
router.get(
  "/:invitationId/activity",
  requireOwnerOrAdmin,
  rateLimiters.read,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = req.ownerContext?.invitation ?? await getInvitationById(req.params.invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      const query = daysQuerySchema.parse(req.query);
      const activity = await getDailyActivity(invitation.id, query.days);
      
      res.json({ activity });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", issues: error.issues });
      }
      next(error);
    }
  }
);

/**
 * GET /api/analytics/:invitationId/response-analysis
 * Get response time analysis (owner only)
 */
router.get(
  "/:invitationId/response-analysis",
  requireOwnerOrAdmin,
  rateLimiters.read,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = req.ownerContext?.invitation ?? await getInvitationById(req.params.invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      const analysis = await getResponseTimeAnalysis(invitation.id);
      
      res.json({ analysis });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/:invitationId/engagement
 * Get engagement metrics (owner only)
 */
router.get(
  "/:invitationId/engagement",
  requireOwnerOrAdmin,
  rateLimiters.read,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = req.ownerContext?.invitation ?? await getInvitationById(req.params.invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      const engagement = await getEngagementMetrics(invitation.id);
      
      res.json({ engagement });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/:invitationId/prediction
 * Get attendance prediction (owner only)
 */
router.get(
  "/:invitationId/prediction",
  requireOwnerOrAdmin,
  rateLimiters.read,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = req.ownerContext?.invitation ?? await getInvitationById(req.params.invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      const prediction = await getAttendancePrediction(invitation.id, invitation.capacity);
      
      res.json({ prediction });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
