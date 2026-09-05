import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex min-h-[100dvh] items-center justify-center overflow-y-auto p-3 sm:p-6"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-950/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Modal'}
        className={`
          relative z-10
          flex w-full ${sizes[size]}
          max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)]
          flex-col
          overflow-hidden
          rounded-2xl
          border border-gray-200
          bg-white
          shadow-2xl
          dark:border-gray-700
          dark:bg-gray-900
        `}
      >
        {/* Header */}
        {title && (
          <div
            className="
              flex flex-shrink-0 items-center justify-between
              gap-4
              border-b border-gray-100
              bg-white
              px-5 py-4
              dark:border-gray-700
              dark:bg-gray-900
              sm:px-6 sm:py-5
            "
          >
            <h2
              className="
                min-w-0
                truncate
                text-base
                font-semibold
                text-gray-900
                dark:text-gray-100
                sm:text-lg
              "
            >
              {title}
            </h2>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="
                flex-shrink-0
                rounded-xl
                p-2
                text-gray-400
                transition-all
                duration-200
                hover:bg-gray-100
                hover:text-gray-700
                focus:outline-none
                focus:ring-2
                focus:ring-gray-300
                dark:hover:bg-gray-800
                dark:hover:text-gray-200
                dark:focus:ring-gray-600
              "
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            overscroll-contain
            scrollbar-thin
            scrollbar-thumb-gray-300
            scrollbar-track-transparent
            dark:scrollbar-thumb-gray-600
          "
        >
          {children}
        </div>
      </div>
    </div>
  );
}