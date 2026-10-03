import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, ArrowUpRight, Search,
  CheckCircle2, XCircle, AlertCircle, RefreshCw
} from 'lucide-react';

export default function BranchDetailsSection({
  data,
  loading,
  error,
  onRetry,
  onSelectBranch,
  selectedBranch
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  if (loading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse" />
          <div className="h-8 bg-gray-100 dark:bg-gray-700/50 rounded-xl w-32 animate-pulse" />
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-50 dark:bg-gray-700/30 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-900 dark:text-red-200">
              Unable to load Branch Details
            </p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">{error}</p>
          </div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 hover:bg-red-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!data) return null;

  const { branches = [], unassigned = null } = data;

  // Filter branches by search query
  const query = search.trim().toLowerCase();
  const filteredBranches = branches.filter((b) => {
    if (!query) return true;
    return (
      b.branchName.toLowerCase().includes(query) ||
      b.branchCode.toLowerCase().includes(query) ||
      b.status.toLowerCase().includes(query)
    );
  });

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 dark:border-gray-700/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Branch Details
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {branches.length} Branches
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Complete breakdown of leads, workflow stages, and employee allocations across all branches
          </p>
        </div>

        {/* Search filter */}
        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search branch or code…"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Desktop / Tablet Table View */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700/60 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
              <th className="py-3 px-3">Branch Name</th>
              <th className="py-3 px-2">Code</th>
              <th className="py-3 px-2 text-center">Status</th>
              <th className="py-3 px-3 text-center">Total Leads</th>
              <th className="py-3 px-2 text-center">New Leads</th>
              <th className="py-3 px-2 text-center">Follow Ups</th>
              <th className="py-3 px-2 text-center">Converted</th>
              <th className="py-3 px-2 text-center">Lost</th>
              <th className="py-3 px-3 text-center">Total Employees</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
            {filteredBranches.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-xs text-gray-400 dark:text-gray-500">
                  {search ? 'No branches match your search.' : 'No branches available.'}
                </td>
              </tr>
            ) : (
              filteredBranches.map((branch) => {
                const isSelected = selectedBranch === branch.branchId;
                return (
                  <tr
                    key={branch.branchId}
                    className={`hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors ${
                      isSelected ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : ''
                    }`}
                  >
                    {/* Branch Name */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700/60 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {branch.branchName}
                        </span>
                      </div>
                    </td>

                    {/* Branch Code */}
                    <td className="py-3 px-2">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {branch.branchCode}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-2 text-center">
                      {branch.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Total Leads */}
                    <td className="py-3 px-3 text-center">
                      <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                        {branch.totalLeads}
                      </span>
                    </td>

                    {/* New Leads */}
                    <td className="py-3 px-2 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                        {branch.newLeads}
                      </span>
                    </td>

                    {/* Follow Ups */}
                    <td className="py-3 px-2 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                        {branch.followupsLogged || branch.followUp || 0}
                      </span>
                    </td>

                    {/* Converted Leads */}
                    <td className="py-3 px-2 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                        {branch.converted}
                      </span>
                    </td>

                    {/* Lost Leads */}
                    <td className="py-3 px-2 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300">
                        {branch.lost}
                      </span>
                    </td>

                    {/* Total Employees */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                        <Users className="w-3 h-3" />
                        {branch.totalEmployees ?? 0}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {onSelectBranch && (
                          <button
                            onClick={() => onSelectBranch(isSelected ? '' : branch.branchId)}
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                            title={isSelected ? 'Reset filter to all branches' : 'Filter dashboard by this branch'}
                          >
                            {isSelected ? 'Filtered' : 'Filter'}
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/leads?branchId=${branch.branchId}`)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                          title="Inspect branch leads"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}

            {/* Unassigned / Legacy Row */}
            {unassigned && unassigned.totalLeads > 0 && !search && (
              <tr className="bg-amber-50/40 dark:bg-amber-950/20 border-t border-amber-200/50 dark:border-amber-900/30">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {unassigned.branchName}
                      </span>
                      <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        Pre-branch assignment records
                      </span>
                    </div>
                  </div>
                </td>

                <td className="py-3 px-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">
                    {unassigned.branchCode}
                  </span>
                </td>

                <td className="py-3 px-2 text-center">
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500">
                    Legacy
                  </span>
                </td>

                <td className="py-3 px-3 text-center font-bold text-gray-900 dark:text-gray-100">
                  {unassigned.totalLeads}
                </td>

                <td className="py-3 px-2 text-center">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                    {unassigned.newLeads}
                  </span>
                </td>

                <td className="py-3 px-2 text-center">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                    {unassigned.followupsLogged || unassigned.followUp || 0}
                  </span>
                </td>

                <td className="py-3 px-2 text-center">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                    {unassigned.converted}
                  </span>
                </td>

                <td className="py-3 px-2 text-center">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300">
                    {unassigned.lost}
                  </span>
                </td>

                <td className="py-3 px-3 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500">
                    <Users className="w-3 h-3" />
                    {unassigned.totalEmployees ?? 0}
                  </span>
                </td>

                <td className="py-3 px-3 text-right">
                  <div className="inline-flex items-center gap-1.5 justify-end">
                    {onSelectBranch && (
                      <button
                        onClick={() => onSelectBranch(selectedBranch === 'unassigned' ? '' : 'unassigned')}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                          selectedBranch === 'unassigned'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {selectedBranch === 'unassigned' ? 'Filtered' : 'Filter'}
                      </button>
                    )}
                    <button
                      onClick={() => navigate('/leads?branchId=unassigned')}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="View unassigned leads"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
