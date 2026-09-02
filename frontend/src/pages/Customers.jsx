import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Users,
  RefreshCw,
  X,
  Save,
  Phone,
  Mail,
  Building2,
  MapPin,
  Filter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import Pagination from "../components/common/Pagination";
import {
  getCustomers,
  createCustomer,
  updateCustomer,
} from "../services/customerApi";

const CUSTOMER_TYPES = [
  "Workshop",
  "Mechanic",
  "Retailer",
  "Dealer",
  "Service Center",
  "Fleet",
  "Individual",
  "Other",
];

const EMPTY_FORM = {
  name: "",
  phone: "",
  alternatePhone: "",
  nationality: "",
  email: "",
  shopName: "",
  companyName: "",
  trn: "",
  address: "",
  city: "",
  country: "",
  customerType: "",
  notes: "",
  status: "active",
};

const getCustomerId = (customer) =>
  customer?._id || customer?.id || customer?.customerId;

const getCustomerName = (customer) =>
  customer?.name ||
  customer?.customerName ||
  customer?.fullName ||
  "Unnamed Customer";

const getCustomerPhone = (customer) =>
  customer?.phone ||
  customer?.contactNumber ||
  customer?.mobile ||
  customer?.number ||
  "—";

const getCustomerEmail = (customer) => customer?.email || "—";

const getCustomerCompany = (customer) =>
  customer?.shopName || customer?.companyName || customer?.company || "—";

const getCustomerTrn = (customer) =>
  customer?.trn ||
  customer?.trnNumber ||
  customer?.vatNumber ||
  customer?.taxNumber ||
  "—";

const getCustomerType = (customer) =>
  customer?.customerType || customer?.type || "—";

const getCustomerStatus = (customer) => customer?.status || "active";

const getInitialForm = (customer = null) => {
  if (!customer) {
    return { ...EMPTY_FORM };
  }

  return {
    name: customer?.name || customer?.customerName || "",
    phone: customer?.phone || customer?.contactNumber || customer?.mobile || "",
    alternatePhone: customer?.alternatePhone || customer?.alternateNumber || "",
    nationality: customer?.nationality || "",
    email: customer?.email || "",
    shopName: customer?.shopName || "",
    companyName: customer?.companyName || "",
    trn: customer?.trn || customer?.trnNumber || customer?.vatNumber || "",
    address: customer?.address || "",
    city: customer?.city || "",
    country: customer?.country || "",
    customerType: customer?.customerType || customer?.type || "",
    notes: customer?.notes || "",
    status: customer?.status || "active",
  };
};

export default function Customers() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [status, setStatus] = useState("");
  const [customerType, setCustomerType] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const loadCustomers = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError("");

        const result = await getCustomers({
          page,
          limit,
          search,
          status,
          customerType,
        });

        setCustomers(result.customers);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      } catch (err) {
        console.error("Customer loading error:", err);

        setError(err?.message || "Unable to load customers. Please try again.");

        setCustomers([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, limit, search, status, customerType],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setForm(getInitialForm(customer));
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingCustomer(null);
    setForm({ ...EMPTY_FORM });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Customer name is required.");
      return;
    }

    if (!form.phone.trim()) {
      toast.error("Contact number is required.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        contactNumber: form.phone.trim(),
        alternateNumber: form.alternatePhone.trim(),
        nationality: form.nationality.trim(),
        email: form.email.trim(),
        shopName: form.shopName.trim(),
        companyName: form.companyName.trim(),
        trnNumber: form.trn.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        customerType: form.customerType || "Other",
        notes: form.notes.trim(),
        status: form.status,
      };

      if (editingCustomer) {
        const id = getCustomerId(editingCustomer);

        if (!id) {
          throw new Error("Customer ID is missing.");
        }

        await updateCustomer(id, payload);

        toast.success("Customer updated successfully.");
      } else {
        await createCustomer(payload);

        toast.success("Customer created successfully.");
      }

      closeModal();

      await loadCustomers({ silent: true });
    } catch (err) {
      console.error("Customer save error:", err);

      toast.error(err?.message || "Unable to save customer. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setCustomerType("");
    setPage(1);
  };

  const hasFilters = useMemo(
    () => Boolean(search || status || customerType),
    [search, status, customerType],
  );

  const renderStatus = (customerStatus) => {
    const active = customerStatus === "active";

    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
          active
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
        }`}
      >
        {active ? "Active" : "Inactive"}
      </span>
    );
  };

  const renderCustomerCard = (customer) => {
    const id = getCustomerId(customer);

    return (
      <div
        key={id}
        className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-2xl p-4 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {getCustomerName(customer)}
              </h3>

              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {getCustomerType(customer)}
              </p>
            </div>
          </div>

          {renderStatus(getCustomerStatus(customer))}
        </div>

        <div className="mt-4 space-y-2.5">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Phone className="w-4 h-4 text-gray-400" />
            <span className="truncate">{getCustomerPhone(customer)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="truncate">{getCustomerCompany(customer)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="truncate">{getCustomerEmail(customer)}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
          <button
            type="button"
            onClick={() => navigate(`/customers/${id}`)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <Eye className="w-4 h-4" />
            View
          </button>

          <button
            type="button"
            onClick={() => openEditModal(customer)}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Customers
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage customer and business information.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadCustomers({ silent: true })}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            title="Refresh customers"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Search / Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search name, phone, shop, company or TRN..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />

            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={customerType}
              onChange={(event) => {
                setCustomerType(event.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Types</option>

              {CUSTOMER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <Filter className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Unable to load customers
              </p>

              <p className="text-sm text-red-600 dark:text-red-400/80 mt-1">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadCustomers()}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/50 text-sm text-red-600 dark:text-red-400"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm p-10">
          <div className="flex flex-col items-center justify-center">
            <div className="w-9 h-9 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />

            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Loading customers...
            </p>
          </div>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm p-10">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
              <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {hasFilters ? "No customers found" : "No customers yet"}
            </h2>

            <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
              {hasFilters
                ? "Try changing your search or filters."
                : "Add your first customer to start building the customer directory."}
            </p>

            {!hasFilters && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500"
              >
                <Plus className="w-4 h-4" />
                Add Customer
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700/50">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Customer
                    </th>

                    <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Contact
                    </th>

                    <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Shop / Company
                    </th>

                    <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      TRN
                    </th>

                    <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Type
                    </th>

                    <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Status
                    </th>

                    <th className="text-right px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {customers.map((customer) => {
                    const id = getCustomerId(customer);

                    return (
                      <tr
                        key={id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                              <Users className="w-4 h-4" />
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {getCustomerName(customer)}
                              </p>

                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {customer?.nationality || "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {getCustomerPhone(customer)}
                          </div>

                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {getCustomerEmail(customer)}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {getCustomerCompany(customer)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {getCustomerTrn(customer)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {getCustomerType(customer)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {renderStatus(getCustomerStatus(customer))}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end items-center gap-1">
                            <button
                              type="button"
                              onClick={() => navigate(`/customers/${id}`)}
                              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400"
                              title="View customer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditModal(customer)}
                              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400"
                              title="Edit customer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {customers.map(renderCustomerCard)}
          </div>

          {/* Pagination */}
          <Pagination
            page={page}
            total={total}
            limit={limit}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Add / Edit Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />

          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700/50">
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 py-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700/50">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {editingCustomer ? "Edit Customer" : "Add Customer"}
                </h2>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Keep customer information accurate and up to date.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-5 space-y-6">
                {/* Customer information */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Customer Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Customer Name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder="Enter customer name"
                    />

                    <Field
                      label="Contact Number"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      required
                      placeholder="Enter contact number"
                    />

                    <Field
                      label="Alternate Number"
                      name="alternatePhone"
                      value={form.alternatePhone}
                      onChange={handleChange}
                      placeholder="Optional alternate number"
                    />

                    <Field
                      label="Nationality"
                      name="nationality"
                      value={form.nationality}
                      onChange={handleChange}
                      placeholder="e.g. Indian"
                    />

                    <Field
                      label="Email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="customer@example.com"
                    />
                  </div>
                </section>

                {/* Business information */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Business Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Shop Name"
                      name="shopName"
                      value={form.shopName}
                      onChange={handleChange}
                      placeholder="Shop / Garage name"
                    />

                    <Field
                      label="Company Name"
                      name="companyName"
                      value={form.companyName}
                      onChange={handleChange}
                      placeholder="Company name"
                    />

                    <Field
                      label="TRN / Tax Number"
                      name="trn"
                      value={form.trn}
                      onChange={handleChange}
                      placeholder="TRN / VAT / Tax number"
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Customer Type
                      </label>

                      <select
                        name="customerType"
                        value={form.customerType}
                        onChange={handleChange}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">Select customer type</option>

                        {CUSTOMER_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                {/* Address */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Address
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Address
                      </label>

                      <textarea
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Full address"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 text-sm outline-none resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <Field
                      label="City"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="City"
                    />

                    <Field
                      label="Country"
                      name="country"
                      value={form.country}
                      onChange={handleChange}
                      placeholder="Country"
                    />
                  </div>
                </section>

                {/* Status and notes */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Additional Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Status
                      </label>

                      <select
                        name="status"
                        value={form.status}
                        onChange={handleChange}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="active">Active</option>

                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Notes
                      </label>

                      <textarea
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Optional notes"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 text-sm outline-none resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 flex items-center justify-end gap-3 px-5 py-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700/50">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingCustomer ? "Update Customer" : "Create Customer"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      />
    </div>
  );
}
