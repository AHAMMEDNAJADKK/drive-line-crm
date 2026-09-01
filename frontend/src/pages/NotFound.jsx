import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-4">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-black text-gray-900 dark:text-gray-100 mb-2">404</h1>
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">Page Not Found</h2>
      <p className="text-sm text-gray-500 max-w-sm mb-6">
        The page you are looking for does not exist or has been moved.
      </p>
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 shadow transition-colors"
      >
        <Home className="w-4 h-4" /> Back to Dashboard
      </button>
    </div>
  );
}
