import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getAll } from '../lib/idb';
import { getCacheStats } from '../lib/mapDownloader';

function OfflineGuide() {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const [cacheStats, setCacheStats] = useState(null);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);

  useEffect(() => {
    // Check online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load offline queue count
    loadQueueCount();
    
    // Load cache stats
    loadCacheStats();

    // Check service worker status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setServiceWorkerReady(true);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadQueueCount = async () => {
    try {
      const queue = await getAll('offlineQueue');
      setQueueCount(queue?.length || 0);
    } catch (error) {
      console.error('Failed to load queue:', error);
    }
  };

  const loadCacheStats = async () => {
    try {
      const stats = await getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  };


  const offlineFeatures = [
    {
      title: 'Forms Work Offline',
      description: 'Submit help requests and volunteer offers without internet. They sync automatically when you reconnect.',
      icon: '📝',
      color: 'blue',
    },
    {
      title: 'GPS Location',
      description: 'Your device GPS works without internet. Location can be captured and saved with offline forms.',
      icon: '📍',
      color: 'green',
    },
    {
      title: 'Cached Maps',
      description: 'Download map tiles in advance. View maps and navigate even when offline.',
      icon: '🗺️',
      color: 'purple',
    },
    {
      title: 'Auto-Sync',
      description: 'All offline actions are queued and sync automatically when connection is restored.',
      icon: '🔄',
      color: 'orange',
    },
  ];

  const emergencyContacts = [
    { name: 'Emergency Services', number: '112 / 911', icon: '🚨' },
    { name: 'Police', number: '100', icon: '👮' },
    { name: 'Fire Brigade', number: '101', icon: '🚒' },
    { name: 'Ambulance', number: '102', icon: '🚑' },
    { name: 'Disaster Helpline', number: '1078', icon: '📞' },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Connection Status Banner */}
      <div className={`mb-6 ${isOnline ? 'bg-green-100 border-green-500' : 'bg-orange-100 border-orange-500'} border-l-4 p-4 rounded`}>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-orange-500'} mr-3 animate-pulse`}></div>
          <div className="flex-1">
            <p className={`font-semibold ${isOnline ? 'text-green-800' : 'text-orange-800'}`}>
              {isOnline ? '🟢 Online - All features available' : '🟠 Offline Mode - Limited connectivity'}
            </p>
            <p className={`text-sm ${isOnline ? 'text-green-700' : 'text-orange-700'}`}>
              {isOnline ? 'You can access all app features and sync data.' : 'Core features still work. Data will sync when connection is restored.'}
            </p>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Offline Guide</h1>
        <p className="text-lg text-gray-600">
          Essential information for using this app during emergencies when internet is unavailable.
        </p>
      </section>

      {/* App Status */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">App Status</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <div className="text-center">
              <div className={`text-3xl mb-2 ${serviceWorkerReady ? 'text-green-500' : 'text-gray-400'}`}>
                {serviceWorkerReady ? '✅' : '⏳'}
              </div>
              <h3 className="font-semibold text-gray-900">Offline Ready</h3>
              <p className="text-sm text-gray-600 mt-1">
                {serviceWorkerReady ? 'App is cached' : 'Loading...'}
              </p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <div className="text-3xl mb-2 text-blue-500">📦</div>
              <h3 className="font-semibold text-gray-900">Pending Sync</h3>
              <p className="text-sm text-gray-600 mt-1">
                {queueCount} {queueCount === 1 ? 'item' : 'items'} queued
              </p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <div className="text-3xl mb-2 text-purple-500">🗺️</div>
              <h3 className="font-semibold text-gray-900">Map Cache</h3>
              <p className="text-sm text-gray-600 mt-1">
                {cacheStats ? `${cacheStats.tileCount} tiles` : 'Not downloaded'}
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Offline Features */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">How Offline Mode Works</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {offlineFeatures.map((feature, index) => (
            <Card key={index}>
              <div className="flex items-start space-x-4">
                <span className="text-4xl" role="img" aria-label={feature.title}>
                  {feature.icon}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-900">Download Maps for Offline Use</h3>
                <p className="text-sm text-gray-600">Pre-cache map tiles for your area</p>
              </div>
              <Button onClick={() => navigate('/map')}>
                Go to Map
              </Button>
            </div>

            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-900">Submit Help Request</h3>
                <p className="text-sm text-gray-600">Works offline - will sync later</p>
              </div>
              <Button onClick={() => navigate('/help')}>
                Request Help
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">View Nearby Requests</h3>
                <p className="text-sm text-gray-600">See who needs help near you</p>
              </div>
              <Button onClick={() => navigate('/volunteer')}>
                Volunteer
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* Emergency Contacts */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Emergency Contacts</h2>
        <Card>
          <p className="text-gray-600 mb-4 text-sm">
            These numbers work even without internet. Save them in your phone.
          </p>
          <div className="space-y-3">
            {emergencyContacts.map((contact, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{contact.icon}</span>
                  <span className="font-medium text-gray-900">{contact.name}</span>
                </div>
                <a 
                  href={`tel:${contact.number.replace(/\s/g, '')}`}
                  className="text-blue-600 font-semibold hover:text-blue-700"
                >
                  {contact.number}
                </a>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Best Practices */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Offline Best Practices</h2>
        <Card>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🗺️</span>
              <div>
                <h4 className="font-semibold text-gray-900">Download Maps Before Disaster</h4>
                <p className="text-sm text-gray-600">Visit the Map page and download tiles for your area while online.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🔋</span>
              <div>
                <h4 className="font-semibold text-gray-900">Keep Devices Charged</h4>
                <p className="text-sm text-gray-600">Maintain battery power. Have backup charging options (power bank, car charger).</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">📱</span>
              <div>
                <h4 className="font-semibold text-gray-900">Enable Location Services</h4>
                <p className="text-sm text-gray-600">GPS works offline. It helps volunteers find you even without internet.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">📲</span>
              <div>
                <h4 className="font-semibold text-gray-900">Install as App</h4>
                <p className="text-sm text-gray-600">Add to home screen for faster access and better offline performance.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">⏱️</span>
              <div>
                <h4 className="font-semibold text-gray-900">Sync When Connection Available</h4>
                <p className="text-sm text-gray-600">App automatically syncs offline submissions when internet is restored.</p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Installation Guide - Simplified */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Install as App (PWA)</h2>
        <Card>
          <p className="text-gray-600 mb-4">
            Installing provides faster access and better offline experience during emergencies.
          </p>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-1">📱 Mobile (Chrome/Safari)</h3>
              <p className="text-sm text-gray-700">
                Tap menu → "Add to Home Screen" or "Install App"
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-1">💻 Desktop (Chrome/Edge)</h3>
              <p className="text-sm text-gray-700">
                Look for install icon in address bar → Click "Install"
              </p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

export default OfflineGuide;
