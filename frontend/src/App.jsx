import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { useAuth } from './context/AuthContext';
import { BranchProvider } from './context/BranchContext';

import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './layouts/ProtectedRoute';

import Login from './pages/Login';
import RegisterAdmin from './pages/RegisterAdmin';

import Dashboard from './pages/Dashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminUsers from './pages/SuperAdminUsers';
import Leads from './pages/Leads';
import ClosedLeads from './pages/ClosedLeads';
import LeadDetail from './pages/LeadDetail';
import Employees from './pages/Employees';
import EmployeeDetail from './pages/EmployeeDetail';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Suppliers from './pages/Suppliers';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import HRDashboard from './pages/HRDashboard';
import Branches from './pages/Branches';

function getHomeRoute(role) {
  if (role === 'superadmin') return '/super-admin';
  if (role === 'hr') return '/hr';
  return '/dashboard';
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading Drive Line CRM…
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to={getHomeRoute(user.role)} replace />
          ) : (
            <Login />
          )
        }
      />

      {/* First Admin Registration */}
      <Route
        path="/register-admin"
        element={
          user ? (
            <Navigate to={getHomeRoute(user.role)} replace />
          ) : (
            <RegisterAdmin />
          )
        }
      />

      {/* Protected — all authenticated users */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Super Admin developer control panel & user management */}
          <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
            <Route path="/super-admin" element={<SuperAdminDashboard />} />
            <Route path="/super-admin/users" element={<SuperAdminUsers />} />
          </Route>

          <Route
            path="/dashboard"
            element={
              user?.role === 'superadmin' ? (
                <Navigate to="/super-admin" replace />
              ) : user?.role === 'hr' ? (
                <Navigate to="/hr" replace />
              ) : (
                <Dashboard />
              )
            }
          />

          <Route
            path="/leads"
            element={<Leads />}
          />

          <Route
            path="/closed-leads"
            element={<ClosedLeads />}
          />

          <Route
            path="/leads/:id"
            element={<LeadDetail />}
          />

          {/* Customers */}
          <Route
            path="/customers"
            element={<Customers />}
          />

          <Route
            path="/customers/:id"
            element={<CustomerDetail />}
          />

          {/* Suppliers */}
          <Route
            path="/suppliers"
            element={<Suppliers />}
          />

          <Route
            path="/profile"
            element={<Profile />}
          />

          <Route
            element={<ProtectedRoute allowedRoles={['hr']} />}
          >
            <Route path="/hr" element={<HRDashboard />} />
          </Route>

          {/* Admin & Super Admin branch management */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={['superadmin', 'admin']}
              />
            }
          >
            <Route
              path="/branches"
              element={<Branches />}
            />
          </Route>

          {/* Admin, Super Admin, and HR employee management */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={['superadmin', 'admin', 'hr']}
              />
            }
          >
            <Route
              path="/employees"
              element={<Employees />}
            />

            <Route
              path="/employees/:id"
              element={<EmployeeDetail />}
            />
          </Route>
        </Route>
      </Route>

      {/* Redirects */}
      <Route
        path="/"
        element={<Navigate to={user ? getHomeRoute(user.role) : '/login'} replace />}
      />

      <Route
        path="*"
        element={<NotFound />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <BranchProvider>
        <AppRoutes />
      </BranchProvider>
    </BrowserRouter>
  );
}