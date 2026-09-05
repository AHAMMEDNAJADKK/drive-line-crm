import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone,
  MessageCircle,
  Eye,
  Calendar,
  Trash2,
} from 'lucide-react';

import { StatusBadge, PriorityBadge } from '../common/Badges';
import ConfirmDialog from '../common/ConfirmDialog';
import FollowupModal from './FollowupModal';

import {
  formatFollowUpDate,
  telLink,
  whatsappLink,
} from '../../utils/formatters';

export default function LeadTable({
  leads,
  user,
  onView,
  onDelete,
  onStatusChange,
  onRefresh,
}) {
  const navigate = useNavigate();

  const [deleteId, setDeleteId] = useState(null);
  const [followupLead, setFollowupLead] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;

    setIsDeleting(true);

    try {
      if (onDelete) {
        await onDelete(deleteId);
      }

      setDeleteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRowClick = (leadId) => {
    if (onView) {
      onView(leadId);
    } else {
      navigate(`/leads/${leadId}`);
    }
  };

  if (!leads || leads.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">

      {/* =========================================================
          DESKTOP TABLE
      ========================================================= */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left">

          <thead className="bg-gray-50 dark:bg-gray-700/30 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">
                Customer
              </th>

              <th className="py-3.5 px-4">
                Vehicle / Part
              </th>

              <th className="py-3.5 px-4">
                Status
              </th>

              <th className="py-3.5 px-4">
                Priority
              </th>

              <th className="py-3.5 px-4">
                Assigned To
              </th>

              <th className="py-3.5 px-4">
                Next Follow-up
              </th>

              <th className="py-3.5 px-4 text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">

            {leads.map((lead) => (
              <tr
                key={lead._id}
                className="hover:bg-gray-50/80 dark:hover:bg-gray-700/20 transition-colors cursor-pointer group"
                onClick={() => handleRowClick(lead._id)}
              >

                {/* =================================================
                    CUSTOMER
                ================================================= */}
                <td className="py-3.5 px-4">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate max-w-[150px]">
                    {lead.customerName ||
                      lead.companyName || (
                        <span className="text-gray-400 italic">
                          No Name
                        </span>
                      )}
                  </p>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {lead.mobileNumber}
                  </p>
                </td>

                {/* =================================================
                    VEHICLE / PART
                ================================================= */}
                <td className="py-3.5 px-4">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[160px]">
                    {lead.partRequired || (
                      <span className="text-gray-400 italic">
                        —
                      </span>
                    )}
                  </p>

                  {(lead.vehicleMake || lead.vehicleModel) && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[160px]">
                      {[lead.vehicleMake, lead.vehicleModel]
                        .filter(Boolean)
                        .join(' ')}
                    </p>
                  )}
                </td>

                {/* =================================================
                    STATUS
                ================================================= */}
                <td className="py-3.5 px-4">
                  <StatusBadge status={lead.status} />
                </td>

                {/* =================================================
                    PRIORITY
                ================================================= */}
                <td className="py-3.5 px-4">
                  <PriorityBadge priority={lead.priority} />
                </td>

                {/* =================================================
                    ASSIGNED TO
                ================================================= */}
                <td className="py-3.5 px-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                    {lead.assignedTo?.name || (
                      <span className="text-gray-400 italic">
                        Unassigned
                      </span>
                    )}
                  </p>
                </td>

                {/* =================================================
                    NEXT FOLLOW-UP
                ================================================= */}
                <td className="py-3.5 px-4">
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    {formatFollowUpDate(
                      lead.nextFollowUpDate
                    )}
                  </span>
                </td>

                {/* =================================================
                    ACTIONS
                        Followup is intentionally FIRST and highlighted
                ================================================= */}
                <td
                  className="py-3.5 px-4 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-1.5">

                    {/* -------------------------------------------------
                        FOLLOWUP - PRIMARY ACTION
                    ------------------------------------------------- */}
                    <button
                      type="button"
                      onClick={() => setFollowupLead(lead)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600 shadow-sm hover:shadow transition-all font-semibold text-xs whitespace-nowrap"
                      title="Add Follow-up"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Followup</span>
                    </button>

                    {/* -------------------------------------------------
                        CALL
                    ------------------------------------------------- */}
                    <a
                      href={telLink(lead.mobileNumber)}
                      className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                      title="Call"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="w-4 h-4" />
                    </a>

                    {/* -------------------------------------------------
                        WHATSAPP
                    ------------------------------------------------- */}
                    <a
                      href={whatsappLink(lead.mobileNumber)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                      title="WhatsApp"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>

                    {/* -------------------------------------------------
                        VIEW DETAILS
                    ------------------------------------------------- */}
                    <button
                      type="button"
                      onClick={() =>
                        handleRowClick(lead._id)
                      }
                      className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* -------------------------------------------------
                        DELETE - ADMIN ONLY
                    ------------------------------------------------- */}
                    {user?.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteId(lead._id)
                        }
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete Lead"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                  </div>
                </td>
              </tr>
            ))}

          </tbody>
        </table>
      </div>

      {/* =========================================================
          MOBILE CARDS VIEW
      ========================================================= */}
      <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700/50">

        {leads.map((lead) => (
          <div
            key={lead._id}
            className="p-4 space-y-3"
            onClick={() => handleRowClick(lead._id)}
          >

            {/* -----------------------------------------------------
                CUSTOMER + STATUS
            ----------------------------------------------------- */}
            <div className="flex items-start justify-between gap-2">

              <div className="min-w-0">

                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                  {lead.customerName ||
                    lead.companyName ||
                    'Unknown Customer'}
                </p>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {lead.mobileNumber}
                </p>

              </div>

              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <StatusBadge status={lead.status} />
                <PriorityBadge priority={lead.priority} />
              </div>

            </div>

            {/* -----------------------------------------------------
                VEHICLE / PART
            ----------------------------------------------------- */}
            {(lead.partRequired || lead.vehicleModel) && (
              <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-3 py-2 text-xs">

                {lead.partRequired && (
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {lead.partRequired}
                  </p>
                )}

                {(lead.vehicleMake ||
                  lead.vehicleModel) && (
                  <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                    {[
                      lead.vehicleMake,
                      lead.vehicleModel,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  </p>
                )}

              </div>
            )}

            {/* -----------------------------------------------------
                ASSIGNED TO + ACTIONS
            ----------------------------------------------------- */}
            <div className="space-y-2 pt-1">

              <div className="text-xs text-gray-500 dark:text-gray-400">
                {lead.assignedTo?.name ? (
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Assigned to: {lead.assignedTo.name}
                  </span>
                ) : (
                  'Unassigned'
                )}
              </div>

              <div
                className="flex flex-wrap items-center gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >

                {/* -------------------------------------------------
                    FOLLOW-UP - PRIMARY ACTION
                ------------------------------------------------- */}
                <button
                  type="button"
                  onClick={() =>
                    setFollowupLead(lead)
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600 shadow-sm transition-all text-xs font-semibold"
                  title="Add Follow-up"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Followup</span>
                </button>

                {/* -------------------------------------------------
                    CALL
                ------------------------------------------------- */}
                <a
                  href={telLink(lead.mobileNumber)}
                  className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs font-semibold"
                  title="Call"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call
                </a>

                {/* -------------------------------------------------
                    WHATSAPP
                ------------------------------------------------- */}
                <a
                  href={whatsappLink(lead.mobileNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold"
                  title="WhatsApp"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WA
                </a>

              </div>
            </div>

          </div>
        ))}

      </div>

      {/* =========================================================
          DELETE CONFIRMATION
      ========================================================= */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
        title="Delete Lead?"
        message="This will permanently delete this lead and its full history. This action cannot be undone."
        confirmText="Delete Lead"
        type="danger"
      />

      {/* =========================================================
          FOLLOW-UP MODAL
      ========================================================= */}
      {followupLead && (
        <FollowupModal
          isOpen={!!followupLead}
          onClose={() => setFollowupLead(null)}
          lead={followupLead}
          onSuccess={onRefresh}
        />
      )}

    </div>
  );
}