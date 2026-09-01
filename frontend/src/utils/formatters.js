import { format, formatDistanceToNow, isToday, isTomorrow, isPast, parseISO } from 'date-fns';

// ─── Date Formatters ───────────────────────────────────────────────────────

/**
 * Format a date to DD MMM YYYY (e.g. "31 Aug 2026")
 */
export function formatDate(date) {
  if (!date) return '—';
  try {
    return format(typeof date === 'string' ? parseISO(date) : date, 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

/**
 * Format a date to DD MMM YYYY, h:mm a (e.g. "31 Aug 2026, 10:45 AM")
 */
export function formatDateTime(date) {
  if (!date) return '—';
  try {
    return format(typeof date === 'string' ? parseISO(date) : date, 'dd MMM yyyy, h:mm a');
  } catch {
    return '—';
  }
}

/**
 * Relative time: "2 hours ago", "3 days ago"
 */
export function timeAgo(date) {
  if (!date) return '—';
  try {
    return formatDistanceToNow(typeof date === 'string' ? parseISO(date) : date, {
      addSuffix: true,
    });
  } catch {
    return '—';
  }
}

/**
 * Smart follow-up date label: "Today", "Tomorrow", "3 Aug 2026", "Overdue"
 */
export function formatFollowUpDate(date) {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    if (isPast(d)) return `Overdue · ${format(d, 'dd MMM')}`;
    return format(d, 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

// ─── Phone Formatters ──────────────────────────────────────────────────────

/**
 * Format mobile for display: trim & keep as-is if already clean
 */
export function formatMobile(mobile) {
  if (!mobile) return '—';
  return mobile.trim();
}

/**
 * Build a tel: link (direct call)
 */
export function telLink(mobile) {
  if (!mobile) return '#';
  const digits = mobile.replace(/\D/g, '');
  return `tel:${digits}`;
}

/**
 * Build a WhatsApp wa.me link (no hard-coded country)
 */
export function whatsappLink(mobile) {
  if (!mobile) return '#';
  // Remove all non-digit characters
  let digits = mobile.replace(/\D/g, '');
  // If it starts with 0, strip it (local format)
  if (digits.startsWith('0')) digits = digits.slice(1);
  return `https://wa.me/${digits}`;
}

// ─── Text Formatters ──────────────────────────────────────────────────────

/**
 * Capitalise first letter of each word
 */
export function titleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

/**
 * Truncate a string to maxLength with ellipsis
 */
export function truncate(str, maxLength = 40) {
  if (!str) return '';
  return str.length > maxLength ? `${str.slice(0, maxLength)}…` : str;
}

/**
 * Return initials from a name (max 2 characters)
 */
export function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
