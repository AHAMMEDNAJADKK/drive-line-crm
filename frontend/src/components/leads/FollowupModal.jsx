import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addFollowupApi } from '../../services/leadApi';
import Modal from '../common/Modal';
import { CalendarDays, MessageSquareText, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUSES = [
  'New',
  'Contacted',
  'Follow Up',
  'Quotation',
  'Interested',
  'Converted',
  'Lost',
];

export default function FollowupModal({
  isOpen,
  onClose,
  lead,
  leadId,
  currentStatus,
  onSuccess,
}) {
  const queryClient = useQueryClient();
  const actualLeadId = leadId || lead?._id;
  const initialStatus = currentStatus || lead?.status || '';

  const [remarks, setRemarks] = useState('');
  const [statusChangedTo, setStatusChangedTo] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRemarks('');
      setStatusChangedTo(initialStatus);
      setNextFollowUpDate('');
    }
  }, [isOpen, initialStatus]);

  const mutation = useMutation({
    mutationFn: (data) => addFollowupApi(actualLeadId, data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', actualLeadId] });
      queryClient.invalidateQueries({
        queryKey: ['lead-followups', actualLeadId],
      });
      queryClient.invalidateQueries({
        queryKey: ['lead-activity', actualLeadId],
      });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      toast.success('Follow-up recorded successfully');

      if (onSuccess) onSuccess();

      onClose();
      setRemarks('');
      setStatusChangedTo('');
      setNextFollowUpDate('');
    },

    onError: (err) =>
      toast.error(
        err.response?.data?.message || 'Failed to record follow-up'
      ),
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!remarks.trim()) {
      return toast.error('Remarks are required');
    }

    mutation.mutate({
      remarks: remarks.trim(),
      statusChangedTo: statusChangedTo || undefined,
      nextFollowUpDate: nextFollowUpDate || undefined,
    });
  };

  const inputClass = `
    w-full
    rounded-xl
    border border-gray-200
    bg-white
    px-3.5 py-3
    text-sm
    text-gray-900
    placeholder-gray-400
    shadow-sm
    transition-all
    duration-200
    focus:border-indigo-500
    focus:outline-none
    focus:ring-2
    focus:ring-indigo-500/20
    dark:border-gray-700
    dark:bg-gray-900
    dark:text-gray-100
    dark:placeholder-gray-500
    dark:focus:border-indigo-400
    dark:focus:ring-indigo-400/20
  `;

  const labelClass =
    'mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Follow-up"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="p-5 sm:p-6">
        {/* Intro */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            <MessageSquareText className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Record customer interaction
            </p>
            <p className="mt-0.5 text-xs leading-5 text-gray-500 dark:text-gray-400">
              Add notes, update the lead status, and schedule the next
              follow-up.
            </p>
          </div>
        </div>

        {/* Remarks */}
        <div className="mb-5">
          <label className={labelClass}>
            Remarks / Interaction Notes{' '}
            <span className="text-red-500">*</span>
          </label>

          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={4}
            placeholder="What happened in this interaction? e.g. Customer requested price, WhatsApp sent, Quotation shared..."
            className={`${inputClass} resize-none leading-6`}
            autoFocus
          />
        </div>

        {/* Status */}
        <div className="mb-5">
          <label className={labelClass}>Update Status</label>

          <select
            value={statusChangedTo}
            onChange={(e) => setStatusChangedTo(e.target.value)}
            className={inputClass}
          >
            <option value="">
              Keep current ({initialStatus || 'Current'})
            </option>

            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Next Follow-up */}
        <div>
          <label
            htmlFor="next-follow-up-date"
            className={labelClass}
          >
            Next Follow-up Date
          </label>

          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />

            <input
              id="next-follow-up-date"
              type="date"
              value={nextFollowUpDate}
              onChange={(e) => setNextFollowUpDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-7 flex flex-col-reverse gap-2.5 border-t border-gray-100 pt-5 dark:border-gray-700/60 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="
              w-full
              rounded-xl
              border border-gray-200
              bg-white
              px-5 py-2.5
              text-sm
              font-semibold
              text-gray-600
              transition-all
              hover:bg-gray-50
              focus:outline-none
              focus:ring-2
              focus:ring-gray-300/50
              disabled:cursor-not-allowed
              disabled:opacity-50
              dark:border-gray-700
              dark:bg-gray-900
              dark:text-gray-300
              dark:hover:bg-gray-800
              dark:focus:ring-gray-600/50
              sm:w-auto
            "
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="
              inline-flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-indigo-600
              px-5 py-2.5
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition-all
              hover:bg-indigo-500
              focus:outline-none
              focus:ring-2
              focus:ring-indigo-500/30
              disabled:cursor-not-allowed
              disabled:opacity-50
              sm:w-auto
            "
          >
            {mutation.isPending && (
              <RefreshCw className="h-4 w-4 animate-spin" />
            )}

            {mutation.isPending ? 'Saving...' : 'Save Follow-up'}
          </button>
        </div>
      </form>
    </Modal>
  );
}