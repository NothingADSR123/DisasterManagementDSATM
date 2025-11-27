/**
 * Home Page Component
 * 
 * Displays 4 action cards (I Need Help, I Can Help, SOS, View Map)
 * and 3 info tiles (Evacuation Notifications, Crowd Reports, Shelter Capacity).
 * 
 * Integration hooks: Uses homeIntegration.initHomeIntegrations() for map/offline actions.
 * Data source: IndexedDB via idb.js module.
 * 
 * @module Home
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Temporary: Comment out problematic imports to test
// import { getAll, watch } from '../lib/idb';
// import { initHomeIntegrations } from '../lib/homeIntegration';
// import { seedHomeFixtures } from '../lib/fixtures/homeFixtures';

// Constants
const SOS_GLOW_MS = 6000;
const SOS_TOAST_MS = 3000;

function Home() {
  const navigate = useNavigate();
  const mapInstanceRef = useRef(null);
  const [sosActive, setSosActive] = useState(false);
  const [showSosToast, setShowSosToast] = useState(false);
  
  // Info tile data
  const [evacuations, setEvacuations] = useState([]);
  const [crowdReports, setCrowdReports] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load data on mount
  useEffect(() => {
    let cleanup;
    
    async function loadData() {
      try {
        // TEMPORARILY DISABLED FOR TESTING
        console.log('[Home] Component mounted - data loading disabled for testing');
        setDataLoaded(true);
        
        /*
        // Seed fixtures if no data exists (dev mode)
        const existingShelters = await getAll('shelters');
        if (!existingShelters || existingShelters.length === 0) {
          console.log('[Home] No data found, seeding fixtures...');
          await seedHomeFixtures();
        }

        // Load all data
        const [evacData, crowdData, shelterData] = await Promise.all([
          getAll('evacuationNotifications'),
          getAll('crowdReports'),
          getAll('shelters')
        ]);

        setEvacuations(evacData || []);
        setCrowdReports(crowdData || []);
        setShelters(shelterData || []);
        setDataLoaded(true);

        // Watch for changes
        const unwatchEvac = watch('evacuationNotifications', (data) => {
          setEvacuations(data || []);
        });
        const unwatchCrowd = watch('crowdReports', (data) => {
          setCrowdReports(data || []);
        });
        const unwatchShelters = watch('shelters', (data) => {
          setShelters(data || []);
        });

        cleanup = () => {
          unwatchEvac?.();
          unwatchCrowd?.();
          unwatchShelters?.();
        };
        */

      } catch (error) {
        console.error('[Home] Failed to load data:', error);
        setDataLoaded(true); // Show UI anyway
      }
    }

    loadData();

    // TEMPORARILY DISABLED FOR TESTING
    // const destroyIntegrations = initHomeIntegrations({ mapInstanceRef });

    // Handle navigation events
    const handleGetHelpNav = () => navigate('/help');
    const handleVolunteerNav = () => navigate('/volunteer');
    const handleMapOpenNav = () => navigate('/map');

    window.addEventListener('ui:show-help-modal', handleGetHelpNav);
    window.addEventListener('ui:show-volunteer-modal', handleVolunteerNav);
    window.addEventListener('map:show', handleMapOpenNav);

    return () => {
      cleanup?.();
      // destroyIntegrations?.();
      window.removeEventListener('ui:show-help-modal', handleGetHelpNav);
      window.removeEventListener('ui:show-volunteer-modal', handleVolunteerNav);
      window.removeEventListener('map:show', handleMapOpenNav);
    };
  }, [navigate]);

  // Handle SOS activation
  const handleSOS = () => {
    if (sosActive) return; // Prevent multiple triggers

    // Activate glow
    setSosActive(true);
    setShowSosToast(true);

    // Vibrate if available
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    // Dispatch SOS event
    window.dispatchEvent(new CustomEvent('action:sos', {
      detail: { source: 'ui', ts: Date.now() }
    }));

    // Hide toast after 3s
    setTimeout(() => {
      setShowSosToast(false);
    }, SOS_TOAST_MS);

    // Remove glow after 6s
    setTimeout(() => {
      setSosActive(false);
    }, SOS_GLOW_MS);
  };

  // Action card handlers
  const handleGetHelp = () => {
    window.dispatchEvent(new CustomEvent('ui:get-help'));
  };

  const handleVolunteer = () => {
    window.dispatchEvent(new CustomEvent('ui:volunteer'));
  };

  const handleMapOpen = () => {
    window.dispatchEvent(new CustomEvent('map:open'));
  };

  // Compute stats
  const unreadEvacuations = evacuations.filter(e => !e.read).length;
  const latestEvacuation = evacuations.sort((a, b) => b.createdAt - a.createdAt)[0];
  const highSeverityCrowd = crowdReports.filter(r => r.severity === 'high').length;
  const topShelters = [...shelters]
    .sort((a, b) => b.available - a.available)
    .slice(0, 3);

  // Format time ago
  const timeAgo = (timestamp) => {
    const mins = Math.floor((Date.now() - timestamp) / 60000);
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <div
      className="min-h-screen w-full bg-cover bg-fixed bg-center bg-no-repeat py-12 px-6"
      style={{
        backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')",
        backgroundColor: "#dfe7ff",
        opacity: 0.98
      }}
    >
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Disaster Management System
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Connect those who need help with volunteers during emergencies. 
          Our platform works online and offline to ensure you're never alone in a crisis.
        </p>
      </section>

      {/* 4 Action Cards */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {/* Card 1: I Need Help */}
        <div 
          className="bg-white border-4 rounded-2xl p-6 flex flex-col items-center justify-between min-h-[220px] md:min-h-[240px] hover:shadow-2xl transition-all"
          style={{ borderColor: '#415A78', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
          role="group"
          aria-label="Request help"
        >
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <svg
              className="w-16 h-16 mb-3"
              style={{ color: '#415A78' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#415A78' }}>I Need Help</h3>
            <p className="text-black text-sm text-center px-2 font-semibold">
              Request assistance during an emergency
            </p>
          </div>
          <button
            onClick={handleGetHelp}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleGetHelp();
              }
            }}
            className="px-6 py-3 rounded-lg text-sm font-bold hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 w-3/4 mt-4"
            style={{ backgroundColor: '#415A78', color: 'white', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15)' }}
            aria-label="Get help now"
            tabIndex={0}
          >
            Get Help Now
          </button>
        </div>

        {/* Card 2: I Can Help */}
        <div 
          className="bg-white border-4 border-blue-300 rounded-2xl p-6 flex flex-col items-center justify-between min-h-[220px] md:min-h-[240px] hover:shadow-2xl transition-all"
          style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
          role="group"
          aria-label="Volunteer to help"
        >
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <svg
              className="w-16 h-16 text-blue-600 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="text-lg font-bold text-blue-600 mb-2">I Can Help</h3>
            <p className="text-black text-sm text-center px-2 font-semibold">
              Volunteer to assist others in need
            </p>
          </div>
          <button
            onClick={handleVolunteer}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleVolunteer();
              }
            }}
            className="px-6 py-3 rounded-lg text-white text-sm font-bold hover:bg-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 w-3/4 mt-4"
            style={{ backgroundColor: '#2563eb', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15)' }}
            aria-label="Volunteer now"
            tabIndex={0}
          >
            Volunteer Now
          </button>
        </div>

        {/* Card 3: SOS */}
        <div 
          className={`bg-white border-4 border-red-600 rounded-2xl p-6 flex flex-col items-center justify-between min-h-[220px] md:min-h-[240px] hover:shadow-2xl transition-all relative ${
            sosActive ? 'sos-glow' : ''
          }`}
          style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
          role="group"
          aria-label="Emergency SOS"
        >
          {showSosToast && (
            <div className="absolute top-2 left-2 right-2 bg-red-100 text-red-800 px-3 py-1 rounded text-xs font-medium animate-pulse z-10">
              Sending SOS...
            </div>
          )}
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <svg
              className="w-20 h-20 text-red-600 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="text-lg font-bold text-red-600 mb-1">EMERGENCY SOS</h3>
            <p className="text-black text-xs text-center px-2 font-semibold">Instant alert to nearby volunteers</p>
          </div>
          <button
            onClick={handleSOS}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSOS();
              }
            }}
            disabled={sosActive}
            className={`px-6 py-3 rounded-lg text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed w-3/4 ${
              sosActive ? 'animate-pulse bg-red-600 text-white' : 'bg-red-600 text-white hover:bg-red-700'
            }`}
            style={{ boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15)' }}
            aria-label="Send emergency SOS"
            tabIndex={0}
          >
            {sosActive ? 'Sending...' : 'SEND SOS'}
          </button>
        </div>

        {/* Card 4: View Map */}
        <div 
          className="bg-white border-4 border-yellow-400 rounded-2xl p-6 flex flex-col items-center justify-between min-h-[220px] md:min-h-[240px] hover:shadow-2xl transition-all"
          style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
          role="group"
          aria-label="View disaster map"
        >
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <svg
              className="w-20 h-20 text-yellow-600 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <h3 className="text-lg font-bold text-yellow-600 mb-2">Live Map</h3>
            <p className="text-black text-sm text-center px-2 font-semibold">
              View real-time disaster information
            </p>
          </div>
          <button
            onClick={handleMapOpen}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleMapOpen();
              }
            }}
            className="px-6 py-3 rounded-lg text-white text-sm font-bold hover:bg-yellow-600 transition-all focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 w-3/4"
            style={{ backgroundColor: '#ca8a04', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15)' }}
            aria-label="View map"
            tabIndex={0}
          >
            View Map
          </button>
        </div>
      </section>

      {/* Info Tiles */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Evacuation Notifications */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Evacuation Notifications
          </h3>
          {dataLoaded ? (
            <>
              <p className="text-2xl font-bold text-gray-900 mb-2">
                {unreadEvacuations} <span className="text-sm font-normal text-gray-600">unread</span>
              </p>
              {latestEvacuation ? (
                <p className="text-sm text-gray-600">
                  Latest: <span className="font-medium">{latestEvacuation.title}</span> — {timeAgo(latestEvacuation.createdAt)}
                </p>
              ) : (
                <p className="text-sm text-gray-500 italic">No notifications</p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">Loading...</p>
          )}
        </div>

        {/* Crowd Reports */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            Crowd Reports
          </h3>
          {dataLoaded ? (
            <>
              <p className="text-2xl font-bold text-gray-900 mb-2">
                {crowdReports.length} <span className="text-sm font-normal text-gray-600">reports</span>
              </p>
              <p className="text-sm text-gray-600">
                {highSeverityCrowd > 0 ? (
                  <><span className="font-medium text-red-600">{highSeverityCrowd} high severity</span> near you</>
                ) : (
                  'No high-severity reports'
                )}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">Loading...</p>
          )}
        </div>

        {/* Shelter Capacity */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            Shelter Capacity
          </h3>
          {dataLoaded ? (
            <>
              <p className="text-2xl font-bold text-gray-900 mb-2">
                {shelters.length} <span className="text-sm font-normal text-gray-600">shelters</span>
              </p>
              {topShelters.length > 0 ? (
                <div className="space-y-1">
                  {topShelters.slice(0, 2).map(shelter => (
                    <p key={shelter.id} className="text-xs text-gray-600 truncate">
                      • {shelter.name}: <span className="font-medium text-green-600">{shelter.available} beds</span>
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No shelters available</p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">Loading...</p>
          )}
        </div>
      </section>

      {/* SOS FAB (Floating Action Button) */}
      <button
        onClick={handleSOS}
        disabled={sosActive}
        className={`fixed bottom-6 right-6 w-16 h-16 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500 focus:ring-offset-2 transition-all z-50 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
          sosActive ? 'sos-glow scale-110' : 'hover:scale-105'
        }`}
        aria-label="Emergency SOS button"
        title="Emergency SOS"
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </button>
      </div>
    </div>
  );
}

export default Home;
