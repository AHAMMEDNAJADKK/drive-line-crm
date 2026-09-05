const CANONICAL_LEAD_STATUSES = [
  'New',
  'Contacted',
  'Quotation',
  'Followup',
  'Converted',
  'Lost'
];

// Kept so existing MongoDB documents continue to load/save.
const LEGACY_LEAD_STATUSES = ['Follow Up', 'Interested'];

const ALL_STORED_LEAD_STATUSES = [
  ...CANONICAL_LEAD_STATUSES,
  ...LEGACY_LEAD_STATUSES
];

const STATUS_ALIASES = {
  'Follow Up': 'Followup'
};

const normalizeLeadStatus = (status) => {
  if (!status) return status;
  return STATUS_ALIASES[status] || status;
};

const isWritableLeadStatus = (status) => {
  const normalized = normalizeLeadStatus(status);
  return CANONICAL_LEAD_STATUSES.includes(normalized);
};

const statusFilterQuery = (status) => {
  if (!status) return undefined;

  if (Array.isArray(status)) {
    const expanded = status.flatMap((item) => {
      const normalized = normalizeLeadStatus(item);
      if (normalized === 'Followup') return ['Followup', 'Follow Up'];
      return [normalized, item];
    });
    return { $in: [...new Set(expanded)] };
  }

  const normalized = normalizeLeadStatus(status);
  if (normalized === 'Followup') {
    return { $in: ['Followup', 'Follow Up'] };
  }

  return status;
};

module.exports = {
  CANONICAL_LEAD_STATUSES,
  LEGACY_LEAD_STATUSES,
  ALL_STORED_LEAD_STATUSES,
  STATUS_ALIASES,
  normalizeLeadStatus,
  isWritableLeadStatus,
  statusFilterQuery
};
