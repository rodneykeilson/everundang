import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import {
  addGuestbookEntry,
  createInvitation,
  getInvitationById,
  getInvitationBySlug,
  listGuestbookEntries,
  listInvitations,
  listPublishedInvitations,
  updateInvitation,
  updateInvitationById,
  updateOwnerSecret,
  deleteInvitationById,
} from "../repositories/invitations.js";
import {
  consumeGuestCode,
  countYesGuests,
  generateGuestCodes,
  getRsvpStats,
  listGuestCodes,
  listRsvps,
  deleteGuestCode,
  upsertRsvp,
  checkInGuest,
} from "../repositories/rsvps.js";
import type { InvitationPayload, InvitationRecord, RsvpRecord, RsvpStatus } from "../types.js";
import { FRONTEND_URL } from "../config.js";
import {
  generateOwnerSecret,
  hashSecret,
  signOwnerToken,
  readAdminKey,
  isAdminKeyValid,
  isIpAllowed,
  verifySecret,
} from "../utils/auth.js";
import { requireAdmin, requireOwnerOrAdmin } from "../middleware/auth.js";
import { rateLimiters } from "../middleware/rateLimit.js";
import QRCode from "qrcode";
import { createHash } from "crypto";

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
  backgroundImageUrl: z.string().url().nullable().optional(),
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
  status: z.enum(["draft", "published", "closed"]).optional(),
  rsvpMode: z.enum(["passcode", "guest_codes", "open"]).optional(),
  capacity: z.number().int().min(1).max(10000).nullable().optional(),
});

const invitationUpdateSchema = z.object({
  slug: invitationSchema.shape.slug.optional(),
  headline: invitationSchema.shape.headline.optional(),
  couple: coupleSchema.partial().optional(),
  event: eventSchema.partial().optional(),
  sections: z.array(sectionSchema).optional(),
  theme: themeSchema.partial().optional(),
  isPublished: z.boolean().optional(),
  status: invitationSchema.shape.status.optional(),
  rsvpMode: invitationSchema.shape.rsvpMode.optional(),
  capacity: invitationSchema.shape.capacity.optional(),
  rsvpPasscode: z.union([z.string().min(4).max(64), z.literal("")]).optional(),
});

const guestbookSchema = z.object({
  guestName: z.string().min(1),
  message: z.string().min(1).max(500),
});

const rsvpSubmissionSchema = z.object({
  name: z.string().min(1),
  phone: z
    .string()
    .min(6)
    .max(30)
    .optional()
    .transform((value) => (value ? value.trim() : undefined)),
  status: z.enum(["yes", "maybe", "no"]).default("yes"),
  partySize: z.coerce.number().int().min(1).max(12).default(1),
  message: z.string().max(500).optional(),
  passcode: z.string().min(1).max(64).optional(),
  guestCode: z.string().min(4).max(32).optional(),
  deviceFingerprint: z.string().min(8).max(128).optional(),
});

const guestCodeGenerateSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(200),
  prefix: z
    .string()
    .max(6)
    .regex(/^[a-z0-9-]*$/i, "Prefix may contain letters, numbers, and hyphens only")
    .optional(),
  issuedTo: z.string().max(120).optional(),
});

const router = Router();

const sanitizeInvitation = (
  invitation: InvitationRecord,
): Omit<InvitationRecord, "ownerSecretHash" | "rsvpPasscodeHash"> & {
  ownerSecretHash?: undefined;
  rsvpPasscodeHash?: undefined;
} => {
  const { ownerSecretHash: _ownerSecret, rsvpPasscodeHash: _passcodeHash, ...rest } = invitation;
  return { ...rest, ownerSecretHash: undefined, rsvpPasscodeHash: undefined };
};

const mapRsvpResponse = (record: RsvpRecord) => ({
  id: record.id,
  name: record.name,
  phone: record.phone ?? undefined,
  status: record.status,
  partySize: record.partySize,
  message: record.message ?? undefined,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

const normalizeIp = (ip?: string | null) => (ip ? ip.replace(/^::ffff:/, "") : undefined);

const hashFingerprint = (value: string) => createHash("sha256").update(value).digest("hex");

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const headerKey = readAdminKey(req.get("x-admin-k"));
    const legacyHeaderKey = readAdminKey(req.get("x-admin-secret"));
    const queryKey = Array.isArray(req.query.k) ? req.query.k[0] : req.query.k;
    const candidate = headerKey ?? legacyHeaderKey ?? readAdminKey(queryKey);
    if (candidate && isAdminKeyValid(candidate)) {
      if (!isIpAllowed(req.ip)) {
        return res.status(403).json({ message: "IP not allowed" });
      }
      const invitations = await listInvitations();
      return res.json(invitations.map(sanitizeInvitation));
    }

    const invitations = await listPublishedInvitations();
    res.json(invitations.map(sanitizeInvitation));
  } catch (error) {
    next(error);
  }
});

router.get(
  "/:id/manage",
  requireOwnerOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = await getInvitationById(req.params.id);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      const guestbook = await listGuestbookEntries(invitation.id);
      res.json({ invitation: sanitizeInvitation(invitation), guestbook });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/:id/manage/qrcode",
  requireOwnerOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = await getInvitationById(req.params.id);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      const normalizedFrontend = FRONTEND_URL.replace(/\/$/, "");
      const shareUrl = `${normalizedFrontend}/#/i/${invitation.slug}`;
      const png = await QRCode.toBuffer(shareUrl, {
        type: "png",
        margin: 1,
        scale: 8,
        errorCorrectionLevel: "M",
      });
      res.setHeader("Content-Type", "image/png");
      res.send(png);
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/:id/manage/rsvp",
  requireOwnerOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = req.ownerContext?.invitation ?? (await getInvitationById(req.params.id));
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      const [rsvps, stats, guestCodes] = await Promise.all([
        listRsvps(invitation.id),
        getRsvpStats(invitation.id),
        listGuestCodes(invitation.id),
      ]);
      res.json({
        invitation: sanitizeInvitation(invitation),
        stats,
        rsvps: rsvps.map(mapRsvpResponse),
        guestCodes,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/:slug", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invitation = await getInvitationBySlug(req.params.slug);
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }
    const headerKey = readAdminKey(req.get("x-admin-k"));
    const legacyHeaderKey = readAdminKey(req.get("x-admin-secret"));
    const queryKey = Array.isArray(req.query.k) ? req.query.k[0] : req.query.k;
    const candidate = headerKey ?? legacyHeaderKey ?? readAdminKey(queryKey);
    const isAdmin = Boolean(candidate && isAdminKeyValid(candidate) && isIpAllowed(req.ip));
    const status = invitation.status ?? (invitation.isPublished ? "published" : "draft");
    if (status === "closed" && !isAdmin) {
      return res.status(410).json({ message: "This invitation has been closed" });
    }
    if (status !== "published" && !isAdmin) {
      return res.status(404).json({ message: "Invitation not found" });
    }
    const guestbook = await listGuestbookEntries(invitation.id);
    res.json({ invitation: sanitizeInvitation(invitation), guestbook });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/:id/manage/guest-codes",
  requireOwnerOrAdmin,
  rateLimiters.guestCodes,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = req.ownerContext?.invitation ?? (await getInvitationById(req.params.id));
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      const parsed = guestCodeGenerateSchema.parse(req.body);
      const codes = await generateGuestCodes(invitation.id, parsed.quantity, {
        issuedTo: parsed.issuedTo,
        prefix: parsed.prefix,
      });
      res.status(201).json({ codes });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", issues: error.issues });
      }
      next(error);
    }
  },
);

router.delete(
  "/:id/manage/guest-codes/:codeId",
  requireOwnerOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = req.ownerContext?.invitation ?? (await getInvitationById(req.params.id));
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      await deleteGuestCode(req.params.codeId, invitation.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  },
);

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = invitationSchema.parse(req.body);
    const secret = generateOwnerSecret();
    const secretHash = await hashSecret(secret);
    const invitation = await createInvitation({
      ...(parsed as InvitationPayload),
      isPublished: false,
      status: "draft",
      rsvpMode: parsed.rsvpMode ?? "open",
      ownerSecretHash: secretHash,
    });
    const ownerToken = signOwnerToken(invitation.id, secret);
    const normalizedFrontend = FRONTEND_URL.replace(/\/$/, "");
    const ownerLink = `${normalizedFrontend}/#/edit/${invitation.id}?k=${encodeURIComponent(ownerToken)}`;
    res.status(201).json({ invitation: sanitizeInvitation(invitation), ownerToken, ownerLink });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", issues: error.issues });
    }
    if ((error as any)?.code === "23505") {
      return res.status(409).json({ message: "Slug already in use" });
    }
    next(error);
  }
});

router.put("/:slug", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.debug("Received payload", req.headers["content-type"], req.body);
    const parsed = invitationSchema.parse({ ...req.body, slug: req.params.slug });
    const invitation = await updateInvitation(req.params.slug, parsed as InvitationPayload);
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }
    res.json(sanitizeInvitation(invitation));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", issues: error.issues });
    }
    next(error);
  }
});

router.patch(
  "/:id",
  requireOwnerOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = invitationUpdateSchema.parse(req.body);
      const existing =
        req.ownerContext?.invitation ?? (await getInvitationById(req.params.id));
      if (!existing) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      const mergeCouple = () => {
        if (!parsed.couple) return undefined;
        const parents = {
          bride: parsed.couple.parents?.bride ?? existing.couple.parents?.bride,
          groom: parsed.couple.parents?.groom ?? existing.couple.parents?.groom,
        };
        const hasParents = Boolean(parents.bride || parents.groom);
        return {
          brideName: parsed.couple.brideName ?? existing.couple.brideName,
          groomName: parsed.couple.groomName ?? existing.couple.groomName,
          ...(hasParents ? { parents } : {}),
        };
      };

      const mergeEvent = () => {
        if (!parsed.event) return undefined;
        return {
          title: parsed.event.title ?? existing.event.title,
          date: parsed.event.date ?? existing.event.date,
          time: parsed.event.time ?? existing.event.time,
          venue: parsed.event.venue ?? existing.event.venue,
          address: parsed.event.address ?? existing.event.address,
          mapLink: parsed.event.mapLink ?? existing.event.mapLink,
        };
      };

      const mergeTheme = () => {
        if (!parsed.theme) return undefined;
        const hasBackgroundImage = Object.prototype.hasOwnProperty.call(
          parsed.theme,
          "backgroundImageUrl",
        );
        return {
          primaryColor: parsed.theme.primaryColor ?? existing.theme?.primaryColor,
          secondaryColor: parsed.theme.secondaryColor ?? existing.theme?.secondaryColor,
          backgroundPattern:
            parsed.theme.backgroundPattern ?? existing.theme?.backgroundPattern,
          backgroundImageUrl: hasBackgroundImage
            ? parsed.theme.backgroundImageUrl ?? null
            : existing.theme?.backgroundImageUrl ?? null,
          musicUrl: parsed.theme.musicUrl ?? existing.theme?.musicUrl,
        };
      };

      const payload: Partial<InvitationPayload> & { slug?: string } = {
        slug: parsed.slug,
        headline: parsed.headline,
        couple: mergeCouple(),
        event: mergeEvent(),
        sections: parsed.sections
          ? parsed.sections.map((section) => ({ ...section, content: section.content ?? null }))
          : undefined,
        theme: mergeTheme(),
        isPublished: parsed.isPublished,
        status: parsed.status,
        rsvpMode: parsed.rsvpMode,
        capacity: parsed.capacity,
      };

      if (Object.prototype.hasOwnProperty.call(parsed, "rsvpPasscode")) {
        payload.rsvpPasscodeHash = parsed.rsvpPasscode
          ? await hashSecret(parsed.rsvpPasscode)
          : null;
      }

      const invitation = await updateInvitationById(req.params.id, payload);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      if (req.ownerContext) {
        req.ownerContext.invitation = invitation;
      }
      res.json(sanitizeInvitation(invitation));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", issues: error.issues });
      }
      next(error);
    }
  },
);

router.delete(
  "/:id",
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await deleteInvitationById(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:id/rotate-owner-link",
  requireOwnerOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitationId = req.params.id;
      const secret = generateOwnerSecret();
      const secretHash = await hashSecret(secret);
      const updated = await updateOwnerSecret(invitationId, secretHash);
      if (!updated) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      const ownerToken = signOwnerToken(invitationId, secret);
      const normalizedFrontend = FRONTEND_URL.replace(/\/$/, "");
      const ownerLink = `${normalizedFrontend}/#/edit/${invitationId}?k=${encodeURIComponent(ownerToken)}`;
      res.json({ invitation: sanitizeInvitation(updated), ownerToken, ownerLink });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:slug/rsvp",
  rateLimiters.rsvp,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = await getInvitationBySlug(req.params.slug);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      const status = invitation.status ?? (invitation.isPublished ? "published" : "draft");
      if (status !== "published") {
        return res.status(400).json({ message: "RSVP is unavailable for this invitation" });
      }

      const parsed = rsvpSubmissionSchema.parse(req.body);
      const mode = invitation.rsvpMode ?? "open";

      if (mode === "passcode") {
        if (!parsed.passcode || !invitation.rsvpPasscodeHash) {
          return res.status(401).json({ message: "RSVP passcode required" });
        }
        const matches = await verifySecret(invitation.rsvpPasscodeHash, parsed.passcode);
        if (!matches) {
          return res.status(401).json({ message: "Invalid RSVP passcode" });
        }
      }

      if (mode === "guest_codes") {
        if (!parsed.guestCode) {
          return res.status(401).json({ message: "Guest code required" });
        }
        const consumed = await consumeGuestCode(invitation.id, parsed.guestCode);
        if (!consumed) {
          return res.status(401).json({ message: "Guest code invalid or already used" });
        }
      }

      if (invitation.capacity && parsed.status === "yes") {
        const currentGuests = await countYesGuests(invitation.id);
        if (currentGuests + parsed.partySize > invitation.capacity) {
          return res.status(400).json({ message: "Guest capacity has been reached" });
        }
      }

  const deviceHash = parsed.deviceFingerprint ? hashFingerprint(parsed.deviceFingerprint) : null;
  const normalizedIp = normalizeIp(req.ip);
  const ipHash = normalizedIp ? hashFingerprint(normalizedIp) : null;

      const rsvp = await upsertRsvp(invitation.id, {
        name: parsed.name,
        phone: parsed.phone,
        status: parsed.status as RsvpStatus,
        partySize: parsed.partySize,
        message: parsed.message,
        deviceHash,
        ipHash,
      });
      const stats = await getRsvpStats(invitation.id);
      res.status(201).json({ rsvp: mapRsvpResponse(rsvp), stats });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", issues: error.issues });
      }
      next(error);
    }
  },
);

router.post(
  "/:slug/guestbook",
  rateLimiters.guestbook,
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invitation = await getInvitationBySlug(req.params.slug);
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }
    const status = invitation.status ?? (invitation.isPublished ? "published" : "draft");
    if (status !== "published") {
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

router.post(
  "/:invitationId/check-in",
  requireOwnerOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = z.object({ token: z.string() }).parse(req.body);
      const rsvp = await checkInGuest(req.params.invitationId, token);
      if (!rsvp) {
        return res.status(404).json({ message: "Invalid check-in token" });
      }
      res.json({ message: "Guest checked in successfully", rsvp });
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
