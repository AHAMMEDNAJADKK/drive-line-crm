import { useState } from 'react';
import { EMPLOYEE_ROLES } from '../../utils/constants';
import { Loader2 } from 'lucide-react';

const FIELD_CLASS =
  'block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors placeholder-gray-400 dark:placeholder-gray-500';

const LABEL_CLASS =
  'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function EmployeeForm({
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  isEdit = false
}) {
  const [form, setForm] = useState({
    name: initialData.name || '',
    email: initialData.email || '',
    employeeId: initialData.employeeId || '',
    phone: initialData.phone || '',
    role: initialData.role || 'employee',
    status: initialData.status || 'active',
    password: '',

    idDetails: initialData.idDetails || '',
    passportNumber: initialData.passportNumber || '',
    passportExpireDate: initialData.passportExpireDate
      ? String(initialData.passportExpireDate).slice(0, 10)
      : '',
    vehicleSpecialization: initialData.vehicleSpecialization || '',
    branch: initialData.branch || '',
    position: initialData.position || '',
    garageShop: initialData.garageShop || ''
  });

  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: ''
    }));
  };

  const validate = () => {
    const errs = {};

    if (!form.name.trim()) {
      errs.name = 'Name is required';
    }

    if (!form.email.trim()) {
      errs.email = 'Email is required';
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      errs.email = 'Enter a valid email address';
    }

    if (!form.employeeId.trim()) {
      errs.employeeId = 'Staff ID is required';
    }

    if (
      !isEdit &&
      (!form.password || form.password.length < 6)
    ) {
      errs.password =
        'Password must be at least 6 characters long';
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

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      employeeId: form.employeeId.trim(),
      phone: form.phone.trim(),
      role: form.role,
      status: form.status,
      idDetails: form.idDetails.trim(),
      passportNumber: form.passportNumber.trim(),
      passportExpireDate: form.passportExpireDate || null,
      vehicleSpecialization: form.vehicleSpecialization,
      branch: form.branch.trim(),
      position: form.position.trim(),
      garageShop: form.garageShop.trim()
    };

    // Password is only sent when creating a new employee.
    if (!isEdit) {
      payload.password = form.password;
    }

    onSubmit(payload);
  };

  const roleLabels = {
    admin: 'Admin',
    hr: 'HR',
    employee: 'Employee'
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-6">

      {/* Basic Information */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Basic Information
        </h3>

        <div className="space-y-4">
          <div>
            <label className={LABEL_CLASS}>
              Full Name <span className="text-red-500">*</span>
            </label>

            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Rahul Sharma"
              className={`${FIELD_CLASS} ${
                errors.name ? 'border-red-400' : ''
              }`}
            />

            {errors.name && (
              <p className="mt-1 text-xs text-red-500">
                {errors.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div>
              <label className={LABEL_CLASS}>
                Staff ID <span className="text-red-500">*</span>
              </label>

              <input
                type="text"
                value={form.employeeId}
                onChange={set('employeeId')}
                placeholder="e.g. DL-101"
                className={`${FIELD_CLASS} ${
                  errors.employeeId ? 'border-red-400' : ''
                }`}
              />

              {errors.employeeId && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.employeeId}
                </p>
              )}
            </div>

            <div>
              <label className={LABEL_CLASS}>
                Phone Number
              </label>

              <input
                type="tel"
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
              className={`${FIELD_CLASS} ${
                errors.email ? 'border-red-400' : ''
              }`}
            />

            {errors.email && (
              <p className="mt-1 text-xs text-red-500">
                {errors.email}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Employment Information */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Employment Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>
            <label className={LABEL_CLASS}>
              Role
            </label>

            <select
              value={form.role}
              onChange={set('role')}
              className={FIELD_CLASS}
            >
              {EMPLOYEE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS}>
              Status
            </label>

            <select
              value={form.status}
              onChange={set('status')}
              className={FIELD_CLASS}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS}>
              Position
            </label>

            <input
              type="text"
              value={form.position}
              onChange={set('position')}
              placeholder="e.g. Sales Executive"
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>
              Branch
            </label>

            <input
              type="text"
              value={form.branch}
              onChange={set('branch')}
              placeholder="e.g. Malappuram Branch"
              className={FIELD_CLASS}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={LABEL_CLASS}>
              Garage / Shop
            </label>

            <input
              type="text"
              value={form.garageShop}
              onChange={set('garageShop')}
              placeholder="e.g. Drive Line Main Garage"
              className={FIELD_CLASS}
            />
          </div>
        </div>
      </div>

      {/* Identification Information */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Identification Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>
            <label className={LABEL_CLASS}>
              ID Details
            </label>

            <input
              type="text"
              value={form.idDetails}
              onChange={set('idDetails')}
              placeholder="e.g. ID number / identification details"
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>
              Passport Number
            </label>

            <input
              type="text"
              value={form.passportNumber}
              onChange={set('passportNumber')}
              placeholder="e.g. A1234567"
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Passport Expiry Date</label>
            <input type="date" value={form.passportExpireDate} onChange={set('passportExpireDate')} className={FIELD_CLASS} />
          </div>

          <div>
            <label className={LABEL_CLASS}>Vehicle Specialization</label>
            <select value={form.vehicleSpecialization} onChange={set('vehicleSpecialization')} className={FIELD_CLASS}>
              <option value="">Not specified</option>
              <option value="German">German</option>
              <option value="Korean">Korean</option>
              <option value="Japanese">Japanese</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Password */}
      {!isEdit && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Login Credentials
          </h3>

          <label className={LABEL_CLASS}>
            Password <span className="text-red-500">*</span>
          </label>

          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            placeholder="Minimum 6 characters"
            autoComplete="new-password"
            className={`${FIELD_CLASS} ${
              errors.password ? 'border-red-400' : ''
            }`}
          />

          {errors.password && (
            <p className="mt-1 text-xs text-red-500">
              {errors.password}
            </p>
          )}

          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            This password will be used by the staff member to
            sign in to the CRM.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 dark:border-gray-700/50 sm:flex-row sm:justify-end">

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-60"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading && (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}

          {loading
            ? 'Saving...'
            : isEdit
              ? 'Save Employee'
              : 'Add Employee'}
        </button>
      </div>
    </form>
  );
}