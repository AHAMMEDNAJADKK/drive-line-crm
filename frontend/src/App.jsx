import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { useAuth } from './context/AuthContext';

import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './layouts/ProtectedRoute';

import Login from './pages/Login';
import RegisterAdmin from './pages/RegisterAdmin';

import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Employees from './pages/Employees';
import EmployeeDetail from './pages/EmployeeDetail';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Suppliers from './pages/Suppliers';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

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
            <Navigate to="/dashboard" replace />
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
            <Navigate to="/dashboard" replace />
          ) : (
            <RegisterAdmin />
          )
        }
      />

      {/* Protected — all authenticated users */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/leads"
            element={<Leads />}
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

          {/* Admin + Manager only */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={['admin', 'manager']}
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
        element={<Navigate to="/dashboard" replace />}
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
      <AppRoutes />
    </BrowserRouter>
  );
}