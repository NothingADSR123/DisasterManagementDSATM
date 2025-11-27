import { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { getAll, subscribe, add, update, STORES } from '../../lib/idb';

/**
 * Shelters Component
 * Renders shelter markers on the map with offline-first support
 * 
 * Features:
 * - Loads shelters from IndexedDB (offline-first)
 * - Attempts to fetch fresh data from API when online
 * - Shows detailed popup with name, capacity, status, last updated
 * - Navigate button triggers map:route event
 * - Visual indication for cached/offline data
 */
export default function Shelters() {
  const map = useMap();
  const [shelters, setShelters] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dataSource, setDataSource] = useState('loading'); // 'loading', 'cache', 'online'
  const markersRef = useRef([]);

  /**
   * Load shelters from IndexedDB (offline-first approach)
   */
  const loadSheltersFromCache = async () => {
    try {
      const cachedShelters = await getAll(STORES.SHELTERS);
      if (cachedShelters && cachedShelters.length > 0) {
        setShelters(cachedShelters);
        setDataSource('cache');
        console.log(`Loaded ${cachedShelters.length} shelters from cache`);
      }
    } catch (error) {
      console.error('Error loading shelters from cache:', error);
    }
  };

  /**
   * Fetch shelters from API (when online)
   */
  const fetchSheltersFromAPI = async () => {
    if (!navigator.onLine) {
      console.log('Offline - using cached shelters');
      return;
    }

    try {
      // TODO: Replace with your actual API endpoint
      // const response = await fetch('/api/shelters');
      // const data = await response.json();
      
      // For now, we'll just use cached data
      // When you have an API, uncomment above and update IndexedDB:
      // for (const shelter of data) {
      //   await update(STORES.SHELTERS, { ...shelter, lastUpdated: Date.now() });
      // }
      // setShelters(data);
      // setDataSource('online');
      
      console.log('API fetch would happen here when endpoint is available');
    } catch (error) {
      console.error('Error fetching shelters from API:', error);
      console.log('Falling back to cached data');
      setDataSource('cache');
    }
  };

  /**
   * Initialize shelters data
   */
  useEffect(() => {
    const initializeShelters = async () => {
      // Load from cache first (offline-first)
      await loadSheltersFromCache();
      
      // Try to fetch fresh data if online
      if (navigator.onLine) {
        await fetchSheltersFromAPI();
      }
    };

    initializeShelters();

    // Subscribe to real-time updates from IndexedDB
    const unsubscribe = subscribe(STORES.SHELTERS, (data) => {
      setShelters(data);
    });

    return unsubscribe;
  }, []);

  /**
   * Monitor online/offline status
   */
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('Connection restored - refreshing shelter data');
      fetchSheltersFromAPI();
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('Connection lost - using cached shelter data');
      setDataSource('cache');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Get user location for navigation
   */
  const getUserLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn('Could not get user location:', error);
          // Fallback to map center
          const center = map.getCenter();
          resolve([center.lat, center.lng]);
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  };

  /**
   * Format time ago (e.g., "2 hours ago")
   */
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  /**
   * Determine shelter status
   */
  const getShelterStatus = (shelter) => {
    if (shelter.status === 'closed' || shelter.isClosed) {
      return { status: 'Closed', color: '#ef4444' };
    }
    
    const available = shelter.available || 0;
    const capacity = shelter.capacity || 0;
    
    if (available <= 0) {
      return { status: 'Full', color: '#f59e0b' };
    }
    
    if (available < capacity * 0.2) {
      return { status: 'Limited Space', color: '#f59e0b' };
    }
    
    return { status: 'Open', color: '#10b981' };
  };

  /**
   * Render shelter markers
   */
  useEffect(() => {
    if (!shelters || shelters.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Create markers for each shelter
    const markers = shelters.map(shelter => {
      const statusInfo = getShelterStatus(shelter);
      const isCached = dataSource === 'cache' || !isOnline;

      // Custom shelter icon with status indicator
      const shelterIcon = L.divIcon({
        className: 'shelter-marker',
        html: `<div style="position: relative;">
          <div style="background-color: ${statusInfo.color}; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 18px;">🏠</span>
          </div>
          ${isCached ? `<div style="position: absolute; top: -8px; right: -8px; background: #f59e0b; color: white; font-size: 10px; padding: 2px 4px; border-radius: 3px; font-weight: bold;">📦</div>` : ''}
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
      });

      const marker = L.marker(
        [shelter.lat || shelter.latitude, shelter.lng || shelter.longitude],
        { icon: shelterIcon }
      );

      // Create detailed popup content
      const popupContent = `
        <div style="min-width: 250px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">
              ${shelter.name || 'Shelter'}
              ${isCached ? '<span style="color: #f59e0b; font-size: 11px; margin-left: 6px;">(cached)</span>' : ''}
            </h3>
            <span style="background-color: ${statusInfo.color}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
              ${statusInfo.status}
            </span>
          </div>
          
          <div style="margin-bottom: 8px;">
            <p style="margin: 4px 0; font-size: 13px; color: #4b5563;">
              <strong style="color: #1f2937;">Capacity:</strong> 
              <span style="color: ${shelter.available > 0 ? '#10b981' : '#ef4444'};">
                ${shelter.available || 0}
              </span> / ${shelter.capacity || 'Unknown'}
            </p>
            
            ${shelter.address ? `
              <p style="margin: 4px 0; font-size: 13px; color: #4b5563;">
                <strong style="color: #1f2937;">Address:</strong><br/>
                ${shelter.address}
              </p>
            ` : ''}
            
            ${shelter.contact ? `
              <p style="margin: 4px 0; font-size: 13px; color: #4b5563;">
                <strong style="color: #1f2937;">Contact:</strong> ${shelter.contact}
              </p>
            ` : ''}
            
            ${shelter.facilities ? `
              <p style="margin: 4px 0; font-size: 13px; color: #4b5563;">
                <strong style="color: #1f2937;">Facilities:</strong> ${shelter.facilities}
              </p>
            ` : ''}
            
            <p style="margin: 6px 0 0 0; font-size: 11px; color: #9ca3af;">
              <strong>Last Updated:</strong> ${formatTimeAgo(shelter.lastUpdated || shelter.timestamp)}
            </p>
          </div>
          
          <button 
            id="navigate-btn-${shelter.id}"
            style="margin-top: 8px; padding: 8px 16px; background-color: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; width: 100%; font-weight: 600; font-size: 14px; transition: background-color 0.2s;"
            onmouseover="this.style.backgroundColor='#2563eb'"
            onmouseout="this.style.backgroundColor='#3b82f6'"
          >
            🧭 Navigate to Shelter
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'shelter-popup'
      });

      // Add click handler for navigate button after popup opens
      marker.on('popupopen', async () => {
        const navigateBtn = document.getElementById(`navigate-btn-${shelter.id}`);
        if (navigateBtn) {
          navigateBtn.onclick = async () => {
            try {
              // Get user location
              const userLocation = await getUserLocation();
              
              // Dispatch route event
              window.dispatchEvent(new CustomEvent('map:route', {
                detail: {
                  from: userLocation,
                  to: [shelter.lat || shelter.latitude, shelter.lng || shelter.longitude],
                  type: 'shelter',
                  id: shelter.id,
                  name: shelter.name
                }
              }));
              
              // Visual feedback
              navigateBtn.textContent = '✓ Route Requested';
              navigateBtn.style.backgroundColor = '#10b981';
              
              setTimeout(() => {
                if (navigateBtn) {
                  navigateBtn.textContent = '🧭 Navigate to Shelter';
                  navigateBtn.style.backgroundColor = '#3b82f6';
                }
              }, 2000);
            } catch (error) {
              console.error('Error requesting route:', error);
              alert('Could not get your location. Please enable location services.');
            }
          };
        }
      });

      marker.addTo(map);
      return marker;
    });

    markersRef.current = markers;

    // Cleanup on unmount
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [shelters, map, dataSource, isOnline]);

  return null; // This component doesn't render anything directly
}
