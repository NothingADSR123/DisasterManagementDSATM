import React, { useState, useEffect } from 'react';

function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div
      className="fixed top-4 right-4 z-50"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={`px-4 py-2 rounded-full shadow-lg text-sm font-medium transition-all duration-300 ${
          isOnline
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white animate-pulse'
        }`}
      >
        <div className="flex items-center space-x-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-white' : 'bg-white animate-ping'
            }`}
            aria-hidden="true"
          ></span>
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>
      {/* Screen reader announcement */}
      <span className="sr-only">
        Connection status: {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}

export default OfflineIndicator;
