import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import MapView from '../components/map/MapView';

function MapPage() {
  const [filters, setFilters] = useState({
    safeZones: true,
    showShelters: true,
    intensity: 50,
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
    console.log('Filter changed:', filterName, value);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
    // Trigger map resize after animation
    setTimeout(() => {
      setMapKey(prev => prev + 1);
    }, 300);
  };

  // Auto-collapse sidebar on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="h-screen flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Toggle Button (Mobile) */}
        <button
          onClick={toggleSidebar}
          className="fixed top-20 left-4 z-[1100] md:hidden bg-white rounded-lg shadow-lg p-2 hover:bg-gray-50 transition"
          aria-label={sidebarCollapsed ? 'Open filters' : 'Close filters'}
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {sidebarCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>

        {/* Sidebar - Filters */}
        <aside
          className={`fixed md:relative top-0 left-0 h-full bg-white shadow-xl md:shadow-none z-[1000] transition-transform duration-300 ${
            sidebarCollapsed ? '-translate-x-full md:translate-x-0 md:w-0 md:hidden' : 'translate-x-0 md:w-64'
          } w-64 overflow-y-auto`}
          style={{ paddingTop: '1rem' }}
        >
          <div className="p-4">
            {/* Close button for mobile */}
            <button
              onClick={toggleSidebar}
              className="md:hidden absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              aria-label="Close filters"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <Card title="Map Filters" className="border-0 shadow-none">
              <div className="space-y-6">
                {/* Safe Zones Toggle */}
                <div>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-gray-700">Safe Zones</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={filters.safeZones}
                        onChange={(e) => handleFilterChange('safeZones', e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={`w-10 h-6 rounded-full transition-colors ${
                          filters.safeZones ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                        onClick={() => handleFilterChange('safeZones', !filters.safeZones)}
                      >
                        <div
                          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            filters.safeZones ? 'transform translate-x-4' : ''
                          }`}
                        ></div>
                      </div>
                    </div>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Show designated safe areas</p>
                </div>

                {/* Show Shelters Toggle */}
                <div>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-gray-700">Show Shelters</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={filters.showShelters}
                        onChange={(e) => handleFilterChange('showShelters', e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={`w-10 h-6 rounded-full transition-colors ${
                          filters.showShelters ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                        onClick={() => handleFilterChange('showShelters', !filters.showShelters)}
                      >
                        <div
                          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            filters.showShelters ? 'transform translate-x-4' : ''
                          }`}
                        ></div>
                      </div>
                    </div>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Display shelters with navigation</p>
                </div>

                {/* Intensity Slider - removed, no longer needed */}

                {/* Legend */}
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Legend</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span className="text-xs text-gray-600">Safe Zone</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      <span className="text-xs text-gray-600">Shelter</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span className="text-xs text-gray-600">Help Request</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-purple-500 rounded"></div>
                      <span className="text-xs text-gray-600">Volunteer</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </aside>

        {/* Main Map Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-4 bg-white border-b border-gray-200 z-[900]">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Live Disaster Map</h1>
          </div>
          <div
            id="map-container"
            className="flex-1 relative"
            style={{ minHeight: '360px' }}
            role="application"
            aria-label="Interactive disaster map showing help requests, volunteers, and shelters"
          >
            <MapView filters={filters} mapKey={mapKey} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default MapPage;
