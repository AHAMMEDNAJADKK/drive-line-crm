const AuditLog = require('../models/AuditLog');

/**
 * Sanitize sensitive keys so passwords, secrets, or tokens are never logged.
 */
const sanitizePayload = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  const forbiddenKeys = ['password', 'currentPassword', 'newPassword', 'token', 'jwt', 'secret'];
  const sanitized = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (forbiddenKeys.some((k) => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !(value instanceof Date)) {
      sanitized[key] = sanitizePayload(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Log an administrative action to AuditLog collection.
 */
const logAudit = async ({
  action,
  performedBy,
  targetUser = null,
  targetBranch = null,
  details = {},
  req = null
}) => {
  try {
    const actorId = performedBy?._id || performedBy;
    if (!actorId) return null;

    let ip = '';
    if (req) {
      ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    }

    const logEntry = new AuditLog({
      action,
      performedBy: actorId,
      targetUser: targetUser?._id || targetUser || null,
      targetBranch: targetBranch?._id || targetBranch || null,
      details: sanitizePayload(details),
      ipAddress: ip ? String(ip).slice(0, 45) : ''
    });

    await logEntry.save();
    return logEntry;
  } catch (err) {
    // Non-fatal logging error
    console.error('[AuditLog] Failed to save audit log:', err.message);
    return null;
  }
};

module.exports = {
  logAudit,
  sanitizePayload
};
