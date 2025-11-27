import React, { useState } from 'react';
import Card from '../components/ui/Card';
import MapView from '../components/map/MapView';

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
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Live Disaster Map</h1>
            <div className="flex-1" style={{ minHeight: '500px' }}>
              <MapView />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default MapPage;
