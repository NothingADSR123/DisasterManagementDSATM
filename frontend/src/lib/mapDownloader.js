/**
 * Map Tile Downloader for Offline Access
 * 
 * Utility to pre-download map tiles for offline use in disaster scenarios.
 * Uses the service worker's cache to store tiles that can be accessed without internet.
 * 
 * @module mapDownloader
 */

/**
 * Calculate tile coordinates for a bounding box at specific zoom levels
 * Uses Web Mercator projection (EPSG:3857)
 * 
 * @param {Object} bounds - Leaflet LatLngBounds object or {north, south, east, west}
 * @param {number} minZoom - Minimum zoom level
 * @param {number} maxZoom - Maximum zoom level
 * @returns {Array} Array of tile URLs
 */
export function calculateTileUrls(bounds, minZoom, maxZoom) {
  const urls = [];
  
  // Extract bounds
  const north = bounds.getNorth ? bounds.getNorth() : bounds.north;
  const south = bounds.getSouth ? bounds.getSouth() : bounds.south;
  const east = bounds.getEast ? bounds.getEast() : bounds.east;
  const west = bounds.getWest ? bounds.getWest() : bounds.west;
  
  // Validate bounds
  if (!isFinite(north) || !isFinite(south) || !isFinite(east) || !isFinite(west)) {
    console.error('Invalid bounds:', { north, south, east, west });
    return urls;
  }
  
  // Generate tiles for each zoom level
  for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
    const tiles = getTilesForBounds({ north, south, east, west }, zoom);
    
    // Convert tiles to URLs
    for (const tile of tiles) {
      const url = getTileUrl(tile.x, tile.y, tile.z);
      urls.push(url);
    }
  }
  
  return urls;
}

/**
 * Get all tile coordinates within bounds at a specific zoom level
 * 
 * @param {Object} bounds - {north, south, east, west} in degrees
 * @param {number} zoom - Zoom level
 * @returns {Array} Array of {x, y, z} tile coordinates
 */
function getTilesForBounds(bounds, zoom) {
  const tiles = [];
  
  // Convert lat/lng to tile coordinates
  const nwTile = latLngToTile(bounds.north, bounds.west, zoom);
  const seTile = latLngToTile(bounds.south, bounds.east, zoom);
  
  // Get tile range
  const minX = Math.min(nwTile.x, seTile.x);
  const maxX = Math.max(nwTile.x, seTile.x);
  const minY = Math.min(nwTile.y, seTile.y);
  const maxY = Math.max(nwTile.y, seTile.y);
  
  // Generate all tiles in range
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      tiles.push({ x, y, z: zoom });
    }
  }
  
  return tiles;
}

/**
 * Convert latitude/longitude to tile coordinates
 * 
 * @param {number} lat - Latitude in degrees
 * @param {number} lng - Longitude in degrees
 * @param {number} zoom - Zoom level
 * @returns {Object} {x, y} tile coordinates
 */
function latLngToTile(lat, lng, zoom) {
  const latRad = lat * Math.PI / 180;
  const n = Math.pow(2, zoom);
  
  const x = Math.floor((lng + 180) / 360 * n);
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  
  return { x, y };
}

/**
 * Generate tile URL for OpenStreetMap
 * 
 * @param {number} x - Tile X coordinate
 * @param {number} y - Tile Y coordinate
 * @param {number} z - Zoom level
 * @returns {string} Tile URL
 */
function getTileUrl(x, y, z) {
  // Use multiple servers (a, b, c) for load balancing
  const servers = ['a', 'b', 'c'];
  const server = servers[Math.floor(Math.random() * servers.length)];
  
  return `https://${server}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

/**
 * Download tiles and cache them via service worker
 * 
 * @param {Array} urls - Array of tile URLs to download
 * @param {Function} onProgress - Progress callback (current, total)
 * @param {Object} options - Options {batchSize, signal}
 * @returns {Promise<Object>} Download statistics
 */
export async function downloadTiles(urls, onProgress = null, options = {}) {
  const {
    batchSize = 10, // Download 10 tiles concurrently
    signal = null    // AbortSignal for cancellation
  } = options;
  
  const stats = {
    total: urls.length,
    downloaded: 0,
    failed: 0,
    cached: 0,
    skipped: 0,
    bytes: 0,
    startTime: Date.now(),
    endTime: null,
    cancelled: false
  };
  
  console.log(`Starting download of ${urls.length} tiles...`);
  
  try {
    // Check for service worker
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
      throw new Error('Service worker not available. Please reload the page.');
    }
    
    // Process tiles in batches
    for (let i = 0; i < urls.length; i += batchSize) {
      // Check for cancellation
      if (signal && signal.aborted) {
        stats.cancelled = true;
        break;
      }
      
      // Get batch
      const batch = urls.slice(i, i + batchSize);
      
      // Download batch concurrently
      const results = await Promise.allSettled(
        batch.map(url => downloadTile(url, signal))
      );
      
      // Process results
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { cached, size, skipped } = result.value;
          
          if (skipped) {
            stats.skipped++;
          } else if (cached) {
            stats.cached++;
            stats.bytes += size;
          }
          
          stats.downloaded++;
        } else {
          stats.failed++;
          console.error('Failed to download tile:', result.reason);
        }
      }
      
      // Report progress
      if (onProgress) {
        onProgress(stats.downloaded, stats.total);
      }
    }
    
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
  
  stats.endTime = Date.now();
  
  console.log('Download complete:', stats);
  
  return stats;
}

/**
 * Download a single tile
 * 
 * @param {string} url - Tile URL
 * @param {AbortSignal} signal - Abort signal
 * @returns {Promise<Object>} {cached, size, skipped}
 */
async function downloadTile(url, signal) {
  try {
    // Check if already cached
    const cache = await caches.open('pwa-tiles-v1');
    const cached = await cache.match(url);
    
    if (cached) {
      // Already cached, skip download
      return { cached: true, size: 0, skipped: true };
    }
    
    // Fetch tile
    const response = await fetch(url, { signal });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Get size
    const blob = await response.blob();
    const size = blob.size;
    
    // Cache via service worker
    await cache.put(url, new Response(blob, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText
    }));
    
    return { cached: true, size, skipped: false };
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Download cancelled');
    }
    throw error;
  }
}

/**
 * Estimate tile count and storage size for a download
 * 
 * @param {Object} bounds - Bounds to download
 * @param {number} minZoom - Minimum zoom level
 * @param {number} maxZoom - Maximum zoom level
 * @returns {Object} {tileCount, estimatedSize, zoomLevels}
 */
export function estimateDownload(bounds, minZoom, maxZoom) {
  const urls = calculateTileUrls(bounds, minZoom, maxZoom);
  
  // Average tile size is ~15-20 KB for OSM
  const avgTileSize = 17 * 1024; // 17 KB
  const estimatedSize = urls.length * avgTileSize;
  
  // Calculate tiles per zoom level
  const zoomLevels = {};
  
  for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
    const tiles = getTilesForBounds({
      north: bounds.getNorth ? bounds.getNorth() : bounds.north,
      south: bounds.getSouth ? bounds.getSouth() : bounds.south,
      east: bounds.getEast ? bounds.getEast() : bounds.east,
      west: bounds.getWest ? bounds.getWest() : bounds.west
    }, zoom);
    
    zoomLevels[zoom] = tiles.length;
  }
  
  return {
    tileCount: urls.length,
    estimatedSize,
    estimatedSizeMB: Math.round(estimatedSize / 1024 / 1024 * 10) / 10,
    zoomLevels
  };
}

/**
 * Clear cached map tiles
 * 
 * @returns {Promise<boolean>} Success status
 */
export async function clearTileCache() {
  try {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
      throw new Error('Service worker not available');
    }
    
    // Delete tile cache
    const deleted = await caches.delete('pwa-tiles-v1');
    
    console.log('Tile cache cleared:', deleted);
    
    return deleted;
    
  } catch (error) {
    console.error('Failed to clear tile cache:', error);
    throw error;
  }
}

/**
 * Get cache statistics
 * 
 * @returns {Promise<Object>} Cache stats
 */
export async function getCacheStats() {
  try {
    const cache = await caches.open('pwa-tiles-v1');
    const keys = await cache.keys();
    
    let totalSize = 0;
    
    // Sample first 100 tiles to estimate size
    const sampleSize = Math.min(keys.length, 100);
    
    for (let i = 0; i < sampleSize; i++) {
      const response = await cache.match(keys[i]);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
    
    // Estimate total size
    const avgSize = totalSize / sampleSize;
    const estimatedTotal = avgSize * keys.length;
    
    return {
      tileCount: keys.length,
      sampledSize: totalSize,
      estimatedTotalSize: estimatedTotal,
      estimatedTotalSizeMB: Math.round(estimatedTotal / 1024 / 1024 * 10) / 10,
      averageTileSize: Math.round(avgSize / 1024 * 10) / 10, // KB
      sampleSize
    };
    
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return {
      tileCount: 0,
      estimatedTotalSize: 0,
      estimatedTotalSizeMB: 0,
      error: error.message
    };
  }
}

/**
 * Get current map bounds from URL or default to a location
 * 
 * @param {Object} map - Leaflet map instance
 * @returns {Object} Bounds {north, south, east, west}
 */
export function getCurrentMapBounds(map) {
  if (!map) {
    console.error('Map instance not available');
    return null;
  }
  
  try {
    const bounds = map.getBounds();
    
    return {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    };
  } catch (error) {
    console.error('Failed to get map bounds:', error);
    return null;
  }
}

/**
 * Example usage:
 * 
 * import { downloadTiles, calculateTileUrls, estimateDownload } from './mapDownloader';
 * 
 * // Get bounds
 * const bounds = map.getBounds();
 * 
 * // Estimate download
 * const estimate = estimateDownload(bounds, 10, 15);
 * console.log(`Will download ${estimate.tileCount} tiles (~${estimate.estimatedSizeMB} MB)`);
 * 
 * // Calculate URLs
 * const urls = calculateTileUrls(bounds, 10, 15);
 * 
 * // Download with progress
 * const controller = new AbortController();
 * 
 * const stats = await downloadTiles(urls, (current, total) => {
 *   console.log(`Progress: ${current}/${total} (${Math.round(current/total*100)}%)`);
 * }, {
 *   signal: controller.signal
 * });
 * 
 * // Cancel download
 * controller.abort();
 */
