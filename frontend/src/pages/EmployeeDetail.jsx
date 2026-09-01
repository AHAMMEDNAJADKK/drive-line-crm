import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, Calendar, Clock, User, Shield, CheckCircle2,
  AlertCircle, ChevronRight
} from 'lucide-react';
import { getEmployeeByIdApi } from '../services/employeeApi';
import { getLeadsApi } from '../services/leadApi';
import { RoleBadge, UserStatusBadge, StatusBadge, PriorityBadge } from '../components/common/Badges';
import { LoadingState, ErrorState } from '../components/common/States';
import { formatDateTime, formatDate, getInitials } from '../utils/formatters';

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [empRes, leadsRes] = await Promise.all([
        getEmployeeByIdApi(id),
        getLeadsApi({ assignedTo: id, limit: 20 }),
      ]);
      setEmployee(empRes.data.data);
      setLeads(leadsRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load employee details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (loading) return <LoadingState message="Loading staff profile..." />;
  if (error) return <ErrorState message={error} onRetry={fetchDetails} />;
  if (!employee) return null;

  const totalAssigned = leads.length;
  const converted = leads.filter((l) => l.status === 'Converted').length;
  const inProgress = leads.filter((l) => !['Converted', 'Lost'].includes(l.status)).length;
  const lost = leads.filter((l) => l.status === 'Lost').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/employees')}
          className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-600 dark:text-gray-400"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{employee.name}</h1>
          <p className="text-xs text-gray-500 font-mono">ID: {employee.employeeId}</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              {getInitials(employee.name)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{employee.name}</h2>
                <UserStatusBadge status={employee.status} />
                <RoleBadge role={employee.role} />
              </div>
              <p className="text-sm text-gray-500">{employee.email}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-6 text-sm">
          <div>
            <span className="text-gray-500 text-xs block mb-0.5">Phone Number</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{employee.phone || '—'}</span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block mb-0.5">Employee ID</span>
            <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{employee.employeeId}</span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block mb-0.5">Member Since</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{formatDate(employee.createdAt)}</span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block mb-0.5">Last Login</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{formatDateTime(employee.lastLogin)}</span>
          </div>
        </div>
      </div>

      {/* Assigned Leads Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50">
          <span className="text-xs font-semibold text-gray-500 uppercase">Assigned Leads</span>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{totalAssigned}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50">
          <span className="text-xs font-semibold text-amber-500 uppercase">Active / Pipeline</span>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{inProgress}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50">
          <span className="text-xs font-semibold text-emerald-500 uppercase">Converted</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{converted}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50">
          <span className="text-xs font-semibold text-red-500 uppercase">Lost</span>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{lost}</p>
        </div>
      </div>

      {/* Assigned Leads List */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Assigned Leads ({leads.length})
        </h3>

        {leads.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No leads currently assigned to this employee.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {leads.map((lead) => (
              <div
                key={lead._id}
                onClick={() => navigate(`/leads/${lead._id}`)}
                className="py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/20 px-2 rounded-xl cursor-pointer transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {lead.customerName || lead.mobileNumber}
                  </p>
                  <p className="text-xs text-gray-500">
                    {lead.mobileNumber} · {lead.partRequired || lead.vehicleModel || 'No part specified'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={lead.status} />
                  <PriorityBadge priority={lead.priority} />
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
