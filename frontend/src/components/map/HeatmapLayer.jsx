import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

/**
 * HeatmapLayer Component
 * Renders a heatmap layer showing danger zones with performance optimizations
 * 
 * Features:
 * - Efficiently handles thousands of points with chunked updates
 * - Uses requestIdleCallback for non-blocking updates
 * - Exposes ref API for fitToBounds and other controls
 * - Supports leaflet.heat plugin for smooth gradient rendering
 */
const HeatmapLayer = forwardRef(({ points, options = {} }, ref) => {
  const map = useMap();
  const heatLayerRef = useRef(null);
  const updateTimeoutRef = useRef(null);
  const requestIdleCallbackIdRef = useRef(null);

  // Default heatmap options
  const defaultOptions = {
    radius: 25,
    blur: 35,
    maxZoom: 13,
    max: 1.0,
    gradient: {
      0.0: 'blue',
      0.3: 'cyan',
      0.5: 'lime',
      0.7: 'yellow',
      1.0: 'red'
    },
    minOpacity: 0.5,
    ...options
  };

  /**
   * Convert points to leaflet.heat format: [lat, lng, intensity]
   */
  const convertPoints = (pointsArray) => {
    if (!pointsArray || pointsArray.length === 0) return [];
    
    return pointsArray.map(point => [
      point.lat || point.latitude,
      point.lng || point.longitude,
      point.intensity || 0.5
    ]);
  };

  /**
   * Update heatmap layer with new points (batched for performance)
   */
  const updateHeatmap = (newPoints) => {
    if (!map || !newPoints) return;

    const heatPoints = convertPoints(newPoints);
    
    // If heatmap layer exists, update it efficiently
    if (heatLayerRef.current) {
      // Use setLatLngs for efficient updates (leaflet.heat method)
      heatLayerRef.current.setLatLngs(heatPoints);
      heatLayerRef.current.redraw();
    } else {
      // Create new heatmap layer
      heatLayerRef.current = L.heatLayer(heatPoints, defaultOptions);
      heatLayerRef.current.addTo(map);
    }
  };

  /**
   * Chunked update for large datasets (non-blocking)
   * Processes points in batches using requestIdleCallback
   */
  const updateHeatmapChunked = (newPoints, chunkSize = 1000) => {
    if (!newPoints || newPoints.length === 0) {
      // Remove layer if no points
      if (heatLayerRef.current) {
        heatLayerRef.current.remove();
        heatLayerRef.current = null;
      }
      return;
    }

    // For small datasets, update immediately
    if (newPoints.length <= chunkSize) {
      updateHeatmap(newPoints);
      return;
    }

    // For large datasets, chunk the updates
    const chunks = [];
    for (let i = 0; i < newPoints.length; i += chunkSize) {
      chunks.push(newPoints.slice(i, i + chunkSize));
    }

    let currentChunk = 0;
    const allPoints = [];

    const processChunk = (deadline) => {
      // Process chunks while we have idle time
      while (
        currentChunk < chunks.length &&
        (deadline.timeRemaining() > 0 || deadline.didTimeout)
      ) {
        allPoints.push(...chunks[currentChunk]);
        currentChunk++;
      }

      // Update the heatmap with accumulated points
      if (allPoints.length > 0) {
        updateHeatmap(allPoints);
      }

      // Schedule next chunk if more remain
      if (currentChunk < chunks.length) {
        requestIdleCallbackIdRef.current = requestIdleCallback(processChunk, {
          timeout: 100
        });
      }
    };

    // Start processing with requestIdleCallback (with fallback to setTimeout)
    const scheduleUpdate = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
    requestIdleCallbackIdRef.current = scheduleUpdate(processChunk, { timeout: 100 });
  };

  /**
   * Debounced update to prevent excessive re-renders
   */
  const scheduleUpdate = (newPoints) => {
    // Cancel any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    if (requestIdleCallbackIdRef.current) {
      const cancelIdleCallback = window.cancelIdleCallback || clearTimeout;
      cancelIdleCallback(requestIdleCallbackIdRef.current);
    }

    // Schedule new update
    updateTimeoutRef.current = setTimeout(() => {
      updateHeatmapChunked(newPoints);
    }, 100); // Debounce by 100ms
  };

  /**
   * Expose public API via ref
   */
  useImperativeHandle(ref, () => ({
    /**
     * Fit map bounds to show all heatmap points
     */
    fitToBounds: () => {
      if (!heatLayerRef.current || !points || points.length === 0) {
        console.warn('No heatmap points to fit bounds to');
        return;
      }

      const bounds = L.latLngBounds(
        points.map(p => [p.lat || p.latitude, p.lng || p.longitude])
      );
      
      map.fitBounds(bounds, { padding: [50, 50] });
    },

    /**
     * Get current heatmap layer
     */
    getLayer: () => heatLayerRef.current,

    /**
     * Update heatmap options
     */
    setOptions: (newOptions) => {
      if (heatLayerRef.current) {
        // Remove old layer
        heatLayerRef.current.remove();
        
        // Create new layer with updated options
        const heatPoints = convertPoints(points);
        heatLayerRef.current = L.heatLayer(heatPoints, {
          ...defaultOptions,
          ...newOptions
        });
        heatLayerRef.current.addTo(map);
      }
    },

    /**
     * Clear the heatmap
     */
    clear: () => {
      if (heatLayerRef.current) {
        heatLayerRef.current.setLatLngs([]);
        heatLayerRef.current.redraw();
      }
    },

    /**
     * Remove the heatmap layer
     */
    remove: () => {
      if (heatLayerRef.current) {
        heatLayerRef.current.remove();
        heatLayerRef.current = null;
      }
    },

    /**
     * Force immediate update (bypass debouncing)
     */
    forceUpdate: () => {
      if (points) {
        updateHeatmapChunked(points);
      }
    }
  }), [points, map]);

  /**
   * Initialize and update heatmap when points change
   */
  useEffect(() => {
    scheduleUpdate(points);

    // Cleanup on unmount
    return () => {
      // Clear timeouts
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (requestIdleCallbackIdRef.current) {
        const cancelIdleCallback = window.cancelIdleCallback || clearTimeout;
        cancelIdleCallback(requestIdleCallbackIdRef.current);
      }

      // Remove layer
      if (heatLayerRef.current) {
        heatLayerRef.current.remove();
        heatLayerRef.current = null;
      }
    };
  }, [points]);

  return null; // This component doesn't render anything directly
});

HeatmapLayer.displayName = 'HeatmapLayer';

export default HeatmapLayer;
