/**
 * Intelligent Mobile Number Normalization and Duplicate Detection Helper
 */

/**
 * Clean and normalize phone number representation for storage
 * @param {string|number} raw 
 * @returns {string}
 */
const normalizePhoneNumber = (raw) => {
  if (raw === null || raw === undefined) return '';
  let str = String(raw).trim();
  if (!str) return '';

  // Remove spaces, hyphens, parentheses, dots
  let cleaned = str.replace(/[\s\-\(\)\.]/g, '');

  // Handle leading 00 as international +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }

  return cleaned;
};

/**
 * Get canonical search key for matching duplicates regardless of formatting
 * e.g. "+91 98765 43210", "919876543210", "09876543210", "9876543210" match
 * @param {string|number} raw 
 * @returns {string}
 */
const getCanonicalPhoneKey = (raw) => {
  const normalized = normalizePhoneNumber(raw);
  if (!normalized) return '';

  // Extract only digits
  const digitsOnly = normalized.replace(/\D/g, '');

  // If digits length is 10 (common in India and several countries without country code), return it
  if (digitsOnly.length === 10) {
    return digitsOnly;
  }

  // If 11 digits starting with 0 (e.g. 09876543210)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return digitsOnly.substring(1);
  }

  // If 12 digits starting with 91 (e.g. 919876543210)
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return digitsOnly.substring(2);
  }

  // If 13 digits starting with 091
  if (digitsOnly.length === 13 && digitsOnly.startsWith('091')) {
    return digitsOnly.substring(3);
  }

  // Return last 10 digits if longer than 10 digits as a primary search match, or full digits
  if (digitsOnly.length > 10) {
    return digitsOnly.slice(-10);
  }

  return digitsOnly;
};

/**
 * Validate phone number format
 * Accepts phone numbers with 7 to 15 digits (ITU-T E.164)
 * @param {string|number} raw 
 * @returns {boolean}
 */
const isValidPhoneNumber = (raw) => {
  if (!raw) return false;
  const normalized = normalizePhoneNumber(raw);
  const digitsOnly = normalized.replace(/\D/g, '');
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
};

/**
 * Generate a WhatsApp chat URL
 * @param {string} phone 
 * @returns {string}
 */
const getWhatsAppUrl = (phone) => {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    // Default to +91 country prefix if 10 digits
    digits = '91' + digits;
  }
  return `https://wa.me/${digits}`;
};

module.exports = {
  normalizePhoneNumber,
  getCanonicalPhoneKey,
  isValidPhoneNumber,
  getWhatsAppUrl
};
