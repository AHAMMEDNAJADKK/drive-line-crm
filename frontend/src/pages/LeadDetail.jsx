import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, MessageCircle, Edit, Calendar, UserCheck,
  FileText, Clock, History, AlertCircle, CheckCircle2, Car, Wrench,
  Building, User, Trash2
} from 'lucide-react';
import {
  getLeadApi, updateLeadApi, updateLeadStatusApi, assignLeadApi,
  deleteLeadApi, getLeadFollowupsApi, getLeadActivityApi,
  exportSingleLeadPDFApi
} from '../services/leadApi';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge } from '../components/common/Badges';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import FollowupModal from '../components/leads/FollowupModal';
import AssignModal from '../components/leads/AssignModal';
import LeadForm from '../components/leads/LeadForm';
import { LoadingState, ErrorState } from '../components/common/States';
import { formatDate, formatDateTime, formatFollowUpDate, telLink, whatsappLink, getInitials } from '../utils/formatters';
import { LEAD_STATUSES } from '../utils/constants';
import toast from 'react-hot-toast';

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lead, setLead] = useState(null);
  const [followups, setFollowups] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details'); // details | followups | activity

  // Modals
  const [editOpen, setEditOpen] = useState(false);
  const [followupOpen, setFollowupOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchLeadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [leadRes, followupsRes, activityRes] = await Promise.all([
        getLeadApi(id),
        getLeadFollowupsApi(id),
        getLeadActivityApi(id),
      ]);
      setLead(leadRes.data.data);
      setFollowups(followupsRes.data.data || []);
      setActivities(activityRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load lead details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLeadData();
  }, [fetchLeadData]);

  const handleUpdateLead = async (formData) => {
    setSavingEdit(true);
    try {
      const res = await updateLeadApi(id, formData);
      setLead(res.data.data);
      toast.success('Lead updated successfully');
      setEditOpen(false);
      fetchLeadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update lead');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    let lostReason = '';
    if (newStatus === 'Lost') {
      const reason = window.prompt('Please enter the reason why this lead was lost:');
      if (!reason) return;
      lostReason = reason;
    }
    try {
      const res = await updateLeadStatusApi(id, { status: newStatus, lostReason });
      setLead(res.data.data);
      toast.success(`Status updated to ${newStatus}`);
      fetchLeadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change status');
    }
  };

  const handleAssign = async (leadId, assignedToId) => {
    await assignLeadApi(leadId, { assignedTo: assignedToId });
    toast.success('Lead assignment updated');
    fetchLeadData();
  };

  const handleDelete = async () => {
    try {
      await deleteLeadApi(id);
      toast.success('Lead deleted successfully');
      navigate('/leads');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete lead');
    }
  };

  if (loading) return <LoadingState message="Loading lead details..." />;
  if (error) return <ErrorState message={error} onRetry={fetchLeadData} />;
  if (!lead) return null;

  const canAssign = user?.role === 'admin' || user?.role === 'manager';
  const canDelete = user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/leads')}
            className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {lead.customerName || lead.mobileNumber}
              </h1>
              <StatusBadge status={lead.status} />
              <PriorityBadge priority={lead.priority} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Created {formatDateTime(lead.createdAt)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={telLink(lead.mobileNumber)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 text-sm font-semibold transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span>Call</span>
          </a>
          <a
            href={whatsappLink(lead.mobileNumber)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-sm font-semibold transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>
          <button
            onClick={() => setFollowupOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 text-sm font-semibold transition-colors"
          >
            <Calendar className="w-4 h-4" />
            <span>Follow-up</span>
          </button>
          {canAssign && (
            <button
              onClick={() => setAssignOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-sm font-semibold transition-colors"
            >
              <UserCheck className="w-4 h-4" />
              <span>Assign</span>
            </button>
          )}
          <button
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-semibold transition-colors"
          >
            <Edit className="w-4 h-4" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => exportSingleLeadPDFApi(lead._id)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-semibold transition-colors"
            title="Download PDF Dossier"
          >
            <FileText className="w-4 h-4" />
            <span>PDF</span>
          </button>
          {canDelete && (
            <button
              onClick={() => setDeleteOpen(true)}
              className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 text-sm font-semibold transition-colors"
              title="Delete Lead"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Pipeline Status Quick Selector */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {LEAD_STATUSES.map((st) => {
            const isCurrent = lead.status === st;
            return (
              <button
                key={st}
                onClick={() => handleStatusChange(st)}
                className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-semibold transition-all text-center ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 gap-6">
        <button
          onClick={() => setActiveTab('details')}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === 'details'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          Lead Details
          {activeTab === 'details' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('followups')}
          className={`pb-3 text-sm font-semibold transition-colors relative flex items-center gap-1.5 ${
            activeTab === 'followups'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          Follow-ups ({followups.length})
          {activeTab === 'followups' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`pb-3 text-sm font-semibold transition-colors relative flex items-center gap-1.5 ${
            activeTab === 'activity'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          Activity Timeline ({activities.length})
          {activeTab === 'activity' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
          )}
        </button>
      </div>

      {/* Tab: Details */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Card */}
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" /> Customer Information
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-500 dark:text-gray-400">Mobile Number:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{lead.mobileNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-500 dark:text-gray-400">Customer Name:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{lead.customerName || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-500 dark:text-gray-400">Alternate Phone:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{lead.alternateMobileNumber || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-500 dark:text-gray-400">Company / Workshop:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{lead.companyName || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-500 dark:text-gray-400">Customer Type:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{lead.customerType || 'Other'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-500 dark:text-gray-400">Location:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{lead.location || '—'}</span>
              </div>
            </div>
          </div>

          {/* Vehicle & Part Requirement Card */}
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-600" /> Part & Vehicle Requirement
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-500 dark:text-gray-400">Part Required:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{lead.partRequired || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-500 dark:text-gray-400">Part Number:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{lead.partNumber || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-500 dark:text-gray-400">Quantity:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{lead.quantity || 1}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-500 dark:text-gray-400">Vehicle:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {[lead.vehicleMake, lead.vehicleModel, lead.vehicleYear].filter(Boolean).join(' ') || '—'}
                </span>
              </div>
              <div className="py-1">
                <span className="text-gray-500 dark:text-gray-400 block mb-1">Requirement Notes:</span>
                <p className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 p-2.5 rounded-xl">
                  {lead.requirementDetails || 'No specific notes provided.'}
                </p>
              </div>
            </div>
          </div>

          {/* Sales & Follow-up Metadata */}
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" /> Sales & Schedule
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-500 dark:text-gray-400">Assigned To:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {lead.assignedTo?.name ? `${lead.assignedTo.name} (${lead.assignedTo.employeeId})` : 'Unassigned'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-500 dark:text-gray-400">Next Follow-up:</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {lead.nextFollowUpDate ? formatFollowUpDate(lead.nextFollowUpDate) : 'Not scheduled'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-500 dark:text-gray-400">Source:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{lead.source || 'Phone'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700/50">
                <span className="text-gray-500 dark:text-gray-400">Created By:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{lead.createdBy?.name || 'System'}</span>
              </div>
              {lead.status === 'Lost' && (
                <div className="py-1">
                  <span className="text-red-500 font-semibold block mb-1">Lost Reason:</span>
                  <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2.5 rounded-xl border border-red-100 dark:border-red-900/30">
                    {lead.lostReason}
                  </p>
                </div>
              )}
              {lead.status === 'Converted' && lead.convertedAt && (
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700/50">
                  <span className="text-emerald-600 font-medium">Converted At:</span>
                  <span className="font-semibold text-emerald-600">{formatDateTime(lead.convertedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Remarks Card */}
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" /> Remarks & Internal Notes
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl min-h-[100px] whitespace-pre-wrap">
              {lead.remarks || 'No remarks recorded.'}
            </p>
          </div>
        </div>
      )}

      {/* Tab: Followups Timeline */}
      {activeTab === 'followups' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Follow-up History
            </h3>
            <button
              onClick={() => setFollowupOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              <Calendar className="w-4 h-4" /> Add Follow-up
            </button>
          </div>

          {followups.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50">
              <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No follow-ups recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {followups.map((f) => (
                <div
                  key={f._id}
                  className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {f.createdBy?.name || 'Staff'}
                    </span>
                    <span>{formatDateTime(f.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {f.remarks}
                  </p>
                  <div className="flex items-center gap-3 pt-2 text-xs border-t border-gray-50 dark:border-gray-700/40">
                    {f.statusChangedTo && (
                      <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                        Status changed: <StatusBadge status={f.statusChangedTo} />
                      </span>
                    )}
                    {f.nextFollowUpDate && (
                      <span className="text-amber-600 dark:text-amber-400">
                        Next: {formatDate(f.nextFollowUpDate)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Activity History */}
      {activeTab === 'activity' && (
        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50">
              <History className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No activity logged yet</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700">
              {activities.map((a) => (
                <div key={a._id} className="relative">
                  <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-indigo-600 ring-4 ring-white dark:ring-gray-900" />
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {a.performedBy?.name || 'System'}
                      </span>
                      <span>{formatDateTime(a.createdAt)}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">
                      {a.action?.replace(/_/g, ' ')}
                    </p>
                    {a.details && (
                      <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg overflow-x-auto">
                        {typeof a.details === 'string' ? a.details : JSON.stringify(a.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Lead Modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Lead Information"
        size="lg"
      >
        <LeadForm
          initialData={lead}
          onSubmit={handleUpdateLead}
          onCancel={() => setEditOpen(false)}
          loading={savingEdit}
        />
      </Modal>

      {/* Follow-up Modal */}
      <FollowupModal
        isOpen={followupOpen}
        onClose={() => setFollowupOpen(false)}
        lead={lead}
        onSuccess={() => {
          setFollowupOpen(false);
          fetchLeadData();
        }}
      />

      {/* Assign Modal */}
      <AssignModal
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        lead={lead}
        onAssigned={handleAssign}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Lead"
        message={`Are you sure you want to permanently delete lead for ${lead.customerName || lead.mobileNumber}? This action cannot be undone.`}
        confirmText="Delete Lead"
        type="danger"
      />
    </div>
  );
}
