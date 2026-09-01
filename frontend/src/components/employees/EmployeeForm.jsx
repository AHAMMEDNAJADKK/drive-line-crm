import { useState } from 'react';
import { EMPLOYEE_ROLES } from '../../utils/constants';
import { Loader2 } from 'lucide-react';

const FIELD_CLASS =
  'block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors placeholder-gray-400 dark:placeholder-gray-500';
const LABEL_CLASS = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function EmployeeForm({ initialData = {}, onSubmit, onCancel, loading = false, isEdit = false }) {
  const [form, setForm] = useState({
    name: initialData.name || '',
    email: initialData.email || '',
    employeeId: initialData.employeeId || '',
    phone: initialData.phone || '',
    role: initialData.role || 'employee',
    status: initialData.status || 'active',
    password: '',
  });

  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (!form.employeeId.trim()) errs.employeeId = 'Employee ID is required';
    if (!isEdit && (!form.password || form.password.length < 6)) {
      errs.password = 'Password must be at least 6 characters long';
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={LABEL_CLASS}>
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={set('name')}
          placeholder="e.g. Rahul Sharma"
          className={`${FIELD_CLASS} ${errors.name ? 'border-red-400' : ''}`}
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLASS}>
            Employee ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.employeeId}
            onChange={set('employeeId')}
            placeholder="e.g. DL-101"
            className={`${FIELD_CLASS} ${errors.employeeId ? 'border-red-400' : ''}`}
          />
          {errors.employeeId && <p className="mt-1 text-xs text-red-500">{errors.employeeId}</p>}
        </div>

        <div>
          <label className={LABEL_CLASS}>Phone Number</label>
          <input
            type="text"
            value={form.phone}
            onChange={set('phone')}
            placeholder="e.g. 9876543210"
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS}>
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={form.email}
          onChange={set('email')}
          placeholder="rahul@driveline.com"
          className={`${FIELD_CLASS} ${errors.email ? 'border-red-400' : ''}`}
        />
        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
      </div>

      {!isEdit && (
        <div>
          <label className={LABEL_CLASS}>
            Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            placeholder="Min 6 characters"
            className={`${FIELD_CLASS} ${errors.password ? 'border-red-400' : ''}`}
          />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLASS}>Role</label>
          <select value={form.role} onChange={set('role')} className={FIELD_CLASS}>
            {EMPLOYEE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL_CLASS}>Status</label>
          <select value={form.status} onChange={set('status')} className={FIELD_CLASS}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/50">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEdit ? 'Save Changes' : 'Create Employee'}
        </button>
      </div>
    </form>
  );
}
