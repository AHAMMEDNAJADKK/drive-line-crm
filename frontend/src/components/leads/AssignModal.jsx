import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { getActiveEmployeesApi } from '../../services/employeeApi';
import { Loader2 } from 'lucide-react';
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
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Lead" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Assign lead for <span className="font-semibold text-gray-900 dark:text-gray-100">{lead?.customerName || lead?.mobileNumber}</span>:
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Select Employee
          </label>
          {fetching ? (
            <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Loading employees...
            </div>
          ) : (
            <select
              value={selectedEmp}
              onChange={(e) => setSelectedEmp(e.target.value)}
              className="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Unassigned —</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} ({emp.employeeId}) - {emp.role}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Assignment
          </button>
        </div>
      </form>
    </Modal>
  );
}
