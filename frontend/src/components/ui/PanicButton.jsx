import React, { useState } from 'react';

function PanicButton({ onPanic }) {
  const [isActive, setIsActive] = useState(false);

  const handleClick = () => {
    setIsActive(true);
    if (onPanic) {
      onPanic();
    }
    // Reset active state after animation
    setTimeout(() => setIsActive(false), 1000);
  };

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 transition-all duration-200 flex items-center justify-center ${
        isActive ? 'animate-pulse scale-110' : ''
      }`}
      aria-label="Emergency panic button"
      title="Emergency Help"
    >
      <svg
        className="w-8 h-8"
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
      {isActive && (
        <span className="absolute inset-0 rounded-full bg-red-600 opacity-75 animate-ping"></span>
      )}
    </button>
  );
}

export default PanicButton;
