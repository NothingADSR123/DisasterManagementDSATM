import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  
  // Get current volunteer ID (you can enhance this with real auth later)
  const navigate = useNavigate();
  const volunteerId = localStorage.getItem('volunteerId') || `vol-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;

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
    const connected = localStorage.getItem('volunteerConnected') === 'true';
    
    if (savedName && savedPhone) {
      setVolunteerName(savedName);
      setVolunteerPhone(savedPhone);
      setIsRegistered(true);
      setIsConnected(connected);
    }
  };

  const handleSaveVolunteerInfo = async (e) => {
    e.preventDefault();
    
    if (!volunteerName.trim() || !volunteerPhone.trim()) {
      alert('Please fill in all fields');
      return;
    }

    // Generate a simple password if not set (for first registration)
    const password = `pass${Date.now().toString().slice(-6)}`;

    // Save to localStorage
    localStorage.setItem('volunteerName', volunteerName);
    localStorage.setItem('volunteerPhone', volunteerPhone);
    localStorage.setItem('volunteerId', volunteerId);
    localStorage.setItem('volunteerPassword', password);

    // Save to IndexedDB volunteers store
    try {
      // Try to capture current location and include coordinates if available
      const geo = await new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        const timer = setTimeout(() => resolve(null), 7000);
        navigator.geolocation.getCurrentPosition((pos) => {
          clearTimeout(timer);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }, () => {
          clearTimeout(timer);
          resolve(null);
        }, { enableHighAccuracy: true, timeout: 7000 });
      });

      const volunteerRecord = {
        id: volunteerId,
        name: volunteerName,
        contact: volunteerPhone,
        available: true,
        timestamp: Date.now(),
      };

      if (geo) {
        volunteerRecord.lat = geo.lat;
        volunteerRecord.lng = geo.lng;
        volunteerRecord.latitude = geo.lat;
        volunteerRecord.longitude = geo.lng;
      }

      await add('volunteers', volunteerRecord);

      setIsRegistered(true);
      setIsConnected(true);
      localStorage.setItem('volunteerConnected', 'true');
      alert(`Registration successful! Your password is: ${password}\n\nPlease save this password. You'll need it to log back in.`);

      // Navigate to the map and show my requests
      navigate('/map');
      window.dispatchEvent(new CustomEvent('map:show-my-requests'));
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
    const accepted = requests.filter(r => r.acceptedBy === volunteerId && r.status !== 'completed' && r.status !== 'resolved');
    setMyAcceptedCount(accepted.length);
    setAcceptedRequests(accepted);

    // Count helped people
    const completed = requests.filter(r => r.acceptedBy === volunteerId && (r.status === 'completed' || r.status === 'resolved'));
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

  const handleConnectToggle = () => {
    if (isConnected) {
      // Disconnect - show login form next time
      setIsConnected(false);
      localStorage.setItem('volunteerConnected', 'false');
      alert('Disconnected from volunteer dashboard');
    } else {
      // Show login form to connect
      setShowLoginForm(true);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    
    const savedName = localStorage.getItem('volunteerName');
    const savedPhone = localStorage.getItem('volunteerPhone');
    const savedPassword = localStorage.getItem('volunteerPassword');
    
    if (!savedName || !savedPhone || !savedPassword) {
      alert('No account found. Please sign up first.');
      setIsSignUpMode(true);
      return;
    }
    
    // Verify credentials
    if (loginName === savedName && loginPhone === savedPhone && loginPassword === savedPassword) {
      setIsConnected(true);
      localStorage.setItem('volunteerConnected', 'true');
      setShowLoginForm(false);
      setLoginName('');
      setLoginPassword('');
      setLoginPhone('');
      alert('Successfully logged in!');
      
      // Optionally request location again
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          add('volunteers', {
            id: volunteerId,
            name: savedName,
            contact: savedPhone,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            available: true,
            timestamp: Date.now()
          }).catch(console.error);
        });
      }
    } else {
      alert('Invalid credentials. Please check your name, phone, and password.');
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    
    if (!loginName.trim() || !loginPhone.trim() || !loginPassword.trim()) {
      alert('Please fill in all fields');
      return;
    }

    if (loginPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    // Save new account
    localStorage.setItem('volunteerName', loginName);
    localStorage.setItem('volunteerPhone', loginPhone);
    localStorage.setItem('volunteerId', volunteerId);
    localStorage.setItem('volunteerPassword', loginPassword);

    // Capture location and save to IndexedDB
    try {
      const geo = await new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        const timer = setTimeout(() => resolve(null), 7000);
        navigator.geolocation.getCurrentPosition((pos) => {
          clearTimeout(timer);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }, () => {
          clearTimeout(timer);
          resolve(null);
        }, { enableHighAccuracy: true, timeout: 7000 });
      });

      const volunteerRecord = {
        id: volunteerId,
        name: loginName,
        contact: loginPhone,
        available: true,
        timestamp: Date.now(),
      };

      if (geo) {
        volunteerRecord.lat = geo.lat;
        volunteerRecord.lng = geo.lng;
        volunteerRecord.latitude = geo.lat;
        volunteerRecord.longitude = geo.lng;
      }

      await add('volunteers', volunteerRecord);

      setVolunteerName(loginName);
      setVolunteerPhone(loginPhone);
      setIsRegistered(true);
      setIsConnected(true);
      localStorage.setItem('volunteerConnected', 'true');
      setShowLoginForm(false);
      setIsSignUpMode(false);
      setLoginName('');
      setLoginPassword('');
      setLoginPhone('');
      
      alert('Sign up successful! You are now connected.');
    } catch (error) {
      console.error('Error during sign up:', error);
      alert('Sign up successful but location capture failed. You can still continue.');
    }
  };

  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      const request = acceptedRequests.find(r => r.id === requestId);
      if (!request) return;

      const updatedRequest = {
        ...request,
        status: newStatus,
        history: [
          ...(request.history || []),
          { status: newStatus, by: volunteerId, at: Date.now() }
        ]
      };

      await add('requests', updatedRequest);
      
      // Queue server sync
      const { offlineQueue } = await import('../lib/offlineQueue');
      await offlineQueue.add({
        type: 'UPDATE_REQUEST',
        endpoint: `/api/requests/${requestId}`,
        payload: { status: newStatus, history: updatedRequest.history }
      });

      alert(`Request marked as ${newStatus}!`);
    } catch (error) {
      console.error('Error updating request status:', error);
      alert('Error updating status');
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

      {/* Connection Status & Toggle */}
      <div className="mt-6 mb-6">
        <button
          onClick={handleConnectToggle}
          className={`w-full md:w-auto px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
            isConnected 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isConnected ? '🔴 Disconnect' : '🟢 Connect as Volunteer'}
        </button>
        {isConnected && (
          <p className="text-sm text-gray-600 mt-2">You are currently connected and can accept requests</p>
        )}
      </div>

      {/* Login Form */}
      {showLoginForm && !isConnected && (
        <div className="mt-4 mb-6 p-6 rounded-xl bg-white shadow-lg border-2 border-blue-500">
          <h3 className="font-bold text-gray-900 mb-4 text-lg">
            {isSignUpMode ? 'Sign Up as Volunteer' : 'Login to Continue'}
          </h3>
          <form onSubmit={isSignUpMode ? handleSignUp : handleLogin}>
            <div className="mb-4">
              <label className="block text-gray-900 font-semibold mb-2">Name</label>
              <input
                type="text"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                placeholder="Enter your name"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-900 font-semibold mb-2">Phone Number</label>
              <input
                type="tel"
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                placeholder="+91 XXXXXXXXXX"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-900 font-semibold mb-2">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                placeholder={isSignUpMode ? "Create a password (min 6 characters)" : "Enter your password"}
                required
              />
            </div>
            <div className="flex gap-2 mb-3">
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow"
              >
                {isSignUpMode ? 'Sign Up' : 'Login'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLoginForm(false);
                  setIsSignUpMode(false);
                }}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUpMode(!isSignUpMode)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {isSignUpMode ? 'Already have an account? Login' : 'New user? Sign Up'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* My Accepted Requests Section */}
      {isConnected && acceptedRequests.length > 0 && (
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">My Accepted Requests</h2>
          <div className="space-y-4">
            {acceptedRequests.map(request => (
              <div key={request.id} className="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-500">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{request.type || 'General Request'}</h3>
                    <p className="text-sm text-gray-600 mt-1">{request.description || 'No description'}</p>
                    {request.contact && (
                      <p className="text-sm text-gray-600 mt-1">Contact: {request.contact}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    request.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                    request.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {request.status || 'pending'}
                  </span>
                </div>
                
                <div className="flex gap-2 mt-4">
                  {request.status !== 'in-progress' && (
                    <button
                      onClick={() => handleUpdateStatus(request.id, 'in-progress')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                    >
                      Mark In Progress
                    </button>
                  )}
                  {request.status === 'in-progress' && (
                    <button
                      onClick={() => handleUpdateStatus(request.id, 'resolved')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition"
                    >
                      Mark Resolved
                    </button>
                  )}
                  <button
                    onClick={() => handleUpdateStatus(request.id, 'cancelled')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition"
                  >
                    Cancel
                  </button>
                  {request.lat && request.lng && (
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('map:route', {
                          detail: { to: [request.lat, request.lng] }
                        }));
                        window.location.href = '/map';
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition"
                    >
                      Show Route
                    </button>
                  )}
                </div>

                {/* History */}
                {request.history && request.history.length > 0 && (
                  <details className="mt-4">
                    <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">View History</summary>
                    <div className="mt-2 space-y-1">
                      {request.history.map((entry, idx) => (
                        <p key={idx} className="text-xs text-gray-500">
                          {new Date(entry.at).toLocaleString()}: {entry.status} by {entry.by}
                        </p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION A — Quick Actions (2 tiles) */}
      <div className="grid gap-6 mt-8 md:grid-cols-2">
        {/* Tile 1 — Nearby SOS Alerts */}
        <div 
          onClick={() => {
            navigate('/map');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('map:show-sos'));
            }, 100);
          }}
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
          onClick={() => {
            navigate('/map');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('map:show-my-requests'));
            }, 100);
          }}
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
          onClick={() => {
            navigate('/map');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('map:nearby-requests'));
            }, 100);
          }}
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
