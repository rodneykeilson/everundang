/**
 * Gift Registry API Routes
 * 
 * Handles all gift registry operations including:
 * - AI-powered gift suggestions
 * - Gift preferences management
 * - Gift item CRUD operations
 * - Gift reservation system
 * 
 * @module routes/gifts
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import {
  generateGiftSuggestions,
  getGiftPreferences,
  upsertGiftPreferences,
  listGiftItems,
  addGiftItem,
  reserveGiftItem,
  unreserveGiftItem,
  deleteGiftItem,
  getGiftRegistryStats,
  type GiftCategory,
  type PriceRange,
} from "../repositories/gifts.js";
import { getInvitationById, getInvitationBySlug } from "../repositories/invitations.js";
import { requireOwnerOrAdmin } from "../middleware/auth.js";
import { rateLimiters } from "../middleware/rateLimit.js";

const router = Router();

/**
 * Zod schemas for validation
 */
const giftCategorySchema = z.enum([
  "home_decor",
  "kitchen",
  "electronics",
  "experiences",
  "charity",
  "cash",
  "travel",
  "fashion",
  "wellness",
  "custom",
]);

const priceRangeSchema = z.enum(["budget", "moderate", "premium", "luxury"]);

const giftPreferencesSchema = z.object({
  categories: z.array(giftCategorySchema).optional(),
  preferredPriceRanges: z.array(priceRangeSchema).optional(),
  notes: z.string().max(1000).nullable().optional(),
  acceptsCash: z.boolean().optional(),
  cashNote: z.string().max(500).nullable().optional(),
  charityPreference: z.string().max(200).nullable().optional(),
});

const giftItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  category: giftCategorySchema,
  priceRange: priceRangeSchema,
  estimatedPrice: z.number().min(0).max(100000).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  purchaseUrl: z.string().url().nullable().optional(),
  priority: z.number().int().min(0).max(100).optional(),
});

const reserveGiftSchema = z.object({
  guestName: z.string().min(1).max(100),
});

const suggestionQuerySchema = z.object({
  categories: z.string().optional().transform(val => val?.split(",") as GiftCategory[] | undefined),
  priceRanges: z.string().optional().transform(val => val?.split(",") as PriceRange[] | undefined),
  count: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  acceptsCash: z.string().optional().transform(val => val === "true"),
});

/**
 * GET /api/gifts/:invitationId/suggestions
 * Get AI-powered gift suggestions based on preferences
 */
router.get(
  "/:invitationId/suggestions",
  rateLimiters.read,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = await getInvitationById(req.params.invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      // Check if invitation is published
      const status = invitation.status ?? (invitation.isPublished ? "published" : "draft");
      if (status !== "published") {
        return res.status(403).json({ message: "Gift suggestions unavailable for unpublished invitations" });
      }

      const query = suggestionQuerySchema.parse(req.query);
      
      // Get stored preferences or use query params
      const storedPreferences = await getGiftPreferences(invitation.id);
      
      const preferences = {
        categories: query.categories ?? storedPreferences?.categories,
        preferredPriceRanges: query.priceRanges ?? storedPreferences?.preferredPriceRanges,
        acceptsCash: query.acceptsCash ?? storedPreferences?.acceptsCash ?? true,
        charityPreference: storedPreferences?.charityPreference,
      };

      const suggestions = generateGiftSuggestions(preferences, query.count ?? 10);
      
      res.json({
        suggestions,
        preferences: storedPreferences,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", issues: error.issues });
      }
      next(error);
    }
  }
);

/**
 * GET /api/gifts/:invitationId/preferences
 * Get gift preferences for an invitation (owner only)
 */
router.get(
  "/:invitationId/preferences",
  requireOwnerOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = req.ownerContext?.invitation ?? await getInvitationById(req.params.invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      const preferences = await getGiftPreferences(invitation.id);
      res.json({ preferences });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/gifts/:invitationId/preferences
 * Update gift preferences for an invitation (owner only)
 */
router.put(
  "/:invitationId/preferences",
  requireOwnerOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = req.ownerContext?.invitation ?? await getInvitationById(req.params.invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      const parsed = giftPreferencesSchema.parse(req.body);
      const preferences = await upsertGiftPreferences(invitation.id, parsed);
      
      res.json({ preferences });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", issues: error.issues });
      }
      next(error);
    }
  }
);

/**
 * GET /api/gifts/:invitationId/registry
 * Get the gift registry for a published invitation (public)
 */
router.get(
  "/:invitationId/registry",
  rateLimiters.read,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = await getInvitationById(req.params.invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      // Check if invitation is published
      const status = invitation.status ?? (invitation.isPublished ? "published" : "draft");
      if (status !== "published") {
        return res.status(403).json({ message: "Gift registry unavailable for unpublished invitations" });
      }

      const [items, preferences, stats] = await Promise.all([
        listGiftItems(invitation.id),
        getGiftPreferences(invitation.id),
        getGiftRegistryStats(invitation.id),
      ]);

      res.json({
        items,
        preferences: preferences ? {
          acceptsCash: preferences.acceptsCash,
          cashNote: preferences.cashNote,
          charityPreference: preferences.charityPreference,
        } : null,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/gifts/:invitationId/registry/manage
 * Get the gift registry with full details (owner only)
 */
router.get(
  "/:invitationId/registry/manage",
  requireOwnerOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = req.ownerContext?.invitation ?? await getInvitationById(req.params.invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      const [items, preferences, stats] = await Promise.all([
        listGiftItems(invitation.id),
        getGiftPreferences(invitation.id),
        getGiftRegistryStats(invitation.id),
      ]);

      res.json({
        items,
        preferences,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/gifts/:invitationId/registry
 * Add a gift item to the registry (owner only)
 */
router.post(
  "/:invitationId/registry",
  requireOwnerOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = req.ownerContext?.invitation ?? await getInvitationById(req.params.invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      const parsed = giftItemSchema.parse(req.body);
      const item = await addGiftItem(invitation.id, {
        name: parsed.name,
        description: parsed.description ?? null,
        category: parsed.category as GiftCategory,
        priceRange: parsed.priceRange as PriceRange,
        estimatedPrice: parsed.estimatedPrice ?? null,
        imageUrl: parsed.imageUrl ?? null,
        purchaseUrl: parsed.purchaseUrl ?? null,
        priority: parsed.priority ?? 0,
      });

      res.status(201).json({ item });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", issues: error.issues });
      }
      next(error);
    }
  }
);

/**
 * POST /api/gifts/:invitationId/registry/:itemId/reserve
 * Reserve a gift item (public)
 */
router.post(
  "/:invitationId/registry/:itemId/reserve",
  rateLimiters.rsvp, // Use RSVP rate limiter for reservations
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = await getInvitationById(req.params.invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      // Check if invitation is published
      const status = invitation.status ?? (invitation.isPublished ? "published" : "draft");
      if (status !== "published") {
        return res.status(403).json({ message: "Gift reservation unavailable for unpublished invitations" });
      }

      const parsed = reserveGiftSchema.parse(req.body);
      const item = await reserveGiftItem(req.params.itemId, parsed.guestName);
      
      if (!item) {
        return res.status(409).json({ message: "Gift is already reserved or not found" });
      }

      res.json({ item });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", issues: error.issues });
      }
      next(error);
    }
  }
);

/**
 * POST /api/gifts/:invitationId/registry/:itemId/unreserve
 * Unreserve a gift item (owner only)
 */
router.post(
  "/:invitationId/registry/:itemId/unreserve",
  requireOwnerOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = req.ownerContext?.invitation ?? await getInvitationById(req.params.invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      const item = await unreserveGiftItem(req.params.itemId);
      if (!item) {
        return res.status(404).json({ message: "Gift item not found" });
      }

      res.json({ item });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/gifts/:invitationId/registry/:itemId
 * Delete a gift item from the registry (owner only)
 */
router.delete(
  "/:invitationId/registry/:itemId",
  requireOwnerOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = req.ownerContext?.invitation ?? await getInvitationById(req.params.invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      const deleted = await deleteGiftItem(req.params.itemId, invitation.id);
      if (!deleted) {
        return res.status(404).json({ message: "Gift item not found" });
      }

      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
