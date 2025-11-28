/**
 * Map Helper Functions
 * Utilities for nearby requests, routing, and navigation
 * 
 * FEATURES IMPLEMENTED:
 * - View Nearby Requests (Volunteer page → Map)
 * - Two-way navigation:
 *   1. Volunteer → Needy (blue route)
 *   2. Needy → Nearest Shelter (orange route)
 * - Offline-first routing with cached routes
 * - Distance calculation and scoring
 * - Toast notifications for user feedback
 * 
 * EVENT NAMES (used for integration):
 * - 'map:show-nearby' - Trigger display of nearby requests
 *   detail: { volunteerLocation: {lat, lng}, requests: Array }
 * 
 * - 'map:route-started' - Route calculation started
 *   detail: { meta: { type, requestId, shelterId? } }
 * 
 * - 'map:route-closed' - Route closed by user
 *   detail: { meta: { type, requestId, shelterId? } }
 * 
 * - 'map:close-route' - Close current route (internal)
 * 
 * TESTING STEPS:
 * 1. Go to Volunteer page
 * 2. Click "View Nearby Requests" button
 * 3. Allow location access
 * 4. Map opens with nearby requests shown as red markers
 * 5. Click on a request marker
 * 6. Click "Navigate to Need" → blue route appears with ETA
 * 7. Click "Navigate to Shelter" → orange route appears to nearest shelter
 * 8. Click "Close Route" button to remove route
 * 
 * DEFENSIVE CODING:
 * - All async calls wrapped in try/catch
 * - Feature detection for geolocation, routing modules
 * - Graceful degradation when offline
 * - Non-blocking toasts instead of alerts
 * - Safe marker removal with error handling
 */

import { getAll } from './idb';
import { computeRoute, getCachedRoute, hashCoords } from './routing';

/**
 * Compute distance between two coordinates using Haversine formula
 * @param {Object} a - {lat, lng}
 * @param {Object} b - {lat, lng}
 * @returns {number} Distance in meters
 */
export function computeDistanceMeters(a, b) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  
  const aRad = toRad(a.lat);
  const bRad = toRad(b.lat);
  
  const aa = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(aRad) * Math.cos(bRad) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

/**
 * Format distance for display
 */
export function formatDistanceMeters(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Format duration for display
 */
export function formatDurationSeconds(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}

/**
 * Show a temporary toast notification
 */
export function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  const bgColors = {
    info: 'bg-blue-600',
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-yellow-600'
  };
  
  toast.className = `fixed bottom-8 right-8 ${bgColors[type] || bgColors.info} text-white px-6 py-3 rounded-lg shadow-lg z-50`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast);
    }
  }, duration);
  
  return toast;
}

/**
 * Find nearest shelter to a given location
 * @param {Object} location - {lat, lng}
 * @param {Array} shelters - Array of shelter objects
 * @returns {Object|null} Nearest shelter or null
 */
export function findNearestShelter(location, shelters) {
  if (!shelters || shelters.length === 0) return null;
  
  let nearest = null;
  let minDist = Infinity;
  
  shelters.forEach(shelter => {
    const shelterLoc = {
      lat: shelter.lat || shelter.latitude,
      lng: shelter.lng || shelter.longitude
    };
    
    if (!shelterLoc.lat || !shelterLoc.lng) return;
    
    const dist = computeDistanceMeters(location, shelterLoc);
    if (dist < minDist) {
      minDist = dist;
      nearest = { ...shelter, distance: dist };
    }
  });
  
  return nearest;
}

/**
 * Perform route calculation with offline fallback
 * @param {Object} params
 * @param {Array} params.from - [lat, lng]
 * @param {Array} params.to - [lat, lng]
 * @param {Object} params.meta - Metadata about the route
 * @param {Function} params.onSuccess - Callback on success
 * @param {Function} params.onError - Callback on error
 */
export async function performRouteCalculation({ from, to, meta, onSuccess, onError }) {
  try {
    let route;
    
    if (!navigator.onLine) {
      // Try to get cached route
      try {
        const routeHash = await hashCoords(from, to);
        route = await getCachedRoute(from, to);
        
        if (!route) {
          showToast('Route unavailable offline', 'warning');
          if (onError) onError(new Error('No cached route available offline'));
          return null;
        }
        
        route.source = 'cache-offline';
        showToast('Using cached route (offline)', 'info');
      } catch (error) {
        console.error('Error getting cached route:', error);
        showToast('Route unavailable offline', 'error');
        if (onError) onError(error);
        return null;
      }
    } else {
      // Online - compute route
      try {
        route = await computeRoute(from, to);
      } catch (error) {
        console.error('Error computing route online:', error);
        
        // Try cached fallback
        try {
          route = await getCachedRoute(from, to);
          if (route) {
            route.source = 'cache-fallback';
            showToast('Using cached route (online failed)', 'warning');
          } else {
            throw new Error('No cached route available');
          }
        } catch (cacheError) {
          showToast('Route unavailable', 'error');
          if (onError) onError(error);
          return null;
        }
      }
    }
    
    // Add metadata
    route.meta = meta;
    route.from = from;
    route.to = to;
    
    if (onSuccess) onSuccess(route);
    return route;
    
  } catch (error) {
    console.error('Error in performRouteCalculation:', error);
    showToast('Failed to calculate route', 'error');
    if (onError) onError(error);
    return null;
  }
}
