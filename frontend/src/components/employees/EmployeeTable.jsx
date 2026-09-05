import { useState } from 'react';
import { Edit, Eye, KeyRound, UserCheck, UserX, Phone, Mail } from 'lucide-react';
import { RoleBadge, UserStatusBadge } from '../common/Badges';
import { formatDateTime, getInitials } from '../../utils/formatters';

export default function EmployeeTable({
  employees,
  currentUser,
  onView,
  onEdit,
  onToggleStatus,
  onResetPassword,
}) {
  const canManageEmployees = ['admin', 'hr'].includes(currentUser?.role);

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
      {/* Desktop View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-gray-700/30 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Employee</th>
              <th className="px-6 py-4">Employee ID</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Vehicle</th>
              <th className="px-6 py-4">Passport Expiry</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Leads Assigned</th>
              <th className="px-6 py-4">Last Login</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {employees.map((emp) => (
              <tr
                key={emp._id}
                className="hover:bg-gray-50/80 dark:hover:bg-gray-700/20 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {getInitials(emp.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{emp.name}</p>
                      <p className="text-xs text-gray-500">{emp.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-gray-700 dark:text-gray-300">
                  {emp.employeeId}
                </td>
                <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400">
                  {emp.phone || '—'}
                </td>
                <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400">
                  {emp.vehicleSpecialization || '—'}
                </td>
                <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400">
                  {emp.passportExpireDate ? new Date(emp.passportExpireDate).toLocaleDateString('en-GB') : '—'}
                </td>
                <td className="px-6 py-4">
                  <RoleBadge role={emp.role} />
                </td>
                <td className="px-6 py-4">
                  <UserStatusBadge status={emp.status} />
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {emp.leadsAssigned ?? emp.assignedLeadsCount ?? 0}
                </td>
                <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                  {formatDateTime(emp.lastLogin)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onView(emp._id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {canManageEmployees && (
                      <>
                        <button
                          onClick={() => onEdit(emp)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          title="Edit Employee"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onResetPassword(emp)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        {emp._id !== currentUser?._id && (
                          <button
                            onClick={() =>
                              onToggleStatus(emp._id, emp.status === 'active' ? 'inactive' : 'active')
                            }
                            className={`p-1.5 rounded-lg transition-colors ${
                              emp.status === 'active'
                                ? 'text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                            }`}
                            title={emp.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {emp.status === 'active' ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700/50">
        {employees.map((emp) => (
          <div key={emp._id} className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {getInitials(emp.name)}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">{emp.name}</h4>
                  <p className="text-xs text-gray-500 font-mono">{emp.employeeId}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <UserStatusBadge status={emp.status} />
                <RoleBadge role={emp.role} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-gray-50 dark:border-gray-700/30">
              <div className="text-gray-500">
                Email: <span className="text-gray-800 dark:text-gray-200 font-medium">{emp.email}</span>
              </div>
              <div className="text-gray-500">
                Phone: <span className="text-gray-800 dark:text-gray-200 font-medium">{emp.phone || '—'}</span>
              </div>
              <div className="text-gray-500">
                Vehicle: <span className="text-gray-800 dark:text-gray-200 font-medium">{emp.vehicleSpecialization || '—'}</span>
              </div>
              <div className="text-gray-500">
                Passport: <span className="text-gray-800 dark:text-gray-200 font-medium">{emp.passportExpireDate ? new Date(emp.passportExpireDate).toLocaleDateString('en-GB') : '—'}</span>
              </div>
              <div className="text-gray-500">
                Assigned Leads:{' '}
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  {emp.leadsAssigned ?? emp.assignedLeadsCount ?? 0}
                </span>
              </div>
              <div className="text-gray-500">
                Last Login: <span className="text-gray-800 dark:text-gray-200">{formatDateTime(emp.lastLogin)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => onView(emp._id)}
                className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300"
              >
                View
              </button>
              {canManageEmployees && (
                <>
                  <button
                    onClick={() => onEdit(emp)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-xs font-semibold text-indigo-600 dark:text-indigo-400"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onResetPassword(emp)}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-xs font-semibold text-amber-600 dark:text-amber-400"
                  >
                    Password
                  </button>
                  {emp._id !== currentUser?._id && (
                    <button
                      onClick={() =>
                        onToggleStatus(emp._id, emp.status === 'active' ? 'inactive' : 'active')
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        emp.status === 'active'
                          ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      }`}
                    >
                      {emp.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
