import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfileApi } from '../services/authApi';
import { RoleBadge, UserStatusBadge } from '../components/common/Badges';
import { formatDateTime, formatDate, getInitials } from '../utils/formatters';
import { User, Lock, Save, Loader2, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

const FIELD_CLASS =
  'block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors placeholder-gray-400 dark:placeholder-gray-500';
const LABEL_CLASS = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function Profile() {
  const { user, updateUser } = useAuth();

  // Profile Form state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await updateProfileApi({ name: name.trim(), phone: phone.trim() });
      updateUser(res.data.data);
      toast.success('Profile details updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setSavingPassword(true);
    try {
      await updateProfileApi({ currentPassword, newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">My Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Manage your personal account settings and security credentials
        </p>
      </div>

      {/* Account Overview Header Card */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center flex-shrink-0 shadow-md">
              {getInitials(user?.name)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{user?.name}</h2>
                <RoleBadge role={user?.role} />
                <UserStatusBadge status={user?.status} />
              </div>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-sm">
          <div>
            <span className="text-gray-500 text-xs block mb-0.5">Employee ID</span>
            <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
              {user?.employeeId}
            </span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block mb-0.5">Member Since</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {formatDate(user?.createdAt)}
            </span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block mb-0.5">Last Login</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {formatDateTime(user?.lastLogin)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details Form */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700/50 pb-3">
            <User className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Personal Information
            </h3>
          </div>

          <form onSubmit={handleUpdateInfo} className="space-y-4">
            <div>
              <label className={LABEL_CLASS}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Email Address (Read-only)</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 text-sm px-4 py-2.5 cursor-not-allowed"
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className={FIELD_CLASS}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Personal Details
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700/50 pb-3">
            <Lock className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Security & Password
            </h3>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className={LABEL_CLASS}>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className={FIELD_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className={FIELD_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className={FIELD_CLASS}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50 transition-colors"
              >
                {savingPassword ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
