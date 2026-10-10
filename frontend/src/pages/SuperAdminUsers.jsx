import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Shield,
  ShieldAlert,
  Building2,
  Search,
  Plus,
  Edit2,
  Key,
  Power,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  X,
  Briefcase
} from 'lucide-react';
import {
  getSuperAdminUsersApi,
  createSuperAdminUserApi,
  updateSuperAdminUserApi,
  toggleSuperAdminUserStatusApi,
  resetSuperAdminUserPasswordApi
} from '../services/superAdminApi';
import { getActiveBranchesListApi } from '../services/branchApi';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import Pagination from '../components/common/Pagination';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import toast from 'react-hot-toast';

export default function SuperAdminUsers() {
  const { user: currentUser } = useAuth();
  const { selectedBranch } = useBranch();

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Data states
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [statusConfirmModalOpen, setStatusConfirmModalOpen] = useState(false);

  // Selected User for actions
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    employeeId: '',
    phone: '',
    role: 'employee',
    status: 'active',
    branchId: '',
    password: '',
    position: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Fetch branches
  useEffect(() => {
    getActiveBranchesListApi()
      .then((res) => setBranches(res.data?.data || []))
      .catch((err) => console.error('Failed to load branches:', err));
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit,
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        branchId: (selectedBranch && selectedBranch !== 'all') ? selectedBranch : undefined
      };
      const res = await getSuperAdminUsersApi(params);
      const data = res.data?.data || {};
      setUsers(data.users || []);
      setPagination({
        total: data.total || 0,
        pages: data.pages || 1
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, roleFilter, statusFilter, selectedBranch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Open Add Modal
  const openAddModal = () => {
    setFormData({
      name: '',
      email: '',
      employeeId: '',
      phone: '',
      role: 'employee',
      status: 'active',
      branchId: '',
      password: '',
      position: ''
    });
    setFormErrors({});
    setAddUserModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (u) => {
    setSelectedUser(u);
    setFormData({
      name: u.name || '',
      email: u.email || '',
      employeeId: u.employeeId || '',
      phone: u.phone || '',
      role: u.role || 'employee',
      status: u.status || 'active',
      branchId: u.branchId?._id || u.branchId || '',
      position: u.position || ''
    });
    setFormErrors({});
    setEditUserModalOpen(true);
  };

  // Open Password Modal
  const openPasswordModal = (u) => {
    setSelectedUser(u);
    setNewPassword('');
    setShowPassword(false);
    setPasswordModalOpen(true);
  };

  // Open Status Confirm Modal
  const openStatusConfirmModal = (u) => {
    setSelectedUser(u);
    setStatusConfirmModalOpen(true);
  };

  // Validate user form
  const validateForm = (isEdit = false) => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Enter a valid email address';
    }
    if (!formData.employeeId.trim()) errs.employeeId = 'Staff / Employee ID is required';

    if (['hr', 'employee'].includes(formData.role) && !formData.branchId) {
      errs.branchId = 'Branch assignment is required for HR and Employee roles';
    }

    if (!isEdit) {
      if (!formData.password) {
        errs.password = 'Initial password is required';
      } else if (formData.password.length < 6) {
        errs.password = 'Password must be at least 6 characters';
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Handle Add Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(false)) return;

    setFormSubmitting(true);
    try {
      await createSuperAdminUserApi({
        ...formData,
        branchId: formData.branchId || null
      });
      toast.success(`User account for ${formData.name} created successfully.`);
      setAddUserModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user account.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(true)) return;

    setFormSubmitting(true);
    try {
      await updateSuperAdminUserApi(selectedUser._id, {
        name: formData.name,
        employeeId: formData.employeeId,
        phone: formData.phone,
        role: formData.role,
        branchId: formData.branchId || null,
        position: formData.position,
        status: formData.status
      });
      toast.success(`User account for ${formData.name} updated.`);
      setEditUserModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user account.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Password Reset Submit
  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setPasswordSubmitting(true);
    try {
      await resetSuperAdminUserPasswordApi(selectedUser._id, newPassword);
      toast.success(`Password reset for ${selectedUser.name}.`);
      setPasswordModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password reset failed.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  // Handle Status Toggle Confirm
  const handleToggleStatusConfirm = async () => {
    if (!selectedUser) return;
    const nextStatus = selectedUser.status === 'active' ? 'inactive' : 'active';
    try {
      await toggleSuperAdminUserStatusApi(selectedUser._id, nextStatus);
      toast.success(
        `User ${selectedUser.name} ${nextStatus === 'active' ? 'activated' : 'deactivated'}.`
      );
      setStatusConfirmModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status change failed.');
    }
  };

  // Format helper for role badge
  const renderRoleBadge = (role) => {
    switch (role) {
      case 'superadmin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            <Shield className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            Super Admin
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300">
            <Shield className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            Admin
          </span>
        );
      case 'hr':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
            <Users className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            HR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            <Users className="w-3 h-3 text-gray-500" />
            Employee
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
              <Shield className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                User & Role Management
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Centralized developer console for cross-branch credentials, role elevations, and branch assignments.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add User Account
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, email, staff ID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Roles (Global)</option>
            <option value="superadmin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="hr">HR</option>
            <option value="employee">Employee</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Accounts</option>
            <option value="inactive">Inactive Accounts</option>
          </select>
        </div>

        {/* Active Filters Summary */}
        {(search || roleFilter || statusFilter) && (
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-700">
            <span>
              Filters applied • Found <strong className="text-gray-800 dark:text-gray-200">{pagination.total}</strong> accounts
            </span>
            <button
              onClick={() => {
                setSearch('');
                setRoleFilter('');
                setStatusFilter('');
                setPage(1);
              }}
              className="text-purple-600 hover:text-purple-700 dark:text-purple-400 font-semibold underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        {loading ? (
          <div className="p-12">
            <LoadingState message="Loading user directory..." />
          </div>
        ) : error ? (
          <div className="p-8">
            <ErrorState message={error} onRetry={fetchUsers} />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No users found"
              description="No user accounts match the current filter or search criteria."
              action={{
                label: 'Add First User',
                onClick: openAddModal
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/60 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Assigned Branch</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Assigned Leads</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {users.map((u) => {
                  const isCurrentSuper = u._id === currentUser?._id;
                  const isSuperAdminRole = u.role === 'superadmin';

                  return (
                    <tr
                      key={u._id}
                      className="hover:bg-gray-50/70 dark:hover:bg-gray-750/50 transition-colors"
                    >
                      {/* User Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-sm shrink-0">
                            {u.name?.slice(0, 2).toUpperCase() || 'DL'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-gray-100">
                              {u.name}
                              {isCurrentSuper && (
                                <span className="text-[10px] bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold">
                                  YOU
                                </span>
                              )}
                              {u.mustChangePassword && (
                                <span
                                  className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5"
                                  title="Must reset password upon login"
                                >
                                  <Lock className="w-2.5 h-2.5" /> PW Reset Pending
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {u.email}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2 mt-0.5">
                              <span>ID: <strong>{u.employeeId || 'N/A'}</strong></span>
                              {u.phone && <span>• {u.phone}</span>}
                              {u.position && <span>• {u.position}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        {renderRoleBadge(u.role)}
                      </td>

                      {/* Branch */}
                      <td className="px-6 py-4">
                        {isSuperAdminRole ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            <Building2 className="w-3.5 h-3.5" />
                            All Branches (Global)
                          </span>
                        ) : u.branchId ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                              <Building2 className="w-3.5 h-3.5 text-gray-400" />
                              {u.branchId.name || u.branchId.code}
                            </span>
                            {u.branchId.code && (
                              <span className="text-[11px] text-gray-400">
                                ({u.branchId.code})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            u.status === 'active'
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                          }`}
                        >
                          {u.status === 'active' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-500" />
                          )}
                          {u.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Assigned Leads */}
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {u.assignedLeadsCount || 0}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">leads</span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit User */}
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                            title="Edit Role & Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => openPasswordModal(u)}
                            className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                            title="Reset Password"
                          >
                            <Key className="w-4 h-4" />
                          </button>

                          {/* Toggle Status */}
                          <button
                            onClick={() => openStatusConfirmModal(u)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.status === 'active'
                                ? 'text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30'
                                : 'text-gray-500 dark:text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                            }`}
                            title={u.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && pagination.total > limit && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            <Pagination
              currentPage={page}
              totalPages={pagination.pages}
              totalItems={pagination.total}
              itemsPerPage={limit}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* ADD USER MODAL                                            */}
      {/* ========================================================= */}
      {addUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                  <Plus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    Create User Account
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Provision credentials with verified role & branch permissions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAddUserModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm ${
                    formErrors.name ? 'border-red-400 bg-red-50 dark:bg-red-950/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                  } text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                />
                {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
              </div>

              {/* Email & Staff ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@driveline.com"
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm ${
                      formErrors.email ? 'border-red-400 bg-red-50 dark:bg-red-950/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                    } text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                  {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Staff ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    placeholder="e.g. DL-108"
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm ${
                      formErrors.employeeId ? 'border-red-400 bg-red-50 dark:bg-red-950/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                    } text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                  {formErrors.employeeId && <p className="text-xs text-red-500 mt-1">{formErrors.employeeId}</p>}
                </div>
              </div>

              {/* Phone & Position */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Position / Title
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="e.g. Lead Technician"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Role & Branch Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Permission Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  >
                    <option value="employee">Employee</option>
                    <option value="hr">HR</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">👑 Super Admin (Full Cluster Access)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Assigned Branch {['hr', 'employee'].includes(formData.role) && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm ${
                      formErrors.branchId ? 'border-red-400 bg-red-50 dark:bg-red-950/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                    } text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  >
                    <option value="">
                      {['superadmin', 'admin'].includes(formData.role)
                        ? '— Global (All Branches) —'
                        : '— Select Assigned Branch —'}
                    </option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                  {formErrors.branchId && <p className="text-xs text-red-500 mt-1">{formErrors.branchId}</p>}
                </div>
              </div>

              {/* Initial Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Initial Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className={`w-full px-3.5 py-2 pr-10 rounded-xl border text-sm ${
                      formErrors.password ? 'border-red-400 bg-red-50 dark:bg-red-950/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                    } text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.password && <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>}
                <p className="text-[11px] text-gray-400 mt-1">
                  User will be prompted to change their password on first sign-in.
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Initial Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
                >
                  <option value="active">Active (Permit Login)</option>
                  <option value="inactive">Inactive (Suspended)</option>
                </select>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setAddUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-60"
                >
                  {formSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EDIT USER MODAL                                           */}
      {/* ========================================================= */}
      {editUserModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                  <Edit2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    Edit User & Privileges
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Modify profile, role permission, or branch reassignment
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditUserModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm ${
                    formErrors.name ? 'border-red-400 bg-red-50' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                  } text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                />
                {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
              </div>

              {/* Email (Readonly) & Staff ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Email Address (Account ID)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={formData.email}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Staff ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm ${
                      formErrors.employeeId ? 'border-red-400 bg-red-50' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                    } text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                  {formErrors.employeeId && <p className="text-xs text-red-500 mt-1">{formErrors.employeeId}</p>}
                </div>
              </div>

              {/* Phone & Position */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              {/* Role & Branch Elevation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Role & Privilege Level
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  >
                    <option value="employee">Employee</option>
                    <option value="hr">HR</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">👑 Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Assigned Branch {['hr', 'employee'].includes(formData.role) && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm ${
                      formErrors.branchId ? 'border-red-400 bg-red-50' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                    } text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  >
                    <option value="">
                      {['superadmin', 'admin'].includes(formData.role)
                        ? '— Global (All Branches) —'
                        : '— Select Assigned Branch —'}
                    </option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                  {formErrors.branchId && <p className="text-xs text-red-500 mt-1">{formErrors.branchId}</p>}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Account Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Self warning */}
              {selectedUser._id === currentUser?._id && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    You are editing your own Super Admin account. Demoting or deactivating your own account requires another active Super Admin in the system.
                  </span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setEditUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-60"
                >
                  {formSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PASSWORD RESET MODAL                                      */}
      {/* ========================================================= */}
      {passwordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                  <Key className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    Reset Account Password
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Set a new password for {selectedUser.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPasswordModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordResetSubmit} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300">
                <p><strong>Account:</strong> {selectedUser.name} ({selectedUser.email})</p>
                <p><strong>Staff ID:</strong> {selectedUser.employeeId || 'N/A'}</p>
                <p><strong>Role:</strong> {selectedUser.role?.toUpperCase()}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  The password will be securely hashed with bcrypt. The user will be required to change it on their next login.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-60"
                >
                  {passwordSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STATUS TOGGLE CONFIRM MODAL                                */}
      {/* ========================================================= */}
      {statusConfirmModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
              <span
                className={`p-2.5 rounded-xl ${
                  selectedUser.status === 'active'
                    ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                    : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {selectedUser.status === 'active' ? (
                  <UserX className="w-5 h-5" />
                ) : (
                  <UserCheck className="w-5 h-5" />
                )}
              </span>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {selectedUser.status === 'active' ? 'Deactivate Account?' : 'Activate Account?'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedUser.name} ({selectedUser.email})
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {selectedUser.status === 'active' ? (
                  <>
                    Are you sure you want to deactivate this account? The user will immediately be blocked from logging into the CRM across all branches.
                  </>
                ) : (
                  <>
                    Are you sure you want to activate this account? The user will be permitted to log in with their credentials.
                  </>
                )}
              </p>

              {selectedUser.role === 'superadmin' && selectedUser.status === 'active' && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <span>
                    <strong>Warning:</strong> Deactivating a Super Admin is protected. If this is the only active Super Admin account, the system will reject deactivation.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
              <button
                type="button"
                onClick={() => setStatusConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleStatusConfirm}
                className={`px-5 py-2 rounded-xl text-white text-sm font-semibold shadow-sm transition-colors ${
                  selectedUser.status === 'active'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Confirm {selectedUser.status === 'active' ? 'Deactivation' : 'Activation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
