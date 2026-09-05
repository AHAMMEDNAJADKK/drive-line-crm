import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  UserRound,
  RefreshCw
} from 'lucide-react';

import {
  getSuppliers,
  createSupplier,
  updateSupplier
} from '../services/supplierApi';
import { useAuth } from '../context/AuthContext';

const SUPPLIER_TYPES = [
  'Manufacturer',
  'Distributor',
  'Wholesaler',
  'Local Supplier',
  'Importer',
  'Other'
];

const EMPTY_FORM = {
  name: '',
  contactPerson: '',
  phone: '',
  alternatePhone: '',
  email: '',
  companyName: '',
  shopWarehouseName: '',
  trnNumber: '',
  country: '',
  city: '',
  address: '',
  supplierType: 'Other',
  vehicleSpecialization: '',
  status: 'active',
  notes: ''
};

const Suppliers = () => {
  const { user } = useAuth();
  const canManageSuppliers = ['admin', 'hr'].includes(user?.role);
  const [suppliers, setSuppliers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    pages: 1
  });

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [supplierType, setSupplierType] = useState('');
  const [country, setCountry] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [editingSupplier, setEditingSupplier] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const loadSuppliers = async (page = pagination.page) => {
    try {
      setLoading(true);
      setError('');

      const result = await getSuppliers({
        page,
        limit: pagination.limit,
        search,
        status,
        supplierType,
        country
      });

      setSuppliers(Array.isArray(result.data) ? result.data : []);

      setPagination((prev) => ({
        ...prev,
        ...(result.pagination || {}),
        page: result.pagination?.page || page
      }));
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      setError(err.message || 'Failed to load suppliers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    loadSuppliers(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setSupplierType('');
    setCountry('');

    setTimeout(() => {
      loadSuppliers(1);
    }, 0);
  };

  const openCreateModal = () => {
    setEditingSupplier(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (supplier) => {
    setEditingSupplier(supplier);

    setForm({
      name: supplier.name || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      alternatePhone: supplier.alternatePhone || '',
      email: supplier.email || '',
      companyName: supplier.companyName || '',
      shopWarehouseName: supplier.shopWarehouseName || '',
      trnNumber: supplier.trnNumber || '',
      country: supplier.country || '',
      city: supplier.city || '',
      address: supplier.address || '',
      supplierType: supplier.supplierType || 'Other',
      vehicleSpecialization: supplier.vehicleSpecialization || '',
      status: supplier.status || 'active',
      notes: supplier.notes || ''
    });

    setError('');
    setShowModal(true);
  };

  const openViewModal = (supplier) => {
    setSelectedSupplier(supplier);
    setShowViewModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingSupplier(null);
    setForm(EMPTY_FORM);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError('Supplier name is required.');
      return;
    }

    if (!form.phone.trim()) {
      setError('Phone number is required.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      if (editingSupplier?._id) {
        await updateSupplier(editingSupplier._id, form);
      } else {
        await createSupplier(form);
      }

      closeModal();
      await loadSuppliers(editingSupplier ? pagination.page : 1);
    } catch (err) {
      console.error('Failed to save supplier:', err);
      setError(err.message || 'Failed to save supplier.');
    } finally {
      setSaving(false);
    }
  };

  const goToPage = (page) => {
    if (
      page < 1 ||
      page > (pagination.pages || 1) ||
      page === pagination.page
    ) {
      return;
    }

    loadSuppliers(page);
  };

  const getInitials = (name = '') => {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-900 dark:text-gray-100 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Suppliers
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage your suppliers and supplier information.
            </p>
          </div>

          {canManageSuppliers && <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            <Plus size={18} />
            Add Supplier
          </button>}
        </div>

        {/* Filters */}
        <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700/50 dark:bg-gray-800">
          <form
            onSubmit={handleSearch}
            className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5"
          >
            <div className="relative lg:col-span-2">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search suppliers..."
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
            </div>

            <select
              value={supplierType}
              onChange={(e) => setSupplierType(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <option value="">All Types</option>

              {SUPPLIER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <div className="flex gap-2">
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
                className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
              />

              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Search
              </button>
            </div>
          </form>

          {(search || status || supplierType || country) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <RefreshCw size={15} />
              Reset filters
            </button>
          )}
        </div>

        {/* Error */}
        {error && !showModal && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700/50 dark:bg-gray-800 md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/30">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Supplier
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Contact
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Type
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Location
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {loading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-5 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      Loading suppliers...
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-5 py-12 text-center"
                    >
                      <Building2
                        size={36}
                        className="mx-auto mb-3 text-gray-300 dark:text-gray-600"
                      />

                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        No suppliers found
                      </p>

                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Add your first supplier to get started.
                      </p>
                    </td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr
                      key={supplier._id}
                      className="transition hover:bg-gray-50 dark:hover:bg-gray-700/20"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                            {getInitials(supplier.name)}
                          </div>

                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {supplier.name}
                            </p>

                            {supplier.companyName && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {supplier.companyName}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {supplier.contactPerson || '-'}
                          </p>

                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {supplier.phone}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {supplier.supplierType || 'Other'}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {supplier.vehicleSpecialization || '—'}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {supplier.city || '-'}
                        </p>

                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {supplier.country || ''}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            supplier.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {supplier.status === 'active'
                            ? 'Active'
                            : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {canManageSuppliers && <button
                            type="button"
                            onClick={() => openViewModal(supplier)}
                            title="View supplier"
                            className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            <Eye size={17} />
                          </button>}

                          {canManageSuppliers && <button
                            type="button"
                            onClick={() => openEditModal(supplier)}
                            title="Edit supplier"
                            className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            <Pencil size={17} />
                          </button>}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="space-y-3 md:hidden">
          {loading ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700/50 dark:bg-gray-800 dark:text-gray-400">
              Loading suppliers...
            </div>
          ) : suppliers.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700/50 dark:bg-gray-800">
              <Building2
                size={36}
                className="mx-auto mb-3 text-gray-300 dark:text-gray-600"
              />

              <p className="font-medium text-gray-700 dark:text-gray-200">
                No suppliers found
              </p>
            </div>
          ) : (
            suppliers.map((supplier) => (
              <div
                key={supplier._id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700/50 dark:bg-gray-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                      {getInitials(supplier.name)}
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-gray-900 dark:text-gray-100">
                        {supplier.name}
                      </h3>

                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {supplier.companyName || supplier.supplierType}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      supplier.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {supplier.status === 'active'
                      ? 'Active'
                      : 'Inactive'}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="text-gray-600 dark:text-gray-300">
                    Vehicle: <span className="font-medium text-gray-900 dark:text-gray-100">{supplier.vehicleSpecialization || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Phone size={15} />
                    {supplier.phone}
                  </div>

                  {supplier.email && (
                    <div className="flex items-center gap-2 break-all text-gray-600 dark:text-gray-300">
                      <Mail size={15} />
                      {supplier.email}
                    </div>
                  )}

                  {(supplier.city || supplier.country) && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <MapPin size={15} />
                      {[supplier.city, supplier.country]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-700/50">
                  <button
                    type="button"
                    onClick={() => openViewModal(supplier)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <Eye size={16} />
                    View
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(supplier)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                  >
                    <Pencil size={16} />
                    Edit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700/50 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing{' '}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {suppliers.length}
            </span>{' '}
            of{' '}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {pagination.total || suppliers.length}
            </span>{' '}
            suppliers
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1 || loading}
              onClick={() => goToPage(pagination.page - 1)}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="min-w-[90px] text-center text-sm text-gray-600 dark:text-gray-300">
              Page {pagination.page || 1} of {pagination.pages || 1}
            </span>

            <button
              type="button"
              disabled={
                pagination.page >= (pagination.pages || 1) ||
                loading
              }
              onClick={() => goToPage(pagination.page + 1)}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/40 p-3 backdrop-blur-[2px] sm:p-5">
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:max-h-[calc(100dvh-2.5rem)]">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {editingSupplier
                    ? 'Edit Supplier'
                    : 'Add Supplier'}
                </h2>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Enter the supplier information below.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="min-h-0 overflow-y-auto p-5 sm:p-6"
            >
              {error && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  label="Supplier Name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter supplier name"
                />

                <FormField
                  label="Contact Person"
                  name="contactPerson"
                  value={form.contactPerson}
                  onChange={handleChange}
                  placeholder="Contact person"
                />

                <FormField
                  label="Phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  placeholder="Phone number"
                />

                <FormField
                  label="Alternate Phone"
                  name="alternatePhone"
                  value={form.alternatePhone}
                  onChange={handleChange}
                  placeholder="Alternate phone"
                />

                <FormField
                  label="Email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email address"
                />

                <FormField
                  label="Company Name"
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  placeholder="Company name"
                />

                <FormField
                  label="Shop / Warehouse"
                  name="shopWarehouseName"
                  value={form.shopWarehouseName}
                  onChange={handleChange}
                  placeholder="Shop or warehouse name"
                />

                <FormField
                  label="TRN / Tax Number"
                  name="trnNumber"
                  value={form.trnNumber}
                  onChange={handleChange}
                  placeholder="TRN or tax number"
                />

                <FormField
                  label="Country"
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  placeholder="Country"
                />

                <FormField
                  label="City"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="City"
                />

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Supplier Type
                  </label>

                  <select
                    name="supplierType"
                    value={form.supplierType}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  >
                    {SUPPLIER_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Vehicle Specialization
                  </label>
                  <select
                    name="vehicleSpecialization"
                    value={form.vehicleSpecialization}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  >
                    <option value="">Not specified</option>
                    <option value="German">German</option>
                    <option value="Korean">Korean</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Address
                  </label>

                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Full supplier address"
                    className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Notes
                  </label>

                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Additional notes"
                    className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-200 pt-4 dark:border-gray-700 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? 'Saving...'
                    : editingSupplier
                      ? 'Update Supplier'
                      : 'Create Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/40 p-3 backdrop-blur-[2px] sm:p-5">
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:max-h-[calc(100dvh-2.5rem)]">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Supplier Details
                </h2>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  View complete supplier information.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
              <div className="mb-6 flex flex-col gap-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800 sm:flex-row sm:items-center">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                  {getInitials(selectedSupplier.name)}
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedSupplier.name}
                  </h3>

                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedSupplier.companyName ||
                      selectedSupplier.supplierType ||
                      'Supplier'}
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                    selectedSupplier.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {selectedSupplier.status === 'active'
                    ? 'Active'
                    : 'Inactive'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailItem
                  icon={<UserRound size={17} />}
                  label="Contact Person"
                  value={selectedSupplier.contactPerson}
                />

                <DetailItem
                  icon={<Phone size={17} />}
                  label="Phone"
                  value={selectedSupplier.phone}
                />

                <DetailItem
                  icon={<Phone size={17} />}
                  label="Alternate Phone"
                  value={selectedSupplier.alternatePhone}
                />

                <DetailItem
                  icon={<Mail size={17} />}
                  label="Email"
                  value={selectedSupplier.email}
                />

                <DetailItem
                  icon={<Building2 size={17} />}
                  label="Company"
                  value={selectedSupplier.companyName}
                />

                <DetailItem
                  icon={<Building2 size={17} />}
                  label="Shop / Warehouse"
                  value={selectedSupplier.shopWarehouseName}
                />

                <DetailItem
                  label="TRN / Tax Number"
                  value={selectedSupplier.trnNumber}
                />

                <DetailItem
                  label="Supplier Type"
                  value={selectedSupplier.supplierType}
                />

                <DetailItem
                  icon={<MapPin size={17} />}
                  label="Country"
                  value={selectedSupplier.country}
                />

                <DetailItem
                  icon={<MapPin size={17} />}
                  label="City"
                  value={selectedSupplier.city}
                />

                <div className="sm:col-span-2">
                  <DetailItem
                    icon={<MapPin size={17} />}
                    label="Address"
                    value={selectedSupplier.address}
                  />
                </div>

                <div className="sm:col-span-2">
                  <DetailItem
                    label="Notes"
                    value={selectedSupplier.notes}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end border-t border-gray-200 pt-4 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowViewModal(false);
                    openEditModal(selectedSupplier);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  <Pencil size={16} />
                  Edit Supplier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FormField = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder = ''
}) => {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
      />
    </div>
  );
};

const DetailItem = ({ icon, label, value }) => {
  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {icon}
        {label}
      </div>

      <p className="break-words text-sm text-gray-800 dark:text-gray-200">
        {value || '-'}
      </p>
    </div>
  );
};

export default Suppliers;