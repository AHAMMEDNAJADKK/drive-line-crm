import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { addFollowupApi } from '../../services/leadApi';
import { getActiveEmployeesApi } from '../../services/employeeApi';
import Modal from '../common/Modal';
import toast from 'react-hot-toast';

const STATUSES = ['New', 'Contacted', 'Follow Up', 'Quotation', 'Interested', 'Converted', 'Lost'];

export default function FollowupModal({ isOpen, onClose, leadId, currentStatus }) {
  const queryClient = useQueryClient();
  const [remarks, setRemarks] = useState('');
  const [statusChangedTo, setStatusChangedTo] = useState(currentStatus || '');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [showLostReason, setShowLostReason] = useState(false);

  const mutation = useMutation({
    mutationFn: (data) => addFollowupApi(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead-followups', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead-activity', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Follow-up recorded successfully');
      onClose();
      setRemarks(''); setStatusChangedTo(''); setNextFollowUpDate('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to record follow-up')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!remarks.trim()) return toast.error('Remarks are required');
    mutation.mutate({ remarks, statusChangedTo: statusChangedTo || undefined, nextFollowUpDate: nextFollowUpDate || undefined });
  };

  const inputClass = "w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Follow-up" size="sm">
      <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Remarks / Interaction Notes <span className="text-red-500">*</span>
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            placeholder="What happened in this interaction? e.g. Customer requested price, WhatsApp sent, Quotation shared..."
            className={inputClass}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Update Status</label>
          <select value={statusChangedTo} onChange={(e) => setStatusChangedTo(e.target.value)} className={inputClass}>
            <option value="">Keep current ({currentStatus})</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Next Follow-up Date</label>
          <input
            type="date"
            value={nextFollowUpDate}
            onChange={(e) => setNextFollowUpDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className={inputClass}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending}
            className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 shadow transition-colors">
            {mutation.isPending ? 'Saving...' : 'Save Follow-up'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
