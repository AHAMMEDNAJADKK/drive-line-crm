import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, CheckCircle2, XCircle, ArrowUpRight,
  BarChart3, Layers, Filter, RefreshCw, AlertCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const STATUS_COLORS = {
  New: '#3B82F6',
  Contacted: '#6366F1',
  'Follow Up': '#F59E0B',
  Quotation: '#8B5CF6',
  Interested: '#EC4899',
  Converted: '#10B981',
  Lost: '#EF4444'
};

const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 rounded-xl shadow-xl text-xs space-y-1.5">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-1.5 mb-1">
          <span className="font-bold text-gray-900 dark:text-gray-100">{item.branchName}</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            {item.branchCode}
          </span>
        </div>
        <div className="flex justify-between gap-4 text-gray-600 dark:text-gray-300">
          <span>Total Leads:</span>
          <span className="font-bold text-gray-900 dark:text-gray-100">{item.totalLeads}</span>
        </div>
        <div className="flex justify-between gap-4 text-emerald-600 dark:text-emerald-400">
          <span>Converted:</span>
          <span className="font-semibold">{item.converted} ({item.conversionRate}%)</span>
        </div>
        <div className="flex justify-between gap-4 text-red-600 dark:text-red-400">
          <span>Lost:</span>
          <span className="font-semibold">{item.lost}</span>
        </div>
        <div className="flex justify-between gap-4 text-amber-600 dark:text-amber-400">
          <span>Follow-up Stage:</span>
          <span className="font-semibold">{item.followUp}</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomWorkflowTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const item = payload[0]?.payload;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 rounded-xl shadow-xl text-xs space-y-1 min-w-[170px]">
        <p className="font-bold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 pb-1 mb-1.5">
          {item?.branchName} ({item?.totalLeads} total)
        </p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-600 dark:text-gray-300">{entry.name}:</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function BranchPerformanceOverview({
  data,
  loading,
  error,
  onRetry,
  onSelectBranch,
  selectedBranch
}) {
  const navigate = useNavigate();
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 space-y-4">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 dark:bg-gray-700/30 rounded-xl animate-pulse" />
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
              Failed to load branch overview analytics
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

  // Filter branches if toggle is on
  const displayBranches = filterActiveOnly
    ? branches.filter((b) => b.status === 'active')
    : branches;

  // Prepare chart dataset
  const chartData = displayBranches.map((b) => ({
    branchId: b.branchId,
    branchName: b.branchName,
    branchCode: b.branchCode,
    shortName: b.branchName.length > 12 ? `${b.branchName.slice(0, 11)}…` : b.branchName,
    totalLeads: b.totalLeads,
    New: b.newLeads,
    Contacted: b.contacted,
    'Follow Up': b.followUp,
    Quotation: b.quotation,
    Interested: b.interested,
    Converted: b.converted,
    Lost: b.lost,
    conversionRate: b.conversionRate
  }));

  // Include unassigned in charts if it has leads
  if (unassigned && unassigned.totalLeads > 0) {
    chartData.push({
      branchId: 'unassigned',
      branchName: 'Unassigned / Legacy',
      branchCode: 'N/A',
      shortName: 'Unassigned',
      totalLeads: unassigned.totalLeads,
      New: unassigned.newLeads,
      Contacted: unassigned.contacted,
      'Follow Up': unassigned.followUp,
      Quotation: unassigned.quotation,
      Interested: unassigned.interested,
      Converted: unassigned.converted,
      Lost: unassigned.lost,
      conversionRate: unassigned.conversionRate || '0.0'
    });
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Branch Performance Overview
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time branch lead volume, conversion performance, and CRM workflow distribution across all branches.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setFilterActiveOnly(!filterActiveOnly)}
            className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-colors flex items-center gap-1.5 ${
              filterActiveOnly
                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-3 h-3" />
            {filterActiveOnly ? 'Active Branches Only' : 'All Branches'}
          </button>
        </div>
      </div>

      {/* Compact Branch Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Total Branches
            </span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {summary.totalBranches || branches.length}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {summary.activeBranches || 0} active
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Total Leads
            </span>
            <BarChart3 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {summary.totalLeads ?? 0}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">across network</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Converted Leads
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary.totalConverted ?? 0}
            </span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
              {summary.overallConversionRate ?? '0.0'}% rate
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Logged Follow-ups
            </span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {summary.totalFollowupsLogged ?? summary.totalFollowups ?? 0}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">interactions</span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Branch Chart */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                Leads by Branch
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Total active leads distribution across branches
              </p>
            </div>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
              {chartData.length} branches
            </span>
          </div>

          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">
              No branch data available
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.12} />
                  <XAxis
                    dataKey="shortName"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={45}
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar
                    dataKey="totalLeads"
                    name="Total Leads"
                    fill="#6366F1"
                    radius={[6, 6, 0, 0]}
                    barSize={20}
                    onClick={(entry) => entry.branchId && onSelectBranch && onSelectBranch(entry.branchId)}
                    cursor="pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Branch Workflow Overview (Stacked Bar Chart) */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" />
                Branch Workflow Progression
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Current stage distribution for leads in each branch
              </p>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">
              No workflow data available
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.12} />
                  <XAxis
                    dataKey="shortName"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={45}
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  />
                  <Tooltip content={<CustomWorkflowTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={34}
                    formatter={(val) => (
                      <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mr-1.5">
                        {val}
                      </span>
                    )}
                  />
                  <Bar dataKey="New" stackId="wf" fill={STATUS_COLORS.New} barSize={20} />
                  <Bar dataKey="Contacted" stackId="wf" fill={STATUS_COLORS.Contacted} />
                  <Bar dataKey="Follow Up" stackId="wf" fill={STATUS_COLORS['Follow Up']} />
                  <Bar dataKey="Quotation" stackId="wf" fill={STATUS_COLORS.Quotation} />
                  <Bar dataKey="Interested" stackId="wf" fill={STATUS_COLORS.Interested} />
                  <Bar dataKey="Converted" stackId="wf" fill={STATUS_COLORS.Converted} />
                  <Bar dataKey="Lost" stackId="wf" fill={STATUS_COLORS.Lost} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Branch Performance Table */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Branch Performance Summary
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Comprehensive branch statistics, lead counts, and stage outcomes
            </p>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {displayBranches.length} branches total
          </span>
        </div>

        {displayBranches.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
            No branches available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100 dark:border-gray-700/60">
                  <th className="pb-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
                    Branch
                  </th>
                  <th className="pb-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide text-center">
                    Leads
                  </th>
                  <th className="pb-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide text-center">
                    Follow-ups
                  </th>
                  <th className="pb-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide text-center">
                    Converted
                  </th>
                  <th className="pb-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide text-center">
                    Lost
                  </th>
                  <th className="pb-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide text-center">
                    Conv. Rate
                  </th>
                  <th className="pb-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide text-center">
                    Status
                  </th>
                  <th className="pb-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
                {displayBranches.map((branch) => {
                  const isSelected = selectedBranch === branch.branchId;
                  return (
                    <tr
                      key={branch.branchId}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
                        isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700/60 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                              {branch.branchName}
                            </p>
                            <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
                              {branch.branchCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                          {branch.totalLeads}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                          {branch.followupsLogged || branch.followUp || 0}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {branch.converted}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          {branch.lost}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            parseFloat(branch.conversionRate) >= 20
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : parseFloat(branch.conversionRate) > 0
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {branch.conversionRate}%
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
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

                      <td className="py-3.5 pl-3 text-right">
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
                            className="p-1 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                            title="Inspect branch leads"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Unassigned / Legacy Row */}
                {unassigned && unassigned.totalLeads > 0 && (
                  <tr className="bg-amber-50/30 dark:bg-amber-950/10">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                          <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                            {unassigned.branchName}
                          </p>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            Records prior to branch assignment
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center font-bold text-gray-900 dark:text-gray-100">
                      {unassigned.totalLeads}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                        {unassigned.followupsLogged || unassigned.followUp || 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                      {unassigned.converted}
                    </td>

                    <td className="py-3.5 px-3 text-center font-semibold text-red-600 dark:text-red-400">
                      {unassigned.lost}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {unassigned.conversionRate || '0.0'}%
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500">
                        Legacy
                      </span>
                    </td>

                    <td className="py-3.5 pl-3 text-right">
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
                          className="p-1 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
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
        )}
      </div>
    </div>
  );
}
