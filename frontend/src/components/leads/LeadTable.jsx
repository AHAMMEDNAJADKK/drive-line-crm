import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Phone, MessageCircle, Eye, Edit2, Calendar, Trash2, UserCheck } from 'lucide-react';
import { format, isToday, isPast, isTomorrow } from 'date-fns';
import { StatusBadge, PriorityBadge } from '../common/Badges';
import { deleteLeadApi } from '../../services/leadApi';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import ConfirmDialog from '../common/ConfirmDialog';
import FollowupModal from './FollowupModal';
import toast from 'react-hot-toast';

function FollowUpChip({ date }) {
  if (!date) return null;
  const d = new Date(date);
  const overdue = isPast(d) && !isToday(d);
  const today = isToday(d);
  const tomorrow = isTomorrow(d);

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      overdue ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
      today ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
      tomorrow ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
      'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
    }`}>
      <Calendar className="w-3 h-3" />
      {overdue ? 'Overdue' : today ? 'Today' : tomorrow ? 'Tomorrow' : format(d, 'dd MMM')}
    </span>
  );
}

export default function LeadTable({ leads, onRefresh }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState(null);
  const [followupLead, setFollowupLead] = useState(null);

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteLeadApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead deleted');
      setDeleteId(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Delete failed')
  });

  const getWhatsAppUrl = (phone) => {
    if (!phone) return '#';
    const digits = phone.replace(/\D/g, '');
    const normalized = digits.length === 10 ? '91' + digits : digits;
    return `https://wa.me/${normalized}`;
  };

  if (!leads || leads.length === 0) return null;

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700/50">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Customer</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Vehicle / Part</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Priority</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Assigned To</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Follow-up</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/30">
            {leads.map((lead) => (
              <tr
                key={lead._id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer group"
                onClick={() => navigate(`/leads/${lead._id}`)}
              >
                <td className="py-3 px-4">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate max-w-[140px]">
                    {lead.customerName || lead.companyName || <span className="text-gray-400 italic">No Name</span>}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{lead.mobileNumber}</p>
                </td>
                <td className="py-3 px-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[160px]">
                    {lead.partRequired || <span className="text-gray-400 italic">—</span>}
                  </p>
                  {(lead.vehicleMake || lead.vehicleModel) && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[160px]">
                      {[lead.vehicleMake, lead.vehicleModel].filter(Boolean).join(' ')}
                    </p>
                  )}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="py-3 px-4">
                  <PriorityBadge priority={lead.priority} />
                </td>
                <td className="py-3 px-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                    {lead.assignedTo?.name || <span className="text-gray-400 italic">Unassigned</span>}
                  </p>
                </td>
                <td className="py-3 px-4">
                  <FollowUpChip date={lead.nextFollowUpDate} />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                       onClick={(e) => e.stopPropagation()}>
                    <a href={`tel:${lead.mobileNumber}`}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                      title="Call">
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <a href={getWhatsAppUrl(lead.mobileNumber)} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                      title="WhatsApp">
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => setFollowupLead(lead)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      title="Add Follow-up">
                      <Calendar className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => navigate(`/leads/${lead._id}`)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      title="View">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => setDeleteId(lead._id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3 p-4">
        {leads.map((lead) => (
          <div
            key={lead._id}
            className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 shadow-sm p-4 space-y-3"
            onClick={() => navigate(`/leads/${lead._id}`)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                  {lead.customerName || lead.companyName || 'Unknown Customer'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{lead.mobileNumber}</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <StatusBadge status={lead.status} />
                <PriorityBadge priority={lead.priority} />
              </div>
            </div>

            {(lead.partRequired || lead.vehicleModel) && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
                {lead.partRequired && <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{lead.partRequired}</p>}
                {(lead.vehicleMake || lead.vehicleModel) && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">{[lead.vehicleMake, lead.vehicleModel].filter(Boolean).join(' ')}</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {lead.assignedTo && <span className="font-medium">{lead.assignedTo.name}</span>}
                <FollowUpChip date={lead.nextFollowUpDate} />
              </div>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <a href={`tel:${lead.mobileNumber}`}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium">
                  <Phone className="w-3 h-3" />Call
                </a>
                <a href={getWhatsAppUrl(lead.mobileNumber)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  <MessageCircle className="w-3 h-3" />WA
                </a>
                <button
                  onClick={() => setFollowupLead(lead)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-xs font-medium">
                  <Calendar className="w-3 h-3" />Follow
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        title="Delete Lead?"
        message="This will permanently remove the lead and all associated follow-ups and activity history."
        confirmLabel="Delete Lead"
      />

      {followupLead && (
        <FollowupModal
          isOpen={!!followupLead}
          onClose={() => setFollowupLead(null)}
          leadId={followupLead._id}
          currentStatus={followupLead.status}
        />
      )}
    </>
  );
}
