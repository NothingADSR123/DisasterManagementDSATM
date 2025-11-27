/**
 * Home Page Integration Module
 * 
 * Handles wiring UI events to map/offline actions.
 * Owned by Maps/Offline team (Person 2).
 * 
 * @module homeIntegration
 */

import { put } from './db.js';
import { offlineQueue } from './offlineQueue.js';

let listeners = [];
let broadcastChannel = null;

if (typeof BroadcastChannel !== 'undefined') {
  broadcastChannel = new BroadcastChannel('disaster-mgmt-sync');
}

/**
 * Compute SHA-256 hash for record integrity
 * @param {Object} record - The record to hash
 * @returns {Promise<string>} Hex-encoded hash
 */
async function computeRecordHash(record) {
  try {
    const sortedKeys = Object.keys(record).sort();
    const dataString = sortedKeys
      .map(key => `${key}:${JSON.stringify(record[key])}`)
      .join('|');
    
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Hash computation failed:', error);
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}

/**
 * Initialize home page integrations
 * @param {Object} options - Integration options
 * @param {Object} options.mapInstanceRef - React ref to map instance
 * @returns {Function} Cleanup function
 */
export function initHomeIntegrations({ mapInstanceRef } = {}) {
  console.log('[HomeIntegration] Initializing...');

  // Handle SOS action
  const handleSOS = async (event) => {
    console.log('[HomeIntegration] SOS triggered:', event.detail);
    
    try {
      // Get current location if available
      let lat = 12.9716, lng = 77.5946; // Default Bangalore
      
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        } catch (geoError) {
          console.warn('[HomeIntegration] Geolocation failed, using default:', geoError);
        }
      }

      // Create SOS record
      const sosRecord = {
        id: `sos-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        lat,
        lng,
        type: 'SOS',
        severity: 'Critical',
        description: 'EMERGENCY: SOS panic button activated',
        contact: 'Emergency response needed',
        timestamp: Date.now(),
        source: 'local',
        status: 'pending'
      };

      // Compute hash
      sosRecord.hash = await computeRecordHash(sosRecord);

      // Write to IndexedDB
      await put('requests', sosRecord);
      console.log('[HomeIntegration] SOS saved to IndexedDB:', sosRecord.id);

      // Add to offline queue
      await offlineQueue.add({
        type: 'sos',
        payload: sosRecord,
        priority: 'critical',
        timestamp: Date.now()
      });
      console.log('[HomeIntegration] SOS queued for sync');

      // Broadcast to other tabs
      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'sos-created',
          data: sosRecord
        });
      }

      // Highlight on map if available
      if (mapInstanceRef?.current) {
        console.log('[HomeIntegration] Adding SOS marker to map');
        // Dispatch event for map to handle
        window.dispatchEvent(new CustomEvent('map:highlight-sos', {
          detail: { lat, lng, id: sosRecord.id }
        }));
      }

      // Show success feedback
      window.dispatchEvent(new CustomEvent('ui:toast', {
        detail: {
          message: 'SOS sent! Emergency services notified.',
          type: 'success',
          duration: 4000
        }
      }));

    } catch (error) {
      console.error('[HomeIntegration] SOS failed:', error);
      window.dispatchEvent(new CustomEvent('ui:toast', {
        detail: {
          message: 'Failed to send SOS. Retrying...',
          type: 'error',
          duration: 3000
        }
      }));
    }
  };

  // Handle map open
  const handleMapOpen = (event) => {
    console.log('[HomeIntegration] Map open requested:', event.detail);
    
    // Scroll to map if it exists in DOM
    const mapRoot = document.querySelector('#mapRoot') || document.querySelector('[data-map-container]');
    if (mapRoot) {
      mapRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Dispatch show event
    window.dispatchEvent(new CustomEvent('map:show', {
      detail: { source: 'home-ui', timestamp: Date.now() }
    }));
  };

  // Handle get help
  const handleGetHelp = (event) => {
    console.log('[HomeIntegration] Get help requested:', event.detail);
    // UI team will handle modal/navigation
    window.dispatchEvent(new CustomEvent('ui:show-help-modal', {
      detail: { source: 'home-card' }
    }));
  };

  // Handle volunteer
  const handleVolunteer = (event) => {
    console.log('[HomeIntegration] Volunteer requested:', event.detail);
    // UI team will handle modal/navigation
    window.dispatchEvent(new CustomEvent('ui:show-volunteer-modal', {
      detail: { source: 'home-card' }
    }));
  };

  // Register listeners
  window.addEventListener('action:sos', handleSOS);
  window.addEventListener('map:open', handleMapOpen);
  window.addEventListener('ui:get-help', handleGetHelp);
  window.addEventListener('ui:volunteer', handleVolunteer);

  listeners = [
    { event: 'action:sos', handler: handleSOS },
    { event: 'map:open', handler: handleMapOpen },
    { event: 'ui:get-help', handler: handleGetHelp },
    { event: 'ui:volunteer', handler: handleVolunteer }
  ];

  console.log('[HomeIntegration] Initialized successfully');

  // Return cleanup function
  return () => {
    listeners.forEach(({ event, handler }) => {
      window.removeEventListener(event, handler);
    });
    listeners = [];
    console.log('[HomeIntegration] Cleaned up');
  };
}

export default { initHomeIntegrations };
