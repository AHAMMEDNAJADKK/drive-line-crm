import { useEffect, useState } from 'react';
import { AlertTriangle, Users } from 'lucide-react';
import { getHrDashboardApi, getNotificationsApi } from '../services/hrApi';
import { LoadingState, ErrorState } from '../components/common/States';

const displayDate = (value) => value
  ? new Date(value).toLocaleDateString('en-GB')
  : '—';

export default function HRDashboard() {
  const [data, setData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getHrDashboardApi(), getNotificationsApi()])
      .then(([dashboard, notificationResponse]) => {
        setData(dashboard.data.data);
        setNotifications(notificationResponse.data.data || []);
      })
      .catch((requestError) => {
        setError(requestError.response?.data?.message || 'Failed to load HR dashboard.');
      });
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState message="Loading HR dashboard..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">HR Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Employee overview and passport expiry monitoring.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric label="Total employees" value={data.totals.totalEmployees} />
        <Metric label="Active employees" value={data.totals.activeEmployees} />
        <Metric label="Passport alerts" value={data.totals.passportAlerts} alert={data.totals.passportAlerts > 0} />
      </div>

      {notifications.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4" /> Passport notifications
          </h2>
          <div className="space-y-2">
            {notifications.map((notification) => (
              <p key={notification._id} className="text-sm text-amber-800 dark:text-amber-200">{notification.message}</p>
            ))}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700/50 dark:bg-gray-800">
        <div className="border-b border-gray-100 p-5 dark:border-gray-700/50">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200"><Users className="h-4 w-4" /> Employee information</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700/30 dark:text-gray-400">
              <tr><th className="px-5 py-3">Employee</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Vehicle</th><th className="px-5 py-3">Passport expiry</th><th className="px-5 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {data.employees.map((employee) => (
                <tr key={employee._id}>
                  <td className="px-5 py-3"><div className="font-medium text-gray-900 dark:text-gray-100">{employee.name}</div><div className="text-xs text-gray-500">{employee.employeeId}</div></td>
                  <td className="px-5 py-3 capitalize text-gray-600 dark:text-gray-300">{employee.role}</td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{employee.vehicleSpecialization || '—'}</td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{displayDate(employee.passportExpireDate)}</td>
                  <td className="px-5 py-3 capitalize text-gray-600 dark:text-gray-300">{employee.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, alert = false }) {
  return <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700/50 dark:bg-gray-800"><p className="text-xs uppercase text-gray-500">{label}</p><p className={`mt-2 text-3xl font-bold ${alert ? 'text-amber-600' : 'text-gray-900 dark:text-gray-100'}`}>{value}</p></div>;
}
