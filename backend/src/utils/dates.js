/**
 * Passport expiry uses UTC calendar days so timezone boundaries
 * do not shift "one month" by a few hours.
 *
 * Business rule: notify when expiry is within the next 31 days,
 * including today, and including already-expired passports.
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PASSPORT_REMINDER_DAYS = 31;

const utcDay = (date) => {
  if (date === undefined || date === null || date === '') return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

const daysUntilUtc = (targetDate, fromDate = new Date()) => {
  const target = utcDay(targetDate);
  const from = utcDay(fromDate);
  if (target === null || from === null) return null;
  return Math.round((target - from) / MS_PER_DAY);
};

const isPassportExpiryDue = (passportExpireDate, fromDate = new Date()) => {
  const days = daysUntilUtc(passportExpireDate, fromDate);
  if (days === null) return false;
  return days <= PASSPORT_REMINDER_DAYS;
};

const parseOptionalDate = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid passport expiry date');
  }

  return date;
};

const toIsoDateKey = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const formatDisplayDate = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
};

module.exports = {
  PASSPORT_REMINDER_DAYS,
  daysUntilUtc,
  isPassportExpiryDue,
  parseOptionalDate,
  toIsoDateKey,
  formatDisplayDate
};
