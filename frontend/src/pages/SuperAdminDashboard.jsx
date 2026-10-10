import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  UserSquare2,
  CheckCircle2,
  XCircle,
  Activity,
  Server,
  Cpu,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  UserCog,
  Clock,
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
  FolderSync
} from 'lucide-react';
import {
  getSuperAdminDashboardApi,
  getSuperAdminBranchAuditApi,
  fixSuperAdminBranchAssignmentsApi,
  getSuperAdminAuditLogsApi
} from '../services/superAdminApi';
import { useBranch } from '../context/BranchContext';
import Modal from '../components/common/Modal';
import { LoadingState, ErrorState } from '../components/common/States';
import toast from 'react-hot-toast';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { selectedBranch } = useBranch();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Tabs for branch distribution
  const [distributionTab, setDistributionTab] = useState('leads'); // 'leads' | 'staff'

  // Tabs for activity stream
  const [activityTab, setActivityTab] = useState('crm'); // 'crm' | 'audit'
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Reassignment / Health Fix Modal
  const [fixModalOpen, setFixModalOpen] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [auditFetching, setAuditFetching] = useState(false);
  const [reassignType, setReassignType] = useState('staff'); // 'staff' | 'leads'
  const [reassignBranchId, setReassignBranchId] = useState('');
  const [reassignSubmitting, setReassignSubmitting] = useState(false);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const res = await getSuperAdminDashboardApi(selectedBranch);
      setData(res.data?.data || null);
    } catch (err) {
      console.error('Super Admin Dashboard error:', err);
      setError(err.response?.data?.message || 'Failed to load Super Admin dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBranch]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Load audit logs when switching to audit tab
  useEffect(() => {
    if (activityTab === 'audit') {
      setAuditLoading(true);
      getSuperAdminAuditLogsApi({ limit: 20 })
        .then((res) => {
          setAuditLogs(res.data?.logs || []);
        })
        .catch((err) => {
          console.error('Audit logs error:', err);
        })
        .finally(() => {
          setAuditLoading(false);
        });
    }
  }, [activityTab]);

  // Handle opening Relationship Health Modal
  const handleOpenFixModal = async () => {
    setFixModalOpen(true);
    setAuditFetching(true);
    try {
      const res = await getSuperAdminBranchAuditApi();
      setAuditData(res.data?.data || null);
      if (res.data?.data?.branches?.length > 0) {
        const firstActive = res.data.data.branches.find((b) => b.status === 'active');
        if (firstActive) setReassignBranchId(firstActive._id);
      }
    } catch (err) {
      toast.error('Failed to inspect branch relationships');
    } finally {
      setAuditFetching(false);
    }
  };

  // Execute Reassignment Fix
  const handleExecuteReassignment = async () => {
    if (!reassignBranchId) {
      toast.error('Please select a target branch');
      return;
    }

    const ids =
      reassignType === 'staff'
        ? [
            ...(auditData?.unassignedStaff?.map((u) => u._id) || []),
            ...(auditData?.orphanedStaff?.map((u) => u._id) || [])
          ]
        : [
            ...(auditData?.unassignedLeads?.map((l) => l._id) || []),
            ...(auditData?.orphanedLeads?.map((l) => l._id) || [])
          ];

    if (ids.length === 0) {
      toast.error(`No unassigned or orphaned ${reassignType} found to reassign`);
      return;
    }

    setReassignSubmitting(true);
    try {
      const res = await fixSuperAdminBranchAssignmentsApi({
        type: reassignType,
        ids,
        targetBranchId: reassignBranchId
      });
      toast.success(res.data?.message || 'Branch relationships updated successfully');
      setFixModalOpen(false);
      await fetchDashboardData(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update assignments');
    } finally {
      setReassignSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading developer control panel…" />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => fetchDashboardData()}
      />
    );
  }

  const {
    summary = {},
    branchLeadDistribution = [],
    branchEmployeeDistribution = [],
    recentActivity = [],
    systemHealth = {},
    relationshipHealth = {}
  } = data || {};

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Header */}
      <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-20 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold tracking-wide uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
              <span>Developer & Owner Control Panel</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Drive Line CRM Architecture Control
            </h1>
            <p className="text-sm text-gray-300 max-w-2xl leading-relaxed">
              Global multi-branch system management, real-time developer diagnostics, user access control, and cross-branch operational synchronization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors border border-white/10 backdrop-blur disabled:opacity-50"
              title="Refresh Control Panel"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => navigate('/super-admin/users')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
            >
              <UserCog className="w-4 h-4" />
              <span>Manage Users</span>
            </button>
          </div>
        </div>

        {/* Status Strip */}
        <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-300">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-white">System Status:</span> {systemHealth.dbStatus || 'Connected'}
            </span>
            <span className="hidden sm:inline text-gray-500">•</span>
            <span className="hidden sm:inline">
              <span className="text-gray-400">Node:</span> {systemHealth.nodeVersion}
            </span>
            <span className="hidden sm:inline text-gray-500">•</span>
            <span className="hidden sm:inline">
              <span className="text-gray-400">Environment:</span> {systemHealth.environment}
            </span>
          </div>

          <div className="flex items-center gap-2 text-indigo-200">
            <Clock className="w-3.5 h-3.5" />
            <span>Uptime: {systemHealth.serverUptimeFormatted || 'Running'}</span>
          </div>
        </div>
      </div>

      {/* Relationship Health Alert Banner (if issues exist) */}
      {relationshipHealth.hasIssues && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-xl text-amber-700 dark:text-amber-300 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Unassigned or Orphaned Branch Relationships Detected
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                {relationshipHealth.unassignedStaffCount > 0 && `${relationshipHealth.unassignedStaffCount} staff without branch assignment. `}
                {relationshipHealth.unassignedLeadsCount > 0 && `${relationshipHealth.unassignedLeadsCount} unassigned lead(s). `}
                {relationshipHealth.orphanedStaffCount > 0 && `${relationshipHealth.orphanedStaffCount} staff pointing to nonexistent branches. `}
                {relationshipHealth.orphanedLeadsCount > 0 && `${relationshipHealth.orphanedLeadsCount} leads pointing to nonexistent branches.`}
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenFixModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-sm transition-colors shrink-0"
          >
            <FolderSync className="w-3.5 h-3.5" />
            <span>Review & Fix Relationships</span>
          </button>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Branches */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Total Branches
            </span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              {summary.totalBranches || 0}
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {summary.activeBranches || 0} active
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>Inactive: {summary.inactiveBranches || 0}</span>
            <button
              onClick={() => navigate('/branches')}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium inline-flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Users & Staff */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Total Users & Staff
            </span>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              {summary.totalUsers || 0}
            </span>
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              {summary.activeUsers || 0} active
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>
              {summary.employeeCount || 0} Emp • {summary.hrCount || 0} HR • {summary.adminCount || 0} Admin
            </span>
            <button
              onClick={() => navigate('/super-admin/users')}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium inline-flex items-center gap-1"
            >
              View <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Total Leads */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Leads ({selectedBranch ? 'Branch Scope' : 'All Branches'})
            </span>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <UserSquare2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              {summary.totalLeads || 0}
            </span>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              {summary.openLeads || 0} open
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>Closed: {summary.closedLeads || 0} ({summary.convertedLeads || 0} won)</span>
            <button
              onClick={() => navigate('/leads')}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium inline-flex items-center gap-1"
            >
              Leads <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Conversion Performance
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              {summary.conversionRate || '0.0'}%
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {summary.convertedLeads || 0} converted
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>Lost: {summary.lostLeads || 0}</span>
            <button
              onClick={() => navigate('/closed-leads')}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium inline-flex items-center gap-1"
            >
              Closed <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* System Infrastructure Diagnostics & Health Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/60 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 rounded-xl">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                System Infrastructure & Health Diagnostics
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Host environment metrics and database connectivity telemetry.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Live Cluster Verified
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-5">
          <div className="p-3.5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700/50">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              MongoDB
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1 block">
              {systemHealth.dbStatus}
            </span>
            <span className="text-[11px] text-gray-500 truncate block mt-0.5">
              {systemHealth.dbName}
            </span>
          </div>

          <div className="p-3.5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700/50">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Server Uptime
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1 block">
              {systemHealth.serverUptimeFormatted}
            </span>
            <span className="text-[11px] text-gray-500 block mt-0.5">
              {systemHealth.serverUptimeSeconds}s total
            </span>
          </div>

          <div className="p-3.5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700/50">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Heap Memory
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1 block">
              {systemHealth.memoryUsageMB?.heapUsed || 0} MB
            </span>
            <span className="text-[11px] text-gray-500 block mt-0.5">
              / {systemHealth.memoryUsageMB?.heapTotal || 0} MB allocated
            </span>
          </div>

          <div className="p-3.5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700/50">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              RSS Memory
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1 block">
              {systemHealth.memoryUsageMB?.rss || 0} MB
            </span>
            <span className="text-[11px] text-gray-500 block mt-0.5">
              Resident set size
            </span>
          </div>

          <div className="p-3.5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700/50">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Node Version
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1 block">
              {systemHealth.nodeVersion}
            </span>
            <span className="text-[11px] text-gray-500 block mt-0.5">
              Runtime engine
            </span>
          </div>

          <div className="p-3.5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700/50">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Environment
            </span>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1 block capitalize">
              {systemHealth.environment}
            </span>
            <span className="text-[11px] text-gray-500 block mt-0.5">
              Active profile
            </span>
          </div>
        </div>
      </div>

      {/* Branch Distribution Breakdown Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/60 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700/50">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Branch-Wise Operations & Distribution
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Cross-branch operational volume, employee headcount, and lead pipelines.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDistributionTab('leads')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                distributionTab === 'leads'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              Lead Distribution
            </button>
            <button
              onClick={() => setDistributionTab('staff')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                distributionTab === 'staff'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              Employee Distribution
            </button>
          </div>
        </div>

        {/* Tab 1: Leads Distribution */}
        {distributionTab === 'leads' ? (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total Leads</th>
                  <th className="py-3 px-4 text-right">Open</th>
                  <th className="py-3 px-4 text-right">Converted</th>
                  <th className="py-3 px-4 text-right">Lost</th>
                  <th className="py-3 px-4 text-right">Win Rate</th>
                  <th className="py-3 px-4 text-center">Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
                {branchLeadDistribution.map((branch) => {
                  const isCurrent = selectedBranch === branch.branchId;
                  return (
                    <tr
                      key={branch.branchId}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${
                        isCurrent ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {branch.branchName}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {branch.branchCode}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                            branch.status === 'active'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {branch.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-gray-900 dark:text-gray-100">
                        {branch.totalLeads}
                      </td>
                      <td className="py-3.5 px-4 text-right text-blue-600 dark:text-blue-400 font-semibold">
                        {branch.openLeads}
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                        {branch.convertedLeads}
                      </td>
                      <td className="py-3.5 px-4 text-right text-red-600 dark:text-red-400 font-semibold">
                        {branch.lostLeads}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-gray-900 dark:text-gray-100">
                        {branch.conversionRate}%
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isCurrent ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                            Active Scope
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Tab 2: Staff Distribution */
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total Staff</th>
                  <th className="py-3 px-4 text-right">Employees</th>
                  <th className="py-3 px-4 text-right">HR Personnel</th>
                  <th className="py-3 px-4">Branch Manager</th>
                  <th className="py-3 px-4 text-center">Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
                {branchEmployeeDistribution.map((branch) => {
                  const isCurrent = selectedBranch === branch.branchId;
                  return (
                    <tr
                      key={branch.branchId}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${
                        isCurrent ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {branch.branchName}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {branch.branchCode}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                            branch.status === 'active'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {branch.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-gray-900 dark:text-gray-100">
                        {branch.totalStaff}
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-700 dark:text-gray-300 font-medium">
                        {branch.employeeCount}
                      </td>
                      <td className="py-3.5 px-4 text-right text-indigo-600 dark:text-indigo-400 font-medium">
                        {branch.hrCount}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400 text-xs">
                        {branch.managerName}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isCurrent ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                            Active Scope
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity Streams (CRM Activity & Audit Logs) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/60 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700/50">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Audit Telemetry & CRM Activity
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Live operational event tracking across all branches.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivityTab('crm')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activityTab === 'crm'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              Lead Activity Feed ({recentActivity.length})
            </button>
            <button
              onClick={() => setActivityTab('audit')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activityTab === 'audit'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              Security Audit Logs
            </button>
          </div>
        </div>

        {/* Lead Activity Stream */}
        {activityTab === 'crm' ? (
          <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-700/40">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No recent CRM lead activity found.
              </div>
            ) : (
              recentActivity.map((act) => (
                <div key={act._id} className="py-3.5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                          {act.action}
                        </span>
                        {act.leadId && (
                          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                            • {act.leadId.customerName} ({act.leadId.mobileNumber})
                          </span>
                        )}
                        {act.leadId?.branchId && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {act.leadId.branchId.code || act.leadId.branchId.name}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        By {act.performedBy?.name || 'System'} ({act.performedBy?.role || 'user'})
                        {act.remarks ? ` — "${act.remarks}"` : ''}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(act.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Security Audit Log Stream */
          <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-700/40">
            {auditLoading ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                Loading audit logs…
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No administrative audit logs recorded yet.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log._id} className="py-3.5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-rose-500 mt-2 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-900 dark:text-gray-100 font-mono">
                          {log.action}
                        </span>
                        {log.targetUser && (
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Target: {log.targetUser.name} ({log.targetUser.email})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Performed by: <span className="font-semibold">{log.performedBy?.name}</span> ({log.performedBy?.email})
                        {log.details && Object.keys(log.details).length > 0 && (
                          <span className="font-mono text-[11px] block text-gray-400 mt-0.5">
                            {JSON.stringify(log.details)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(log.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Review & Fix Relationships Modal */}
      <Modal
        isOpen={fixModalOpen}
        onClose={() => setFixModalOpen(false)}
        title="Branch Relationship Health & Migration Tool"
      >
        <div className="space-y-5">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Detect and safely reassign unassigned or orphaned staff and leads to an active branch without data loss.
          </p>

          {auditFetching ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Analyzing database branch relationships…
            </div>
          ) : auditData ? (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setReassignType('staff')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    reassignType === 'staff'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                    Staff Issues
                  </span>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {(auditData.summary?.unassignedStaffCount || 0) + (auditData.summary?.orphanedStaffCount || 0)}
                  </div>
                  <span className="text-[11px] text-gray-500">
                    {auditData.summary?.unassignedStaffCount || 0} unassigned, {auditData.summary?.orphanedStaffCount || 0} orphaned
                  </span>
                </div>

                <div
                  onClick={() => setReassignType('leads')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    reassignType === 'leads'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                    Lead Issues
                  </span>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {(auditData.summary?.unassignedLeadsCount || 0) + (auditData.summary?.orphanedLeadsCount || 0)}
                  </div>
                  <span className="text-[11px] text-gray-500">
                    {auditData.summary?.unassignedLeadsCount || 0} unassigned, {auditData.summary?.orphanedLeadsCount || 0} orphaned
                  </span>
                </div>
              </div>

              {/* Target Branch Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Reassign Selected {reassignType.toUpperCase()} To Target Branch
                </label>
                <select
                  value={reassignBranchId}
                  onChange={(e) => setReassignBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {auditData.branches
                    ?.filter((b) => b.status === 'active')
                    .map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                </select>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-700/60">
                <button
                  type="button"
                  onClick={() => setFixModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteReassignment}
                  disabled={reassignSubmitting}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition-colors disabled:opacity-50"
                >
                  {reassignSubmitting ? 'Migrating…' : 'Execute Reassignment'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
