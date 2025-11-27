/**
 * Routing Helper Module
 * 
 * Provides route computation with automatic caching and offline support.
 * Uses public routing APIs (OSRM, GraphHopper) with fallback to cached routes.
 * 
 * Features:
 * - Multiple routing service providers (OSRM, GraphHopper)
 * - Automatic route caching in IndexedDB
 * - Offline route retrieval from cache
 * - Retry mechanism with exponential backoff
 * - Coordinate hashing for cache keys
 * 
 * @module routing
 */

import { get, put, query, deleteRecord } from './db.js';
import { computeHash } from './db.js';

const STORE_NAME = 'routes';
const CACHE_EXPIRY_DAYS = 7; // Routes expire after 7 days
const CACHE_EXPIRY_MS = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

/**
 * Routing service providers
 * These are free public endpoints - swap with your own if needed
 * @constant {Object}
 */
export const ROUTING_PROVIDERS = {
  OSRM: {
    name: 'OSRM',
    url: 'https://router.project-osrm.org/route/v1/driving',
    format: 'osrm'
  },
  GRAPHHOPPER: {
    name: 'GraphHopper',
    url: 'https://graphhopper.com/api/1/route',
    apiKey: '', // Add your API key if using GraphHopper
    format: 'graphhopper'
  }
};

/**
 * Default routing provider
 * Change this to switch providers globally
 * @type {Object}
 */
let currentProvider = ROUTING_PROVIDERS.OSRM;

/**
 * Retry configuration
 * @constant {Object}
 */
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 5000,  // 5 seconds
  timeout: 15000   // 15 seconds
};


/**
 * Set the routing provider
 * @param {Object} provider - Provider from ROUTING_PROVIDERS
 */
export function setRoutingProvider(provider) {
  if (!provider || !provider.url) {
    throw new Error('Invalid routing provider');
  }
  currentProvider = provider;
  console.log(`Routing provider set to: ${provider.name}`);
}

/**
 * Get current routing provider
 * @returns {Object} Current provider
 */
export function getRoutingProvider() {
  return currentProvider;
}

/**
 * Hash coordinates for cache key generation
 * Creates a stable hash from two coordinate pairs
 * 
 * @param {Array<number>} from - [lat, lon] or [lat, lng]
 * @param {Array<number>} to - [lat, lon] or [lat, lng]
 * @param {number} [precision=4] - Decimal precision for rounding
 * @returns {Promise<string>} Hash string
 * 
 * @example
 * const key = await hashCoords([40.7128, -74.0060], [34.0522, -118.2437]);
 */
export async function hashCoords(from, to, precision = 4) {
  // Round coordinates to reduce cache misses from minor differences
  const roundCoord = (coord) => parseFloat(coord.toFixed(precision));
  
  const fromRounded = [roundCoord(from[0]), roundCoord(from[1])];
  const toRounded = [roundCoord(to[0]), roundCoord(to[1])];
  
  // Create stable string representation
  const coordString = `${fromRounded[0]},${fromRounded[1]}-${toRounded[0]},${toRounded[1]}`;
  
  // Use the db module's hash function for consistency
  return await computeHash({ coords: coordString });
}

/**
 * Generate route key for IndexedDB (legacy support)
 */
function generateRouteKey(from, to) {
  const fromKey = `${from[0].toFixed(4)},${from[1].toFixed(4)}`;
  const toKey = `${to[0].toFixed(4)},${to[1].toFixed(4)}`;
  return `${fromKey}:${toKey}`;
}

/**
 * Sleep utility for retry delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 * @param {number} attempt - Attempt number (0-indexed)
 * @returns {number} Delay in milliseconds
 */
function getBackoffDelay(attempt) {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}

/**
 * Fetch with timeout
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeout = RETRY_CONFIG.timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxAttempts - Maximum retry attempts
 * @returns {Promise<any>} Function result
 */
async function retryWithBackoff(fn, maxAttempts = RETRY_CONFIG.maxAttempts) {
  let lastError;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxAttempts - 1) {
        const delay = getBackoffDelay(attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxAttempts} after ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Parse OSRM response
 * @param {Object} data - OSRM API response
 * @returns {Object} Normalized route data
 */
function parseOSRMResponse(data) {
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error('No route found in OSRM response');
  }
  
  const route = data.routes[0];
  const leg = route.legs[0];
  
  // Convert GeoJSON coordinates to [lat, lon] pairs
  const geometry = route.geometry.type === 'LineString'
    ? route.geometry.coordinates.map(coord => [coord[1], coord[0]])
    : [];
  
  // Extract turn-by-turn steps
  const steps = leg.steps ? leg.steps.map(step => ({
    instruction: step.maneuver.type,
    text: step.name || 'Unnamed road',
    distance: step.distance,
    duration: step.duration,
    location: [step.maneuver.location[1], step.maneuver.location[0]]
  })) : [];
  
  return {
    geometry,
    distance: route.distance, // meters
    duration: route.duration, // seconds
    steps,
    provider: 'OSRM'
  };
}

/**
 * Parse GraphHopper response
 * @param {Object} data - GraphHopper API response
 * @returns {Object} Normalized route data
 */
function parseGraphHopperResponse(data) {
  if (!data.paths || data.paths.length === 0) {
    throw new Error('No route found in GraphHopper response');
  }
  
  const path = data.paths[0];
  
  // Convert points to [lat, lon] pairs
  const geometry = path.points.coordinates
    ? path.points.coordinates.map(coord => [coord[1], coord[0]])
    : [];
  
  // Extract instructions
  const steps = path.instructions ? path.instructions.map(instr => ({
    instruction: instr.sign,
    text: instr.text,
    distance: instr.distance,
    duration: instr.time / 1000, // Convert ms to seconds
    location: [instr.interval[0], instr.interval[1]]
  })) : [];
  
  return {
    geometry,
    distance: path.distance, // meters
    duration: path.time / 1000, // Convert ms to seconds
    steps,
    provider: 'GraphHopper'
  };
}

/**
 * Fetch route from OSRM service
 * @param {Array<number>} from - Start coordinates [lat, lon]
 * @param {Array<number>} to - End coordinates [lat, lon]
 * @returns {Promise<Object>} Route data
 */
async function fetchOSRMRoute(from, to) {
  const url = `${ROUTING_PROVIDERS.OSRM.url}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true`;
  
  const response = await fetchWithTimeout(url);
  
  if (!response.ok) {
    throw new Error(`OSRM API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return parseOSRMResponse(data);
}

/**
 * Fetch route from GraphHopper service
 * @param {Array<number>} from - Start coordinates [lat, lon]
 * @param {Array<number>} to - End coordinates [lat, lon]
 * @returns {Promise<Object>} Route data
 */
async function fetchGraphHopperRoute(from, to) {
  const params = new URLSearchParams({
    point: `${from[0]},${from[1]}`,
    point: `${to[0]},${to[1]}`,
    vehicle: 'car',
    locale: 'en',
    instructions: 'true',
    calc_points: 'true',
    points_encoded: 'false'
  });
  
  if (ROUTING_PROVIDERS.GRAPHHOPPER.apiKey) {
    params.append('key', ROUTING_PROVIDERS.GRAPHHOPPER.apiKey);
  }
  
  const url = `${ROUTING_PROVIDERS.GRAPHHOPPER.url}?${params}`;
  
  const response = await fetchWithTimeout(url);
  
  if (!response.ok) {
    throw new Error(`GraphHopper API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return parseGraphHopperResponse(data);
}

/**
 * Fetch route from current provider
 * @param {Array<number>} from - Start coordinates [lat, lon]
 * @param {Array<number>} to - End coordinates [lat, lon]
 * @returns {Promise<Object>} Route data
 */
async function fetchRoute(from, to) {
  if (currentProvider.format === 'osrm') {
    return await fetchOSRMRoute(from, to);
  } else if (currentProvider.format === 'graphhopper') {
    return await fetchGraphHopperRoute(from, to);
  } else {
    throw new Error(`Unsupported provider format: ${currentProvider.format}`);
  }
}

/**
 * Check if cached route is still valid
 */
function isRouteValid(route) {
  if (!route || !route.timestamp) return false;
  
  const age = Date.now() - route.timestamp;
  return age < CACHE_EXPIRY_MS;
}


/**
 * Get cached route from IndexedDB
 * @param {Array<number>} from - Start coordinates
 * @param {Array<number>} to - End coordinates
 * @returns {Promise<Object|null>} Cached route or null
 */
export async function getCachedRoute(from, to) {
  try {
    const routeKey = await hashCoords(from, to);
    const cached = await get(STORE_NAME, routeKey);
    
    if (!cached) {
      return null;
    }
    
    // Check if cache is expired
    if (!isRouteValid(cached)) {
      console.log(`Cache expired for route: ${routeKey}`);
      await deleteRecord(STORE_NAME, routeKey);
      return null;
    }
    
    const age = Date.now() - cached.timestamp;
    console.log(`Using cached route: ${routeKey} (age: ${Math.round(age / 1000 / 60)} min)`);
    return cached;
    
  } catch (error) {
    console.error('Error retrieving cached route:', error);
    return null;
  }
}

/**
 * Cache route in IndexedDB
 * @param {Array<number>} from - Start coordinates
 * @param {Array<number>} to - End coordinates
 * @param {Object} routeData - Route data to cache
 * @returns {Promise<string>} Cache ID
 */
export async function cacheRoute(from, to, routeData) {
  try {
    const routeKey = await hashCoords(from, to);
    const legacyKey = generateRouteKey(from, to);
    
    const cacheEntry = {
      id: routeKey,
      routeKey: legacyKey, // For backwards compatibility
      from,
      to,
      geometry: routeData.geometry || routeData.coordinates,
      distance: routeData.distance,
      duration: routeData.duration || routeData.time,
      steps: routeData.steps || routeData.instructions || [],
      summary: routeData.summary,
      provider: routeData.provider,
      timestamp: Date.now()
    };
    
    await put(STORE_NAME, cacheEntry);
    console.log(`Route cached: ${routeKey}`);
    return routeKey;
    
  } catch (error) {
    console.error('Error caching route:', error);
    throw error;
  }
}

/**
 * Compute a route between two points
 * 
 * Attempts to fetch from routing service with retry logic.
 * Caches successful routes in IndexedDB.
 * Falls back to cached route when offline or on failure.
 * 
 * @param {Array<number>} from - Start coordinates [lat, lon]
 * @param {Array<number>} to - End coordinates [lat, lon]
 * @param {Object} [options] - Computation options
 * @param {boolean} [options.preferCache=false] - Use cache even when online
 * @param {boolean} [options.skipCache=false] - Don't use cache, force fresh fetch
 * @returns {Promise<Object>} Route data with geometry, distance, duration, steps
 * 
 * @example
 * const route = await computeRoute(
 *   [40.7128, -74.0060], // New York
 *   [34.0522, -118.2437] // Los Angeles
 * );
 * 
 * console.log(`Distance: ${route.distance}m`);
 * console.log(`Duration: ${route.duration}s`);
 * console.log(`Steps: ${route.steps.length}`);
 */
export async function computeRoute(from, to, options = {}) {
  const { preferCache = false, skipCache = false } = options;
  
  // Validate coordinates
  if (!Array.isArray(from) || from.length !== 2 || !Array.isArray(to) || to.length !== 2) {
    throw new Error('Invalid coordinates. Expected [lat, lon] arrays.');
  }
  
  // Check if we should use cache first
  if (preferCache && !skipCache) {
    const cached = await getCachedRoute(from, to);
    if (cached) {
      return { ...cached, source: 'cache' };
    }
  }
  
  // Try to fetch from service if online
  if (navigator.onLine && !preferCache) {
    try {
      console.log(`Computing route from ${from} to ${to}...`);
      
      const route = await retryWithBackoff(() => fetchRoute(from, to));
      
      // Cache the route
      if (!skipCache) {
        await cacheRoute(from, to, route);
      }
      
      return { ...route, source: 'online' };
      
    } catch (error) {
      console.error('Failed to compute route online:', error);
      
      // Fall back to cache
      if (!skipCache) {
        const cached = await getCachedRoute(from, to);
        if (cached) {
          console.log('Using cached route as fallback');
          return { ...cached, source: 'cache-fallback' };
        }
      }
      
      throw error;
    }
  }
  
  // Offline or preferCache mode - use cache
  if (!skipCache) {
    const cached = await getCachedRoute(from, to);
    if (cached) {
      console.log('Using cached route (offline mode)');
      return { ...cached, source: 'cache-offline' };
    }
  }
  
  throw new Error('Route unavailable: offline and no cached route found');
}


/**
 * Delete cached route
 */
export async function deleteCachedRoute(from, to) {
  try {
    const routeKey = await hashCoords(from, to);
    await deleteRecord(STORE_NAME, routeKey);
    console.log(`Deleted cached route: ${routeKey}`);
  } catch (error) {
    console.error('Error deleting cached route:', error);
  }
}

/**
 * Clear all cached routes
 */
export async function clearRouteCache() {
  try {
    const routes = await query(STORE_NAME, () => true);
    
    for (const route of routes) {
      await deleteRecord(STORE_NAME, route.id);
    }
    
    console.log(`Cleared ${routes.length} cached routes`);
    return routes.length;
  } catch (error) {
    console.error('Error clearing route cache:', error);
    return 0;
  }
}

/**
 * Clear expired routes
 */
export async function clearExpiredRoutes() {
  try {
    const allRoutes = await query(STORE_NAME, () => true);
    let cleared = 0;
    
    for (const route of allRoutes) {
      if (!isRouteValid(route)) {
        await deleteRecord(STORE_NAME, route.id);
        cleared++;
      }
    }
    
    console.log(`Cleared ${cleared} expired routes`);
    return cleared;
  } catch (error) {
    console.error('Error clearing expired routes:', error);
    return 0;
  }
}

/**
 * Get all cached routes
 */
export async function getAllCachedRoutes() {
  try {
    const routes = await query(STORE_NAME, isRouteValid);
    return routes;
  } catch (error) {
    console.error('Error getting all cached routes:', error);
    return [];
  }
}

/**
 * Get route cache statistics
 */
export async function getRouteCacheStats() {
  try {
    const allRoutes = await query(STORE_NAME, () => true);
    const validRoutes = allRoutes.filter(isRouteValid);
    
    const stats = {
      total: allRoutes.length,
      valid: validRoutes.length,
      expired: allRoutes.length - validRoutes.length,
      totalDistance: 0,
      averageDistance: 0,
      oldestRoute: null,
      newestRoute: null
    };
    
    validRoutes.forEach(route => {
      if (route.distance) {
        stats.totalDistance += route.distance;
      }
      
      if (!stats.oldestRoute || route.timestamp < stats.oldestRoute) {
        stats.oldestRoute = route.timestamp;
      }
      
      if (!stats.newestRoute || route.timestamp > stats.newestRoute) {
        stats.newestRoute = route.timestamp;
      }
    });
    
    if (stats.valid > 0) {
      stats.averageDistance = stats.totalDistance / stats.valid;
    }
    
    return stats;
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { total: 0, valid: 0, expired: 0 };
  }
}

/**
 * Precompute and cache multiple routes
 * Useful for warming up the cache
 * 
 * @param {Array<Object>} routePairs - Array of {from, to} objects
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Array>} Array of computed routes
 * 
 * @example
 * await precacheRoutes([
 *   { from: [40.7128, -74.0060], to: [34.0522, -118.2437] },
 *   { from: [41.8781, -87.6298], to: [29.7604, -95.3698] }
 * ], (progress) => {
 *   console.log(`${progress.current}/${progress.total} routes cached`);
 * });
 */
export async function precacheRoutes(routePairs, onProgress) {
  const results = [];
  
  for (let i = 0; i < routePairs.length; i++) {
    const { from, to } = routePairs[i];
    
    try {
      const route = await computeRoute(from, to);
      results.push({ success: true, route });
      
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: routePairs.length,
          success: true,
          from,
          to
        });
      }
    } catch (error) {
      console.error(`Failed to precache route ${i + 1}:`, error);
      results.push({ success: false, error: error.message });
      
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: routePairs.length,
          success: false,
          error: error.message,
          from,
          to
        });
      }
    }
    
    // Small delay to avoid overwhelming the API
    if (i < routePairs.length - 1) {
      await sleep(500);
    }
  }
  
  return results;
}

export default {
  computeRoute,
  hashCoords,
  getCachedRoute,
  cacheRoute,
  deleteCachedRoute,
  clearRouteCache,
  clearExpiredRoutes,
  getAllCachedRoutes,
  getRouteCacheStats,
  precacheRoutes,
  setRoutingProvider,
  getRoutingProvider,
  ROUTING_PROVIDERS
};
