import { useState, useRef, useEffect } from 'react';
import { Phone, AlertCircle, ExternalLink, CheckCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import { checkDuplicateApi, createLeadApi } from '../../services/leadApi';

export default function QuickLeadModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mobileRef = useRef(null);

  const [mobile, setMobile] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [partRequired, setPartRequired] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [duplicateResult, setDuplicateResult] = useState(null); // null | { isDuplicate, existingLead }
  const [checkingDup, setCheckingDup] = useState(false);
  const [forceDuplicate, setForceDuplicate] = useState(false);

  // Auto-focus mobile input when modal opens
  useEffect(() => {
    if (isOpen) {
      setMobile(''); setCustomerName(''); setPartRequired(''); setVehicleModel('');
      setDuplicateResult(null); setForceDuplicate(false);
      setTimeout(() => mobileRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const dupTimer = useRef(null);

  const handleMobileChange = (val) => {
    setMobile(val);
    setDuplicateResult(null);
    setForceDuplicate(false);
    const digitsOnly = val.replace(/\D/g, '');
    if (digitsOnly.length >= 7) {
      clearTimeout(dupTimer.current);
      setCheckingDup(true);
      dupTimer.current = setTimeout(async () => {
        try {
          const res = await checkDuplicateApi(val);
          setDuplicateResult(res.data);
        } catch (_) {}
        setCheckingDup(false);
      }, 500);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data) => createLeadApi(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Lead created successfully!');
      onClose();
      navigate(`/leads/${res.data.data._id}`);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to create lead';
      if (err.response?.data?.isDuplicate) {
        setDuplicateResult({ isDuplicate: true, existingLead: err.response.data.existingLead });
      } else {
        toast.error(msg);
      }
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!mobile.trim()) return toast.error('Mobile number is required');
    createMutation.mutate({
      mobileNumber: mobile.trim(),
      customerName: customerName.trim(),
      partRequired: partRequired.trim(),
      vehicleModel: vehicleModel.trim(),
      forceDuplicate
    });
  };

  const isDuplicate = duplicateResult?.isDuplicate;
  const existing = duplicateResult?.existingLead;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick Add Lead" size="sm">
      <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
        {/* Mobile Number - Primary Field */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={mobileRef}
              type="tel"
              value={mobile}
              onChange={(e) => handleMobileChange(e.target.value)}
              placeholder="Enter mobile number..."
              className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 transition-colors ${
                isDuplicate
                  ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500'
                  : 'border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-indigo-500'
              }`}
            />
            {checkingDup && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>

        {/* Duplicate Warning */}
        {isDuplicate && existing && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Existing Lead Found</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  <span className="font-medium">{existing.customerName || 'Unknown'}</span> • Status: <span className="font-medium">{existing.status}</span>
                  {existing.assignedTo && <> • Assigned: <span className="font-medium">{existing.assignedTo.name}</span></>}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { onClose(); navigate(`/leads/${existing._id}`); }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 text-xs font-semibold text-white hover:bg-amber-500 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Existing
              </button>
              <button
                type="button"
                onClick={() => setForceDuplicate(true)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Anyway
              </button>
            </div>
          </div>
        )}

        {forceDuplicate && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800/50">
            <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">Creating as a new separate lead for this number.</p>
          </div>
        )}

        {/* Quick optional fields */}
        {(!isDuplicate || forceDuplicate) && (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">Optional — fill now or later</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. John Sharma"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Part Required</label>
              <input
                type="text"
                value={partRequired}
                onChange={(e) => setPartRequired(e.target.value)}
                placeholder="e.g. Clutch Plate, Brake Pad..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Vehicle Model</label>
              <input
                type="text"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="e.g. Toyota Innova, Swift..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          {(!isDuplicate || forceDuplicate) && (
            <button
              type="submit"
              disabled={createMutation.isPending || !mobile.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow transition-colors"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Lead'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
