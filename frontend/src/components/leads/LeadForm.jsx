import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { getActiveEmployeesApi } from '../../services/employeeApi';
import {
  LEAD_STATUSES, LEAD_PRIORITIES, CUSTOMER_TYPES, LEAD_SOURCES
} from '../../utils/constants';

const FIELD_CLASS = 'block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors placeholder-gray-400 dark:placeholder-gray-500';
const LABEL_CLASS = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
const SECTION_CLASS = 'rounded-xl border border-gray-100 dark:border-gray-700/50 p-5 space-y-4';
const SECTION_TITLE = 'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4';

export default function LeadForm({ initialData = {}, onSubmit, onCancel, loading = false, isNew = false }) {
  const [form, setForm] = useState({
    mobileNumber: '',
    customerName: '',
    alternateMobileNumber: '',
    companyName: '',
    customerType: 'Other',
    location: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    partRequired: '',
    partNumber: '',
    quantity: 1,
    requirementDetails: '',
    source: 'Phone',
    status: 'New',
    priority: 'Medium',
    assignedTo: '',
    nextFollowUpDate: '',
    remarks: '',
    lostReason: '',
    ...initialData,
  });

  const [employees, setEmployees] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Populate form with initialData when editing
    if (initialData && Object.keys(initialData).length > 0) {
      setForm(prev => ({
        ...prev,
        ...initialData,
        assignedTo: initialData.assignedTo?._id || initialData.assignedTo || '',
        nextFollowUpDate: initialData.nextFollowUpDate
          ? new Date(initialData.nextFollowUpDate).toISOString().slice(0, 10)
          : '',
      }));
    }
  }, [initialData._id]);

  useEffect(() => {
    getActiveEmployeesApi()
      .then(res => setEmployees(res.data.data || []))
      .catch(() => {});
  }, []);

  const set = (field) => (e) => {
    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm(prev => ({ ...prev, [field]: val }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.mobileNumber?.trim()) errs.mobileNumber = 'Mobile number is required';
    if (form.quantity && form.quantity < 1) errs.quantity = 'Quantity must be at least 1';
    if (form.status === 'Lost' && !form.lostReason?.trim()) errs.lostReason = 'Lost reason is required';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSubmit(form);
  };

  const Field = ({ label, name, type = 'text', placeholder, required, options, children }) => (
    <div>
      <label className={LABEL_CLASS}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children || (options ? (
        <select value={form[name] || ''} onChange={set(name)} className={FIELD_CLASS}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={form[name] || ''}
          onChange={set(name)}
          placeholder={placeholder}
          className={`${FIELD_CLASS} ${errors[name] ? 'border-red-400 focus:ring-red-400' : ''}`}
        />
      ))}
      {errors[name] && <p className="mt-1 text-xs text-red-500">{errors[name]}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Customer */}
      <div className={SECTION_CLASS}>
        <p className={SECTION_TITLE}>Customer Information</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Mobile Number" name="mobileNumber" placeholder="+91 98765 43210" required />
          <Field label="Customer Name" name="customerName" placeholder="John Doe" />
          <Field label="Alternate Mobile" name="alternateMobileNumber" placeholder="+91 87654 32109" />
          <Field label="Company / Workshop" name="companyName" placeholder="ABC Motors" />
          <Field label="Customer Type" name="customerType" options={CUSTOMER_TYPES} />
          <Field label="Location" name="location" placeholder="Mumbai, MH" />
        </div>
      </div>

      {/* Vehicle */}
      <div className={SECTION_CLASS}>
        <p className={SECTION_TITLE}>Vehicle Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Vehicle Make" name="vehicleMake" placeholder="Toyota" />
          <Field label="Vehicle Model" name="vehicleModel" placeholder="Innova Crysta" />
          <Field label="Vehicle Year" name="vehicleYear" placeholder="2022" />
        </div>
      </div>

      {/* Requirement */}
      <div className={SECTION_CLASS}>
        <p className={SECTION_TITLE}>Requirement Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Part Required" name="partRequired" placeholder="Clutch Plate" />
          <Field label="Part Number" name="partNumber" placeholder="TYT-CP-2022" />
          <div>
            <label className={LABEL_CLASS}>Quantity</label>
            <input
              type="number"
              min={1}
              value={form.quantity || 1}
              onChange={set('quantity')}
              className={`${FIELD_CLASS} ${errors.quantity ? 'border-red-400 focus:ring-red-400' : ''}`}
            />
            {errors.quantity && <p className="mt-1 text-xs text-red-500">{errors.quantity}</p>}
          </div>
          <div></div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS}>Requirement Details</label>
            <textarea
              rows={2}
              value={form.requirementDetails || ''}
              onChange={set('requirementDetails')}
              placeholder="Additional notes about the requirement…"
              className={FIELD_CLASS}
            />
          </div>
        </div>
      </div>

      {/* Sales */}
      <div className={SECTION_CLASS}>
        <p className={SECTION_TITLE}>Sales Information</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Source" name="source" options={LEAD_SOURCES} />
          <Field label="Status" name="status" options={LEAD_STATUSES} />
          <Field label="Priority" name="priority" options={LEAD_PRIORITIES} />
          <div>
            <label className={LABEL_CLASS}>Assigned Employee</label>
            <select value={form.assignedTo || ''} onChange={set('assignedTo')} className={FIELD_CLASS}>
              <option value="">— Unassigned —</option>
              {employees.map(e => (
                <option key={e._id} value={e._id}>{e.name} ({e.employeeId})</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Next Follow-up Date</label>
            <input
              type="date"
              value={form.nextFollowUpDate || ''}
              onChange={set('nextFollowUpDate')}
              className={FIELD_CLASS}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS}>Remarks</label>
            <textarea
              rows={2}
              value={form.remarks || ''}
              onChange={set('remarks')}
              placeholder="Any remarks or notes…"
              className={FIELD_CLASS}
            />
          </div>
          {form.status === 'Lost' && (
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>Lost Reason <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.lostReason || ''}
                onChange={set('lostReason')}
                placeholder="Why was this lead lost?"
                className={`${FIELD_CLASS} ${errors.lostReason ? 'border-red-400 focus:ring-red-400' : ''}`}
              />
              {errors.lostReason && <p className="mt-1 text-xs text-red-500">{errors.lostReason}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </button>
        )}
        <button type="submit" disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed shadow transition-colors">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isNew ? 'Create Lead' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
