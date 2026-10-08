import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCog,
  UserSquare2,
  UserRound,
  Building2,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Truck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import QuickLeadModal from '../components/leads/QuickLeadModal';
import NotificationBell from '../components/notifications/NotificationBell';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickLeadOpen, setQuickLeadOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';

    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }

    return document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === 'dark' ? 'light' : 'dark'
    );
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const navItems = user?.role === 'hr'
    ? [
        { to: '/hr', icon: UserCog, label: 'HR' },
        { to: '/employees', icon: Users, label: 'Employees' }
      ]
    : [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/leads', icon: UserSquare2, label: 'Leads' },
        { to: '/closed-leads', icon: CheckCircle2, label: 'Closed Leads' },
        ...(user?.role === 'admin'
          ? [
              { to: '/branches', icon: Building2, label: 'Branches' },
              { to: '/employees', icon: Users, label: 'Employees' }
            ]
          : []),
        { to: '/customers', icon: UserRound, label: 'Customers' },
        { to: '/suppliers', icon: Truck, label: 'Suppliers' }
      ];

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-indigo-600 text-white shadow-sm'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-gray-100'
    }`;

  const getPageLabel = () => {
    if (location.pathname.startsWith('/branches')) {
      return 'Branches';
    }

    const customerMatch = location.pathname.startsWith('/customers');

    if (customerMatch) {
      return 'Customers';
    }

    const supplierMatch = location.pathname.startsWith('/suppliers');

    if (supplierMatch) {
      return 'Suppliers';
    }

    const current = navItems.find((item) =>
      location.pathname.startsWith(item.to)
    );

    return current?.label || 'Drive Line';
  };

  const SidebarContent = ({ mobile = false }) => {
    const collapsed = mobile ? false : sidebarCollapsed;

    return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-3 px-4 py-5 border-b border-gray-100 dark:border-gray-700/50`}>
        {collapsed ? (
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            className="flex items-center justify-center p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <img
              src="/drive-line-logo-mark.svg"
              alt="Drive Line"
              className="w-9 h-9 object-contain dark:hidden"
            />
            <img
              src="/drive-line-logo-mark-dark.svg"
              alt="Drive Line"
              className="w-9 h-9 object-contain hidden dark:block"
            />
          </button>
        ) : (
          <>
            <div className="flex items-center min-w-0">
              <img
                src="/drive-line-logo.svg"
                alt="Drive Line"
                className="h-8 max-w-[155px] w-auto object-contain dark:hidden"
              />
              <img
                src="/drive-line-logo-dark.svg"
                alt="Drive Line"
                className="h-8 max-w-[155px] w-auto object-contain hidden dark:block"
              />
            </div>

            {!mobile && (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Quick Add Lead */}
      {user?.role !== 'hr' && <div className="px-3 py-3">
        <button
          onClick={() => {
            setQuickLeadOpen(true);
            setSidebarOpen(false);
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 shadow transition-colors"
          title="Add Lead"
        >
          <Plus className="w-4 h-4" />
          {!collapsed && 'Add Lead'}
        </button>
      </div>}

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={navLinkClass}
            onClick={() => setSidebarOpen(false)}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && item.label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-700/50 space-y-1">
        <NavLink
          to="/profile"
          className={navLinkClass}
          onClick={() => setSidebarOpen(false)}
        >
          <div className="w-7 h-7 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>

          {!collapsed && <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {user?.name}
            </p>

            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 capitalize truncate">
              <span>{user?.role}</span>
              {user?.branchId ? (
                <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 truncate">
                  • {user.branchId.name || user.branchId.code}
                </span>
              ) : user?.role === 'admin' ? (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 truncate">
                  • All Branches
                </span>
              ) : null}
            </div>
          </div>}
        </NavLink>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700/50 transition-all duration-200 ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-60'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700/50 transform transition-transform duration-200 lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <SidebarContent mobile />
      </aside>

      {/* Main content area */}
      <div className={`flex flex-col min-h-screen transition-all duration-200 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'}`}>
        {/* Top nav */}
        <nav className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Breadcrumb */}
              <div className="hidden sm:flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {getPageLabel()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Add */}
              {user?.role !== 'hr' && <button
                onClick={() => setQuickLeadOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Quick Lead
              </button>}

              {/* HR-only Passport Notification Bell */}
              <NotificationBell />

              {/* Branch indicator */}
              {user?.branchId ? (
                <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{user.branchId.code || user.branchId.name}</span>
                </span>
              ) : user?.role === 'admin' ? (
                <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                  <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>All Branches</span>
                </span>
              ) : null}

              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>


              {/* User avatar */}
              <NavLink
                to="/profile"
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              </NavLink>
            </div>
          </div>
        </nav>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      {/* Quick Lead Modal */}
      <QuickLeadModal
        isOpen={quickLeadOpen}
        onClose={() => setQuickLeadOpen(false)}
      />
    </div>
  );
}