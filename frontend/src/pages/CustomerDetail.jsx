import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Pencil,
  UserRound,
  Phone,
  Mail,
  Building2,
  MapPin,
  Globe,
  FileText,
  BriefcaseBusiness,
  RefreshCw,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  getCustomer,
  updateCustomer
} from '../services/customerApi';

const CUSTOMER_TYPES = [
  'Workshop',
  'Mechanic',
  'Retailer',
  'Dealer',
  'Service Center',
  'Fleet',
  'Individual',
  'Other'
];

const getCustomerName = (customer) =>
  customer?.name ||
  customer?.customerName ||
  customer?.fullName ||
  'Unnamed Customer';

const getCustomerPhone = (customer) =>
  customer?.phone ||
  customer?.contactNumber ||
  customer?.mobile ||
  customer?.number ||
  '—';

const getCustomerEmail = (customer) =>
  customer?.email || '—';

const getCustomerId = (customer) =>
  customer?._id ||
  customer?.id ||
  customer?.customerId;

const getCustomerLeads = (customer) => {
  if (Array.isArray(customer?.leads)) {
    return customer.leads;
  }

  if (Array.isArray(customer?.relatedLeads)) {
    return customer.relatedLeads;
  }

  return [];
};

const EMPTY_FORM = {
  name: '',
  phone: '',
  alternatePhone: '',
  nationality: '',
  email: '',
  shopName: '',
  companyName: '',
  trn: '',
  address: '',
  city: '',
  country: '',
  customerType: '',
  notes: '',
  status: 'active'
};

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const loadCustomer = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await getCustomer(id);

      if (!data) {
        throw new Error('Customer was not found.');
      }

      setCustomer(data);
    } catch (err) {
      console.error('Customer detail error:', err);

      setError(
        err?.message ||
          'Unable to load customer details.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const openEdit = () => {
    if (!customer) return;

    setForm({
      name:
        customer?.name ||
        customer?.customerName ||
        '',
      phone:
        customer?.phone ||
        customer?.contactNumber ||
        customer?.mobile ||
        '',
      alternatePhone:
        customer?.alternatePhone ||
        customer?.alternateNumber ||
        '',
      nationality:
        customer?.nationality || '',
      email:
        customer?.email || '',
      shopName:
        customer?.shopName || '',
      companyName:
        customer?.companyName || '',
      trn:
        customer?.trn ||
        customer?.trnNumber ||
        customer?.vatNumber ||
        '',
      address:
        customer?.address || '',
      city:
        customer?.city || '',
      country:
        customer?.country || '',
      customerType:
        customer?.customerType ||
        customer?.type ||
        '',
      notes:
        customer?.notes || '',
      status:
        customer?.status || 'active'
    });

    setEditOpen(true);
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
      toast.error('Customer name is required.');
      return;
    }

    if (!form.phone.trim()) {
      toast.error('Contact number is required.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        alternatePhone: form.alternatePhone.trim(),
        nationality: form.nationality.trim(),
        email: form.email.trim(),
        shopName: form.shopName.trim(),
        companyName: form.companyName.trim(),
        trn: form.trn.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        customerType: form.customerType,
        notes: form.notes.trim(),
        status: form.status
      };

      const updated = await updateCustomer(id, payload);

      setCustomer(
        updated || {
          ...customer,
          ...payload
        }
      );

      setEditOpen(false);

      toast.success('Customer updated successfully.');

      await loadCustomer();
    } catch (err) {
      console.error('Customer update error:', err);

      toast.error(
        err?.message ||
          'Unable to update customer.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-9 h-9 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />

          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Loading customer...
          </p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Customers
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-100 dark:border-red-900/40 p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Customer could not be loaded
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {error || 'Customer not found.'}
            </p>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={loadCustomer}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <button
                type="button"
                onClick={() => navigate('/customers')}
                className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium"
              >
                Customers
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const leads = getCustomerLeads(customer);

  const status =
    customer?.status || 'active';

  const customerId =
    getCustomerId(customer);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            title="Back to customers"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Customer
            </p>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {getCustomerName(customer)}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadCustomer}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>

          <button
            type="button"
            onClick={openEdit}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500"
          >
            <Pencil className="w-4 h-4" />
            Edit Customer
          </button>
        </div>
      </div>

      {/* Profile summary */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <UserRound className="w-8 h-8" />
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {getCustomerName(customer)}
              </h2>

              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {status === 'active'
                  ? 'Active'
                  : 'Inactive'}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2">
              <InfoInline
                icon={Phone}
                value={getCustomerPhone(customer)}
              />

              <InfoInline
                icon={Mail}
                value={getCustomerEmail(customer)}
              />

              <InfoInline
                icon={BriefcaseBusiness}
                value={
                  customer?.customerType ||
                  customer?.type ||
                  '—'
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Information grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Customer Information */}
        <InfoCard
          title="Customer Information"
          icon={UserRound}
        >
          <InfoRow
            label="Customer Name"
            value={getCustomerName(customer)}
          />

          <InfoRow
            label="Contact Number"
            value={getCustomerPhone(customer)}
          />

          <InfoRow
            label="Alternate Number"
            value={
              customer?.alternatePhone ||
              customer?.alternateNumber ||
              '—'
            }
          />

          <InfoRow
            label="Nationality"
            value={
              customer?.nationality || '—'
            }
          />

          <InfoRow
            label="Email"
            value={getCustomerEmail(customer)}
          />
        </InfoCard>

        {/* Business Information */}
        <InfoCard
          title="Business Information"
          icon={Building2}
        >
          <InfoRow
            label="Shop Name"
            value={
              customer?.shopName || '—'
            }
          />

          <InfoRow
            label="Company Name"
            value={
              customer?.companyName || '—'
            }
          />

          <InfoRow
            label="TRN / Tax Number"
            value={
              customer?.trn ||
              customer?.trnNumber ||
              customer?.vatNumber ||
              '—'
            }
          />

          <InfoRow
            label="Customer Type"
            value={
              customer?.customerType ||
              customer?.type ||
              '—'
            }
          />

          <InfoRow
            label="Status"
            value={
              status === 'active'
                ? 'Active'
                : 'Inactive'
            }
          />
        </InfoCard>

        {/* Address */}
        <InfoCard
          title="Address"
          icon={MapPin}
        >
          <InfoRow
            label="Address"
            value={
              customer?.address || '—'
            }
          />

          <InfoRow
            label="City"
            value={
              customer?.city || '—'
            }
          />

          <InfoRow
            label="Country"
            value={
              customer?.country || '—'
            }
          />
        </InfoCard>

        {/* Notes */}
        <InfoCard
          title="Notes"
          icon={FileText}
        >
          <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
            {customer?.notes || 'No notes added.'}
          </div>
        </InfoCard>
      </div>

      {/* Related Leads */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700/50">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Related Leads
            </h2>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Leads associated with this customer.
            </p>
          </div>

          <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
            {leads.length}
          </span>
        </div>

        {leads.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <BriefcaseBusiness className="w-6 h-6 text-gray-400" />
            </div>

            <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              No related leads
            </p>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leads linked to this customer will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {leads.map((lead, index) => {
              const leadId =
                lead?._id ||
                lead?.id ||
                lead?.leadId;

              return (
                <div
                  key={leadId || index}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/20"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {lead?.leadNumber ||
                        lead?.reference ||
                        lead?.title ||
                        `Lead ${index + 1}`}
                    </p>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {lead?.status || '—'}
                      {lead?.priority
                        ? ` • ${lead.priority}`
                        : ''}
                    </p>
                  </div>

                  {leadId && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/leads/${leadId}`)
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 flex-shrink-0"
                    >
                      Open
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-[60] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/40 p-3 backdrop-blur-[2px] sm:p-5">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!saving) {
                setEditOpen(false);
              }
            }}
          />

          <div className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-gray-700/50 dark:bg-gray-800 sm:max-h-[calc(100dvh-2.5rem)]">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700/50">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Edit Customer
                </h2>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Update the customer information.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!saving) {
                    setEditOpen(false);
                  }
                }}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span className="text-xl leading-none">
                  ×
                </span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="min-h-0 overflow-y-auto">
              <div className="space-y-5 p-5 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <EditField
                    label="Customer Name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />

                  <EditField
                    label="Contact Number"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                  />

                  <EditField
                    label="Alternate Number"
                    name="alternatePhone"
                    value={form.alternatePhone}
                    onChange={handleChange}
                  />

                  <EditField
                    label="Nationality"
                    name="nationality"
                    value={form.nationality}
                    onChange={handleChange}
                  />

                  <EditField
                    label="Email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                  />

                  <EditField
                    label="Shop Name"
                    name="shopName"
                    value={form.shopName}
                    onChange={handleChange}
                  />

                  <EditField
                    label="Company Name"
                    name="companyName"
                    value={form.companyName}
                    onChange={handleChange}
                  />

                  <EditField
                    label="TRN / Tax Number"
                    name="trn"
                    value={form.trn}
                    onChange={handleChange}
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
                      <option value="">
                        Select type
                      </option>

                      {CUSTOMER_TYPES.map((type) => (
                        <option
                          key={type}
                          value={type}
                        >
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

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
                      <option value="active">
                        Active
                      </option>

                      <option value="inactive">
                        Inactive
                      </option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Address
                    </label>

                    <textarea
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 text-sm outline-none resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <EditField
                    label="City"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                  />

                  <EditField
                    label="Country"
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                  />

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Notes
                    </label>

                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 text-sm outline-none resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 flex justify-end gap-3 px-5 py-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700/50">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
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
                      <Pencil className="w-4 h-4" />
                      Save Changes
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

function InfoCard({
  title,
  icon: Icon,
  children
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700/50">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
          <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </div>

        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
      </div>

      <div className="p-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
      <div className="sm:w-40 flex-shrink-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
          {label}
        </p>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
        {value || '—'}
      </p>
    </div>
  );
}

function InfoInline({
  icon: Icon,
  value
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
      <Icon className="w-4 h-4" />
      <span>{value}</span>
    </div>
  );
}

function EditField({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}

        {required && (
          <span className="text-red-500 ml-1">
            *
          </span>
        )}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      />
    </div>
  );
}