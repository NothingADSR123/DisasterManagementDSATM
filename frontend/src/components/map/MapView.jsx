import { useEffect, useState, useRef, memo } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Import components
import Shelters from './Shelters';
import HeatmapLayer from './HeatmapLayer';
import RoutingControl from './RoutingControl';

// Import utilities
import { getAll, subscribe, add, update, STORES } from '../../lib/idb';
import { offlineQueue } from '../../lib/offlineQueue';
import { seedMapFixtures } from '../../lib/fixtures/mapFixtures';

// Fix for default marker icons in Leaflet with webpack/vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/**
 * MapClickHandler Component
 * Handles click events on the map
 */
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick(e.latlng);
      }
    }
  });
  return null;
}

// Dummy safe zones for testing (defined outside component to prevent re-creation)
// In production, load from IndexedDB or API
const SAFE_ZONES = [
  { id: 'sz1', name: 'Park Safe Zone', lat: 12.9716, lng: 77.5946, radius: 500, description: 'Open park area' },
  { id: 'sz2', name: 'Stadium Safe Zone', lat: 12.9352, lng: 77.6245, radius: 800, description: 'Sports complex' },
  { id: 'sz3', name: 'School Safe Zone', lat: 12.9800, lng: 77.6000, radius: 400, description: 'School ground' }
];

/**
 * MapView Component
 * Main map component with offline support and real-time data
 */
function MapView({ filters = { showShelters: true, intensity: 50 }, mapKey = 0 }) {
  // State
  const [helpRequests, setHelpRequests] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showRouting, setShowRouting] = useState(false);
  const [routeFrom, setRouteFrom] = useState(null);
  const [routeTo, setRouteTo] = useState(null);
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [pickedLocation, setPickedLocation] = useState(null);

  // Refs
  const mapRef = useRef(null);
  const helpMarkersRef = useRef([]);
  const volunteerMarkersRef = useRef([]);
  const heatmapLayerRef = useRef(null);
  const safeZoneLayersRef = useRef([]);

  // Default map center (you can change this to your disaster area coordinates)
  const DEFAULT_CENTER = [12.9716, 77.5946]; // Bangalore, India - CHANGE THIS as needed
  const DEFAULT_ZOOM = 13;

  // Handle map resize when layout changes
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
        // Fit bounds with padding to keep markers visible
        if (helpRequests.length > 0 || shelters.length > 0) {
          const allPoints = [
            ...helpRequests.map(r => [r.lat || r.latitude, r.lng || r.longitude]),
            ...shelters.map(s => [s.lat || s.latitude, s.lng || s.longitude])
          ].filter(p => p[0] && p[1]);
          
          if (allPoints.length > 0) {
            const bounds = L.latLngBounds(allPoints);
            mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
          }
        }
      }, 100);
    }
  }, [mapKey, helpRequests, shelters]);

  /**
   * Load initial data from IndexedDB on mount
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        const [requests, vols, shelts] = await Promise.all([
          getAll(STORES.HELP_REQUESTS),
          getAll(STORES.VOLUNTEERS),
          getAll(STORES.SHELTERS)
        ]);

        // Seed fixtures if no data exists (dev mode)
        if ((!requests || requests.length === 0) && 
            (!vols || vols.length === 0) && 
            (!shelts || shelts.length === 0)) {
          console.log('[MapView] No data found, seeding fixtures...');
          await seedMapFixtures();
          
          // Reload data after seeding
          const [newRequests, newVols, newShelts] = await Promise.all([
            getAll(STORES.HELP_REQUESTS),
            getAll(STORES.VOLUNTEERS),
            getAll(STORES.SHELTERS)
          ]);
          
          setHelpRequests(newRequests);
          setVolunteers(newVols);
          setShelters(newShelts);
          
          // Generate heatmap points from help requests
          const points = newRequests.map(req => ({
            lat: req.lat || req.latitude,
            lng: req.lng || req.longitude,
            intensity: req.severity === 'High' ? 1.0 : req.severity === 'Medium' ? 0.6 : 0.3
          }));
          setHeatmapPoints(points);
        } else {
          setHelpRequests(requests);
          setVolunteers(vols);
          setShelters(shelts);

          // Generate heatmap points from help requests
          const points = requests.map(req => ({
            lat: req.lat || req.latitude,
            lng: req.lng || req.longitude,
            intensity: req.severity === 'High' ? 1.0 : req.severity === 'Medium' ? 0.6 : 0.3
          }));
          setHeatmapPoints(points);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadData();
  }, []);

  /**
   * Subscribe to real-time data changes
   */
  useEffect(() => {
    const unsubscribeHelp = subscribe(STORES.HELP_REQUESTS, (data) => {
      setHelpRequests(data);
      // Update heatmap
      const points = data.map(req => ({
        lat: req.lat || req.latitude,
        lng: req.lng || req.longitude,
        intensity: req.severity || 0.5
      }));
      setHeatmapPoints(points);
    });

    const unsubscribeVolunteers = subscribe(STORES.VOLUNTEERS, (data) => {
      setVolunteers(data);
    });

    const unsubscribeShelters = subscribe(STORES.SHELTERS, (data) => {
      setShelters(data);
    });

    return () => {
      unsubscribeHelp();
      unsubscribeVolunteers();
      unsubscribeShelters();
    };
  }, []);

  /**
   * Handle online/offline events
   */
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      console.log('Connection restored');
    };

    const handleOffline = () => {
      setIsOffline(true);
      console.log('Connection lost - offline mode');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Listen for routing requests
   */
  useEffect(() => {
    const handleRouteRequest = (event) => {
      const { from, to, name } = event.detail;
      console.log('[MapView] Route requested:', { from, to, name });
      
      if (from && to) {
        console.log('[MapView] Setting route from/to:', from, to);
        setRouteFrom(from);
        setRouteTo(to);
        setShowRouting(true);
      } else if (to) {
        // Use current location or map center as starting point
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const currentPos = [position.coords.latitude, position.coords.longitude];
            console.log('[MapView] Got current position:', currentPos);
            setRouteFrom(currentPos);
            setRouteTo(to);
            setShowRouting(true);
          },
          (error) => {
            console.error('Error getting location:', error);
            // Fallback to map center
            console.log('[MapView] Using map center as fallback');
            const center = mapRef.current ? mapRef.current.getCenter() : null;
            const fallbackPos = center ? [center.lat, center.lng] : DEFAULT_CENTER;
            setRouteFrom(fallbackPos);
            setRouteTo(to);
            setShowRouting(true);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    };

    window.addEventListener('map:route', handleRouteRequest);

    return () => {
      window.removeEventListener('map:route', handleRouteRequest);
    };
  }, []);

  /**
   * Render markers for help requests
   */
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    helpMarkersRef.current.forEach(marker => marker.remove());
    helpMarkersRef.current = [];

    // Custom icon for help requests (Need Help)
    const needHelpIcon = L.divIcon({
      className: 'need-help-marker',
      html: `<div style="background-color: #ef4444; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 18px;">🆘</span>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });

    // Create markers
    const markers = helpRequests.map(request => {
      const marker = L.marker(
        [request.lat || request.latitude, request.lng || request.longitude],
        { icon: needHelpIcon }
      );

      const popupContent = `
        <div style="min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #ef4444;">Help Needed</h3>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Type:</strong> ${request.type || 'General'}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Severity:</strong> ${request.severity || 'Medium'}</p>
          ${request.description ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Details:</strong> ${request.description}</p>` : ''}
          ${request.contact ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Contact:</strong> ${request.contact}</p>` : ''}
          <button 
            id="accept-btn-${request.id}"
            style="margin-top: 8px; padding: 6px 12px; background-color: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%;"
          >
            Queue Accept
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);
      
      // Add click handler after popup opens
      marker.on('popupopen', () => {
        const btn = document.getElementById(`accept-btn-${request.id}`);
        if (btn) {
          btn.onclick = async () => {
            try {
              const volunteerId = localStorage.getItem('volunteerId') || 'unknown-volunteer';

              // Update request locally: set status, acceptedBy and append history
              const updatedRequest = {
                ...request,
                status: 'assigned',
                acceptedBy: volunteerId,
                history: [
                  ...(request.history || []),
                  { status: 'assigned', by: volunteerId, at: Date.now() }
                ]
              };

              // Persist update to IndexedDB so UI reflects immediately
              await update(STORES.HELP_REQUESTS, updatedRequest);

              // Queue server sync (offlineQueue expects an action object)
              await offlineQueue.add({
                type: 'UPDATE_REQUEST',
                endpoint: `/api/requests/${request.id}`,
                payload: { status: 'assigned', acceptedBy: volunteerId, history: updatedRequest.history }
              });

              btn.textContent = 'Queued!';
              btn.style.backgroundColor = '#6b7280';
              btn.disabled = true;
            } catch (error) {
              console.error('Error queueing accept:', error);
              alert('Error queueing action. Please try again.');
            }
          };
        }
      });

      marker.addTo(mapRef.current);
      return marker;
    });

    helpMarkersRef.current = markers;

    return () => {
      helpMarkersRef.current.forEach(marker => marker.remove());
      helpMarkersRef.current = [];
    };
  }, [helpRequests]);

  /**
   * Render markers for volunteers (Can Help)
   */
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    volunteerMarkersRef.current.forEach(marker => marker.remove());
    volunteerMarkersRef.current = [];

    // Custom icon for volunteers (Can Help)
    const canHelpIcon = L.divIcon({
      className: 'can-help-marker',
      html: `<div style="background-color: #3b82f6; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 18px;">🤝</span>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });

    // Filter volunteers that have valid coordinates and create markers
    const volunteersWithCoords = volunteers.filter(volunteer => {
      const lat = volunteer.lat || volunteer.latitude;
      const lng = volunteer.lng || volunteer.longitude;
      return lat !== undefined && lng !== undefined && lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);
    });

    const markers = volunteersWithCoords.map(volunteer => {
      const marker = L.marker(
        [volunteer.lat || volunteer.latitude, volunteer.lng || volunteer.longitude],
        { icon: canHelpIcon }
      );

      const popupContent = `
        <div style="min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #3b82f6;">Volunteer Available</h3>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Name:</strong> ${volunteer.name || 'Anonymous'}</p>
          ${volunteer.skills ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Skills:</strong> ${volunteer.skills}</p>` : ''}
          ${volunteer.contact ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Contact:</strong> ${volunteer.contact}</p>` : ''}
          <button 
            onclick="window.dispatchEvent(new CustomEvent('webrtc:connect', { detail: { id: ${JSON.stringify(volunteer.id)} } }))"
            style="margin-top: 8px; padding: 6px 12px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%;"
          >
            Connect (WebRTC)
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.addTo(mapRef.current);
      return marker;
    });

    volunteerMarkersRef.current = markers;

    return () => {
      volunteerMarkersRef.current.forEach(marker => marker.remove());
      volunteerMarkersRef.current = [];
    };
  }, [volunteers]);

  /**
   * Render safe zones when filter is enabled
   */
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing safe zone layers
    safeZoneLayersRef.current.forEach(layer => layer.remove());
    safeZoneLayersRef.current = [];

    // Only render if safe zones filter is enabled
    if (!filters.safeZones) {
      return;
    }

    // Create circle overlays for each safe zone
    const layers = SAFE_ZONES.map(zone => {
      // Create circle
      const circle = L.circle([zone.lat, zone.lng], {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.2,
        radius: zone.radius,
        weight: 2
      });

      // Create marker for the center
      const markerIcon = L.divIcon({
        className: 'safe-zone-marker',
        html: `<div style="background-color: #10b981; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 16px;">✓</span>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
      });

      const marker = L.marker([zone.lat, zone.lng], { icon: markerIcon });

      const popupContent = `
        <div style="min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #10b981;">Safe Zone</h3>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Name:</strong> ${zone.name}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Radius:</strong> ${zone.radius}m</p>
          ${zone.description ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Info:</strong> ${zone.description}</p>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);

      circle.addTo(mapRef.current);
      marker.addTo(mapRef.current);

      return [circle, marker];
    }).flat();

    safeZoneLayersRef.current = layers;

    return () => {
      safeZoneLayersRef.current.forEach(layer => layer.remove());
      safeZoneLayersRef.current = [];
    };
  }, [filters.safeZones]);

  /**
   * Handle map click to add help request or pick location
   */
  const handleMapClick = async (latlng) => {
    // If in location picking mode, set the picked location
    if (isPickingLocation) {
      setPickedLocation(latlng);
      return;
    }

    // Otherwise, show prompt to add SOS request
    const description = window.prompt(
      `Add SOS Request at this location?\n\nLatitude: ${latlng.lat.toFixed(6)}\nLongitude: ${latlng.lng.toFixed(6)}\n\nDescribe your emergency:`
    );
    
    if (description && description.trim()) {
      try {
        // Create the help request
        const helpRequest = {
          id: `help-${Date.now()}`,
          lat: latlng.lat,
          lng: latlng.lng,
          latitude: latlng.lat,
          longitude: latlng.lng,
          type: 'SOS',
          severity: 'High',
          description: description.trim(),
          timestamp: Date.now(),
          status: 'pending'
        };

        // Add to IndexedDB for immediate display
        await add(STORES.HELP_REQUESTS, helpRequest);
        
        // If offline, add to queue for later sync
        if (isOffline) {
          await offlineQueue.add({
            type: 'addHelpRequest',
            data: helpRequest
          });
          alert('SOS added to offline queue. Will sync when online.');
        } else {
          alert('SOS request added successfully!');
        }
      } catch (error) {
        console.error('Error adding help request:', error);
      }
    }
  };

  /**
   * Handle route found
   */
  const handleRouteFound = (routeData) => {
    console.log('[MapView] Route found:', routeData);
    // Optional: Show a notification
    if (routeData && routeData.distance) {
      const distanceKm = (routeData.distance / 1000).toFixed(2);
      const durationMin = Math.round(routeData.duration / 60);
      console.log(`Route: ${distanceKm}km, ${durationMin} minutes`);
    }
  };

  return (
    <div className={`map-view-container ${isOffline ? 'offline' : ''}`}>
      {/* Offline Indicator */}
      {isOffline && (
        <div className="offline-indicator">
          <span>⚠️ Offline Mode</span>
        </div>
      )}

      {/* Map Container */}
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        whenCreated={(map) => { 
          mapRef.current = map; 
          // Dispatch event to notify that map is ready
          window.dispatchEvent(new CustomEvent('map:ready', { 
            detail: { map } 
          }));
        }}
      >
        {/* 
          Tile Layer - OpenStreetMap
          You can swap this URL with other tile providers:
          - Mapbox: https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}
          - Google Maps: Requires additional setup
          - Local tiles: http://localhost:8080/tiles/{z}/{x}/{y}.png
        */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          // For offline cached tiles (served by service worker), use:
          // url="/tiles/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Map Click Handler */}
        <MapClickHandler onMapClick={handleMapClick} />

        {/* Shelters Component - only show if enabled */}
        {filters.showShelters && <Shelters key="shelters-layer" />}

        {/* Routing Control */}
        <RoutingControl
          visible={showRouting}
          from={routeFrom}
          to={routeTo}
          onRouteFound={handleRouteFound}
        />
      </MapContainer>

      {/* Route Controls */}
      {showRouting && (
        <div className="route-controls">
          <button
            onClick={() => {
              setShowRouting(false);
              setRouteFrom(null);
              setRouteTo(null);
            }}
            className="close-route-btn"
          >
            ✕ Close Route
          </button>
        </div>
      )}

      {/* Location Picking Controls */}
      {isPickingLocation && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-4 z-[1200] border-2 border-blue-500">
          <div className="text-center mb-3">
            <p className="font-bold text-lg text-gray-900">Click on the map to pick a location</p>
            {pickedLocation && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: {pickedLocation.lat.toFixed(6)}, {pickedLocation.lng.toFixed(6)}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (pickedLocation) {
                  // Dispatch event with picked location
                  window.dispatchEvent(new CustomEvent('map:location-picked', {
                    detail: {
                      lat: pickedLocation.lat,
                      lng: pickedLocation.lng,
                      address: `${pickedLocation.lat.toFixed(6)}, ${pickedLocation.lng.toFixed(6)}`
                    }
                  }));
                  
                  // Navigate back to help page
                  window.history.back();
                } else {
                  alert('Please click on the map to select a location');
                }
              }}
              disabled={!pickedLocation}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              ✓ Confirm Location
            </button>
            <button
              onClick={() => {
                setIsPickingLocation(false);
                setPickedLocation(null);
                window.history.back();
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Export memoized version to prevent unnecessary re-renders
export default memo(MapView, (prevProps, nextProps) => {
  // Only re-render if filters.safeZones or filters.showShelters actually changed
  return (
    prevProps.filters.safeZones === nextProps.filters.safeZones &&
    prevProps.filters.showShelters === nextProps.filters.showShelters &&
    prevProps.mapKey === nextProps.mapKey
  );
});
