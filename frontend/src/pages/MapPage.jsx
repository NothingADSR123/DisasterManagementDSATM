import React, { useState } from 'react';
import Card from '../components/ui/Card';

// Placeholder component for Maps team
function MapPlaceholder() {
  return (
    <div className="h-full min-h-[400px] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <svg
          className="w-16 h-16 mx-auto mb-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          Map Component
        </h3>
        <p className="text-gray-600 mb-4">
          Maps & routing implemented by Maps team.
        </p>
        <p className="text-sm text-gray-500">
          Map API available at <code className="bg-gray-200 px-2 py-1 rounded">../lib/routing.js</code>
        </p>
      </div>
    </div>
  );
}

function MapPage() {
  const [filters, setFilters] = useState({
    safeZones: true,
    shelters: true,
    heatmap: false,
    intensity: 50,
  });

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
    console.log('Filter changed:', filterName, value);
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="container mx-auto px-4 py-6 h-full">
        <div className="flex flex-col md:flex-row gap-6 h-full">
          {/* Sidebar - Filters */}
          <aside className="md:w-64 flex-shrink-0">
            <Card title="Map Filters" className="sticky top-6">
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

                {/* Shelters Toggle */}
                <div>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-gray-700">Shelters</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={filters.shelters}
                        onChange={(e) => handleFilterChange('shelters', e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={`w-10 h-6 rounded-full transition-colors ${
                          filters.shelters ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                        onClick={() => handleFilterChange('shelters', !filters.shelters)}
                      >
                        <div
                          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            filters.shelters ? 'transform translate-x-4' : ''
                          }`}
                        ></div>
                      </div>
                    </div>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Display emergency shelters</p>
                </div>

                {/* Heatmap Toggle */}
                <div>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-gray-700">Heatmap</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={filters.heatmap}
                        onChange={(e) => handleFilterChange('heatmap', e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={`w-10 h-6 rounded-full transition-colors ${
                          filters.heatmap ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                        onClick={() => handleFilterChange('heatmap', !filters.heatmap)}
                      >
                        <div
                          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            filters.heatmap ? 'transform translate-x-4' : ''
                          }`}
                        ></div>
                      </div>
                    </div>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Show activity density</p>
                </div>

                {/* Intensity Slider */}
                {filters.heatmap && (
                  <div>
                    <label htmlFor="intensity-slider" className="block text-sm font-medium text-gray-700 mb-2">
                      Intensity: {filters.intensity}%
                    </label>
                    <input
                      id="intensity-slider"
                      type="range"
                      min="0"
                      max="100"
                      value={filters.intensity}
                      onChange={(e) => handleFilterChange('intensity', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>
                )}

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
          </aside>

          {/* Main Map Area */}
          <main className="flex-1 flex flex-col">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Map</h1>
            <div className="flex-1">
              <MapPlaceholder />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default MapPage;
