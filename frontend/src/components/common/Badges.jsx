// Status badge colors
const STATUS_STYLES = {
  'New':       'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'Contacted': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  'Follow Up': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'Quotation': 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'Interested':'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  'Converted': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'Lost':      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const PRIORITY_STYLES = {
  'Low':    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  'Medium': 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'High':   'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'Urgent': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const ROLE_STYLES = {
  'admin':    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  'manager':  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'employee': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${style}`}>
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES['Medium'];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${style}`}>
      {priority}
    </span>
  );
}

export function RoleBadge({ role }) {
  const style = ROLE_STYLES[role] || ROLE_STYLES['employee'];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${style}`}>
      {role}
    </span>
  );
}

export function UserStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
      status === 'active'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {status}
    </span>
  );
}
