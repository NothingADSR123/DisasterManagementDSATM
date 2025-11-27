import { useState, useCallback, useRef } from 'react';

let toastId = 0;

// Toast context to share toasts across components
let toastListeners = [];

const notifyListeners = (toasts) => {
  toastListeners.forEach((listener) => listener(toasts));
};

// Shared toast state
let toasts = [];

/**
 * Custom hook for managing toast notifications
 * @returns {Object} Toast methods
 */
export function useToast() {
  const [, setUpdate] = useState(0);

  const forceUpdate = useCallback(() => {
    setUpdate((prev) => prev + 1);
  }, []);

  // Register listener on mount
  if (!toastListeners.includes(forceUpdate)) {
    toastListeners.push(forceUpdate);
  }

  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
   * @param {number} timeout - Duration in milliseconds (default: 3000)
   */
  const showToast = useCallback((message, type = 'info', timeout = 3000) => {
    const id = ++toastId;
    const newToast = {
      id,
      message,
      type,
      timestamp: Date.now(),
    };

    toasts = [...toasts, newToast];
    notifyListeners(toasts);

    // Auto-dismiss after timeout
    if (timeout > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, timeout);
    }

    return id;
  }, []);

  /**
   * Dismiss a specific toast by ID
   * @param {number} id - Toast ID to dismiss
   */
  const dismissToast = useCallback((id) => {
    toasts = toasts.filter((toast) => toast.id !== id);
    notifyListeners(toasts);
  }, []);

  /**
   * Clear all toasts
   */
  const clearAllToasts = useCallback(() => {
    toasts = [];
    notifyListeners(toasts);
  }, []);

  return {
    showToast,
    dismissToast,
    clearAllToasts,
    toasts,
  };
}

/**
 * Toast Container component to render all active toasts
 * Place this component at the root level of your app
 */
export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  const getToastStyles = (type) => {
    const baseStyles = 'flex items-center space-x-3 p-4 rounded-lg shadow-lg max-w-md w-full';
    
    const typeStyles = {
      success: 'bg-green-500 text-white',
      error: 'bg-red-500 text-white',
      warning: 'bg-yellow-500 text-white',
      info: 'bg-blue-500 text-white',
    };

    return `${baseStyles} ${typeStyles[type] || typeStyles.info}`;
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return (
          <svg
            className="w-6 h-6 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'error':
        return (
          <svg
            className="w-6 h-6 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'warning':
        return (
          <svg
            className="w-6 h-6 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg
            className="w-6 h-6 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 space-y-3"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${getToastStyles(toast.type)} animate-slide-in`}
          role="alert"
        >
          {getIcon(toast.type)}
          <p className="flex-1 font-medium">{toast.message}</p>
          <button
            onClick={() => dismissToast(toast.id)}
            className="flex-shrink-0 ml-2 p-1 rounded hover:bg-white hover:bg-opacity-20 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Dismiss notification"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
