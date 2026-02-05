import { DateTime } from "luxon";

/**
 * Format a UTC ISO datetime string into local date/time labels.
 *
 * We always parse as UTC first, then convert to the viewer's local zone (or a provided zone),
 * to avoid accidental double‑shifting.
 *
 * @param {string | null | undefined} isoUtc - ISO string representing a UTC datetime.
 * @param {Object} options
 * @param {string} [options.timeZone] - Optional IANA timezone to display in (defaults to browser local tz).
 * @returns {{ dateLabel: string, timeLabel: string, fullLabel: string }}
 */
export function formatUtcDateTime(isoUtc, options = {}) {
  if (!isoUtc) {
    return { dateLabel: "", timeLabel: "", fullLabel: "" };
  }

  try {
    const viewerZone =
      options.timeZone ||
      (typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "local");

    // Always parse as UTC first
    const utc = DateTime.fromISO(isoUtc, { zone: "utc" });
    if (!utc.isValid) {
      return { dateLabel: "", timeLabel: "", fullLabel: "" };
    }

    // Convert to the viewer's zone for display
    const local = viewerZone === "local" ? utc.toLocal() : utc.setZone(viewerZone);

    const dateLabel = local.toFormat("ccc, LLL dd");
    const timeLabel = local.toFormat("h:mm a");
    const fullLabel = `${dateLabel} at ${timeLabel}`;

    return { dateLabel, timeLabel, fullLabel };
  } catch (e) {
    console.warn("[formatUtcDateTime] Failed to format", isoUtc, e);
    return { dateLabel: "", timeLabel: "", fullLabel: "" };
  }
}

/**
 * Optional helper to generate a human‑friendly timezone label,
 * e.g. "America/New_York (EDT)".
 */
export function formatTimeZoneLabel(timeZone) {
  if (!timeZone) return "";
  try {
    const nowInZone = DateTime.now().setZone(timeZone);
    if (!nowInZone.isValid) return timeZone;
    const short = nowInZone.offsetNameShort || "";
    return short ? `${timeZone} (${short})` : timeZone;
  } catch {
    return timeZone;
  }
}


