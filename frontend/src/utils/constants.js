// ─── Lead Statuses ─────────────────────────────────────────────────────────
export const LEAD_STATUSES = [
  'New',
  'Contacted',
  'Follow Up',
  'Quotation',
  'Interested',
  'Converted',
  'Lost',
];

// ─── Lead Priorities ───────────────────────────────────────────────────────
export const LEAD_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

// ─── Customer Types ────────────────────────────────────────────────────────
export const CUSTOMER_TYPES = [
  'Workshop',
  'Mechanic',
  'Retailer',
  'Dealer',
  'Service Center',
  'Fleet',
  'Individual',
  'Other',
];

// ─── Lead Sources ──────────────────────────────────────────────────────────
export const LEAD_SOURCES = [
  'Phone',
  'WhatsApp',
  'Walk-in',
  'Referral',
  'Website',
  'Social Media',
  'Existing Customer',
  'Other',
];

// ─── Employee Roles ────────────────────────────────────────────────────────
export const EMPLOYEE_ROLES = ['admin', 'manager', 'employee'];

// ─── Status Badge Colours (Tailwind classes) ───────────────────────────────
export const STATUS_COLORS = {
  New: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Contacted: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  'Follow Up': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Quotation: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Interested: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  Converted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Lost: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

// ─── Priority Badge Colours ────────────────────────────────────────────────
export const PRIORITY_COLORS = {
  Low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  Medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
  High: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300',
  Urgent: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
};

// ─── Role Badge Colours ────────────────────────────────────────────────────
export const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  manager: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  employee: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

// ─── Status dot colours for Kanban / pipeline ──────────────────────────────
export const STATUS_DOT_COLORS = {
  New: '#3B82F6',
  Contacted: '#6366F1',
  'Follow Up': '#F59E0B',
  Quotation: '#8B5CF6',
  Interested: '#EC4899',
  Converted: '#10B981',
  Lost: '#EF4444',
};
