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
import { initDB } from './lib/db';
import './App.css';

function App() {
  useEffect(() => {
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
