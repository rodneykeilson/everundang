/**
 * Gift Suggestion Engine
 * 
 * AI-powered gift suggestion system that recommends gifts based on:
 * - Couple preferences and interests
 * - Budget ranges
 * - Category preferences
 * - Guest relationship context
 * 
 * This is a unique feature that distinguishes EverUndang from other invitation platforms.
 * 
 * @module repositories/gifts
 */

import { pool } from "../db.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Gift category enumeration
 */
export type GiftCategory = 
  | "home_decor"
  | "kitchen"
  | "electronics"
  | "experiences"
  | "charity"
  | "cash"
  | "travel"
  | "fashion"
  | "wellness"
  | "custom";

/**
 * Price range for gift suggestions
 */
export type PriceRange = "budget" | "moderate" | "premium" | "luxury";

/**
 * Gift item structure
 */
export interface GiftItem {
  id: string;
  invitationId: string;
  name: string;
  description: string | null;
  category: GiftCategory;
  priceRange: PriceRange;
  estimatedPrice: number | null;
  imageUrl: string | null;
  purchaseUrl: string | null;
  priority: number;
  reserved: boolean;
  reservedBy: string | null;
  reservedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Gift preference for the couple
 */
export interface GiftPreference {
  id: string;
  invitationId: string;
  categories: GiftCategory[];
  preferredPriceRanges: PriceRange[];
  notes: string | null;
  acceptsCash: boolean;
  cashNote: string | null;
  charityPreference: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * AI suggestion based on patterns and preferences
 */
export interface GiftSuggestion {
  name: string;
  description: string;
  category: GiftCategory;
  priceRange: PriceRange;
  estimatedPrice: number;
  reason: string;
  popularity: number; // 0-100 score
}

/**
 * Pre-defined gift templates for intelligent suggestions
 */
const giftTemplates: GiftSuggestion[] = [
  // Home Decor
  {
    name: "Luxury Bedding Set",
    description: "Egyptian cotton bed sheets and duvet cover set",
    category: "home_decor",
    priceRange: "premium",
    estimatedPrice: 250,
    reason: "Essential for creating a cozy home together",
    popularity: 92,
  },
  {
    name: "Decorative Wall Art Set",
    description: "Curated set of modern wall art pieces",
    category: "home_decor",
    priceRange: "moderate",
    estimatedPrice: 150,
    reason: "Personalizes your new shared space",
    popularity: 78,
  },
  {
    name: "Smart Home Starter Kit",
    description: "Smart lights, thermostat, and voice assistant bundle",
    category: "electronics",
    priceRange: "premium",
    estimatedPrice: 350,
    reason: "Modern convenience for your new home",
    popularity: 85,
  },
  // Kitchen
  {
    name: "Premium Cookware Set",
    description: "Professional-grade non-stick cookware collection",
    category: "kitchen",
    priceRange: "premium",
    estimatedPrice: 400,
    reason: "Cook memorable meals together",
    popularity: 95,
  },
  {
    name: "Espresso Machine",
    description: "Automatic espresso and cappuccino maker",
    category: "kitchen",
    priceRange: "luxury",
    estimatedPrice: 600,
    reason: "Perfect for coffee-loving couples",
    popularity: 88,
  },
  {
    name: "Kitchen Appliance Bundle",
    description: "Blender, toaster, and electric kettle set",
    category: "kitchen",
    priceRange: "moderate",
    estimatedPrice: 180,
    reason: "Essential kitchen companions",
    popularity: 82,
  },
  // Experiences
  {
    name: "Spa Day for Two",
    description: "Couples massage and spa treatment package",
    category: "experiences",
    priceRange: "premium",
    estimatedPrice: 300,
    reason: "Relaxation after wedding preparations",
    popularity: 90,
  },
  {
    name: "Cooking Class Experience",
    description: "Private cooking class for couples",
    category: "experiences",
    priceRange: "moderate",
    estimatedPrice: 150,
    reason: "Learn to cook together",
    popularity: 75,
  },
  {
    name: "Weekend Getaway Voucher",
    description: "Luxury hotel stay for a weekend escape",
    category: "travel",
    priceRange: "luxury",
    estimatedPrice: 500,
    reason: "Mini honeymoon experience",
    popularity: 93,
  },
  // Travel
  {
    name: "Premium Luggage Set",
    description: "Matching hardshell luggage for honeymoon travel",
    category: "travel",
    priceRange: "premium",
    estimatedPrice: 350,
    reason: "Travel in style together",
    popularity: 86,
  },
  // Wellness
  {
    name: "Fitness Tracker Duo",
    description: "Matching fitness trackers for health goals",
    category: "wellness",
    priceRange: "moderate",
    estimatedPrice: 200,
    reason: "Stay healthy together",
    popularity: 72,
  },
  // Charity
  {
    name: "Charity Donation",
    description: "Contribution to the couple's chosen charity",
    category: "charity",
    priceRange: "budget",
    estimatedPrice: 50,
    reason: "Give back together",
    popularity: 65,
  },
  // Cash
  {
    name: "Honeymoon Fund Contribution",
    description: "Direct contribution to honeymoon savings",
    category: "cash",
    priceRange: "budget",
    estimatedPrice: 100,
    reason: "Help fund the perfect honeymoon",
    popularity: 98,
  },
];

/**
 * Price range boundaries
 */
const priceRangeBoundaries: Record<PriceRange, { min: number; max: number }> = {
  budget: { min: 0, max: 75 },
  moderate: { min: 75, max: 200 },
  premium: { min: 200, max: 500 },
  luxury: { min: 500, max: 10000 },
};

/**
 * Generates intelligent gift suggestions based on preferences
 */
export function generateGiftSuggestions(
  preferences: Partial<GiftPreference>,
  count: number = 10
): GiftSuggestion[] {
  const categories = preferences.categories ?? Object.keys(priceRangeBoundaries) as GiftCategory[];
  const priceRanges = preferences.preferredPriceRanges ?? ["moderate", "premium"];

  // Filter templates based on preferences
  let suggestions = giftTemplates.filter(template => {
    const categoryMatch = categories.length === 0 || categories.includes(template.category);
    const priceMatch = priceRanges.length === 0 || priceRanges.includes(template.priceRange);
    return categoryMatch && priceMatch;
  });

  // Handle cash preference
  if (!preferences.acceptsCash) {
    suggestions = suggestions.filter(s => s.category !== "cash");
  }

  // Handle charity preference
  if (!preferences.charityPreference) {
    suggestions = suggestions.filter(s => s.category !== "charity");
  }

  // Sort by popularity and take top N
  suggestions.sort((a, b) => b.popularity - a.popularity);
  
  return suggestions.slice(0, count);
}

/**
 * Creates the gift_items table if it doesn't exist
 */
export async function ensureGiftTables(): Promise<void> {
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gift_category') THEN
        CREATE TYPE gift_category AS ENUM (
          'home_decor', 'kitchen', 'electronics', 'experiences',
          'charity', 'cash', 'travel', 'fashion', 'wellness', 'custom'
        );
      END IF;
    END $$;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gift_price_range') THEN
        CREATE TYPE gift_price_range AS ENUM ('budget', 'moderate', 'premium', 'luxury');
      END IF;
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS gift_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
      categories TEXT[] NOT NULL DEFAULT '{}',
      preferred_price_ranges TEXT[] NOT NULL DEFAULT '{}',
      notes TEXT,
      accepts_cash BOOLEAN NOT NULL DEFAULT true,
      cash_note TEXT,
      charity_preference TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(invitation_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS gift_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      price_range TEXT NOT NULL,
      estimated_price NUMERIC,
      image_url TEXT,
      purchase_url TEXT,
      priority INTEGER NOT NULL DEFAULT 0,
      reserved BOOLEAN NOT NULL DEFAULT false,
      reserved_by TEXT,
      reserved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS gift_items_invitation_idx ON gift_items(invitation_id);
    CREATE INDEX IF NOT EXISTS gift_items_category_idx ON gift_items(category);
    CREATE INDEX IF NOT EXISTS gift_items_reserved_idx ON gift_items(reserved);
  `);
}

/**
 * Gets gift preferences for an invitation
 */
export async function getGiftPreferences(invitationId: string): Promise<GiftPreference | null> {
  const result = await pool.query(
    `SELECT 
      id,
      invitation_id as "invitationId",
      categories,
      preferred_price_ranges as "preferredPriceRanges",
      notes,
      accepts_cash as "acceptsCash",
      cash_note as "cashNote",
      charity_preference as "charityPreference",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM gift_preferences
    WHERE invitation_id = $1`,
    [invitationId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    ...row,
    categories: row.categories ?? [],
    preferredPriceRanges: row.preferredPriceRanges ?? [],
  };
}

/**
 * Creates or updates gift preferences for an invitation
 */
export async function upsertGiftPreferences(
  invitationId: string,
  preferences: Partial<Omit<GiftPreference, "id" | "invitationId" | "createdAt" | "updatedAt">>
): Promise<GiftPreference> {
  const result = await pool.query(
    `INSERT INTO gift_preferences (
      invitation_id, categories, preferred_price_ranges, notes,
      accepts_cash, cash_note, charity_preference
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (invitation_id) DO UPDATE SET
      categories = COALESCE(EXCLUDED.categories, gift_preferences.categories),
      preferred_price_ranges = COALESCE(EXCLUDED.preferred_price_ranges, gift_preferences.preferred_price_ranges),
      notes = COALESCE(EXCLUDED.notes, gift_preferences.notes),
      accepts_cash = COALESCE(EXCLUDED.accepts_cash, gift_preferences.accepts_cash),
      cash_note = COALESCE(EXCLUDED.cash_note, gift_preferences.cash_note),
      charity_preference = COALESCE(EXCLUDED.charity_preference, gift_preferences.charity_preference),
      updated_at = NOW()
    RETURNING
      id,
      invitation_id as "invitationId",
      categories,
      preferred_price_ranges as "preferredPriceRanges",
      notes,
      accepts_cash as "acceptsCash",
      cash_note as "cashNote",
      charity_preference as "charityPreference",
      created_at as "createdAt",
      updated_at as "updatedAt"`,
    [
      invitationId,
      preferences.categories ?? [],
      preferences.preferredPriceRanges ?? [],
      preferences.notes ?? null,
      preferences.acceptsCash ?? true,
      preferences.cashNote ?? null,
      preferences.charityPreference ?? null,
    ]
  );

  return result.rows[0];
}

/**
 * Lists all gift items for an invitation
 */
export async function listGiftItems(invitationId: string): Promise<GiftItem[]> {
  const result = await pool.query(
    `SELECT 
      id,
      invitation_id as "invitationId",
      name,
      description,
      category,
      price_range as "priceRange",
      estimated_price as "estimatedPrice",
      image_url as "imageUrl",
      purchase_url as "purchaseUrl",
      priority,
      reserved,
      reserved_by as "reservedBy",
      reserved_at as "reservedAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM gift_items
    WHERE invitation_id = $1
    ORDER BY priority DESC, created_at ASC`,
    [invitationId]
  );

  return result.rows;
}

/**
 * Adds a gift item to an invitation's registry
 */
export async function addGiftItem(
  invitationId: string,
  item: Omit<GiftItem, "id" | "invitationId" | "reserved" | "reservedBy" | "reservedAt" | "createdAt" | "updatedAt">
): Promise<GiftItem> {
  const result = await pool.query(
    `INSERT INTO gift_items (
      invitation_id, name, description, category, price_range,
      estimated_price, image_url, purchase_url, priority
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING
      id,
      invitation_id as "invitationId",
      name,
      description,
      category,
      price_range as "priceRange",
      estimated_price as "estimatedPrice",
      image_url as "imageUrl",
      purchase_url as "purchaseUrl",
      priority,
      reserved,
      reserved_by as "reservedBy",
      reserved_at as "reservedAt",
      created_at as "createdAt",
      updated_at as "updatedAt"`,
    [
      invitationId,
      item.name,
      item.description ?? null,
      item.category,
      item.priceRange,
      item.estimatedPrice ?? null,
      item.imageUrl ?? null,
      item.purchaseUrl ?? null,
      item.priority ?? 0,
    ]
  );

  return result.rows[0];
}

/**
 * Reserves a gift item for a guest
 */
export async function reserveGiftItem(
  itemId: string,
  guestName: string
): Promise<GiftItem | null> {
  const result = await pool.query(
    `UPDATE gift_items
    SET reserved = true, reserved_by = $2, reserved_at = NOW(), updated_at = NOW()
    WHERE id = $1 AND reserved = false
    RETURNING
      id,
      invitation_id as "invitationId",
      name,
      description,
      category,
      price_range as "priceRange",
      estimated_price as "estimatedPrice",
      image_url as "imageUrl",
      purchase_url as "purchaseUrl",
      priority,
      reserved,
      reserved_by as "reservedBy",
      reserved_at as "reservedAt",
      created_at as "createdAt",
      updated_at as "updatedAt"`,
    [itemId, guestName]
  );

  return result.rows[0] ?? null;
}

/**
 * Unreserves a gift item
 */
export async function unreserveGiftItem(itemId: string): Promise<GiftItem | null> {
  const result = await pool.query(
    `UPDATE gift_items
    SET reserved = false, reserved_by = NULL, reserved_at = NULL, updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      invitation_id as "invitationId",
      name,
      description,
      category,
      price_range as "priceRange",
      estimated_price as "estimatedPrice",
      image_url as "imageUrl",
      purchase_url as "purchaseUrl",
      priority,
      reserved,
      reserved_by as "reservedBy",
      reserved_at as "reservedAt",
      created_at as "createdAt",
      updated_at as "updatedAt"`,
    [itemId]
  );

  return result.rows[0] ?? null;
}

/**
 * Deletes a gift item
 */
export async function deleteGiftItem(itemId: string, invitationId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM gift_items WHERE id = $1 AND invitation_id = $2`,
    [itemId, invitationId]
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * Gets gift registry statistics for an invitation
 */
export async function getGiftRegistryStats(invitationId: string): Promise<{
  totalItems: number;
  reservedItems: number;
  totalValue: number;
  reservedValue: number;
  byCategory: Record<string, { count: number; reserved: number }>;
}> {
  const result = await pool.query(
    `SELECT 
      COUNT(*)::int as total,
      SUM(CASE WHEN reserved THEN 1 ELSE 0 END)::int as reserved,
      COALESCE(SUM(estimated_price), 0)::numeric as "totalValue",
      COALESCE(SUM(CASE WHEN reserved THEN estimated_price ELSE 0 END), 0)::numeric as "reservedValue"
    FROM gift_items
    WHERE invitation_id = $1`,
    [invitationId]
  );

  const categoryResult = await pool.query(
    `SELECT 
      category,
      COUNT(*)::int as count,
      SUM(CASE WHEN reserved THEN 1 ELSE 0 END)::int as reserved
    FROM gift_items
    WHERE invitation_id = $1
    GROUP BY category`,
    [invitationId]
  );

  const byCategory: Record<string, { count: number; reserved: number }> = {};
  for (const row of categoryResult.rows) {
    byCategory[row.category] = {
      count: row.count,
      reserved: row.reserved,
    };
  }

  const row = result.rows[0];
  return {
    totalItems: row.total,
    reservedItems: row.reserved,
    totalValue: Number(row.totalValue),
    reservedValue: Number(row.reservedValue),
    byCategory,
  };
}

export default {
  generateGiftSuggestions,
  ensureGiftTables,
  getGiftPreferences,
  upsertGiftPreferences,
  listGiftItems,
  addGiftItem,
  reserveGiftItem,
  unreserveGiftItem,
  deleteGiftItem,
  getGiftRegistryStats,
};
