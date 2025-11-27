import { useEffect, useState } from 'react';
import MapView from './components/map/MapView';
import { put, initDB } from './lib/db';
import './App.css';

const STORES = {
  HELP_REQUESTS: 'requests',
  VOLUNTEERS: 'volunteers',
  SHELTERS: 'shelters'
};

function App() {
  const [showMap, setShowMap] = useState(true);
  const [error, setError] = useState(null);

  console.log('App component rendering...', { showMap });

  useEffect(() => {
    console.log('App useEffect running...');
    
    // Initialize database
    initDB().then(() => {
      console.log('Database initialized successfully');
    }).catch(error => {
      console.error('Database initialization failed:', error);
    });
    // Register service worker for offline support
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then((registration) => {
            console.log('Service Worker registered:', registration);
          })
          .catch((error) => {
            console.log('Service Worker registration failed (optional):', error);
          });
      });
    }

    // Listen for map events
    const handleRouteFound = (event) => {
      console.log('Route found:', event.detail);
    };

    const handleAddHelpRequest = (event) => {
      console.log('Add help request at:', event.detail);
      // You can show a form modal here
      const description = prompt('Describe your emergency:');
      if (description) {
        put('requests', {
          lat: event.detail.lat,
          lng: event.detail.lng,
          type: 'General',
          severity: 'Medium',
          description: description,
          contact: 'Not provided'
        });
      }
    };

    window.addEventListener('map:routeFound', handleRouteFound);
    window.addEventListener('map:addHelpRequest', handleAddHelpRequest);

    return () => {
      window.removeEventListener('map:routeFound', handleRouteFound);
      window.removeEventListener('map:addHelpRequest', handleAddHelpRequest);
    };
  }, []);

  // Add sample data for testing
  const addSampleData = async () => {
    try {
      await put('requests', {
        lat: 12.9716,
        lng: 77.5946,
        type: 'Medical',
        severity: 'High',
        description: 'Need medical supplies urgently',
        contact: '+91-9876543210'
      });

      await put('volunteers', {
        lat: 12.9352,
        lng: 77.6245,
        name: 'John Doe',
        skills: 'First Aid, EMT',
        contact: '+91-9876543211'
      });

      await put('shelters', {
        lat: 12.9500,
        lng: 77.6000,
        name: 'Central Relief Shelter',
        capacity: 500,
        available: 250,
        address: '123 Main Street, Bangalore',
        contact: '+91-9876543212'
      });

      alert('Sample data added! Markers should appear on the map.');
    } catch (error) {
      console.error('Error adding sample data:', error);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Control Panel */}
      <div style={{
        padding: '10px',
        background: '#1f2937',
        color: 'white',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>Disaster Management Map</h2>
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
      </div>

      {/* Map Container */}
      {error ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red' }}>
          <div>
            <h2>Error Loading Map</h2>
            <pre style={{ background: '#fee', padding: '20px', borderRadius: '4px' }}>{error}</pre>
          </div>
        </div>
      ) : showMap ? (
        <div style={{ flex: 1 }}>
          <MapView />
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>Map hidden</p>
        </div>
      )}
    </div>
  );
}

export default App;
