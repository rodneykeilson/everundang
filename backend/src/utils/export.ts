/**
 * EverUndang Export Utilities
 *
 * Provides export functionality for:
 * - CSV guest lists
 * - RSVP data exports
 * - Guestbook message exports
 * - Analytics reports
 */

import type { RsvpRecord, InvitationRecord } from "../types.js";
import { listRsvps } from "../repositories/rsvps.js";
import { listGuestbookEntries, type GuestbookEntryRecord } from "../repositories/invitations.js";

/**
 * Escape a value for CSV
 */
function escapeCSV(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value);

  // If value contains comma, newline, or quote, wrap in quotes and escape quotes
  if (str.includes(",") || str.includes("\n") || str.includes('"') || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV<T>(
  data: T[],
  columns: Array<{ key: keyof T; header: string }>
): string {
  if (data.length === 0) {
    return columns.map((c) => c.header).join(",");
  }

  const header = columns.map((c) => escapeCSV(c.header)).join(",");
  const rows = data.map((row) =>
    columns
      .map((c) => escapeCSV(row[c.key] as unknown as string | number | boolean | null))
      .join(",")
  );

  return [header, ...rows].join("\n");
}

/**
 * Export RSVP data as CSV
 */
export async function exportRsvpsToCSV(invitationId: string): Promise<string> {
  const rsvps = await listRsvps(invitationId);

  const columns: Array<{ key: keyof RsvpRecord; header: string }> = [
    { key: "name", header: "Guest Name" },
    { key: "phone", header: "Phone" },
    { key: "status", header: "Response" },
    { key: "partySize", header: "Party Size" },
    { key: "message", header: "Message" },
    { key: "createdAt", header: "Submitted At" },
  ];

  return arrayToCSV(rsvps, columns);
}

/**
 * Export guestbook entries as CSV
 */
export function exportGuestbookToCSV(entries: GuestbookEntryRecord[]): string {
  const columns: Array<{ key: keyof GuestbookEntryRecord; header: string }> = [
    { key: "guestName", header: "Author" },
    { key: "message", header: "Message" },
    { key: "createdAt", header: "Posted At" },
  ];

  return arrayToCSV(entries, columns);
}

/**
 * RSVP summary for export
 */
interface RsvpSummary {
  totalResponses: number;
  yesCount: number;
  maybeCount: number;
  noCount: number;
  totalGuests: number;
  responseRate: string;
}

/**
 * Generate RSVP summary statistics
 */
export async function generateRsvpSummary(invitationId: string): Promise<RsvpSummary> {
  const rsvps = await listRsvps(invitationId);

  const summary = {
    totalResponses: rsvps.length,
    yesCount: 0,
    maybeCount: 0,
    noCount: 0,
    totalGuests: 0,
    responseRate: "0%",
  };

  for (const rsvp of rsvps) {
    if (rsvp.status === "yes") {
      summary.yesCount++;
      summary.totalGuests += rsvp.partySize ?? 1;
    } else if (rsvp.status === "maybe") {
      summary.maybeCount++;
      summary.totalGuests += rsvp.partySize ?? 1;
    } else if (rsvp.status === "no") {
      summary.noCount++;
    }
  }

  return summary;
}

/**
 * Export format for invitation data
 */
interface InvitationExportData {
  id: string;
  slug: string;
  title: string;
  headline: string;
  coupleNames: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  status: string;
  rsvpMode: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Export invitation data to a flat structure
 */
export function exportInvitationData(invitation: InvitationRecord): InvitationExportData {
  // Get couple names from the CoupleInfo structure
  const brideName = invitation.couple.brideName ?? "";
  const groomName = invitation.couple.groomName ?? "";
  const coupleNames = `${brideName} & ${groomName}`;

  return {
    id: invitation.id,
    slug: invitation.slug,
    title: invitation.title ?? invitation.event?.title ?? "",
    headline: invitation.headline,
    coupleNames,
    eventDate: invitation.dateISO ?? invitation.event?.date ?? "",
    eventTime: invitation.timeStr ?? invitation.event?.time ?? "",
    venue: invitation.venue ?? invitation.event?.venue ?? "",
    status: invitation.status ?? (invitation.isPublished ? "published" : "draft"),
    rsvpMode: invitation.rsvpMode ?? "open",
    createdAt: String(invitation.createdAt),
    updatedAt: String(invitation.updatedAt),
  };
}

/**
 * Generate a complete event report
 */
export interface EventReport {
  invitation: InvitationExportData;
  rsvpSummary: RsvpSummary;
  rsvpList: RsvpRecord[];
  generatedAt: string;
}

/**
 * Generate complete event report
 */
export async function generateEventReport(
  invitation: InvitationRecord
): Promise<EventReport> {
  const rsvps = await listRsvps(invitation.id);
  const rsvpSummary = await generateRsvpSummary(invitation.id);

  return {
    invitation: exportInvitationData(invitation),
    rsvpSummary,
    rsvpList: rsvps,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate event report as JSON string
 */
export async function exportEventReportJSON(
  invitation: InvitationRecord
): Promise<string> {
  const report = await generateEventReport(invitation);
  return JSON.stringify(report, null, 2);
}

/**
 * Generate a simple text summary
 */
export async function exportEventSummaryText(
  invitation: InvitationRecord
): Promise<string> {
  const report = await generateEventReport(invitation);
  const { invitation: inv, rsvpSummary } = report;

  const lines = [
    "=" + "=".repeat(60),
    "EVENT SUMMARY REPORT",
    "=" + "=".repeat(60),
    "",
    `Event: ${inv.title || inv.headline}`,
    `Couple: ${inv.coupleNames}`,
    `Date: ${inv.eventDate} ${inv.eventTime}`,
    `Venue: ${inv.venue}`,
    `Status: ${inv.status}`,
    "",
    "-" + "-".repeat(60),
    "RSVP SUMMARY",
    "-" + "-".repeat(60),
    "",
    `Total Responses: ${rsvpSummary.totalResponses}`,
    `Attending (Yes): ${rsvpSummary.yesCount}`,
    `Maybe: ${rsvpSummary.maybeCount}`,
    `Not Attending: ${rsvpSummary.noCount}`,
    `Total Expected Guests: ${rsvpSummary.totalGuests}`,
    "",
    "-" + "-".repeat(60),
    "GUEST LIST (Attending)",
    "-" + "-".repeat(60),
    "",
  ];

  const attending = report.rsvpList.filter((r) => r.status === "yes");
  if (attending.length === 0) {
    lines.push("No confirmed guests yet.");
  } else {
    for (const rsvp of attending) {
      lines.push(`• ${rsvp.name} (${rsvp.partySize ?? 1} guest(s))`);
      if (rsvp.message) {
        lines.push(`  Message: "${rsvp.message}"`);
      }
    }
  }

  lines.push("");
  lines.push("=" + "=".repeat(60));
  lines.push(`Report generated: ${report.generatedAt}`);
  lines.push("=" + "=".repeat(60));

  return lines.join("\n");
}

export { arrayToCSV, escapeCSV };
