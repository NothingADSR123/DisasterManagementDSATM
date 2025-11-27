import React, { useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

function OfflineGuide() {
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const toggleOfflineMode = () => {
    setIsOfflineMode(!isOfflineMode);
    if (!isOfflineMode) {
      console.log('Simulating offline mode');
    } else {
      console.log('Returning to online mode');
    }
  };

  const emergencyItems = [
    { category: 'First Aid', items: ['Bandages', 'Antiseptic', 'Pain relievers', 'Gauze', 'Medical tape'] },
    { category: 'Food & Water', items: ['Bottled water (3-day supply)', 'Non-perishable food', 'Can opener', 'Energy bars'] },
    { category: 'Communication', items: ['Battery-powered radio', 'Flashlight', 'Extra batteries', 'Phone charger/power bank'] },
    { category: 'Documents', items: ['ID copies', 'Insurance papers', 'Emergency contacts list', 'Medical records'] },
    { category: 'Tools & Supplies', items: ['Multi-tool', 'Duct tape', 'Whistle', 'Local maps', 'Waterproof matches'] },
    { category: 'Personal Items', items: ['Medications', 'Glasses/contacts', 'Hygiene items', 'Warm clothing', 'Blankets'] },
  ];

  const offlineTips = [
    {
      title: 'Forms Work Offline',
      description: 'All help request and volunteer forms can be filled out without internet. They will sync automatically when you reconnect.',
      icon: '📝',
    },
    {
      title: 'Cached Resources',
      description: 'Essential pages and resources are cached for offline access. Maps require initial loading but can work offline afterward.',
      icon: '💾',
    },
    {
      title: 'Location Services',
      description: 'GPS works without internet. Your location can still be determined and saved with offline forms.',
      icon: '📍',
    },
    {
      title: 'Data Sync',
      description: 'All offline actions are queued and will automatically sync when connection is restored. You\'ll see a sync status indicator.',
      icon: '🔄',
    },
  ];

  const pwaInstructions = [
    {
      platform: 'Android (Chrome)',
      steps: [
        'Open the app in Chrome browser',
        'Tap the menu (three dots) in the top right',
        'Select "Add to Home screen" or "Install app"',
        'Follow the prompts to complete installation',
        'Launch from your home screen like any other app',
      ],
    },
    {
      platform: 'iOS (Safari)',
      steps: [
        'Open the app in Safari browser',
        'Tap the Share button (square with arrow)',
        'Scroll down and tap "Add to Home Screen"',
        'Name the app and tap "Add"',
        'Access from your home screen',
      ],
    },
    {
      platform: 'Desktop (Chrome/Edge)',
      steps: [
        'Open the app in Chrome or Edge',
        'Look for the install icon in the address bar',
        'Click "Install" or "Add"',
        'The app will open in its own window',
        'Access from your apps menu or desktop',
      ],
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Offline Mode Banner */}
      {isOfflineMode && (
        <div className="mb-6 bg-orange-100 border-l-4 border-orange-500 p-4 rounded">
          <div className="flex items-center">
            <svg
              className="w-6 h-6 text-orange-500 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-orange-800">Offline Mode Simulation Active</p>
              <p className="text-sm text-orange-700">This is a UI simulation. No network calls are being made.</p>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Offline Guide</h1>
        <p className="text-lg text-gray-600">
          Learn how to use this app during emergencies when internet connectivity is limited or unavailable.
        </p>
      </section>

      {/* Test Offline Mode */}
      <section className="mb-12">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Test Offline Mode</h3>
              <p className="text-gray-600">
                Simulate offline functionality to see how the app behaves without internet
              </p>
            </div>
            <Button
              variant={isOfflineMode ? 'secondary' : 'primary'}
              onClick={toggleOfflineMode}
            >
              {isOfflineMode ? 'Go Online' : 'Go Offline'}
            </Button>
          </div>
        </Card>
      </section>

      {/* Offline Tips */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">How Offline Mode Works</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {offlineTips.map((tip, index) => (
            <Card key={index}>
              <div className="flex items-start space-x-4">
                <span className="text-4xl" role="img" aria-label={tip.title}>
                  {tip.icon}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {tip.title}
                  </h3>
                  <p className="text-gray-600 text-sm">{tip.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Emergency Items Checklist */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Emergency Kit Checklist</h2>
        <Card>
          <p className="text-gray-600 mb-6">
            Prepare an emergency kit with these essential items. Keep it in an easily accessible location.
          </p>
          <div className="space-y-6">
            {emergencyItems.map((category, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-gray-900 mb-3">{category.category}</h3>
                <ul className="grid md:grid-cols-2 gap-2">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-center text-sm text-gray-700">
                      <svg
                        className="w-4 h-4 text-green-500 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* PWA Installation Guide */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Install as PWA (Progressive Web App)</h2>
        <Card>
          <p className="text-gray-600 mb-6">
            Installing this app on your device provides the best offline experience and faster access during emergencies.
          </p>
          <div className="space-y-8">
            {pwaInstructions.map((platform, index) => (
              <div key={index}>
                <h3 className="font-semibold text-gray-900 mb-3 text-lg">{platform.platform}</h3>
                <ol className="space-y-2">
                  {platform.steps.map((step, stepIndex) => (
                    <li key={stepIndex} className="flex items-start text-sm text-gray-700">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-semibold mr-3 flex-shrink-0">
                        {stepIndex + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Best Practices */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Offline Best Practices</h2>
        <Card>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">💡</span>
              <div>
                <h4 className="font-semibold text-gray-900">Load Key Pages Before Disaster</h4>
                <p className="text-sm text-gray-600">Visit important pages while online to cache them for offline use.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🔋</span>
              <div>
                <h4 className="font-semibold text-gray-900">Keep Devices Charged</h4>
                <p className="text-sm text-gray-600">Maintain battery power and have backup charging options available.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">📱</span>
              <div>
                <h4 className="font-semibold text-gray-900">Enable Location Services</h4>
                <p className="text-sm text-gray-600">GPS works offline and helps volunteers find you even without internet.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">⏱️</span>
              <div>
                <h4 className="font-semibold text-gray-900">Sync When Possible</h4>
                <p className="text-sm text-gray-600">Check for connection periodically to sync offline submissions.</p>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

export default OfflineGuide;
