import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Import components
import Shelters from './Shelters';
import HeatmapLayer from './HeatmapLayer';
import RoutingControl from './RoutingControl';

// Import utilities
import { getAll, subscribe, add, STORES } from '../../lib/idb';
import { offlineQueue } from '../../lib/offlineQueue';

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

/**
 * MapView Component
 * Main map component with offline support and real-time data
 */
export default function MapView() {
  // State
  const [helpRequests, setHelpRequests] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showRouting, setShowRouting] = useState(false);
  const [routeFrom, setRouteFrom] = useState(null);
  const [routeTo, setRouteTo] = useState(null);

  // Refs
  const mapRef = useRef(null);
  const helpMarkersRef = useRef([]);
  const volunteerMarkersRef = useRef([]);
  const heatmapLayerRef = useRef(null);

  // Default map center (you can change this to your disaster area coordinates)
  const DEFAULT_CENTER = [12.9716, 77.5946]; // Bangalore, India - CHANGE THIS as needed
  const DEFAULT_ZOOM = 13;

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

        setHelpRequests(requests);
        setVolunteers(vols);
        setShelters(shelts);

        // Generate heatmap points from help requests
        const points = requests.map(req => ({
          lat: req.lat || req.latitude,
          lng: req.lng || req.longitude,
          intensity: req.severity || 0.5
        }));
        setHeatmapPoints(points);
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
      const { from, to } = event.detail;
      
      if (from && to) {
        setRouteFrom(from);
        setRouteTo(to);
        setShowRouting(true);
      } else if (to) {
        // Use current location or map center as starting point
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setRouteFrom([position.coords.latitude, position.coords.longitude]);
            setRouteTo(to);
            setShowRouting(true);
          },
          (error) => {
            console.error('Error getting location:', error);
            // Fallback to map center
            setRouteFrom(DEFAULT_CENTER);
            setRouteTo(to);
            setShowRouting(true);
          }
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
              await offlineQueue.add({ type: 'accept', id: request.id });
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

    // Create markers
    const markers = volunteers.map(volunteer => {
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
            onclick="window.dispatchEvent(new CustomEvent('webrtc:connect', { detail: { id: ${volunteer.id} } }))"
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
   * Handle map click to add help request
   */
  const handleMapClick = async (latlng) => {
    // Dispatch event to open NeedHelpForm
    window.dispatchEvent(new CustomEvent('map:addHelpRequest', {
      detail: {
        lat: latlng.lat,
        lng: latlng.lng
      }
    }));

    // Alternative: Add directly to queue when offline
    if (isOffline) {
      const confirmed = window.confirm('You are offline. Add help request to queue?');
      if (confirmed) {
        try {
          await offlineQueue.add({
            type: 'addHelpRequest',
            data: {
              lat: latlng.lat,
              lng: latlng.lng,
              timestamp: Date.now()
            }
          });
          
          // Also add to local IndexedDB for immediate display
          await add(STORES.HELP_REQUESTS, {
            lat: latlng.lat,
            lng: latlng.lng,
            type: 'General',
            severity: 'Medium',
            description: 'Added while offline'
          });
        } catch (error) {
          console.error('Error adding help request:', error);
        }
      }
    }
  };

  /**
   * Handle route found
   */
  const handleRouteFound = (routeData) => {
    console.log('Route found:', routeData);
    // You can display route info in a panel or notification
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
        whenCreated={(map) => { mapRef.current = map; }}
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

        {/* Shelters Component - loads its own data from IndexedDB */}
        <Shelters />

        {/* Heatmap Layer */}
        <HeatmapLayer ref={heatmapLayerRef} points={heatmapPoints} />

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
    </div>
  );
}
