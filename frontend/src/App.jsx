import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/ui/Header';
import Footer from './components/ui/Footer';
import OfflineIndicator from './components/ui/OfflineIndicator';
import PanicButton from './components/ui/PanicButton';
import Home from './pages/Home';
import Help from './pages/Help';
import Volunteer from './pages/Volunteer';
import MapPage from './pages/MapPage';
import OfflineGuide from './pages/OfflineGuide';
import { put, initDB } from './lib/db';
import './App.css';

function App() {
  console.log('App component rendering...');

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

  return (
    <Router>
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#D8E3FF' }}>
        <Header />
        <OfflineIndicator />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/help" element={<Help />} />
            <Route path="/volunteer" element={<Volunteer />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/offline-guide" element={<OfflineGuide />} />
          </Routes>
        </main>
        <Footer />
        <PanicButton />
      </div>
    </Router>
  );
}

export default App;
