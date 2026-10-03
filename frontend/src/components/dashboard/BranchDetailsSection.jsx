import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, ArrowUpRight, Search,
  CheckCircle2, XCircle, AlertCircle, RefreshCw,
  TrendingUp, BarChart3, Layers, Filter, Check
} from 'lucide-react';

const WORKFLOW_STAGES = [
  { key: 'newLeads', label: 'New', color: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/40' },
  { key: 'contacted', label: 'Contacted', color: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
  { key: 'followUp', label: 'Follow Up', color: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  { key: 'quotation', label: 'Quotation', color: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-950/40' },
  { key: 'interested', label: 'Interested', color: 'bg-pink-500', text: 'text-pink-700 dark:text-pink-300', bg: 'bg-pink-50 dark:bg-pink-950/40' },
  { key: 'converted', label: 'Converted', color: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  { key: 'lost', label: 'Lost', color: 'bg-red-500', text: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-950/40' }
];

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
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
          <div className="h-8 bg-gray-100 dark:bg-gray-700/50 rounded-xl w-32 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-50 dark:bg-gray-700/30 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-50 dark:bg-gray-700/20 rounded-xl animate-pulse" />
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
              Unable to load Branch Overview & Details
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

  const { summary = {}, branches = [], unassigned = null } = data;

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

  // Calculate maximum leads for bar chart scaling
  const maxLeads = Math.max(
    ...branches.map((b) => b.totalLeads || 0),
    unassigned ? unassigned.totalLeads || 0 : 0,
    1
  );

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 space-y-6">
      {/* 1. Header with title & search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 dark:border-gray-700/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Branch Overview & Details
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {branches.length} Branches
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time branch comparison, lead workflow stages, and staff allocations across all branches
          </p>
        </div>

        {/* Live Search */}
        <div className="relative w-full sm:w-64">
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

      {/* 2. Compact Branch Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Total Branches
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {summary.totalBranches ?? branches.length}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {summary.activeBranches ?? branches.filter((b) => b.status === 'active').length} Active
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Total Leads
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {summary.totalLeads ?? branches.reduce((sum, b) => sum + (b.totalLeads || 0), 0)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              in pipeline
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Converted Leads
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary.totalConverted ?? branches.reduce((sum, b) => sum + (b.converted || 0), 0)}
            </span>
            <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              ({summary.overallConversionRate ?? '0.0'}%)
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Total Staff
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {summary.totalEmployees ?? branches.reduce((sum, b) => sum + (b.totalEmployees || 0), 0)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              employees
            </span>
          </div>
        </div>
      </div>

      {/* 3. Simple Branch Visualization: Comparison Bars & Workflow Progression */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Simple Bar Comparison */}
        <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
              Branch Volume Comparison
            </h4>
            <span className="text-[11px] text-gray-400">Total Leads</span>
          </div>

          <div className="space-y-3 pt-1">
            {branches.map((b) => {
              const widthPct = Math.max(Math.round(((b.totalLeads || 0) / maxLeads) * 100), 4);
              const isSelected = selectedBranch === b.branchId;
              return (
                <div key={b.branchId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {b.branchName}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {b.branchCode}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        {b.totalLeads} leads
                      </span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ({b.converted || 0} converted)
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isSelected ? 'bg-indigo-600' : 'bg-indigo-500 hover:bg-indigo-600'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Branch Workflow Overview */}
        <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              Branch Workflow Progression
            </h4>
            <span className="text-[11px] text-gray-400">CRM Pipeline Stages</span>
          </div>

          <div className="space-y-3 pt-1">
            {branches.map((b) => (
              <div key={b.branchId} className="p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {b.branchName}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {b.totalEmployees || 0} Employees · {b.totalLeads || 0} Total
                  </span>
                </div>

                {/* Workflow status chips */}
                <div className="flex flex-wrap gap-1.5">
                  {WORKFLOW_STAGES.map((st) => {
                    const count = b[st.key] || 0;
                    return (
                      <div
                        key={st.key}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${st.bg} ${st.text}`}
                        title={`${st.label}: ${count}`}
                      >
                        <span>{st.label}</span>
                        <span className="font-bold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Desktop / Tablet Detailed Table View */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700/60 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
              <th className="py-3 px-3">Branch Name</th>
              <th className="py-3 px-2">Code</th>
              <th className="py-3 px-2 text-center">Status</th>
              <th className="py-3 px-2 text-center">Employees</th>
              <th className="py-3 px-3 text-center">Total Leads</th>
              <th className="py-3 px-2 text-center">New</th>
              <th className="py-3 px-2 text-center">Contacted</th>
              <th className="py-3 px-2 text-center">Follow Up</th>
              <th className="py-3 px-2 text-center">Quotation</th>
              <th className="py-3 px-2 text-center">Converted</th>
              <th className="py-3 px-2 text-center">Lost</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
            {filteredBranches.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-8 text-center text-xs text-gray-400 dark:text-gray-500">
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

                    {/* Total Employees */}
                    <td className="py-3 px-2 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                        <Users className="w-3 h-3" />
                        {branch.totalEmployees ?? 0}
                      </span>
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

                    {/* Contacted */}
                    <td className="py-3 px-2 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                        {branch.contacted || 0}
                      </span>
                    </td>

                    {/* Follow Ups */}
                    <td className="py-3 px-2 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                        {branch.followupsLogged || branch.followUp || 0}
                      </span>
                    </td>

                    {/* Quotation */}
                    <td className="py-3 px-2 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                        {branch.quotation || 0}
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

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            if (onSelectBranch) {
                              onSelectBranch(isSelected ? '' : branch.branchId);
                            }
                          }}
                          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 hover:text-indigo-600'
                          }`}
                          title={isSelected ? 'Clear branch filter' : 'Filter dashboard by this branch'}
                        >
                          {isSelected ? 'Filtering' : 'Filter'}
                        </button>
                        <button
                          onClick={() => navigate('/branches')}
                          className="p-1 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Manage branches"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}

            {/* Unassigned / Legacy Row if records exist */}
            {unassigned && unassigned.totalLeads > 0 && (
              <tr className="bg-amber-50/30 dark:bg-amber-950/10 border-t border-amber-200/40 text-gray-600 dark:text-gray-300">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 font-bold">⚠</span>
                    <span className="font-medium text-xs text-amber-900 dark:text-amber-200">
                      Unassigned / Legacy
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2 font-mono text-xs text-gray-400">—</td>
                <td className="py-3 px-2 text-center">
                  <span className="text-[11px] text-amber-600 dark:text-amber-400">Unassigned</span>
                </td>
                <td className="py-3 px-2 text-center text-xs">
                  {unassigned.totalEmployees || 0}
                </td>
                <td className="py-3 px-3 text-center font-bold text-gray-700 dark:text-gray-300">
                  {unassigned.totalLeads}
                </td>
                <td className="py-3 px-2 text-center text-xs">{unassigned.newLeads}</td>
                <td className="py-3 px-2 text-center text-xs">{unassigned.contacted || 0}</td>
                <td className="py-3 px-2 text-center text-xs">{unassigned.followupsLogged || unassigned.followUp || 0}</td>
                <td className="py-3 px-2 text-center text-xs">{unassigned.quotation || 0}</td>
                <td className="py-3 px-2 text-center text-xs">{unassigned.converted}</td>
                <td className="py-3 px-2 text-center text-xs">{unassigned.lost}</td>
                <td className="py-3 px-3 text-right">
                  <button
                    onClick={() => {
                      if (onSelectBranch) {
                        onSelectBranch('unassigned');
                      }
                    }}
                    className="px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300 hover:underline"
                  >
                    Inspect
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Mobile / Small Screen Card View */}
      <div className="grid grid-cols-1 gap-3 sm:hidden pt-2">
        {filteredBranches.map((branch) => {
          const isSelected = selectedBranch === branch.branchId;
          return (
            <div
              key={branch.branchId}
              className={`p-4 rounded-xl border transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                  : 'border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-500" />
                  <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                    {branch.branchName}
                  </span>
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {branch.branchCode}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    branch.status === 'active'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {branch.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-gray-100 dark:border-gray-700/40">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Total Leads:</span>{' '}
                  <span className="font-bold text-gray-900 dark:text-gray-100">{branch.totalLeads}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Employees:</span>{' '}
                  <span className="font-bold text-gray-900 dark:text-gray-100">{branch.totalEmployees ?? 0}</span>
                </div>
              </div>

              {/* Workflow Breakdown on Mobile */}
              <div className="mt-2.5 pt-1 space-y-1 text-xs">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Workflow Stages
                </p>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="p-1.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                    <span className="block text-[10px]">New</span>
                    <span className="font-bold">{branch.newLeads}</span>
                  </div>
                  <div className="p-1.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                    <span className="block text-[10px]">Contacted</span>
                    <span className="font-bold">{branch.contacted || 0}</span>
                  </div>
                  <div className="p-1.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                    <span className="block text-[10px]">Follow Up</span>
                    <span className="font-bold">{branch.followupsLogged || branch.followUp || 0}</span>
                  </div>
                  <div className="p-1.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                    <span className="block text-[10px]">Quotation</span>
                    <span className="font-bold">{branch.quotation || 0}</span>
                  </div>
                  <div className="p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                    <span className="block text-[10px]">Converted</span>
                    <span className="font-bold">{branch.converted}</span>
                  </div>
                  <div className="p-1.5 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300">
                    <span className="block text-[10px]">Lost</span>
                    <span className="font-bold">{branch.lost}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => {
                    if (onSelectBranch) {
                      onSelectBranch(isSelected ? '' : branch.branchId);
                    }
                  }}
                  className={`w-full py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {isSelected ? 'Clear Filter' : 'Filter Dashboard'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
