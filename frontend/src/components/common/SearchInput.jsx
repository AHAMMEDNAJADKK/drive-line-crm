import { Search, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export default function SearchInput({ value, onChange, placeholder = 'Search...', debounceMs = 350, className = '' }) {
  const [internal, setInternal] = useState(value || '');
  const timer = useRef(null);

  useEffect(() => { setInternal(value || ''); }, [value]);

  const handleChange = (e) => {
    const v = e.target.value;
    setInternal(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), debounceMs);
  };

  const handleClear = () => {
    setInternal('');
    clearTimeout(timer.current);
    onChange('');
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={internal}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
      />
      {internal && (
        <button onClick={handleClear} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
