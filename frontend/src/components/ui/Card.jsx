import React from 'react';

function Card({ title, subtitle, children, className = '' }) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {title && (
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {title}
        </h2>
      )}
      {subtitle && (
        <p className="text-gray-600 mb-4">
          {subtitle}
        </p>
      )}
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default Card;
