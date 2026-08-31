import { useQuery } from '@tanstack/react-query';
import { X, Filter } from 'lucide-react';
import { getActiveEmployeesApi } from '../../services/employeeApi';

const STATUSES = ['New', 'Contacted', 'Follow Up', 'Quotation', 'Interested', 'Converted', 'Lost'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const CUSTOMER_TYPES = ['Workshop', 'Mechanic', 'Retailer', 'Dealer', 'Service Center', 'Fleet', 'Individual', 'Other'];
const SOURCES = ['Phone', 'WhatsApp', 'Walk-in', 'Referral', 'Website', 'Social Media', 'Existing Customer', 'Other'];
const FOLLOWUP_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'no_followup', label: 'No Follow-up Set' },
];
const DATE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' },
];

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
      >
        <option value="">All</option>
        {options.map(opt => (
          <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
            {typeof opt === 'string' ? opt : opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function LeadFiltersDrawer({ isOpen, onClose, filters, onChange }) {
  const { data: empData } = useQuery({ queryKey: ['active-employees'], queryFn: () => getActiveEmployeesApi() });
  const employees = empData?.data?.data || [];

  const update = (key, val) => onChange({ ...filters, [key]: val });

  const activeCount = Object.values(filters).filter(v => v && v !== '').length;

  const clearAll = () => onChange({});

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-100 dark:border-gray-700/50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Filters</h2>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">{activeCount}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-600 font-medium">Clear All</button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-5">
          <FilterSelect label="Status" value={filters.status} onChange={(v) => update('status', v)} options={STATUSES} />
          <FilterSelect label="Priority" value={filters.priority} onChange={(v) => update('priority', v)} options={PRIORITIES} />
          <FilterSelect label="Customer Type" value={filters.customerType} onChange={(v) => update('customerType', v)} options={CUSTOMER_TYPES} />
          <FilterSelect label="Lead Source" value={filters.source} onChange={(v) => update('source', v)} options={SOURCES} />

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Assigned Employee</label>
            <select
              value={filters.assignedTo || ''}
              onChange={(e) => update('assignedTo', e.target.value || undefined)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            >
              <option value="">All Employees</option>
              {employees.map(e => (
                <option key={e._id} value={e._id}>{e.name} ({e.employeeId})</option>
              ))}
            </select>
          </div>

          <FilterSelect label="Follow-up" value={filters.followUp} onChange={(v) => update('followUp', v)} options={FOLLOWUP_OPTIONS} />
          <FilterSelect label="Created Date" value={filters.date} onChange={(v) => update('date', v)} options={DATE_OPTIONS} />

          {filters.date === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">From</label>
                <input type="date" value={filters.startDate || ''} onChange={(e) => update('startDate', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">To</label>
                <input type="date" value={filters.endDate || ''} onChange={(e) => update('endDate', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700/50 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 shadow transition-colors"
          >
            Apply Filters {activeCount > 0 ? `(${activeCount})` : ''}
          </button>
        </div>
      </div>
    </>
  );
}
