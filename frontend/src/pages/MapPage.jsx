import React, { useState, useEffect, useRef, useMemo } from 'react';
import Card from '../components/ui/Card';
import MapView from '../components/map/MapView';
import { 
  downloadTiles, 
  calculateTileUrls, 
  estimateDownload, 
  getCacheStats, 
  clearTileCache,
  getCurrentMapBounds 
} from '../lib/mapDownloader';

function MapPage() {
  const [filters, setFilters] = useState({
    safeZones: true,
    showShelters: true,
    intensity: 50,
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  
  // Offline download state
  const [downloadState, setDownloadState] = useState({
    isDownloading: false,
    progress: 0,
    total: 0,
    estimate: null,
    stats: null,
    error: null
  });
  const [zoomRange, setZoomRange] = useState({ min: 12, max: 15 });
  const downloadController = useRef(null);
  const mapInstanceRef = useRef(null);

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
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
  
  // Load cache stats on mount
  useEffect(() => {
    loadCacheStats();
  }, []);
  
  // Listen for map instance
  useEffect(() => {
    const handleMapReady = (e) => {
      mapInstanceRef.current = e.detail.map;
      updateEstimate();
    };
    
    window.addEventListener('map:ready', handleMapReady);
    return () => window.removeEventListener('map:ready', handleMapReady);
  }, [zoomRange]);
  
  // Update estimate when zoom range changes
  useEffect(() => {
    updateEstimate();
  }, [zoomRange]);
  
  async function loadCacheStats() {
    try {
      const stats = await getCacheStats();
      setDownloadState(prev => ({ ...prev, stats }));
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  }
  
  function updateEstimate() {
    if (!mapInstanceRef.current) return;
    
    try {
      const bounds = getCurrentMapBounds(mapInstanceRef.current);
      if (!bounds) return;
      
      const estimate = estimateDownload(bounds, zoomRange.min, zoomRange.max);
      setDownloadState(prev => ({ ...prev, estimate }));
    } catch (error) {
      console.error('Failed to estimate download:', error);
    }
  }
  
  async function handleDownload() {
    if (!mapInstanceRef.current) {
      setDownloadState(prev => ({ 
        ...prev, 
        error: 'Map not ready. Please wait a moment and try again.' 
      }));
      return;
    }
    
    try {
      setDownloadState(prev => ({ 
        ...prev, 
        isDownloading: true, 
        progress: 0, 
        total: 0, 
        error: null 
      }));
      
      const bounds = getCurrentMapBounds(mapInstanceRef.current);
      if (!bounds) {
        throw new Error('Could not get map bounds');
      }
      
      const urls = calculateTileUrls(bounds, zoomRange.min, zoomRange.max);
      
      downloadController.current = new AbortController();
      
      const stats = await downloadTiles(
        urls,
        (current, total) => {
          setDownloadState(prev => ({ 
            ...prev, 
            progress: current, 
            total 
          }));
        },
        {
          signal: downloadController.current.signal
        }
      );
      
      setDownloadState(prev => ({ 
        ...prev, 
        isDownloading: false,
        progress: stats.downloaded,
        total: stats.total
      }));
      
      // Reload cache stats
      await loadCacheStats();
      
      alert(`Download complete!\n${stats.cached} tiles cached\n${stats.skipped} already cached\n${stats.failed} failed`);
      
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadState(prev => ({ 
        ...prev, 
        isDownloading: false, 
        error: error.message 
      }));
    }
  }
  
  function handleCancelDownload() {
    if (downloadController.current) {
      downloadController.current.abort();
      setDownloadState(prev => ({ 
        ...prev, 
        isDownloading: false, 
        error: 'Download cancelled' 
      }));
    }
  }
  
  async function handleClearCache() {
    if (!confirm('Clear all cached map tiles? This will free up storage but you will need to re-download tiles for offline use.')) {
      return;
    }
    
    try {
      await clearTileCache();
      await loadCacheStats();
      alert('Map cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Failed to clear cache: ' + error.message);
    }
  }

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

                {/* Offline Maps Download */}
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Offline Maps</h4>
                  
                  {/* Cache Stats */}
                  {downloadState.stats && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <div className="text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Cached Tiles:</span>
                          <span className="font-medium">{downloadState.stats.tileCount}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span>Storage Used:</span>
                          <span className="font-medium">{downloadState.stats.estimatedTotalSizeMB} MB</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Zoom Range Selection */}
                  <div className="mb-3">
                    <label className="text-xs text-gray-600 block mb-1">Zoom Levels</label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="18"
                        value={zoomRange.min}
                        onChange={(e) => setZoomRange(prev => ({ ...prev, min: parseInt(e.target.value) }))}
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                        disabled={downloadState.isDownloading}
                      />
                      <span className="text-xs text-gray-600 py-1">to</span>
                      <input
                        type="number"
                        min="1"
                        max="18"
                        value={zoomRange.max}
                        onChange={(e) => setZoomRange(prev => ({ ...prev, max: parseInt(e.target.value) }))}
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                        disabled={downloadState.isDownloading}
                      />
                    </div>
                  </div>
                  
                  {/* Download Estimate */}
                  {downloadState.estimate && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-3">
                      <div className="text-xs text-blue-800">
                        <div className="flex justify-between">
                          <span>Tiles to download:</span>
                          <span className="font-medium">{downloadState.estimate.tileCount}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span>Estimated size:</span>
                          <span className="font-medium">~{downloadState.estimate.estimatedSizeMB} MB</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Progress Bar */}
                  {downloadState.isDownloading && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Downloading...</span>
                        <span>{downloadState.progress}/{downloadState.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${downloadState.total > 0 ? (downloadState.progress / downloadState.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Error Message */}
                  {downloadState.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
                      <p className="text-xs text-red-800">{downloadState.error}</p>
                    </div>
                  )}
                  
                  {/* Download Buttons */}
                  <div className="space-y-2">
                    {!downloadState.isDownloading ? (
                      <>
                        <button
                          onClick={handleDownload}
                          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                        >
                          Download Current Area
                        </button>
                        {downloadState.stats && downloadState.stats.tileCount > 0 && (
                          <button
                            onClick={handleClearCache}
                            className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
                          >
                            Clear Cache
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={handleCancelDownload}
                        className="w-full bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition"
                      >
                        Cancel Download
                      </button>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Download map tiles for the current view to use offline during emergencies.
                  </p>
                </div>
                
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
