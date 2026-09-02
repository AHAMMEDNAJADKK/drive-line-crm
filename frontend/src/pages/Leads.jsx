import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  SlidersHorizontal,
  Download,
  FileText,
  Upload,
  X,
} from 'lucide-react';

import {
  getLeadsApi,
  createLeadApi,
  deleteLeadApi,
  updateLeadStatusApi,
  exportExcelApi,
  exportPDFApi,
} from '../services/leadApi';

import { useAuth } from '../context/AuthContext';

import LeadTable from '../components/leads/LeadTable';
import LeadFiltersDrawer from '../components/leads/LeadFiltersDrawer';
import LeadForm from '../components/leads/LeadForm';
import ImportModal from '../components/leads/ImportModal';

import SearchInput from '../components/common/SearchInput';
import Pagination from '../components/common/Pagination';
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from '../components/common/States';

import toast from 'react-hot-toast';

const PAGE_LIMIT = 25;

export default function Leads() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // =========================================================
  // STATE
  // =========================================================

  const [leads, setLeads] = useState([]);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filtersOpen, setFiltersOpen] = useState(false);

  // NEW LEAD FORM
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [addLeadLoading, setAddLeadLoading] = useState(false);

  const [importModalOpen, setImportModalOpen] = useState(false);

  // =========================================================
  // BUILD QUERY
  // =========================================================

  const buildQuery = useCallback(() => {
    const q = {};

    if (searchParams.get('search')) {
      q.search = searchParams.get('search');
    }

    if (searchParams.get('status')) {
      q.status = searchParams.get('status');
    }

    if (searchParams.get('priority')) {
      q.priority = searchParams.get('priority');
    }

    if (searchParams.get('assignedTo')) {
      q.assignedTo = searchParams.get('assignedTo');
    }

    if (searchParams.get('customerType')) {
      q.customerType = searchParams.get('customerType');
    }

    if (searchParams.get('source')) {
      q.source = searchParams.get('source');
    }

    if (searchParams.get('followup')) {
      q.followup = searchParams.get('followup');
    }

    if (searchParams.get('dateFrom')) {
      q.dateFrom = searchParams.get('dateFrom');
    }

    if (searchParams.get('dateTo')) {
      q.dateTo = searchParams.get('dateTo');
    }

    q.page = searchParams.get('page') || 1;
    q.limit = PAGE_LIMIT;

    return q;
  }, [searchParams]);

  // =========================================================
  // LOAD LEADS
  // =========================================================

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await getLeadsApi(buildQuery());

      const list =
        res.data.data ||
        res.data.leads ||
        [];

      const totalCount =
        res.data.total ??
        res.data.pagination?.total ??
        list.length;

      const totalPages =
        res.data.pages ??
        res.data.pagination?.totalPages ??
        1;

      const curPage =
        res.data.page ??
        res.data.pagination?.page ??
        1;

      setLeads(list);

      setPagination({
        total: totalCount,
        page: curPage,
        pages: totalPages,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to load leads.'
      );
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // =========================================================
  // FILTER / SEARCH
  // =========================================================

  const setParam = (key, value) => {
    const p = new URLSearchParams(searchParams);

    if (value) {
      p.set(key, value);
    } else {
      p.delete(key);
    }

    p.delete('page');

    setSearchParams(p);
  };

  const handleSearch = (value) => {
    setParam('search', value);
  };

  const handlePage = (page) => {
    const p = new URLSearchParams(searchParams);

    p.set('page', page);

    setSearchParams(p);
  };

  const handleFiltersApply = (filters) => {
    const p = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        p.set(key, value);
      }
    });

    if (searchParams.get('search')) {
      p.set(
        'search',
        searchParams.get('search')
      );
    }

    setSearchParams(p);
  };

  // =========================================================
  // CREATE NEW LEAD
  // =========================================================

  const handleCreateLead = async (payload) => {
    setAddLeadLoading(true);

    try {
      const res = await createLeadApi(payload);

      const createdLead =
        res.data?.data ||
        res.data?.lead;

      toast.success(
        'Lead created successfully!'
      );

      setAddLeadOpen(false);

      await loadLeads();

      if (createdLead?._id) {
        navigate(
          `/leads/${createdLead._id}`
        );
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Failed to create lead.';

      toast.error(message);
    } finally {
      setAddLeadLoading(false);
    }
  };

  // =========================================================
  // DELETE
  // =========================================================

  const handleDelete = async (id) => {
    try {
      await deleteLeadApi(id);

      toast.success('Lead deleted');

      loadLeads();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          'Delete failed'
      );
    }
  };

  // =========================================================
  // STATUS
  // =========================================================

  const handleStatusChange = async (
    id,
    status,
    lostReason
  ) => {
    try {
      await updateLeadStatusApi(id, {
        status,
        lostReason,
      });

      toast.success(
        `Status updated to ${status}`
      );

      loadLeads();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          'Status update failed'
      );
    }
  };

  // =========================================================
  // FILTER STATE
  // =========================================================

  const currentFilters =
    Object.fromEntries(
      searchParams.entries()
    );

  const hasFilters =
    Object.keys(currentFilters).some(
      (key) =>
        !['page', 'search'].includes(
          key
        ) &&
        currentFilters[key]
    );

  const activeFilterCount =
    Object.keys(currentFilters).filter(
      (key) =>
        !['page', 'search'].includes(
          key
        ) &&
        currentFilters[key]
    ).length;

  // =========================================================
  // EXPORT
  // =========================================================

  const handleExportExcel = () =>
    exportExcelApi(buildQuery());

  const handleExportPDF = () =>
    exportPDFApi(buildQuery());

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="space-y-4">

      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Leads
          </h1>

          {!loading && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {pagination.total}{' '}
              {pagination.total === 1
                ? 'lead'
                : 'leads'}{' '}
              total
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">

          {/* =================================================
              NEW ADD LEAD BUTTON
          ================================================= */}

          <button
            type="button"
            onClick={() =>
              setAddLeadOpen(true)
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 shadow transition-colors"
          >
            <Plus className="w-4 h-4" />

            <span>Add Lead</span>
          </button>

          {/* IMPORT */}

          {user?.role !== 'employee' && (
            <button
              type="button"
              onClick={() =>
                setImportModalOpen(true)
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Import Leads from Excel/CSV"
            >
              <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />

              <span>Import Leads</span>
            </button>
          )}

          {/* EXPORT */}

          {user?.role !== 'employee' && (
            <>
              <button
                type="button"
                onClick={
                  handleExportExcel
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Export Filtered Leads to Excel"
              >
                <Download className="w-4 h-4" />

                <span className="hidden sm:inline">
                  Export Excel
                </span>

                <span className="sm:hidden">
                  Excel
                </span>
              </button>

              <button
                type="button"
                onClick={
                  handleExportPDF
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Export Filtered Leads to PDF"
              >
                <FileText className="w-4 h-4" />

                <span className="hidden sm:inline">
                  Export PDF
                </span>

                <span className="sm:hidden">
                  PDF
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* =====================================================
          SEARCH + FILTER
      ====================================================== */}

      <div className="flex items-center gap-2">

        <div className="flex-1">
          <SearchInput
            value={
              searchParams.get(
                'search'
              ) || ''
            }
            onChange={handleSearch}
            placeholder="Search mobile, name, part, vehicle…"
          />
        </div>

        <button
          type="button"
          onClick={() =>
            setFiltersOpen(true)
          }
          className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
            hasFilters
              ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />

          Filters

          {activeFilterCount > 0 && (
            <span className="ml-1 w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={() =>
              setSearchParams(
                searchParams.get(
                  'search'
                )
                  ? {
                      search:
                        searchParams.get(
                          'search'
                        ),
                    }
                  : {}
              )
            }
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors whitespace-nowrap"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* =====================================================
          LEADS CONTENT
      ====================================================== */}

      {loading ? (
        <LoadingState message="Loading leads…" />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={loadLeads}
        />
      ) : leads.length === 0 ? (
        <EmptyState
          title={
            hasFilters ||
            searchParams.get(
              'search'
            )
              ? 'No leads match your filters'
              : 'No leads yet'
          }
          description={
            hasFilters ||
            searchParams.get(
              'search'
            )
              ? 'Try adjusting your filters or search query.'
              : 'Start by adding your first customer enquiry.'
          }
          action={
            !hasFilters &&
            !searchParams.get(
              'search'
            )
              ? {
                  label: 'Add Lead',
                  onClick: () =>
                    setAddLeadOpen(
                      true
                    ),
                }
              : null
          }
        />
      ) : (
        <>
          <LeadTable
            leads={leads}
            user={user}
            onView={(id) =>
              navigate(
                `/leads/${id}`
              )
            }
            onDelete={
              handleDelete
            }
            onStatusChange={
              handleStatusChange
            }
            onRefresh={
              loadLeads
            }
          />

          {pagination.pages >
            1 && (
            <Pagination
              currentPage={
                pagination.page
              }
              totalPages={
                pagination.pages
              }
              totalItems={
                pagination.total
              }
              itemsPerPage={
                PAGE_LIMIT
              }
              onPageChange={
                handlePage
              }
            />
          )}
        </>
      )}

      {/* =====================================================
          FILTER DRAWER
      ====================================================== */}

      <LeadFiltersDrawer
        isOpen={filtersOpen}
        onClose={() =>
          setFiltersOpen(false)
        }
        filters={currentFilters}
        onApply={
          handleFiltersApply
        }
      />

      {/* =====================================================
          NEW PROFESSIONAL ADD LEAD FORM
      ====================================================== */}

      {addLeadOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-3 sm:p-5">

          <div className="w-full max-w-7xl my-2 sm:my-5 bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

            {/* FORM HEADER */}

            <div className="sticky top-0 z-20 flex items-center justify-between gap-4 px-5 py-4 sm:px-6 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">

              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                  Add New Lead
                </h2>

                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Create a complete customer enquiry with vehicle and part requirements
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (
                    !addLeadLoading
                  ) {
                    setAddLeadOpen(
                      false
                    );
                  }
                }}
                disabled={
                  addLeadLoading
                }
                className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FORM BODY */}

            <div className="p-3 sm:p-5 lg:p-6 max-h-[calc(100vh-110px)] overflow-y-auto">

              <LeadForm
                isNew={true}
                loading={
                  addLeadLoading
                }
                onSubmit={
                  handleCreateLead
                }
                onCancel={() => {
                  if (
                    !addLeadLoading
                  ) {
                    setAddLeadOpen(
                      false
                    );
                  }
                }}
              />

            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          IMPORT MODAL
      ====================================================== */}

      <ImportModal
        isOpen={
          importModalOpen
        }
        onClose={() =>
          setImportModalOpen(
            false
          )
        }
        onSuccess={
          loadLeads
        }
      />
    </div>
  );
}