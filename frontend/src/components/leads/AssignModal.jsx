import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { getActiveEmployeesApi } from '../../services/employeeApi';
import { Loader2, UserRound, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AssignModal({ isOpen, onClose, lead, onAssigned }) {
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedEmp(lead?.assignedTo?._id || lead?.assignedTo || '');
      setFetching(true);

      getActiveEmployeesApi()
        .then((res) => setEmployees(res.data.data || []))
        .catch(() => toast.error('Failed to load active employees'))
        .finally(() => setFetching(false));
    }
  }, [isOpen, lead]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onAssigned(lead._id, selectedEmp || null);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Lead"
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-5 sm:p-6">
        {/* Lead Information */}
        <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-700/60 dark:bg-gray-800/50">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <UserRound className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Lead
              </p>

              <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                {lead?.customerName || lead?.mobileNumber || 'Unknown Lead'}
              </p>

              {lead?.customerName && lead?.mobileNumber && (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {lead.mobileNumber}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Employee Selection */}
        <div>
          <label
            htmlFor="assign-employee"
            className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
          >
            Select Employee
          </label>

          {fetching ? (
            <div className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              Loading employees...
            </div>
          ) : (
            <div className="relative">
              <UserCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />

              <select
                id="assign-employee"
                value={selectedEmp}
                onChange={(e) => setSelectedEmp(e.target.value)}
                className="
                  block w-full appearance-none
                  rounded-xl
                  border border-gray-200
                  bg-white
                  px-10 py-3
                  text-sm
                  text-gray-900
                  shadow-sm
                  transition-all
                  focus:border-indigo-500
                  focus:outline-none
                  focus:ring-2
                  focus:ring-indigo-500/20
                  dark:border-gray-700
                  dark:bg-gray-900
                  dark:text-gray-100
                  dark:focus:border-indigo-400
                  dark:focus:ring-indigo-400/20
                "
              >
                <option value="">— Unassigned —</option>

                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} - {emp.employeeId} - {emp.vehicleSpecialization || 'Other'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-7 flex flex-col-reverse gap-2.5 border-t border-gray-100 pt-5 dark:border-gray-700/60 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
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
              disabled:cursor-not-allowed
              disabled:opacity-50
              dark:border-gray-700
              dark:bg-gray-900
              dark:text-gray-300
              dark:hover:bg-gray-800
              sm:w-auto
            "
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading || fetching}
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
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}

            {loading ? 'Saving...' : 'Save Assignment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}