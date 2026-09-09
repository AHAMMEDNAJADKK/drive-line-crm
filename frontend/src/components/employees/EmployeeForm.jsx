import { useState, useEffect } from 'react';

import { EMPLOYEE_ROLES } from '../../utils/constants';

import {
  getEmployeeVehicleSpecializationsApi,
  createEmployeeVehicleSpecializationApi
} from '../../services/employeeApi';

import { Loader2, Plus, X } from 'lucide-react';

const FIELD_CLASS =
  'block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors placeholder-gray-400 dark:placeholder-gray-500';

const LABEL_CLASS =
  'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

const DEFAULT_VEHICLE_SPECIALIZATIONS = [
  'German',
  'Korean',
  'Japanese'
];

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
    vehicleSpecialization:
      initialData.vehicleSpecialization || '',
    branch: initialData.branch || '',
    position: initialData.position || '',
    garageShop: initialData.garageShop || ''
  });

  const [vehicleSpecializations, setVehicleSpecializations] =
    useState(DEFAULT_VEHICLE_SPECIALIZATIONS);

  const [selectedSpec, setSelectedSpec] = useState(
    initialData.vehicleSpecialization || ''
  );

  const [errors, setErrors] = useState({});

  // Add specialization modal state
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [newSpecName, setNewSpecName] = useState('');
  const [savingSpec, setSavingSpec] = useState(false);
  const [specError, setSpecError] = useState('');

  // Load vehicle specializations from MongoDB
  useEffect(() => {
    let mounted = true;

    const loadVehicleSpecializations = async () => {
      try {
        const response =
          await getEmployeeVehicleSpecializationsApi();

        const data = response?.data?.data;

        if (!mounted || !Array.isArray(data)) {
          return;
        }

        const names = data
          .map((item) =>
            typeof item === 'string'
              ? item
              : item?.name
          )
          .filter(Boolean)
          .map((name) => String(name).trim());

        // Keep default values and merge database values.
        const merged = [
          ...DEFAULT_VEHICLE_SPECIALIZATIONS,
          ...names
        ]
          .filter(
            (name, index, array) =>
              array.findIndex(
                (item) =>
                  item.toLowerCase() === name.toLowerCase()
              ) === index
          )
          .filter(
            (name) => name.toLowerCase() !== 'other'
          );

        setVehicleSpecializations(merged);
      } catch (err) {
        // Keep default options if API is temporarily unavailable.
        console.error(
          'Failed to load vehicle specializations:',
          err
        );
      }
    };

    loadVehicleSpecializations();

    return () => {
      mounted = false;
    };
  }, []);

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

  // Select an existing specialization.
  const handleSpecializationChange = (e) => {
    const value = e.target.value;

    setSelectedSpec(value);

    setForm((prev) => ({
      ...prev,
      vehicleSpecialization: value
    }));

    setErrors((prev) => ({
      ...prev,
      vehicleSpecialization: ''
    }));
  };

  const removeVehicleSpecialization = () => {
    setSelectedSpec('');

    setForm((prev) => ({
      ...prev,
      vehicleSpecialization: ''
    }));
  };

  const handleCreateSpecialization = async (e) => {
    e.preventDefault();

    const cleanName = newSpecName.trim();

    if (!cleanName) {
      setSpecError(
        'Specialization name is required'
      );
      return;
    }

    // Prevent duplicate values in the current dropdown.
    const alreadyExists =
      vehicleSpecializations.some(
        (spec) =>
          spec.toLowerCase() ===
          cleanName.toLowerCase()
      );

    if (alreadyExists) {
      setSpecError(
        'This vehicle specialization already exists'
      );
      return;
    }

    setSavingSpec(true);
    setSpecError('');

    try {
      const response =
        await createEmployeeVehicleSpecializationApi(
          cleanName
        );

      const created = response?.data?.data;

      const createdName =
        typeof created === 'string'
          ? created
          : created?.name || cleanName;

      // Add it immediately to the dropdown.
      setVehicleSpecializations((prev) => {
        const exists = prev.some(
          (spec) =>
            spec.toLowerCase() ===
            createdName.toLowerCase()
        );

        if (exists) {
          return prev;
        }

        return [...prev, createdName];
      });

      // Automatically select the new specialization.
      setSelectedSpec(createdName);

      setForm((prev) => ({
        ...prev,
        vehicleSpecialization: createdName
      }));

      setNewSpecName('');
      setShowSpecModal(false);
      setSpecError('');
    } catch (err) {
      setSpecError(
        err.response?.data?.message ||
          'Failed to add vehicle specialization'
      );
    } finally {
      setSavingSpec(false);
    }
  };

  const closeSpecModal = () => {
    if (savingSpec) return;

    setShowSpecModal(false);
    setNewSpecName('');
    setSpecError('');
  };

  const validate = () => {
    const errs = {};

    if (!form.name.trim()) {
      errs.name = 'Name is required';
    }

    if (!form.email.trim()) {
      errs.email = 'Email is required';
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim()
      )
    ) {
      errs.email =
        'Enter a valid email address';
    }

    if (!form.employeeId.trim()) {
      errs.employeeId =
        'Staff ID is required';
    }

    if (
      !isEdit &&
      (!form.password ||
        form.password.length < 6)
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
      passportNumber:
        form.passportNumber.trim(),
      passportExpireDate:
        form.passportExpireDate || null,
      vehicleSpecialization:
        form.vehicleSpecialization || '',
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
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-6 p-5 sm:p-6"
      >
        {/* Basic Information */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Basic Information
          </h3>

          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className={LABEL_CLASS}>
                Full Name{' '}
                <span className="text-red-500">
                  *
                </span>
              </label>

              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. Rahul Sharma"
                className={`${FIELD_CLASS} ${
                  errors.name
                    ? 'border-red-400'
                    : ''
                }`}
              />

              {errors.name && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Staff ID + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLASS}>
                  Staff ID{' '}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <input
                  type="text"
                  value={form.employeeId}
                  onChange={set('employeeId')}
                  placeholder="e.g. DL-101"
                  className={`${FIELD_CLASS} ${
                    errors.employeeId
                      ? 'border-red-400'
                      : ''
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

            {/* Email */}
            <div>
              <label className={LABEL_CLASS}>
                Email Address{' '}
                <span className="text-red-500">
                  *
                </span>
              </label>

              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="rahul@driveline.com"
                className={`${FIELD_CLASS} ${
                  errors.email
                    ? 'border-red-400'
                    : ''
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
            {/* Role */}
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
                  <option
                    key={role}
                    value={role}
                  >
                    {roleLabels[role] || role}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className={LABEL_CLASS}>
                Status
              </label>

              <select
                value={form.status}
                onChange={set('status')}
                className={FIELD_CLASS}
              >
                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>
              </select>
            </div>

            {/* Position */}
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

            {/* Branch */}
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

            {/* Garage / Shop */}
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
            {/* ID Details */}
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

            {/* Passport Number */}
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

            {/* Passport Expiry */}
            <div>
              <label className={LABEL_CLASS}>
                Passport Expiry Date
              </label>

              <input
                type="date"
                value={form.passportExpireDate}
                onChange={set('passportExpireDate')}
                className={FIELD_CLASS}
              />
            </div>

            {/* Vehicle Specialization */}
            <div>
              <label className={LABEL_CLASS}>
                Vehicle Specialization
              </label>

              <div className="flex gap-2">
                <select
                  value={selectedSpec}
                  onChange={
                    handleSpecializationChange
                  }
                  className={`${FIELD_CLASS} flex-1`}
                >
                  <option value="">
                    Select specialization
                  </option>

                  {vehicleSpecializations
                    .filter(
                      (spec) =>
                        spec.toLowerCase() !== 'other'
                    )
                    .map((spec) => (
                      <option
                        key={spec}
                        value={spec}
                      >
                        {spec}
                      </option>
                    ))}
                </select>

                {/* Add new specialization */}
                <button
                  type="button"
                  onClick={() => {
                    setSpecError('');
                    setNewSpecName('');
                    setShowSpecModal(true);
                  }}
                  className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shrink-0"
                  title="Add Specialization"
                  aria-label="Add vehicle specialization"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Selected specialization */}
              {form.vehicleSpecialization && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    <span>
                      {form.vehicleSpecialization}
                    </span>

                    <button
                      type="button"
                      onClick={
                        removeVehicleSpecialization
                      }
                      className="inline-flex items-center justify-center text-indigo-500 hover:text-red-500 dark:text-indigo-400 dark:hover:text-red-400 transition-colors"
                      title="Remove specialization"
                      aria-label="Remove vehicle specialization"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>
              )}
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
              Password{' '}
              <span className="text-red-500">
                *
              </span>
            </label>

            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
              className={`${FIELD_CLASS} ${
                errors.password
                  ? 'border-red-400'
                  : ''
              }`}
            />

            {errors.password && (
              <p className="mt-1 text-xs text-red-500">
                {errors.password}
              </p>
            )}

            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              This password will be used by the staff
              member to sign in to the CRM.
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

      {/* Add Vehicle Specialization Modal */}
      {showSpecModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Add Vehicle Specialization
                </h3>

                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Add a specialization for employees.
                </p>
              </div>

              <button
                type="button"
                onClick={closeSpecModal}
                disabled={savingSpec}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleCreateSpecialization}
              className="p-5 space-y-4"
            >
              <div>
                <label className={LABEL_CLASS}>
                  Specialization Name
                </label>

                <input
                  type="text"
                  value={newSpecName}
                  onChange={(e) => {
                    setNewSpecName(
                      e.target.value
                    );
                    setSpecError('');
                  }}
                  placeholder="e.g. Japan Car"
                  autoFocus
                  disabled={savingSpec}
                  className={`${FIELD_CLASS} ${
                    specError
                      ? 'border-red-400'
                      : ''
                  }`}
                />

                {specError && (
                  <p className="mt-1 text-xs text-red-500">
                    {specError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeSpecModal}
                  disabled={savingSpec}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    savingSpec ||
                    !newSpecName.trim()
                  }
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingSpec && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}

                  {savingSpec
                    ? 'Adding...'
                    : 'Add Specialization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}