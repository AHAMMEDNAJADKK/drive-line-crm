import { useSearchParams } from 'react-router-dom';
import { Archive, Trash2 } from 'lucide-react';
import Leads from './Leads';

export default function ClosedLeads() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') === 'deleted' ? 'deleted' : 'closed';

  const setTab = (tab) => {
    const p = new URLSearchParams(searchParams);
    if (tab === 'deleted') {
      p.set('tab', 'deleted');
    } else {
      p.delete('tab');
    }
    p.delete('page');
    p.delete('status');
    setSearchParams(p);
  };

  return (
    <div className="space-y-4">
      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700/60 pb-3">
        <button
          type="button"
          onClick={() => setTab('closed')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            currentTab === 'closed'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Closed Leads</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('deleted')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            currentTab === 'deleted'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Deleted Leads</span>
        </button>
      </div>

      {currentTab === 'closed' ? (
        <Leads isClosed={true} />
      ) : (
        <Leads isDeletedView={true} />
      )}
    </div>
  );
}
