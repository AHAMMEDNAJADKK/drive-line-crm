import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Clock,
  User,
  Shield,
  Briefcase,
  Building2,
  MapPin,
  CreditCard,
  IdCard,
  ChevronRight
} from 'lucide-react';

import { getEmployeeByIdApi } from '../services/employeeApi';
import { getLeadsApi } from '../services/leadApi';

import {
  RoleBadge,
  UserStatusBadge,
  StatusBadge,
  PriorityBadge
} from '../components/common/Badges';

import {
  LoadingState,
  ErrorState
} from '../components/common/States';

import {
  formatDateTime,
  formatDate,
  getInitials
} from '../utils/formatters';

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
        getLeadsApi({
          assignedTo: id,
          limit: 20
        })
      ]);

      setEmployee(empRes.data?.data || empRes.data);
      setLeads(leadsRes.data?.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Failed to load employee details'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (loading) {
    return (
      <LoadingState message="Loading staff profile..." />
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={fetchDetails}
      />
    );
  }

  if (!employee) {
    return null;
  }

  const totalAssigned = leads.length;

  const converted = leads.filter(
    (lead) => lead.status === 'Converted'
  ).length;

  const inProgress = leads.filter(
    (lead) =>
      !['Converted', 'Lost'].includes(lead.status)
  ).length;

  const lost = leads.filter(
    (lead) => lead.status === 'Lost'
  ).length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">

        <button
          onClick={() => navigate('/employees')}
          className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
          aria-label="Back to staff"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {employee.name}
          </h1>

          <p className="text-xs text-gray-500 font-mono">
            ID: {employee.employeeId}
          </p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-700/50">

          <div className="flex items-center gap-4">

            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              {getInitials(employee.name)}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">

                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {employee.name}
                </h2>

                <UserStatusBadge
                  status={employee.status}
                />

                <RoleBadge
                  role={employee.role}
                />
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {employee.email}
              </p>
            </div>
          </div>
        </div>

        {/* Main Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 pt-6">

          <InfoItem
            icon={Phone}
            label="Phone Number"
            value={employee.phone}
          />

          <InfoItem
            icon={IdCard}
            label="Staff ID"
            value={employee.employeeId}
            mono
          />

          <InfoItem
            icon={Calendar}
            label="Member Since"
            value={formatDate(employee.createdAt)}
          />

          <InfoItem
            icon={Clock}
            label="Last Login"
            value={formatDateTime(employee.lastLogin)}
          />

        </div>
      </div>

      {/* Employment Information */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">

        <div className="flex items-center gap-2 mb-5">

          <Briefcase className="w-5 h-5 text-indigo-500" />

          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Employment Information
          </h3>

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">

          <InfoItem
            icon={Briefcase}
            label="Position"
            value={employee.position}
          />

          <InfoItem
            icon={Building2}
            label="Branch"
            value={employee.branch}
          />

          <InfoItem
            icon={MapPin}
            label="Garage / Shop"
            value={employee.garageShop}
          />

          <InfoItem
            icon={Shield}
            label="Role"
            value={
              employee.role
                ? employee.role.charAt(0).toUpperCase() +
                  employee.role.slice(1)
                : ''
            }
          />

          <InfoItem
            icon={User}
            label="Account Status"
            value={
              employee.status
                ? employee.status.charAt(0).toUpperCase() +
                  employee.status.slice(1)
                : ''
            }
          />

        </div>
      </div>

      {/* Identification Information */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">

        <div className="flex items-center gap-2 mb-5">

          <CreditCard className="w-5 h-5 text-indigo-500" />

          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Identification Details
          </h3>

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          <InfoItem
            icon={IdCard}
            label="ID Details"
            value={employee.idDetails}
          />

          <InfoItem
            icon={CreditCard}
            label="Passport Number"
            value={employee.passportNumber}
            mono
          />

          <InfoItem
            icon={CreditCard}
            label="Passport Expiry"
            value={employee.passportExpireDate ? new Date(employee.passportExpireDate).toLocaleDateString('en-GB') : 'Not specified'}
          />

          <InfoItem
            icon={User}
            label="Vehicle Specialization"
            value={employee.vehicleSpecialization || 'Not specified'}
          />

        </div>
      </div>

      {/* Assigned Leads Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

        <StatCard
          label="Assigned Leads"
          value={totalAssigned}
        />

        <StatCard
          label="Active / Pipeline"
          value={inProgress}
          valueClass="text-amber-600 dark:text-amber-400"
          labelClass="text-amber-500"
        />

        <StatCard
          label="Converted"
          value={converted}
          valueClass="text-emerald-600 dark:text-emerald-400"
          labelClass="text-emerald-500"
        />

        <StatCard
          label="Lost"
          value={lost}
          valueClass="text-red-600 dark:text-red-400"
          labelClass="text-red-500"
        />

      </div>

      {/* Assigned Leads */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 space-y-4">

        <div className="flex items-center justify-between">

          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Assigned Leads ({leads.length})
          </h3>

        </div>

        {leads.length === 0 ? (

          <p className="text-sm text-gray-500 text-center py-6">
            No leads currently assigned to this employee.
          </p>

        ) : (

          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">

            {leads.map((lead) => (

              <div
                key={lead._id}
                onClick={() =>
                  navigate(`/leads/${lead._id}`)
                }
                className="py-3 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/20 px-2 rounded-xl cursor-pointer transition-colors"
              >

                <div className="min-w-0">

                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {lead.customerName ||
                      lead.mobileNumber ||
                      'Unnamed Lead'}
                  </p>

                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {lead.mobileNumber || 'No phone'} ·{' '}
                    {lead.partRequired ||
                      lead.vehicleModel ||
                      'No part specified'}
                  </p>

                </div>

                <div className="flex items-center gap-2 flex-shrink-0">

                  <StatusBadge
                    status={lead.status}
                  />

                  <PriorityBadge
                    priority={lead.priority}
                  />

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

/* ----------------------------- */
/* Reusable Info Item             */
/* ----------------------------- */

function InfoItem({
  icon: Icon,
  label,
  value,
  mono = false
}) {
  return (
    <div className="flex items-start gap-3">

      <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </div>

      <div className="min-w-0">

        <span className="text-gray-500 dark:text-gray-400 text-xs block mb-0.5">
          {label}
        </span>

        <span
          className={`font-semibold text-sm text-gray-900 dark:text-gray-100 break-words ${
            mono ? 'font-mono' : ''
          }`}
        >
          {value || '—'}
        </span>

      </div>
    </div>
  );
}

/* ----------------------------- */
/* Reusable Stat Card             */
/* ----------------------------- */

function StatCard({
  label,
  value,
  valueClass = 'text-gray-900 dark:text-gray-100',
  labelClass = 'text-gray-500'
}) {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50">

      <span
        className={`text-xs font-semibold uppercase ${labelClass}`}
      >
        {label}
      </span>

      <p
        className={`text-2xl font-bold mt-1 ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}