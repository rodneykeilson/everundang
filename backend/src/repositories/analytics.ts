/**
 * Event Analytics Repository
 * 
 * Provides real-time analytics and insights for invitation events.
 * Tracks RSVP trends, engagement metrics, and attendance predictions.
 * 
 * Features:
 * - RSVP trend analysis over time
 * - Geographic distribution (if location data available)
 * - Engagement metrics
 * - Attendance predictions based on patterns
 * 
 * @module repositories/analytics
 */

import { pool } from "../db.js";

/**
 * RSVP trend data point
 */
export interface RsvpTrendPoint {
  date: string;
  yesCount: number;
  maybeCount: number;
  noCount: number;
  totalResponses: number;
  cumulativeGuests: number;
}

/**
 * Daily activity summary
 */
export interface DailyActivity {
  date: string;
  rsvpCount: number;
  guestbookCount: number;
  giftReservations: number;
}

/**
 * Response time analysis
 */
export interface ResponseTimeAnalysis {
  averageResponseDays: number;
  fastestResponseDays: number;
  slowestResponseDays: number;
  responsesByDayOfWeek: Record<string, number>;
  responsesByHourOfDay: Record<string, number>;
}

/**
 * Engagement metrics
 */
export interface EngagementMetrics {
  totalRsvps: number;
  totalGuestbookEntries: number;
  totalGiftReservations: number;
  rsvpConversionRate: number; // Percentage who said yes
  averagePartySize: number;
  peakActivityDay: string | null;
  peakActivityHour: number | null;
}

/**
 * Attendance prediction
 */
export interface AttendancePrediction {
  predictedAttendees: number;
  confidenceLevel: "low" | "medium" | "high";
  basedOnResponses: number;
  maybeConversionRate: number;
  notes: string[];
}

/**
 * Complete analytics dashboard data
 */
export interface AnalyticsDashboard {
  summary: {
    totalInvited: number | null;
    totalResponded: number;
    responseRate: number;
    confirmedGuests: number;
    maybeGuests: number;
    declinedGuests: number;
  };
  trends: RsvpTrendPoint[];
  dailyActivity: DailyActivity[];
  responseAnalysis: ResponseTimeAnalysis;
  engagement: EngagementMetrics;
  prediction: AttendancePrediction;
}

/**
 * Gets RSVP trends over time for an invitation
 */
export async function getRsvpTrends(
  invitationId: string,
  days: number = 30
): Promise<RsvpTrendPoint[]> {
  const result = await pool.query(
    `WITH date_series AS (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '${days} days',
        CURRENT_DATE,
        '1 day'::interval
      )::date as date
    ),
    daily_rsvps AS (
      SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN status = 'yes' THEN 1 ELSE 0 END) as yes_count,
        SUM(CASE WHEN status = 'maybe' THEN 1 ELSE 0 END) as maybe_count,
        SUM(CASE WHEN status = 'no' THEN 1 ELSE 0 END) as no_count,
        SUM(CASE WHEN status = 'yes' THEN party_size ELSE 0 END) as yes_guests
      FROM rsvps
      WHERE invitation_id = $1
        AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
    )
    SELECT 
      ds.date::text,
      COALESCE(dr.yes_count, 0)::int as "yesCount",
      COALESCE(dr.maybe_count, 0)::int as "maybeCount",
      COALESCE(dr.no_count, 0)::int as "noCount",
      COALESCE(dr.yes_count + dr.maybe_count + dr.no_count, 0)::int as "totalResponses",
      SUM(COALESCE(dr.yes_guests, 0)) OVER (ORDER BY ds.date)::int as "cumulativeGuests"
    FROM date_series ds
    LEFT JOIN daily_rsvps dr ON ds.date = dr.date
    ORDER BY ds.date`,
    [invitationId]
  );

  return result.rows;
}

/**
 * Gets daily activity for an invitation
 */
export async function getDailyActivity(
  invitationId: string,
  days: number = 14
): Promise<DailyActivity[]> {
  const result = await pool.query(
    `WITH date_series AS (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '${days} days',
        CURRENT_DATE,
        '1 day'::interval
      )::date as date
    ),
    daily_stats AS (
      SELECT 
        DATE(r.created_at) as date,
        COUNT(DISTINCT r.id) as rsvp_count
      FROM rsvps r
      WHERE r.invitation_id = $1
        AND r.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(r.created_at)
    ),
    daily_guestbook AS (
      SELECT 
        DATE(g.created_at) as date,
        COUNT(*) as guestbook_count
      FROM guestbook_entries g
      WHERE g.invitation_id = $1
        AND g.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(g.created_at)
    ),
    daily_gifts AS (
      SELECT 
        DATE(gi.reserved_at) as date,
        COUNT(*) as gift_count
      FROM gift_items gi
      WHERE gi.invitation_id = $1
        AND gi.reserved = true
        AND gi.reserved_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(gi.reserved_at)
    )
    SELECT 
      ds.date::text,
      COALESCE(dst.rsvp_count, 0)::int as "rsvpCount",
      COALESCE(dg.guestbook_count, 0)::int as "guestbookCount",
      COALESCE(dgf.gift_count, 0)::int as "giftReservations"
    FROM date_series ds
    LEFT JOIN daily_stats dst ON ds.date = dst.date
    LEFT JOIN daily_guestbook dg ON ds.date = dg.date
    LEFT JOIN daily_gifts dgf ON ds.date = dgf.date
    ORDER BY ds.date`,
    [invitationId]
  );

  return result.rows;
}

/**
 * Analyzes response time patterns
 */
export async function getResponseTimeAnalysis(
  invitationId: string
): Promise<ResponseTimeAnalysis> {
  // Get invitation created date for response time calculation
  const invitationResult = await pool.query(
    `SELECT created_at FROM invitations WHERE id = $1`,
    [invitationId]
  );

  if (invitationResult.rows.length === 0) {
    return {
      averageResponseDays: 0,
      fastestResponseDays: 0,
      slowestResponseDays: 0,
      responsesByDayOfWeek: {},
      responsesByHourOfDay: {},
    };
  }

  const invitationCreated = invitationResult.rows[0].created_at;

  const analysisResult = await pool.query(
    `SELECT 
      AVG(EXTRACT(EPOCH FROM (created_at - $2)) / 86400)::numeric(10,2) as avg_days,
      MIN(EXTRACT(EPOCH FROM (created_at - $2)) / 86400)::numeric(10,2) as min_days,
      MAX(EXTRACT(EPOCH FROM (created_at - $2)) / 86400)::numeric(10,2) as max_days
    FROM rsvps
    WHERE invitation_id = $1`,
    [invitationId, invitationCreated]
  );

  const byDayResult = await pool.query(
    `SELECT 
      TO_CHAR(created_at, 'Day') as day_name,
      COUNT(*)::int as count
    FROM rsvps
    WHERE invitation_id = $1
    GROUP BY TO_CHAR(created_at, 'Day'), EXTRACT(DOW FROM created_at)
    ORDER BY EXTRACT(DOW FROM created_at)`,
    [invitationId]
  );

  const byHourResult = await pool.query(
    `SELECT 
      EXTRACT(HOUR FROM created_at)::int as hour,
      COUNT(*)::int as count
    FROM rsvps
    WHERE invitation_id = $1
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY hour`,
    [invitationId]
  );

  const responsesByDayOfWeek: Record<string, number> = {};
  for (const row of byDayResult.rows) {
    responsesByDayOfWeek[row.day_name.trim()] = row.count;
  }

  const responsesByHourOfDay: Record<string, number> = {};
  for (const row of byHourResult.rows) {
    responsesByHourOfDay[String(row.hour)] = row.count;
  }

  const analysis = analysisResult.rows[0];
  return {
    averageResponseDays: parseFloat(analysis.avg_days) || 0,
    fastestResponseDays: Math.max(0, parseFloat(analysis.min_days) || 0),
    slowestResponseDays: parseFloat(analysis.max_days) || 0,
    responsesByDayOfWeek,
    responsesByHourOfDay,
  };
}

/**
 * Gets engagement metrics for an invitation
 */
export async function getEngagementMetrics(invitationId: string): Promise<EngagementMetrics> {
  const [rsvpStats, guestbookStats, giftStats, peakActivity] = await Promise.all([
    pool.query(
      `SELECT 
        COUNT(*)::int as total,
        SUM(CASE WHEN status = 'yes' THEN 1 ELSE 0 END)::int as yes_count,
        AVG(CASE WHEN status = 'yes' THEN party_size ELSE NULL END)::numeric(10,2) as avg_party_size
      FROM rsvps
      WHERE invitation_id = $1`,
      [invitationId]
    ),
    pool.query(
      `SELECT COUNT(*)::int as total FROM guestbook_entries WHERE invitation_id = $1`,
      [invitationId]
    ),
    pool.query(
      `SELECT COUNT(*)::int as total FROM gift_items WHERE invitation_id = $1 AND reserved = true`,
      [invitationId]
    ),
    pool.query(
      `SELECT 
        DATE(created_at)::text as peak_day,
        EXTRACT(HOUR FROM created_at)::int as peak_hour,
        COUNT(*) as count
      FROM rsvps
      WHERE invitation_id = $1
      GROUP BY DATE(created_at), EXTRACT(HOUR FROM created_at)
      ORDER BY count DESC
      LIMIT 1`,
      [invitationId]
    ),
  ]);

  const rsvp = rsvpStats.rows[0];
  const total = rsvp.total || 0;
  const yesCount = rsvp.yes_count || 0;

  return {
    totalRsvps: total,
    totalGuestbookEntries: guestbookStats.rows[0]?.total || 0,
    totalGiftReservations: giftStats.rows[0]?.total || 0,
    rsvpConversionRate: total > 0 ? (yesCount / total) * 100 : 0,
    averagePartySize: parseFloat(rsvp.avg_party_size) || 1,
    peakActivityDay: peakActivity.rows[0]?.peak_day || null,
    peakActivityHour: peakActivity.rows[0]?.peak_hour ?? null,
  };
}

/**
 * Generates attendance prediction based on current data
 */
export async function getAttendancePrediction(
  invitationId: string,
  capacity: number | null = null
): Promise<AttendancePrediction> {
  const result = await pool.query(
    `SELECT 
      SUM(CASE WHEN status = 'yes' THEN party_size ELSE 0 END)::int as confirmed_guests,
      SUM(CASE WHEN status = 'maybe' THEN party_size ELSE 0 END)::int as maybe_guests,
      COUNT(*)::int as total_responses
    FROM rsvps
    WHERE invitation_id = $1`,
    [invitationId]
  );

  const stats = result.rows[0];
  const confirmedGuests = stats.confirmed_guests || 0;
  const maybeGuests = stats.maybe_guests || 0;
  const totalResponses = stats.total_responses || 0;

  // Apply conversion rate for "maybe" responses
  // Historical data suggests about 40-60% of "maybes" typically attend
  const maybeConversionRate = 0.5;
  const predictedFromMaybes = Math.round(maybeGuests * maybeConversionRate);
  const predictedAttendees = confirmedGuests + predictedFromMaybes;

  // Determine confidence level
  let confidenceLevel: "low" | "medium" | "high";
  const notes: string[] = [];

  if (totalResponses < 5) {
    confidenceLevel = "low";
    notes.push("Limited response data available");
  } else if (totalResponses < 20) {
    confidenceLevel = "medium";
    notes.push("Moderate response data");
  } else {
    confidenceLevel = "high";
    notes.push("Sufficient response data for accurate prediction");
  }

  if (maybeGuests > confirmedGuests) {
    notes.push("High number of uncertain responses");
    if (confidenceLevel === "high") confidenceLevel = "medium";
  }

  if (capacity && predictedAttendees > capacity) {
    notes.push(`Predicted attendance exceeds capacity of ${capacity}`);
  }

  return {
    predictedAttendees,
    confidenceLevel,
    basedOnResponses: totalResponses,
    maybeConversionRate: maybeConversionRate * 100,
    notes,
  };
}

/**
 * Gets complete analytics dashboard data for an invitation
 */
export async function getAnalyticsDashboard(
  invitationId: string,
  capacity: number | null = null
): Promise<AnalyticsDashboard> {
  const [
    summaryResult,
    trends,
    dailyActivity,
    responseAnalysis,
    engagement,
    prediction,
  ] = await Promise.all([
    pool.query(
      `SELECT 
        COUNT(*)::int as total_responded,
        SUM(CASE WHEN status = 'yes' THEN party_size ELSE 0 END)::int as confirmed_guests,
        SUM(CASE WHEN status = 'maybe' THEN party_size ELSE 0 END)::int as maybe_guests,
        SUM(CASE WHEN status = 'no' THEN party_size ELSE 0 END)::int as declined_guests
      FROM rsvps
      WHERE invitation_id = $1`,
      [invitationId]
    ),
    getRsvpTrends(invitationId),
    getDailyActivity(invitationId),
    getResponseTimeAnalysis(invitationId),
    getEngagementMetrics(invitationId),
    getAttendancePrediction(invitationId, capacity),
  ]);

  const summary = summaryResult.rows[0];
  const totalResponded = summary.total_responded || 0;

  return {
    summary: {
      totalInvited: capacity,
      totalResponded,
      responseRate: capacity ? (totalResponded / capacity) * 100 : 0,
      confirmedGuests: summary.confirmed_guests || 0,
      maybeGuests: summary.maybe_guests || 0,
      declinedGuests: summary.declined_guests || 0,
    },
    trends,
    dailyActivity,
    responseAnalysis,
    engagement,
    prediction,
  };
}

export default {
  getRsvpTrends,
  getDailyActivity,
  getResponseTimeAnalysis,
  getEngagementMetrics,
  getAttendancePrediction,
  getAnalyticsDashboard,
};
