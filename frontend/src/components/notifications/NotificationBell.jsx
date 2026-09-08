import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  AlertOctagon,
  Calendar,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getNotificationsApi,
  markNotificationAsReadApi,
  markAllNotificationsAsReadApi
} from '../../services/hrApi';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const containerRef = useRef(null);

  // Strictly HR-only
  const isHr = user?.role === 'hr';

  const fetchNotifications = useCallback(async () => {
    if (!isHr) return;
    try {
      const response = await getNotificationsApi();
      const list = response.data?.data || [];
      setNotifications(list);
    } catch (err) {
      // Silently catch in polling / background
      console.error('Failed to fetch passport notifications:', err);
    }
  }, [isHr]);

  useEffect(() => {
    if (!isHr) return;

    fetchNotifications();

    // Periodic background sync every 60s
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [isHr, fetchNotifications]);

  // Click outside and Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isHr) {
    return null;
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleToggle = () => {
    if (!isOpen) {
      // Refresh on open
      fetchNotifications();
    }
    setIsOpen((prev) => !prev);
  };

  const handleMarkAsRead = async (id, event) => {
    event?.stopPropagation();
    try {
      await markNotificationAsReadApi(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true, readAt: new Date() } : n))
      );
    } catch {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    try {
      setMarkingAll(true);
      await markAllNotificationsAsReadApi();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date() }))
      );
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification._id);
    }
    if (notification.relatedEmployeeId?._id) {
      setIsOpen(false);
      navigate(`/employees/${notification.relatedEmployeeId._id}`);
    }
  };

  const formatExpiryDate = (dateVal) => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return String(dateVal);
    }
  };

  const formatTimeAgo = (dateVal) => {
    if (!dateVal) return '';
    try {
      const diffMs = Date.now() - new Date(dateVal).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        title="Passport Expiry Notifications"
        aria-label="Passport Expiry Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-800 animate-in fade-in zoom-in duration-150">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-100 bg-white shadow-xl dark:border-gray-700/60 dark:bg-gray-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5 dark:border-gray-700/50">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Passport Alerts
              </h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200/60 dark:border-red-900/40">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-50 transition-colors"
                title="Mark all as read"
              >
                {markingAll ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )}
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/40 scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-700/40 text-gray-400 dark:text-gray-500 mb-3">
                  <Bell className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  No notifications
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                  All active staff passport expiries are up to date.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isExpired =
                  item.title?.toLowerCase().includes('expired') ||
                  item.message?.toLowerCase().includes('expired');
                const employee = item.relatedEmployeeId;
                const empName = employee?.name || 'Staff Member';
                const expiryDate =
                  employee?.passportExpireDate ||
                  item.passportExpireDate;

                return (
                  <div
                    key={item._id}
                    onClick={() => handleNotificationClick(item)}
                    className={`group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer ${
                      item.read
                        ? 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                        : 'bg-indigo-50/40 hover:bg-indigo-50/70 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40'
                    }`}
                  >
                    {/* Status Icon */}
                    <div
                      className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${
                        isExpired
                          ? 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-200/50 dark:border-red-900/40'
                          : 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/40'
                      }`}
                    >
                      {isExpired ? (
                        <AlertOctagon className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider ${
                            isExpired
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {item.title ||
                            (isExpired
                              ? 'Passport Expired'
                              : 'Passport Expiry Approaching')}
                        </span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                          {formatTimeAgo(item.createdAt)}
                        </span>
                      </div>

                      <p className="mt-0.5 text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {empName}
                        {employee?.employeeId && (
                          <span className="ml-1 text-[11px] font-normal text-gray-500 dark:text-gray-400">
                            ({employee.employeeId})
                          </span>
                        )}
                      </p>

                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2">
                        {item.message}
                      </p>

                      {expiryDate && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span>Expires: {formatExpiryDate(expiryDate)}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions / Read Dot */}
                    <div className="flex flex-col items-end justify-between self-stretch pl-1">
                      {!item.read ? (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(item._id, e)}
                          className="rounded-full p-1 text-gray-400 hover:bg-white hover:text-indigo-600 dark:hover:bg-gray-700 dark:hover:text-indigo-400 transition-colors"
                          title="Mark as read"
                        >
                          <span className="block h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-900" />
                        </button>
                      ) : (
                        <Check className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
                      )}

                      {employee?._id && (
                        <ExternalLink className="h-3 w-3 text-gray-300 opacity-0 group-hover:opacity-100 dark:text-gray-600 transition-opacity" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 bg-gray-50/70 px-4 py-2.5 dark:border-gray-700/50 dark:bg-gray-800/80 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/hr');
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                View HR Dashboard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
