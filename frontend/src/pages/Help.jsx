import React, { useState, useEffect } from 'react';
import { add, remove } from '../lib/idb';
import * as offlineQueue from '../lib/offlineQueue';

// Helper to generate unique ID
const generateUUID = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

// Helper to compute hash
const computeHash = async (data) => {
  const str = JSON.stringify(data);
  try {
    const msgBuffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback simple hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
};

function Help() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('Medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);
  const [error, setError] = useState('');
  const [showUndo, setShowUndo] = useState(false);
  const [lastRequestId, setLastRequestId] = useState(null);
  const [undoTimeout, setUndoTimeout] = useState(null);

  useEffect(() => {
    // Listen for map location picked
    const handleLocationPicked = (event) => {
      const { lat, lng, address: addr } = event.detail;
      setLocation({ lat, lng });
      setAddress(addr || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    };

    window.addEventListener('map:location-picked', handleLocationPicked);

    return () => {
      window.removeEventListener('map:location-picked', handleLocationPicked);
      if (undoTimeout) {
        clearTimeout(undoTimeout);
      }
    };
  }, [undoTimeout]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setError('Getting your location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocation({ lat, lng });
        setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setError('');
      },
      (err) => {
        setError('Could not get your location. Please pick on map.');
        console.error('Geolocation error:', err);
      },
      { timeout: 5000, enableHighAccuracy: false }
    );
  };

  const handlePickOnMap = () => {
    window.dispatchEvent(new CustomEvent('map:pick-location', {
      detail: { mode: 'for-request' }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!location) {
      setError('Location is required. Please use your location or pick on map.');
      return;
    }

    if (!phone.trim() && !description.trim()) {
      setError('Please provide at least your phone number or a description.');
      return;
    }

    setIsSubmitting(true);

    try {
      const id = generateUUID();
      const now = Date.now();

      const request = {
        id,
        type: 'need',
        name: name.trim(),
        phone: phone.trim(),
        description: description.trim(),
        urgency,
        location: {
          lat: location.lat,
          lng: location.lng
        },
        address,
        status: 'open',
        createdAt: now,
        updatedAt: now,
        source: 'local',
        pendingSync: true
      };

      // Compute hash
      request.hash = await computeHash(request);

      // Save to IndexedDB
      await add('requests', request);

      // Add to offline queue
      try {
        await offlineQueue.add({
          type: 'request:create',
          payload: request
        });
      } catch (queueErr) {
        console.warn('Offline queue not available:', queueErr);
      }

      // Dispatch events
      window.dispatchEvent(new CustomEvent('request:created', {
        detail: { id: request.id }
      }));

      window.dispatchEvent(new CustomEvent('map:add-request-marker', {
        detail: {
          id,
          lat: location.lat,
          lng: location.lng,
          type: 'request'
        }
      }));

      // Show undo toast
      setLastRequestId(id);
      setShowUndo(true);
      setPendingSync(true);

      // Hide undo after 5 seconds
      const timeout = setTimeout(() => {
        setShowUndo(false);
      }, 5000);
      setUndoTimeout(timeout);

      // Reset form
      setName('');
      setPhone('');
      setDescription('');
      setUrgency('Medium');
      setLocation(null);
      setAddress('');
      setIsSubmitting(false);

    } catch (err) {
      console.error('Error submitting request:', err);
      setError('Failed to submit request. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleUndo = async () => {
    if (!lastRequestId) return;

    try {
      // Remove from IndexedDB
      await remove('requests', lastRequestId);

      // Try to remove from offline queue
      try {
        if (offlineQueue.removeByPayloadId) {
          await offlineQueue.removeByPayloadId(lastRequestId);
        }
      } catch (err) {
        console.warn('Could not remove from queue:', err);
      }

      // Dispatch deleted event
      window.dispatchEvent(new CustomEvent('request:deleted', {
        detail: { id: lastRequestId }
      }));

      setShowUndo(false);
      setPendingSync(false);
      setLastRequestId(null);
      if (undoTimeout) {
        clearTimeout(undoTimeout);
      }

    } catch (err) {
      console.error('Error undoing request:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#dfe7ff] py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Request Emergency Help</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name field (optional) */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Name <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg bg-white text-gray-900"
              placeholder="Your name"
            />
          </div>

          {/* Phone field */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg bg-white text-gray-900"
              placeholder="Your contact number"
            />
          </div>

          {/* Location block */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {location ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">
                    📍 {address || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">No location selected</p>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  📍 Use My Location
                </button>
                <button
                  type="button"
                  onClick={handlePickOnMap}
                  className="flex-1 px-4 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  🗺️ Pick on Map
                </button>
              </div>
            </div>
          </div>

          {/* Description field */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Short Description
            </label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={140}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg bg-white text-gray-900"
              placeholder="e.g., Need medical help / trapped / food"
            />
            <p className="mt-1 text-sm text-gray-500">{description.length}/140 characters</p>
          </div>

          {/* Urgency radios */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Urgency Level
            </label>
            <div className="flex gap-4">
              {['Low', 'Medium', 'High'].map((level) => (
                <label
                  key={level}
                  className={`flex-1 flex items-center justify-center px-4 py-3 border-2 rounded-lg cursor-pointer transition-all ${
                    urgency === level
                      ? level === 'High'
                        ? 'border-red-500 bg-red-50'
                        : level === 'Medium'
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-green-500 bg-green-50'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="urgency"
                    value={level}
                    checked={urgency === level}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="sr-only"
                  />
                  <span className={`font-medium ${urgency === level ? 'text-gray-900' : 'text-gray-600'}`}>
                    {level}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-4 bg-red-600 text-white font-bold text-lg rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Help Request'}
          </button>

          {/* Pending status */}
          {pendingSync && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Status: <span className="font-medium text-yellow-600">Pending sync</span>
              </p>
            </div>
          )}
        </form>

        {/* Undo toast */}
        {showUndo && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white text-gray-900 px-6 py-4 rounded-lg shadow-lg flex items-center gap-4 z-50 border border-gray-200">
            <p className="font-medium">Request saved</p>
            <button
              onClick={handleUndo}
              className="px-4 py-2 bg-gray-900 text-white font-medium rounded hover:bg-gray-800 transition-colors"
            >
              Undo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Help;
