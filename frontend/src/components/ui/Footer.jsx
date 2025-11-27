import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 text-gray-300 py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Project Name and Copyright */}
          <div className="text-center md:text-left">
            <p className="font-semibold text-white">DisasterManagement DSATM</p>
            <p className="text-sm">© {currentYear} All rights reserved.</p>
          </div>

          {/* Links to Docs */}
          <nav className="flex space-x-6" aria-label="Footer navigation">
            <Link
              to="/offline-guide"
              className="text-sm hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 rounded px-2 py-1"
            >
              Documentation
            </Link>
            <a
              href="https://github.com/NothingADSR123/DisasterManagementDSATM"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 rounded px-2 py-1"
            >
              GitHub
            </a>
            <Link
              to="/help"
              className="text-sm hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 rounded px-2 py-1"
            >
              Help
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
