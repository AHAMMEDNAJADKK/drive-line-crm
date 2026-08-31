import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, KeyRound } from 'lucide-react';
import {
  getEmployeesApi, createEmployeeApi, updateEmployeeApi,
  toggleEmployeeStatusApi, resetEmployeePasswordApi
} from '../services/employeeApi';
import { useAuth } from '../context/AuthContext';
import EmployeeTable from '../components/employees/EmployeeTable';
import EmployeeForm from '../components/employees/EmployeeForm';
import SearchInput from '../components/common/SearchInput';
import Pagination from '../components/common/Pagination';
import Modal from '../components/common/Modal';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import toast from 'react-hot-toast';

export default function Employees() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedForPassword, setSelectedForPassword] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getEmployeesApi({
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 15,
      });
      setEmployees(res.data.data || []);
      setPagination({
        total: res.data.total || 0,
        page: res.data.page || 1,
        pages: res.data.pages || 1,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleFormSubmit = async (formData) => {
    setFormLoading(true);
    try {
      if (editingEmployee) {
        await updateEmployeeApi(editingEmployee._id, formData);
        toast.success('Employee updated successfully');
      } else {
        await createEmployeeApi(formData);
        toast.success('Employee created successfully');
      }
      setFormOpen(false);
      setEditingEmployee(null);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (id, status) => {
    try {
      await toggleEmployeeStatusApi(id, status);
      toast.success(`Employee ${status === 'active' ? 'activated' : 'deactivated'}`);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status change failed');
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSavingPassword(true);
    try {
      await resetEmployeePasswordApi(selectedForPassword._id, newPassword);
      toast.success('Password reset successfully');
      setPasswordModalOpen(false);
      setSelectedForPassword(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password reset failed');
    } finally {
      setSavingPassword(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Employees</h1>
          {!loading && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {pagination.total} registered staff member{pagination.total === 1 ? '' : 's'}
            </p>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingEmployee(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 shadow transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by name, email, employee ID..."
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm px-3 py-2.5"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm px-3 py-2.5"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Main Content */}
      {loading ? (
        <LoadingState message="Loading staff list..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchEmployees} />
      ) : employees.length === 0 ? (
        <EmptyState
          title="No employees found"
          description="Try clearing filters or add a new team member."
          action={
            isAdmin
              ? {
                  label: 'Add Employee',
                  onClick: () => {
                    setEditingEmployee(null);
                    setFormOpen(true);
                  },
                }
              : null
          }
        />
      ) : (
        <>
          <EmployeeTable
            employees={employees}
            currentUser={user}
            onView={(id) => navigate(`/employees/${id}`)}
            onEdit={(emp) => {
              setEditingEmployee(emp);
              setFormOpen(true);
            }}
            onToggleStatus={handleToggleStatus}
            onResetPassword={(emp) => {
              setSelectedForPassword(emp);
              setPasswordModalOpen(true);
            }}
          />
          {pagination.pages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              totalItems={pagination.total}
              itemsPerPage={15}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* Employee Add / Edit Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingEmployee(null);
        }}
        title={editingEmployee ? 'Edit Employee' : 'Add New Employee'}
        size="md"
      >
        <EmployeeForm
          initialData={editingEmployee || {}}
          isEdit={!!editingEmployee}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setFormOpen(false);
            setEditingEmployee(null);
          }}
          loading={formLoading}
        />
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={passwordModalOpen}
        onClose={() => {
          setPasswordModalOpen(false);
          setSelectedForPassword(null);
          setNewPassword('');
        }}
        title="Reset Employee Password"
        size="sm"
      >
        <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Reset password for <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedForPassword?.name}</span>:
          </p>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm px-4 py-2.5"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setPasswordModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingPassword}
              className="px-5 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-500"
            >
              Reset Password
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
