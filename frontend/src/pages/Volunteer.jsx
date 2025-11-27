import React, { useState, useEffect } from 'react';
import { getAll, subscribe, add } from '../lib/idb';

function Volunteer() {
  const [sosCount, setSosCount] = useState(0);
  const [myAcceptedCount, setMyAcceptedCount] = useState(0);
  const [helpedCount, setHelpedCount] = useState(0);
  const [isSafe, setIsSafe] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [locationInterval, setLocationInterval] = useState(null);
  const [volunteerName, setVolunteerName] = useState("");
  const [volunteerPhone, setVolunteerPhone] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  
  // Get current volunteer ID (you can enhance this with real auth later)
  const volunteerId = 'current-volunteer-id';

  useEffect(() => {
    loadData();
    loadVolunteerInfo();

    // Subscribe to live updates
    const unsubscribe = subscribe('requests', (requests) => {
      updateCounts(requests);
    });

    return () => {
      unsubscribe();
      if (locationInterval) {
        clearInterval(locationInterval);
      }
    };
  }, []);

  const loadVolunteerInfo = () => {
    // Check if volunteer info exists in localStorage
    const savedName = localStorage.getItem('volunteerName');
    const savedPhone = localStorage.getItem('volunteerPhone');
    
    if (savedName && savedPhone) {
      setVolunteerName(savedName);
      setVolunteerPhone(savedPhone);
      setIsRegistered(true);
    }
  };

  const handleSaveVolunteerInfo = async (e) => {
    e.preventDefault();
    
    if (!volunteerName.trim() || !volunteerPhone.trim()) {
      alert('Please fill in all fields');
      return;
    }

    // Save to localStorage
    localStorage.setItem('volunteerName', volunteerName);
    localStorage.setItem('volunteerPhone', volunteerPhone);

    // Save to IndexedDB volunteers store
    try {
      await add('volunteers', {
        id: volunteerId,
        name: volunteerName,
        contact: volunteerPhone,
        available: true,
        timestamp: Date.now()
      });
      
      setIsRegistered(true);
      alert('Registration successful!');
    } catch (error) {
      console.error('Error saving volunteer info:', error);
      alert('Registration saved locally');
    }
  };

  const loadData = async () => {
    try {
      const requests = await getAll('requests');
      updateCounts(requests);
    } catch (error) {
      console.error('Error loading volunteer data:', error);
    }
  };

  const updateCounts = (requests) => {
    if (!requests) return;

    // Count nearby SOS (within 10km - simplified for now)
    const sosRequests = requests.filter(r => r.type === 'SOS' && r.status === 'pending');
    setSosCount(sosRequests.length);

    // Count my accepted requests
    const accepted = requests.filter(r => r.acceptedBy === volunteerId && r.status !== 'completed');
    setMyAcceptedCount(accepted.length);

    // Count helped people
    const completed = requests.filter(r => r.acceptedBy === volunteerId && r.status === 'completed');
    setHelpedCount(completed.length);
  };

  const handleSafeToggle = (e) => {
    const safe = e.target.checked;
    setIsSafe(safe);
    window.dispatchEvent(new CustomEvent('volunteer:safe-status', { 
      detail: { safe } 
    }));
  };

  const handleLocationToggle = (e) => {
    const sharing = e.target.checked;
    setSharingLocation(sharing);

    if (sharing) {
      // Start sharing location every 10 seconds
      window.dispatchEvent(new CustomEvent('volunteer:share-location'));
      
      const interval = setInterval(() => {
        window.dispatchEvent(new CustomEvent('volunteer:share-location'));
      }, 10000);
      
      setLocationInterval(interval);
    } else {
      // Stop sharing
      window.dispatchEvent(new CustomEvent('volunteer:stop-share-location'));
      
      if (locationInterval) {
        clearInterval(locationInterval);
        setLocationInterval(null);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Page Header */}
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Volunteer Dashboard</h1>
        <p className="text-lg text-gray-600">
          Help those in need and make a difference during emergencies.
        </p>
      </section>

      {/* Volunteer Registration Form */}
      {!isRegistered ? (
        <div className="mt-4 mb-6 p-6 rounded-xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.1)] w-full max-w-xl">
          <h3 className="font-bold text-gray-900 mb-4 text-lg">Register as Volunteer</h3>
          <form onSubmit={handleSaveVolunteerInfo}>
            <div className="mb-4">
              <label className="block text-gray-900 font-semibold mb-2">Name</label>
              <input
                type="text"
                value={volunteerName}
                onChange={(e) => setVolunteerName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                placeholder="Enter your full name"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-900 font-semibold mb-2">Phone Number</label>
              <input
                type="tel"
                value={volunteerPhone}
                onChange={(e) => setVolunteerPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                placeholder="+91 XXXXXXXXXX"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow"
            >
              Save & Register
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-4 mb-6 p-4 rounded-xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.1)] w-full max-w-xl">
          <h3 className="font-semibold text-gray-900 mb-2">Your Information</h3>
          <p className="text-gray-700 text-sm"><strong>Name:</strong> {volunteerName}</p>
          <p className="text-gray-700 text-sm mt-1"><strong>Phone:</strong> {volunteerPhone}</p>
        </div>
      )}

      {/* SECTION A — Quick Actions (2 tiles) */}
      <div className="grid gap-6 mt-8 md:grid-cols-2">
        {/* Tile 1 — Nearby SOS Alerts */}
        <div 
          onClick={() => window.dispatchEvent(new CustomEvent('map:show-sos'))}
          className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.1)] p-5 cursor-pointer hover:shadow-[0_4px_14px_rgba(0,0,0,0.15)] transition"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🆘</span>
            <h3 className="text-lg font-bold text-gray-900">Nearby SOS Alerts</h3>
          </div>
          <p className="text-3xl font-bold text-red-600">{sosCount}</p>
          <p className="text-sm text-gray-600 mt-1">Active emergency requests</p>
        </div>

        {/* Tile 2 — My Accepted Requests */}
        <div 
          onClick={() => window.dispatchEvent(new CustomEvent('map:show-my-requests'))}
          className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.1)] p-5 cursor-pointer hover:shadow-[0_4px_14px_rgba(0,0,0,0.15)] transition"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">✅</span>
            <h3 className="text-lg font-bold text-gray-900">My Accepted Requests</h3>
          </div>
          <p className="text-3xl font-bold text-blue-600">{myAcceptedCount}</p>
          <p className="text-sm text-gray-600 mt-1">Currently helping</p>
        </div>
      </div>

      {/* SECTION B — Active Help Requests */}
      <section className="mt-10">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('map:nearby-requests'))}
          className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition font-semibold"
        >
          📍 View Nearby Requests
        </button>
      </section>

      {/* SECTION C — Safety Tools (2 toggles) */}
      <section className="mt-10 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Safety Tools</h3>
        
        {/* Toggle 1 - Mark Myself Safe */}
        <label className="flex items-center gap-3 text-gray-700 cursor-pointer">
          <input 
            type="checkbox" 
            className="w-5 h-5 cursor-pointer" 
            checked={isSafe}
            onChange={handleSafeToggle}
          />
          <span className="font-medium">Mark Myself Safe</span>
        </label>

        {/* Toggle 2 - Share My Location */}
        <label className="flex items-center gap-3 text-gray-700 cursor-pointer">
          <input 
            type="checkbox" 
            className="w-5 h-5 cursor-pointer" 
            checked={sharingLocation}
            onChange={handleLocationToggle}
          />
          <span className="font-medium">Share My Location (updates every 10s)</span>
        </label>
      </section>

      {/* SECTION D — Optional micro-log */}
      {helpedCount > 0 && (
        <p className="mt-6 text-gray-500 text-sm">
          ✨ You have helped <strong>{helpedCount}</strong> {helpedCount === 1 ? 'person' : 'people'} so far.
        </p>
      )}
    </div>
  );
}

export default Volunteer;
