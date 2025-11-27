import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { getCachedRoute, cacheRoute } from '../../lib/routing';

/**
 * RoutingControl Component
 * Renders routing between two points with offline support
 * 
 * Features:
 * - Online routing via Leaflet Routing Machine (OSRM)
 * - Offline route caching in IndexedDB
 * - Fallback to cached routes when offline
 * - Turn-by-turn instructions
 * - Route metadata (distance, duration, ETA)
 * - Callback for route calculation results
 */
export default function RoutingControl({ 
  visible, 
  from, 
  to, 
  onRouteCalculated,
  onRouteFound // Legacy support
}) {
  const map = useMap();
  const routingControlRef = useRef(null);
  const polylineRef = useRef(null);
  const markersRef = useRef([]);
  const [routeStatus, setRouteStatus] = useState('idle'); // idle, loading, online, cached, error
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  /**
   * Monitor online/offline status
   */
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Clean up map elements
   */
  const cleanup = () => {
    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }
    
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
  };

  /**
   * Create route markers
   */
  const createMarkers = (fromCoords, toCoords) => {
    const startMarker = L.marker(fromCoords, {
      icon: L.divIcon({
        className: 'route-marker',
        html: `<div style="background-color: #10b981; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 14px; font-weight: bold;">A</span>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })
    });

    const endMarker = L.marker(toCoords, {
      icon: L.divIcon({
        className: 'route-marker',
        html: `<div style="background-color: #ef4444; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 14px; font-weight: bold;">B</span>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })
    });

    startMarker.addTo(map);
    endMarker.addTo(map);

    markersRef.current = [startMarker, endMarker];
  };

  /**
   * Format duration in minutes/hours
   */
  const formatDuration = (seconds) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  /**
   * Render cached route
   */
  const renderCachedRoute = (cachedRoute) => {
    console.log('[RoutingControl] Rendering cached route:', cachedRoute);
    console.log('[RoutingControl] From:', from, 'To:', to);
    setRouteStatus('cached');

    // Create markers
    createMarkers(from, to);

    // Create polyline from cached geometry
    const coordinates = cachedRoute.geometry.map(coord => 
      Array.isArray(coord) ? [coord[0], coord[1]] : [coord.lat, coord.lng]
    );

    polylineRef.current = L.polyline(coordinates, {
      color: '#f59e0b',
      weight: 6,
      opacity: 0.7,
      dashArray: '10, 5' // Dashed line to indicate cached
    }).addTo(map);

    // Fit bounds to show entire route
    const bounds = L.latLngBounds(coordinates);
    map.fitBounds(bounds, { padding: [50, 50] });

    // Create info popup
    const midpoint = coordinates[Math.floor(coordinates.length / 2)];
    const popup = L.popup()
      .setLatLng(midpoint)
      .setContent(`
        <div style="text-align: center; min-width: 200px;">
          <div style="background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; margin-bottom: 8px; font-weight: 600;">
            📦 Cached Route (Offline)
          </div>
          <p style="margin: 4px 0;"><strong>Distance:</strong> ${(cachedRoute.distance / 1000).toFixed(2)} km</p>
          <p style="margin: 4px 0;"><strong>Duration:</strong> ${formatDuration(cachedRoute.duration)}</p>
          <p style="font-size: 11px; color: #666; margin-top: 8px;">
            Route unavailable online. Using cached data.
          </p>
        </div>
      `)
      .openOn(map);

    // Call callbacks
    const routeData = {
      distance: cachedRoute.distance,
      duration: cachedRoute.duration,
      time: cachedRoute.duration,
      coordinates: coordinates,
      geometry: cachedRoute.geometry,
      instructions: cachedRoute.instructions || [],
      summary: cachedRoute.summary,
      source: 'cache'
    };

    if (onRouteCalculated) {
      onRouteCalculated(routeData);
    }
    if (onRouteFound) {
      onRouteFound(routeData);
    }

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('map:routeFound', {
      detail: routeData
    }));
  };

  /**
   * Fetch route from OSRM API directly (fallback)
   */
  const fetchRouteFromOSRM = async (fromCoords, toCoords) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromCoords[1]},${fromCoords[0]};${toCoords[1]},${toCoords[0]}?overview=full&geometries=geojson&steps=true`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('OSRM API error');

      const data = await response.json();
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('No route found');
      }

      const route = data.routes[0];
      
      // Convert GeoJSON coordinates to LatLng
      const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

      // Extract instructions
      const instructions = route.legs[0].steps.map(step => ({
        text: step.maneuver.instruction || 'Continue',
        distance: step.distance,
        duration: step.duration
      }));

      return {
        geometry: coordinates,
        distance: route.distance,
        duration: route.duration,
        instructions: instructions,
        summary: {
          totalDistance: route.distance,
          totalTime: route.duration
        }
      };
    } catch (error) {
      console.error('OSRM fetch error:', error);
      throw error;
    }
  };

  /**
   * Main routing effect
   */
  useEffect(() => {
    if (!visible || !from || !to) {
      cleanup();
      setRouteStatus('idle');
      return;
    }

    const computeRoute = async () => {
      console.log('[RoutingControl] Computing route from', from, 'to', to);
      setRouteStatus('loading');

      // Check for cached route first (offline-first approach)
      const cachedRoute = await getCachedRoute(from, to);
      console.log('[RoutingControl] Cached route found:', !!cachedRoute);

      if (!isOnline) {
        // Offline mode
        if (cachedRoute) {
          renderCachedRoute(cachedRoute);
        } else {
          setRouteStatus('error');
          console.warn('Route unavailable offline and no cache');
          
          // Show error message
          const midpoint = [
            (from[0] + to[0]) / 2,
            (from[1] + to[1]) / 2
          ];

          L.popup()
            .setLatLng(midpoint)
            .setContent(`
              <div style="text-align: center; min-width: 200px; color: #ef4444;">
                <div style="font-size: 32px; margin-bottom: 8px;">⚠️</div>
                <p style="font-weight: 600; margin: 4px 0;">Route Unavailable Offline</p>
                <p style="font-size: 12px; color: #666; margin: 4px 0;">
                  No cached route available. Connect to internet to compute route.
                </p>
              </div>
            `)
            .openOn(map);
        }
        return;
      }

      // Online mode - try Leaflet Routing Machine first
      try {
        const routingControl = L.Routing.control({
          waypoints: [
            L.latLng(from[0], from[1]),
            L.latLng(to[0], to[1])
          ],
          routeWhileDragging: false,
          addWaypoints: false,
          draggableWaypoints: false,
          fitSelectedRoutes: true,
          showAlternatives: false,
          router: L.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1'
          }),
          lineOptions: {
            styles: [
              { color: '#3b82f6', opacity: 0.8, weight: 6 }
            ]
          },
          createMarker: function(i, waypoint, n) {
            const marker = L.marker(waypoint.latLng, {
              draggable: false,
              icon: L.divIcon({
                className: 'route-marker',
                html: `<div style="background-color: ${i === 0 ? '#10b981' : '#ef4444'}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-size: 14px; font-weight: bold;">${i === 0 ? 'A' : 'B'}</span>
                </div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
              })
            });
            return marker;
          }
        });

        // Listen for route found event
        routingControl.on('routesfound', async function(e) {
          console.log('[RoutingControl] Route found:', e.routes);
          const routes = e.routes;
          const route = routes[0];
          const summary = route.summary;
          
          setRouteStatus('online');

          const routeData = {
            distance: summary.totalDistance,
            duration: summary.totalTime,
            time: summary.totalTime,
            coordinates: route.coordinates,
            geometry: route.coordinates,
            instructions: route.instructions || [],
            summary: summary,
            source: 'online'
          };

          // Cache the route for offline use
          try {
            await cacheRoute(from, to, routeData);
            console.log('Route cached successfully');
          } catch (error) {
            console.error('Failed to cache route:', error);
          }

          // Call callbacks
          if (onRouteCalculated) {
            onRouteCalculated(routeData);
          }
          if (onRouteFound) {
            onRouteFound(routeData);
          }

          // Dispatch custom event
          window.dispatchEvent(new CustomEvent('map:routeFound', {
            detail: routeData
          }));
        });

        routingControl.on('routingerror', async function(e) {
          console.error('Routing error:', e);
          
          // Try OSRM direct API as fallback
          try {
            console.log('Trying OSRM direct API...');
            const osrmRoute = await fetchRouteFromOSRM(from, to);
            
            // Remove failed routing control
            if (routingControlRef.current) {
              map.removeControl(routingControlRef.current);
              routingControlRef.current = null;
            }

            // Create markers
            createMarkers(from, to);

            // Draw polyline
            polylineRef.current = L.polyline(osrmRoute.geometry, {
              color: '#3b82f6',
              weight: 6,
              opacity: 0.8
            }).addTo(map);

            map.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });

            const routeData = {
              ...osrmRoute,
              time: osrmRoute.duration,
              source: 'osrm-direct'
            };

            // Cache the route
            await cacheRoute(from, to, routeData);
            setRouteStatus('online');

            // Call callbacks
            if (onRouteCalculated) {
              onRouteCalculated(routeData);
            }
            if (onRouteFound) {
              onRouteFound(routeData);
            }

            window.dispatchEvent(new CustomEvent('map:routeFound', {
              detail: routeData
            }));

          } catch (osrmError) {
            console.error('OSRM fallback failed:', osrmError);
            
            // Last resort: use cached route if available
            if (cachedRoute) {
              console.log('Using cached route as last resort');
              renderCachedRoute(cachedRoute);
            } else {
              setRouteStatus('error');
            }
          }
        });

        routingControl.addTo(map);
        routingControlRef.current = routingControl;

      } catch (error) {
        console.error('Routing control error:', error);
        
        // Try cached route as fallback
        if (cachedRoute) {
          renderCachedRoute(cachedRoute);
        } else {
          setRouteStatus('error');
        }
      }
    };

    computeRoute();

    // Cleanup on unmount or when visibility changes
    return cleanup;
  }, [visible, from, to, map, isOnline]);

  return null; // This component doesn't render anything directly
}
