import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, TrendingUp, Clock, AlertCircle,
  CheckCircle2, XCircle, Phone, MessageCircle,
  ChevronRight, BarChart3, Award
} from 'lucide-react';
import { getDashboardApi } from '../services/dashboardApi';
import { useAuth } from '../context/AuthContext';
import { LoadingState, ErrorState } from '../components/common/States';
import { formatDate, formatFollowUpDate, whatsappLink, telLink, getInitials } from '../utils/formatters';
import { STATUS_COLORS } from '../utils/constants';
import { StatusBadge, PriorityBadge } from '../components/common/Badges';

function MetricCard({ label, value, color, icon: Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow text-left w-full"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
      </div>
      <p className={`text-3xl font-bold ${color || 'text-gray-900 dark:text-gray-100'}`}>{value ?? 0}</p>
    </button>
  );
}

function FollowupCard({ lead, onOpen }) {
  const name = lead.customerName || lead.mobileNumber;
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold flex-shrink-0">
        {getInitials(name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {lead.partRequired || lead.vehicleModel || lead.mobileNumber}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <a href={telLink(lead.mobileNumber)} className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Call">
          <Phone className="w-3.5 h-3.5" />
        </a>
        <a href={whatsappLink(lead.mobileNumber)} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="WhatsApp">
          <MessageCircle className="w-3.5 h-3.5" />
        </a>
        <button onClick={() => onOpen(lead._id)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isEmployee = user?.role === 'employee';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getDashboardApi();
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingState message="Loading dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const { metrics, todayFollowupsList, overdueFollowupsList, recentLeads, employeePerformance, topPartsDemand, topVehiclesDemand } = data;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {greeting}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Here's what's happening with your leads today.
        </p>
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3">
        <MetricCard label="Total Leads" value={metrics.totalLeads} icon={Users}
          onClick={() => navigate('/leads')} />
        <MetricCard label="Today's Follow-ups" value={metrics.todayFollowupsCount}
          color="text-amber-600 dark:text-amber-400" icon={Clock}
          onClick={() => navigate('/leads?followup=today')} />
        <MetricCard label="Overdue" value={metrics.overdueFollowupsCount}
          color={metrics.overdueFollowupsCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}
          icon={AlertCircle} onClick={() => navigate('/leads?followup=overdue')} />
        <MetricCard label="Converted" value={metrics.convertedLeads}
          color="text-emerald-600 dark:text-emerald-400" icon={CheckCircle2}
          onClick={() => navigate('/leads?status=Converted')} />
      </div>

      {/* Status breakdown */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Lead Pipeline
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'New', value: metrics.newLeads, status: 'New' },
            { label: 'Contacted', value: metrics.contactedLeads, status: 'Contacted' },
            { label: 'Follow Up', value: metrics.followupLeads, status: 'Follow Up' },
            { label: 'Quotation', value: metrics.quotationLeads, status: 'Quotation' },
            { label: 'Interested', value: metrics.interestedLeads, status: 'Interested' },
            { label: 'Converted', value: metrics.convertedLeads, status: 'Converted' },
            { label: 'Lost', value: metrics.lostLeads, status: 'Lost' },
          ].map(({ label, value, status }) => (
            <button
              key={status}
              onClick={() => navigate(`/leads?status=${encodeURIComponent(status)}`)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</span>
              <StatusBadge status={status} />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Follow-ups */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Today's Follow-ups
              {metrics.todayFollowupsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-medium">
                  {metrics.todayFollowupsCount}
                </span>
              )}
            </h3>
            <button onClick={() => navigate('/leads?followup=today')} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
              View all
            </button>
          </div>
          {todayFollowupsList.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No follow-ups scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayFollowupsList.slice(0, 5).map(lead => (
                <FollowupCard key={lead._id} lead={lead} onOpen={(id) => navigate(`/leads/${id}`)} />
              ))}
            </div>
          )}
        </div>

        {/* Overdue Follow-ups */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Overdue Follow-ups
              {metrics.overdueFollowupsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-medium">
                  {metrics.overdueFollowupsCount}
                </span>
              )}
            </h3>
            <button onClick={() => navigate('/leads?followup=overdue')} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
              View all
            </button>
          </div>
          {overdueFollowupsList.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No overdue follow-ups</p>
            </div>
          ) : (
            <div className="space-y-2">
              {overdueFollowupsList.slice(0, 5).map(lead => (
                <FollowupCard key={lead._id} lead={lead} onOpen={(id) => navigate(`/leads/${id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Leads */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Leads</h3>
          <button onClick={() => navigate('/leads')} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
            View all
          </button>
        </div>
        {recentLeads.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No leads yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Customer</th>
                  <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide hidden sm:table-cell">Part / Vehicle</th>
                  <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Status</th>
                  <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide hidden md:table-cell">Assigned</th>
                  <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide hidden lg:table-cell">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {recentLeads.map((lead) => (
                  <tr
                    key={lead._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/leads/${lead._id}`)}
                  >
                    <td className="py-3 pr-4">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[140px]">
                        {lead.customerName || '—'}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">{lead.mobileNumber}</p>
                    </td>
                    <td className="py-3 pr-4 hidden sm:table-cell text-gray-600 dark:text-gray-400 text-xs">
                      {lead.partRequired || lead.vehicleModel || '—'}
                    </td>
                    <td className="py-3 pr-4"><StatusBadge status={lead.status} /></td>
                    <td className="py-3 pr-4 hidden md:table-cell text-gray-600 dark:text-gray-400 text-xs">
                      {lead.assignedTo?.name || '—'}
                    </td>
                    <td className="py-3 hidden lg:table-cell text-gray-500 dark:text-gray-400 text-xs">
                      {formatDate(lead.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin/Manager only */}
      {!isEmployee && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee Performance */}
          {employeePerformance.length > 0 && (
            <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <Award className="w-4 h-4" /> Employee Performance
              </h3>
              <div className="space-y-3">
                {employeePerformance.slice(0, 5).map((emp) => (
                  <div key={emp._id} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold flex-shrink-0">
                      {getInitials(emp.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{emp.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                          {emp.converted}/{emp.totalLeads} converted
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${Math.min(parseFloat(emp.conversionRate), 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex-shrink-0">{emp.conversionRate}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Parts Demand */}
          {topPartsDemand.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top Parts in Demand</h3>
              <div className="space-y-3">
                {topPartsDemand.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[160px]">{item.part}</span>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>

              {topVehiclesDemand.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-5 mb-3">Top Vehicles</h3>
                  <div className="space-y-3">
                    {topVehiclesDemand.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[160px]">{item.vehicle}</span>
                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
