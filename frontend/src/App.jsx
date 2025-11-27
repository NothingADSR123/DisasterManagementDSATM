import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/ui/Header';
import Footer from './components/ui/Footer';
import OfflineIndicator from './components/ui/OfflineIndicator';
import PanicButton from './components/ui/PanicButton';
import { ToastContainer } from './components/ui/useToast.jsx';
import './App.css';

// Lazy-loaded page components
const Home = lazy(() => import('./pages/Home'));
const Help = lazy(() => import('./pages/Help'));
const Volunteer = lazy(() => import('./pages/Volunteer'));
const MapPage = lazy(() => import('./pages/MapPage'));
const OfflineGuide = lazy(() => import('./pages/OfflineGuide'));

function App() {
  return (
    <BrowserRouter>
      <div className="app-container min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-grow">
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/help" element={<Help />} />
              <Route path="/volunteer" element={<Volunteer />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/offline-guide" element={<OfflineGuide />} />
            </Routes>
          </Suspense>
        </main>

        <Footer />
        
        {/* Persistent UI components */}
        <OfflineIndicator />
        <PanicButton />
        <ToastContainer />
      </div>
    </BrowserRouter>
  );
}

export default App;
