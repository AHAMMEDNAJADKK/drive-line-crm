import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { getActiveBranchesListApi } from '../../services/branchApi';

export default function BranchSelector({
  value = '',
  onChange,
  includeAll = true,
  showAll,
  allLabel = 'All Branches',
  includeUnassigned = true,
  disabled = false,
  className = '',
  size = 'md',
  branches: externalBranches = null
}) {
  const [internalBranches, setInternalBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (externalBranches && Array.isArray(externalBranches) && externalBranches.length > 0) {
      setInternalBranches(externalBranches);
      return;
    }

    let mounted = true;
    setLoading(true);
    getActiveBranchesListApi()
      .then((res) => {
        if (mounted) {
          setInternalBranches(res.data?.data || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load branches:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const sizeClasses =
    size === 'sm'
      ? 'text-xs py-1.5 pl-8 pr-3'
      : 'text-sm py-2 pl-9 pr-8';

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled || loading}
        aria-label="Filter by branch"
        className={`appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-xl text-gray-800 dark:text-gray-200 font-medium hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${sizeClasses}`}
      >
        {(showAll !== undefined ? showAll : includeAll) && <option value="">{allLabel}</option>}
        {internalBranches.map((b) => (
          <option key={b._id} value={b._id}>
            {b.name} ({b.code})
          </option>
        ))}
        {includeUnassigned && (
          <option value="unassigned">Unassigned / Legacy</option>
        )}
      </select>
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  );
}
