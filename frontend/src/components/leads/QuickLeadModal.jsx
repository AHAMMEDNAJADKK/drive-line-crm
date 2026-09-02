import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import LeadForm from './LeadForm';
import { checkDuplicateApi, createLeadApi } from '../../services/leadApi';

export default function QuickLeadModal({
  isOpen,
  onClose,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [duplicate, setDuplicate] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) {
    return null;
  }

  const extractResponseData = (response) => {
    return (
      response?.data?.data ||
      response?.data?.lead ||
      response?.data ||
      response
    );
  };

  const handleSubmit = async (payload) => {
    setLoading(true);
    setError('');
    setDuplicate(null);

    try {
      /*
       * Keep the existing duplicate-phone protection.
       * If the duplicate endpoint fails because of an older backend,
       * creation is still allowed instead of blocking the user.
       */
      try {
        if (payload.mobileNumber?.trim()) {
          const duplicateResponse =
            await checkDuplicateApi(
              payload.mobileNumber.trim()
            );

          const duplicateData =
            extractResponseData(
              duplicateResponse
            );

          const isDuplicate =
            duplicateResponse?.data?.isDuplicate === true ||
            duplicateResponse?.data?.duplicate === true ||
            duplicateData?.isDuplicate === true ||
            duplicateData?.duplicate === true;

          if (isDuplicate) {
            setDuplicate(
              duplicateData?.lead ||
                duplicateData?.existingLead ||
                duplicateData
            );
          }
        }
      } catch (duplicateError) {
        /*
         * Do not prevent lead creation if the duplicate-check
         * endpoint is unavailable.
         */
        console.warn(
          'Duplicate check unavailable:',
          duplicateError
        );
      }

      const response =
        await createLeadApi(payload);

      const createdLead =
        extractResponseData(response);

      /*
       * Close the modal after successful creation.
       */
      if (onSuccess) {
        await onSuccess(createdLead);
      }

      onClose?.();
    } catch (err) {
      console.error(
        'Create lead error:',
        err
      );

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to create lead. Please try again.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (loading) return;

    setDuplicate(null);
    setError('');
    onClose?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Add New Lead"
      size="xl"
    >
      <div className="space-y-4">
        {/* Duplicate warning */}
        {duplicate && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />

              <div className="min-w-0">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                  Possible duplicate customer
                </p>

                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                  A lead with this mobile number may
                  already exist.
                </p>

                {duplicate?.customerName && (
                  <p className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Existing customer:{' '}
                    {duplicate.customerName}
                  </p>
                )}

                {duplicate?.mobileNumber && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Mobile:{' '}
                    {duplicate.mobileNumber}
                  </p>
                )}

                <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-500">
                  You can still continue if this is a
                  different lead/customer.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Creation error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />

              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  Unable to create lead
                </p>

                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        <LeadForm
          isNew={true}
          loading={loading}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />

        {loading && (
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving lead...
          </div>
        )}
      </div>
    </Modal>
  );
}