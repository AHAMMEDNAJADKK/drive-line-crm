import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Eye,
  Users,
  Phone,
  Mail,
  MapPin,
  Loader2
} from 'lucide-react';
import {
  getBranchesApi,
  getBranchApi,
  createBranchApi,
  updateBranchApi,
  toggleBranchStatusApi,
  assignBranchUserApi
} from '../services/branchApi';
import { getActiveEmployeesListApi } from '../services/employeeApi';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import toast from 'react-hot-toast';

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    status: 'active'
  });

  // Details Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Status toggle confirmation
  const [confirmStatusModal, setConfirmStatusModal] = useState({
    open: false,
    branch: null,
    newStatus: ''
  });
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Manage Users Modal
  const [manageUsersModal, setManageUsersModal] = useState({
    open: false,
    branch: null
  });
  const [allStaff, setAllStaff] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assigningUser, setAssigningUser] = useState(false);

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getBranchesApi({
        search: search || undefined,
        status: statusFilter || undefined,
        all: true
      });
      setBranches(res.data?.data || res.data?.branches || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load branches.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Handle open Add modal
  const handleOpenAdd = () => {
    setEditingBranch(null);
    setFormData({
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      status: 'active'
    });
    setFormModalOpen(true);
  };

  // Handle open Edit modal
  const handleOpenEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name || '',
      code: branch.code || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      status: branch.status || 'active'
    });
    setFormModalOpen(true);
  };

  // Submit Add / Edit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const cleanName = formData.name.trim();
    const cleanCode = formData.code.trim().toUpperCase();
    const cleanAddress = formData.address.trim();
    const cleanPhone = formData.phone.trim();
    const cleanEmail = formData.email.trim().toLowerCase();

    if (!cleanName || !cleanCode) {
      toast.error('Branch name and branch code are required');
      return;
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    const payload = {
      name: cleanName,
      code: cleanCode,
      address: cleanAddress,
      phone: cleanPhone,
      email: cleanEmail,
      status: formData.status
    };

    setFormSubmitting(true);
    try {
      if (editingBranch) {
        await updateBranchApi(editingBranch._id, payload);
        toast.success('Branch updated successfully');
      } else {
        await createBranchApi(payload);
        toast.success('Branch created successfully');
      }
      setFormModalOpen(false);
      fetchBranches();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  // View details
  const handleViewDetails = async (branchId) => {
    setDetailsLoading(true);
    setDetailsModalOpen(true);
    try {
      const res = await getBranchApi(branchId);
      setSelectedBranch(res.data?.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load branch details');
      setDetailsModalOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Confirm status toggle
  const handleToggleStatusClick = (branch) => {
    const nextStatus = branch.status === 'active' ? 'inactive' : 'active';
    setConfirmStatusModal({
      open: true,
      branch,
      newStatus: nextStatus
    });
  };

  const executeStatusToggle = async () => {
    if (!confirmStatusModal.branch) return;
    setStatusUpdating(true);
    try {
      await toggleBranchStatusApi(
        confirmStatusModal.branch._id,
        confirmStatusModal.newStatus
      );
      toast.success(
        `Branch ${confirmStatusModal.newStatus === 'active' ? 'activated' : 'deactivated'} successfully`
      );
      setConfirmStatusModal({ open: false, branch: null, newStatus: '' });
      fetchBranches();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update branch status');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Manage users / assign staff
  const handleOpenManageUsers = async (branch) => {
    setManageUsersModal({ open: true, branch });
    setSelectedUserId('');
    try {
      const res = await getActiveEmployeesListApi();
      setAllStaff(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignUser = async () => {
    if (!selectedUserId || !manageUsersModal.branch) {
      toast.error('Please select a user to assign');
      return;
    }
    setAssigningUser(true);
    try {
      await assignBranchUserApi(manageUsersModal.branch._id, {
        userId: selectedUserId
      });
      toast.success('User assigned to branch successfully');
      setSelectedUserId('');
      setManageUsersModal({ open: false, branch: null });
      fetchBranches();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    } finally {
      setAssigningUser(false);
    }
  };

  // Computed summary
  const totalBranchesCount = branches.length;
  const activeBranchesCount = branches.filter((b) => b.status === 'active').length;
  const totalStaffCount = branches.reduce(
    (sum, b) => sum + (b.hrCount || 0) + (b.employeeCount || 0),
    0
  );
  const totalLeadsCount = branches.reduce((sum, b) => sum + (b.leadCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Branch Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configure branches, assign staff, and monitor branch-level performance.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-sm transition-colors w-fit"
        >
          <Plus className="w-4 h-4" />
          Add Branch
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Total Branches
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {totalBranchesCount}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Active Branches
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {activeBranchesCount}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Assigned Staff
          </p>
          <p className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {totalStaffCount}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Branch Leads
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {totalLeadsCount}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search branches by name, code, address..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Branch Table */}
      {loading ? (
        <LoadingState message="Loading branches..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchBranches} />
      ) : branches.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No branches found"
          message={
            search || statusFilter
              ? 'No branches match your current search or filter.'
              : 'Get started by creating your first branch.'
          }
          actionLabel="Add Branch"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/80 dark:bg-gray-700/30 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Branch</th>
                  <th className="py-3.5 px-4">Code</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4 text-center">HR</th>
                  <th className="py-3.5 px-4 text-center">Employees</th>
                  <th className="py-3.5 px-4 text-center">Leads</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
                {branches.map((branch) => (
                  <tr
                    key={branch._id}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-700/20 transition-colors"
                  >
                    {/* Name & Phone */}
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {branch.name}
                        </p>
                        {branch.phone && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {branch.phone}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Code */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-mono font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        {branch.code}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300 max-w-[200px] truncate">
                      {branch.address || <span className="text-gray-400 italic">No address</span>}
                    </td>

                    {/* HR Count */}
                    <td className="py-3.5 px-4 text-center font-medium text-gray-800 dark:text-gray-200">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                        {branch.hrCount || 0}
                      </span>
                    </td>

                    {/* Employee Count */}
                    <td className="py-3.5 px-4 text-center font-medium text-gray-800 dark:text-gray-200">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                        {branch.employeeCount || 0}
                      </span>
                    </td>

                    {/* Leads Count */}
                    <td className="py-3.5 px-4 text-center font-semibold text-gray-900 dark:text-gray-100">
                      {branch.leadCount || 0}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          branch.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
                            : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40'
                        }`}
                      >
                        {branch.status === 'active' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-600" />
                        )}
                        {branch.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleViewDetails(branch._id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenManageUsers(branch)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Assign Staff"
                        >
                          <Users className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(branch)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                          title="Edit Branch"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleStatusClick(branch)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            branch.status === 'active'
                              ? 'text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                              : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                          }`}
                          title={branch.status === 'active' ? 'Deactivate Branch' : 'Activate Branch'}
                        >
                          {branch.status === 'active' ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
          ADD / EDIT MODAL
      ========================================================= */}
      <Modal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={editingBranch ? 'Edit Branch' : 'Add New Branch'}
        size="md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 p-5 sm:p-6">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Branch Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Cochin Hub, Malappuram Main"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Branch Code * (Unique)
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. COCH, MLPM, TVM"
              className="w-full px-3.5 py-2.5 text-sm uppercase font-mono rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Short identifier used for lead references and exports.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Address / Location
            </label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Building, street, city..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 9876543210"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="branch@driveline.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setFormModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm transition-colors disabled:opacity-60"
            >
              {formSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingBranch ? 'Save Changes' : 'Create Branch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
          BRANCH DETAILS MODAL
      ========================================================= */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={selectedBranch ? `${selectedBranch.name} (${selectedBranch.code})` : 'Branch Details'}
        size="lg"
      >
        {detailsLoading || !selectedBranch ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="space-y-6 p-5 sm:p-6">
            {/* Branch Quick Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <p className="text-xs text-gray-400 font-medium">Status</p>
                <p className="text-sm font-semibold capitalize mt-1 text-gray-900 dark:text-gray-100">
                  {selectedBranch.status}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <p className="text-xs text-gray-400 font-medium">Total Staff</p>
                <p className="text-sm font-semibold mt-1 text-gray-900 dark:text-gray-100">
                  {selectedBranch.metrics?.totalStaff || 0}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <p className="text-xs text-gray-400 font-medium">Total Leads</p>
                <p className="text-sm font-semibold mt-1 text-indigo-600 dark:text-indigo-400">
                  {selectedBranch.metrics?.totalLeads || 0}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <p className="text-xs text-gray-400 font-medium">Converted</p>
                <p className="text-sm font-semibold mt-1 text-emerald-600 dark:text-emerald-400">
                  {selectedBranch.metrics?.convertedLeads || 0}
                </p>
              </div>
            </div>

            {/* Contact details */}
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50/50 dark:bg-gray-900/20 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
              {selectedBranch.address && (
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <span>{selectedBranch.address}</span>
                </p>
              )}
              {selectedBranch.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{selectedBranch.phone}</span>
                </p>
              )}
              {selectedBranch.email && (
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{selectedBranch.email}</span>
                </p>
              )}
            </div>

            {/* Assigned Staff List */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Assigned Staff ({selectedBranch.staff?.length || 0})
              </h3>
              {selectedBranch.staff && selectedBranch.staff.length > 0 ? (
                <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-100 dark:border-gray-800">
                  {selectedBranch.staff.map((s) => (
                    <div
                      key={s._id}
                      className="p-3 flex items-center justify-between text-sm hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
                    >
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {s.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {s.employeeId} · {s.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          {s.role}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            s.status === 'active' ? 'bg-emerald-500' : 'bg-red-400'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl">
                  No staff members currently assigned to this branch.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================
          MANAGE USERS / ASSIGN TO BRANCH MODAL
      ========================================================= */}
      <Modal
        isOpen={manageUsersModal.open}
        onClose={() => setManageUsersModal({ open: false, branch: null })}
        title={`Assign Staff to ${manageUsersModal.branch?.name || 'Branch'}`}
        size="md"
      >
        <div className="space-y-4 p-5 sm:p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select an employee or HR to assign or transfer to{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {manageUsersModal.branch?.name}
            </span>
            . Their historical leads will remain safely associated with their original records.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Select Staff Member
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">-- Choose Staff Member --</option>
              {allStaff.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.employeeId}) · {u.role?.toUpperCase()} {u.branch ? `[Current: ${u.branch}]` : '[Unassigned]'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setManageUsersModal({ open: false, branch: null })}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssignUser}
              disabled={assigningUser || !selectedUserId}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm transition-colors disabled:opacity-60"
            >
              {assigningUser && <Loader2 className="w-4 h-4 animate-spin" />}
              Assign to Branch
            </button>
          </div>
        </div>
      </Modal>

      {/* =========================================================
          CONFIRM STATUS CHANGE DIALOG
      ========================================================= */}
      <ConfirmDialog
        isOpen={confirmStatusModal.open}
        onClose={() => setConfirmStatusModal({ open: false, branch: null, newStatus: '' })}
        onConfirm={executeStatusToggle}
        loading={statusUpdating}
        title={`${confirmStatusModal.newStatus === 'active' ? 'Activate' : 'Deactivate'} ${
          confirmStatusModal.branch?.name
        }?`}
        message={
          confirmStatusModal.newStatus === 'inactive'
            ? 'Deactivating this branch will prevent new users or leads from being assigned to it. Historical data will NOT be deleted and will remain accessible to Admin.'
            : 'Activating this branch will allow staff assignment and active lead operations.'
        }
        confirmText={confirmStatusModal.newStatus === 'active' ? 'Activate' : 'Deactivate'}
        variant={confirmStatusModal.newStatus === 'active' ? 'primary' : 'danger'}
      />
    </div>
  );
}
