import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/help', label: 'Help' },
    { path: '/volunteer', label: 'Volunteer' },
    { path: '/map', label: 'Map' },
    { path: '/offline-guide', label: 'Offline Guide' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-white shadow-md" style={{ borderBottom: '3px solid #415A78' }}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img 
              src="/logo.png" 
              alt="Disaster Management Logo" 
              className="h-16 w-auto"
            />
            <span className="text-2xl font-bold" style={{ color: '#415A78' }}>Trivya</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-6" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`transition-all px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isActive(link.path) 
                    ? 'font-semibold shadow-sm' 
                    : 'hover:bg-gray-100'
                }`}
                style={{
                  color: isActive(link.path) ? '#fff' : '#415A78',
                  backgroundColor: isActive(link.path) ? '#415A78' : 'transparent',
                  focusRingColor: '#415A78'
                }}
                aria-current={isActive(link.path) ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ color: '#415A78', focusRingColor: '#415A78' }}
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden pb-4" aria-label="Mobile navigation">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`px-4 py-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isActive(link.path) ? 'font-semibold shadow-sm' : 'hover:bg-gray-100'
                  }`}
                  style={{
                    color: isActive(link.path) ? '#fff' : '#415A78',
                    backgroundColor: isActive(link.path) ? '#415A78' : 'transparent',
                    focusRingColor: '#415A78'
                  }}
                  aria-current={isActive(link.path) ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

export default Header;
