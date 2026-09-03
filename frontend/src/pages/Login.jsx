import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Car,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  UserCheck,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError(
        'Please enter your email / employee ID and password.'
      );
      return;
    }

    setLoading(true);

    try {
      await login(identifier.trim(), password);

      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Invalid credentials. Please verify your email and password.';

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (email, pwd) => {
    setIdentifier(email);
    setPassword(pwd);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-200">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mb-3">
            <Car className="w-7 h-7 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Drive Line
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Automobile Parts CRM
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6 sm:p-8">

          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">
            Sign in to your account
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email / Employee ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email or Employee ID
              </label>

              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoFocus
                autoComplete="username"
                placeholder="admin@driveline.com or DL001"
                className="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm px-4 py-3 pr-11 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((v) => !v)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Sign In */}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed shadow transition-colors mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Register Admin */}
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700/50 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Don't have an admin account?
            </p>

            <Link
              to="/register-admin"
              className="mt-2 inline-flex items-center justify-center font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              Register Admin
            </Link>
          </div>

          {/* Demo Accounts */}
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700/50">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">
              Quick Fill Demo Accounts:
            </p>

            <div className="grid grid-cols-3 gap-2">

              <button
                type="button"
                onClick={() =>
                  fillCredentials(
                    'admin@driveline.com',
                    'Admin@123'
                  )
                }
                className="flex flex-col items-center p-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-semibold transition-colors"
              >
                <ShieldCheck className="w-4 h-4 mb-1" />
                Admin
              </button>

              <button
                type="button"
                onClick={() =>
                  fillCredentials(
                    'manager@driveline.com',
                    'Manager@123'
                  )
                }
                className="flex flex-col items-center p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-colors"
              >
                <Briefcase className="w-4 h-4 mb-1" />
                Manager
              </button>

              <button
                type="button"
                onClick={() =>
                  fillCredentials(
                    'rahul@driveline.com',
                    'Employee@123'
                  )
                }
                className="flex flex-col items-center p-2 rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-xs font-semibold transition-colors"
              >
                <UserCheck className="w-4 h-4 mb-1" />
                Employee
              </button>

            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-5">
          Drive Line CRM · Automobile Parts Division
        </p>
      </div>
    </div>
  );
}