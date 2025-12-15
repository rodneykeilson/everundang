/**
 * Export Routes
 *
 * Provides endpoints for exporting invitation data in various formats:
 * - CSV guest lists
 * - JSON reports
 * - Text summaries
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { requireOwner } from "../middleware/auth.js";
import { getInvitationById, listGuestbookEntries } from "../repositories/invitations.js";
import {
  exportRsvpsToCSV,
  exportGuestbookToCSV,
  exportEventReportJSON,
  exportEventSummaryText,
  generateRsvpSummary,
} from "../utils/export.js";
import { rateLimiters } from "../middleware/rateLimit.js";

const router = Router();

/**
 * Export RSVPs as CSV
 * GET /api/exports/:id/rsvps/csv
 * Requires owner authentication
 */
router.get(
  "/:id/rsvps/csv",
  rateLimiters.read,
  requireOwner,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const invitation = await getInvitationById(id);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      const csv = await exportRsvpsToCSV(id);
      const filename = `rsvps-${invitation.slug}-${Date.now()}.csv`;

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Export Guestbook as CSV
 * GET /api/exports/:id/guestbook/csv
 * Requires owner authentication
 */
router.get(
  "/:id/guestbook/csv",
  rateLimiters.read,
  requireOwner,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const invitation = await getInvitationById(id);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      const entries = await listGuestbookEntries(id);
      const csv = exportGuestbookToCSV(entries);
      const filename = `guestbook-${invitation.slug}-${Date.now()}.csv`;

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Export full event report as JSON
 * GET /api/exports/:id/report/json
 * Requires owner authentication
 */
router.get(
  "/:id/report/json",
  rateLimiters.read,
  requireOwner,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const invitation = await getInvitationById(id);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      const json = await exportEventReportJSON(invitation);
      const filename = `report-${invitation.slug}-${Date.now()}.json`;

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(json);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Export event summary as text
 * GET /api/exports/:id/summary/text
 * Requires owner authentication
 */
router.get(
  "/:id/summary/text",
  rateLimiters.read,
  requireOwner,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const invitation = await getInvitationById(id);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      const text = await exportEventSummaryText(invitation);
      const filename = `summary-${invitation.slug}-${Date.now()}.txt`;

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(text);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get RSVP summary statistics (inline, not download)
 * GET /api/exports/:id/rsvps/summary
 * Requires owner authentication
 */
router.get(
  "/:id/rsvps/summary",
  rateLimiters.read,
  requireOwner,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const invitation = await getInvitationById(id);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      const summary = await generateRsvpSummary(id);
      res.json(summary);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
