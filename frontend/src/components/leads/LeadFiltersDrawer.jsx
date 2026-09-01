import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Filter } from 'lucide-react';
import { getActiveEmployeesApi } from '../../services/employeeApi';
import {
  LEAD_STATUSES,
  LEAD_PRIORITIES,
  CUSTOMER_TYPES,
  LEAD_SOURCES,
} from '../../utils/constants';

const FOLLOWUP_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'no_followup', label: 'No Follow-up Set' },
];

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
        {label}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option
            key={typeof opt === 'string' ? opt : opt.value}
            value={typeof opt === 'string' ? opt : opt.value}
          >
            {typeof opt === 'string' ? opt : opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function LeadFiltersDrawer({ isOpen, onClose, filters = {}, onChange, onApply }) {
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    setDraft(filters || {});
  }, [filters, isOpen]);

  const { data: empData } = useQuery({
    queryKey: ['active-employees'],
    queryFn: () => getActiveEmployeesApi(),
    enabled: isOpen,
  });
  const employees = empData?.data?.data || [];

  const update = (key, val) => {
    const next = { ...draft, [key]: val };
    if (!val) delete next[key];
    setDraft(next);
  };

  const activeCount = Object.values(draft).filter((v) => v && v !== '').length;

  const handleApply = () => {
    if (onApply) onApply(draft);
    if (onChange) onChange(draft);
    onClose();
  };

  const clearAll = () => {
    setDraft({});
    if (onApply) onApply({});
    if (onChange) onChange({});
  };

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
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                {activeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-red-500 hover:text-red-600 font-medium"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-4">
          <FilterSelect
            label="Status"
            value={draft.status}
            onChange={(v) => update('status', v)}
            options={LEAD_STATUSES}
          />
          <FilterSelect
            label="Priority"
            value={draft.priority}
            onChange={(v) => update('priority', v)}
            options={LEAD_PRIORITIES}
          />
          <FilterSelect
            label="Customer Type"
            value={draft.customerType}
            onChange={(v) => update('customerType', v)}
            options={CUSTOMER_TYPES}
          />
          <FilterSelect
            label="Lead Source"
            value={draft.source}
            onChange={(v) => update('source', v)}
            options={LEAD_SOURCES}
          />

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              Assigned Employee
            </label>
            <select
              value={draft.assignedTo || ''}
              onChange={(e) => update('assignedTo', e.target.value || undefined)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            >
              <option value="">All Employees</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name} ({e.employeeId})
                </option>
              ))}
            </select>
          </div>

          <FilterSelect
            label="Follow-up Date"
            value={draft.followup}
            onChange={(v) => update('followup', v)}
            options={FOLLOWUP_OPTIONS}
          />

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={draft.dateFrom || ''}
                onChange={(e) => update('dateFrom', e.target.value || undefined)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={draft.dateTo || ''}
                onChange={(e) => update('dateTo', e.target.value || undefined)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700/50 flex-shrink-0">
          <button
            onClick={handleApply}
            className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 shadow transition-colors"
          >
            Apply Filters {activeCount > 0 ? `(${activeCount})` : ''}
          </button>
        </div>
      </div>
    </>
  );
}
