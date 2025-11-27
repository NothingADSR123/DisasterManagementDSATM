/**
 * Example integration of MapView component
 * This file demonstrates how to use MapView in your application
 */

import { useEffect, useState } from 'react';
import MapView from './components/map/MapView';
import { add, STORES } from './lib/idb';
import { offlineQueue } from './lib/offlineQueue';

function App() {
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    // Register service worker for offline support
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then((registration) => {
            console.log('Service Worker registered:', registration);
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error);
          });
      });
    }

    // Listen for map events
    const handleRouteRequest = (event) => {
      console.log('Route requested:', event.detail);
      // You can show a route panel or modal here
    };

    const handleRouteFound = (event) => {
      console.log('Route found:', event.detail);
      // Display route information (distance, time)
      alert(`Route: ${(event.detail.distance / 1000).toFixed(2)} km, ${(event.detail.time / 60).toFixed(0)} minutes`);
    };

    const handleWebRTCConnect = (event) => {
      console.log('WebRTC connect requested:', event.detail);
      // Initialize WebRTC connection with volunteer
    };

    const handleAddHelpRequest = (event) => {
      console.log('Add help request at:', event.detail);
      // Show NeedHelpForm modal/dialog
      showHelpRequestForm(event.detail);
    };

    window.addEventListener('map:route', handleRouteRequest);
    window.addEventListener('map:routeFound', handleRouteFound);
    window.addEventListener('webrtc:connect', handleWebRTCConnect);
    window.addEventListener('map:addHelpRequest', handleAddHelpRequest);

    return () => {
      window.removeEventListener('map:route', handleRouteRequest);
      window.removeEventListener('map:routeFound', handleRouteFound);
      window.removeEventListener('webrtc:connect', handleWebRTCConnect);
      window.removeEventListener('map:addHelpRequest', handleAddHelpRequest);
    };
  }, []);

  // Example: Add sample data to IndexedDB
  const addSampleData = async () => {
    try {
      // Add sample help request
      await add(STORES.HELP_REQUESTS, {
        lat: 12.9716,
        lng: 77.5946,
        type: 'Medical',
        severity: 'High',
        description: 'Need medical supplies urgently',
        contact: '+91-9876543210'
      });

      // Add sample volunteer
      await add(STORES.VOLUNTEERS, {
        lat: 12.9352,
        lng: 77.6245,
        name: 'John Doe',
        skills: 'First Aid, EMT',
        contact: '+91-9876543211'
      });

      // Add sample shelter
      await add(STORES.SHELTERS, {
        lat: 12.9500,
        lng: 77.6000,
        name: 'Central Relief Shelter',
        capacity: 500,
        available: 250,
        address: '123 Main Street, Bangalore',
        contact: '+91-9876543212'
      });

      alert('Sample data added! Reload the page to see markers.');
    } catch (error) {
      console.error('Error adding sample data:', error);
      alert('Error adding sample data. Check console.');
    }
  };

  // Example: Show help request form
  const showHelpRequestForm = (location) => {
    const description = prompt('Describe your emergency:');
    const contact = prompt('Contact number:');
    const type = prompt('Type (Medical/Food/Shelter/Other):') || 'General';

    if (description) {
      add(STORES.HELP_REQUESTS, {
        lat: location.lat,
        lng: location.lng,
        type: type,
        severity: 'Medium',
        description: description,
        contact: contact || 'Not provided'
      }).then(() => {
        alert('Help request added!');
      }).catch((error) => {
        console.error('Error adding help request:', error);
        alert('Error adding request. Check console.');
      });
    }
  };

  // Example: Trigger a route
  const triggerRoute = () => {
    window.dispatchEvent(new CustomEvent('map:route', {
      detail: {
        from: [12.9716, 77.5946],
        to: [12.9352, 77.6245],
        type: 'custom'
      }
    }));
  };

  // Example: Check offline queue status
  const checkQueueStatus = async () => {
    const queueLength = await offlineQueue.getQueueLength();
    alert(`Offline queue has ${queueLength} pending actions`);
  };

  return (
    <div className="App" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Optional: Control Panel */}
      <div style={{
        padding: '10px',
        background: '#f3f4f6',
        borderBottom: '1px solid #d1d5db',
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setShowMap(!showMap)}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showMap ? 'Hide' : 'Show'} Map
        </button>
        
        <button
          onClick={addSampleData}
          style={{
            padding: '8px 16px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Add Sample Data
        </button>

        <button
          onClick={triggerRoute}
          style={{
            padding: '8px 16px',
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Show Sample Route
        </button>

        <button
          onClick={checkQueueStatus}
          style={{
            padding: '8px 16px',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Check Queue Status
        </button>
      </div>

      {/* Map Container */}
      {showMap && (
        <div style={{ flex: 1 }}>
          <MapView />
        </div>
      )}
    </div>
  );
}

export default App;
