import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import {
  addGuestbookEntry,
  getInvitationBySlug,
  listGuestbookEntries,
  listInvitations,
  listPublishedInvitations,
  upsertInvitation,
} from "../repositories/invitations.js";
import type { InvitationPayload } from "../types.js";
import { ADMIN_SECRET } from "../config.js";

const coupleSchema = z.object({
  brideName: z.string().min(1),
  groomName: z.string().min(1),
  parents: z
    .object({
      bride: z.string().optional(),
      groom: z.string().optional(),
    })
    .optional(),
});

const eventSchema = z.object({
  title: z.string().min(1),
  date: z.string().min(1),
  time: z.string().optional(),
  venue: z.string().min(1),
  address: z.string().optional(),
  mapLink: z.string().url().optional(),
});

const sectionSchema = z.object({
  type: z.enum(["loveStory", "gallery", "countdown", "rsvp", "custom"]),
  title: z.string().min(1),
  content: z.unknown(),
});

const themeSchema = z.object({
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  backgroundPattern: z.string().optional(),
  musicUrl: z.string().url().optional(),
});

const invitationSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9-]{3,}$/i, "Slug must be alphanumeric and may include hyphens"),
  headline: z.string().min(3),
  couple: coupleSchema,
  event: eventSchema,
  sections: z.array(sectionSchema).default([]),
  theme: themeSchema.default({}),
  isPublished: z.boolean().optional(),
});

const guestbookSchema = z.object({
  guestName: z.string().min(1),
  message: z.string().min(1).max(500),
});

const router = Router();

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const secret = req.headers["x-admin-secret"];
  if (secret !== ADMIN_SECRET) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const secret = req.headers["x-admin-secret"];

    if (typeof secret === "string" && secret.length > 0) {
      if (secret !== ADMIN_SECRET) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const invitations = await listInvitations();
      return res.json(invitations);
    }

    const invitations = await listPublishedInvitations();
    res.json(invitations);
  } catch (error) {
    next(error);
  }
});

router.get("/:slug", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invitation = await getInvitationBySlug(req.params.slug);
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }
    const secret = req.headers["x-admin-secret"];
    const isAdmin = typeof secret === "string" && secret === ADMIN_SECRET;
    if (!invitation.isPublished && !isAdmin) {
      return res.status(404).json({ message: "Invitation not found" });
    }
    const guestbook = await listGuestbookEntries(invitation.id);
    res.json({ invitation, guestbook });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = invitationSchema.parse(req.body);
    const invitation = await upsertInvitation(parsed as InvitationPayload);
    res.status(201).json(invitation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", issues: error.issues });
    }
    next(error);
  }
});

router.put("/:slug", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.debug("Received payload", req.headers["content-type"], req.body);
    const parsed = invitationSchema.parse({ ...req.body, slug: req.params.slug });
    const invitation = await upsertInvitation(parsed as InvitationPayload);
    res.json(invitation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", issues: error.issues });
    }
    next(error);
  }
});

router.post(
  "/:slug/guestbook",
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invitation = await getInvitationBySlug(req.params.slug);
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }
    if (!invitation.isPublished) {
      return res.status(400).json({ message: "Guestbook is unavailable for this invitation" });
    }
    const parsed = guestbookSchema.parse(req.body);
    const entry = await addGuestbookEntry(invitation.id, parsed);
    res.status(201).json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", issues: error.issues });
    }
    next(error);
  }
  },
);

router.get("/:slug/guestbook", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invitation = await getInvitationBySlug(req.params.slug);
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }
    const entries = await listGuestbookEntries(invitation.id);
    res.json(entries);
  } catch (error) {
    next(error);
  }
});

export default router;
