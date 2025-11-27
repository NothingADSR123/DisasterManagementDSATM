import React, { useState } from 'react';
import NeedHelpForm from '../components/forms/NeedHelpForm';
import PanicButton from '../components/ui/PanicButton';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/useToast.jsx';
// Stub import - implementation will be handled by data team
import { saveToLocalQueue } from '../lib/offlineQueue';

function Help() {
  const [showPanicModal, setShowPanicModal] = useState(false);
  const { showToast } = useToast();

  const handleFormSubmit = (data) => {
    // Save to local queue (stub function)
    try {
      saveToLocalQueue(data);
    } catch (error) {
      console.log('Local queue save (stub):', data);
    }

    // Show success toast
    showToast('Help request submitted! Volunteers nearby have been notified.', 'success', 4000);
  };

  const handlePickLocation = () => {
    console.log('Maps team: Open location picker');
    alert('Location picker will be implemented by Maps team');
  };

  const handlePanic = () => {
    setShowPanicModal(true);
  };

  const confirmPanic = () => {
    console.log('PANIC activated - sending emergency alerts');
    showToast('Emergency alert sent to all nearby volunteers!', 'warning', 5000);
    setShowPanicModal(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Page Header */}
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Request Help</h1>
        <p className="text-lg text-gray-600">
          Fill out the form below to request assistance during an emergency. 
          Your request will be shared with nearby volunteers who can help you.
        </p>
      </section>

      {/* Help Request Form */}
      <section className="mb-12">
        <Card title="Help Request Form" subtitle="Provide details about your situation">
          <NeedHelpForm 
            onSubmit={handleFormSubmit} 
            onPickLocation={handlePickLocation}
          />
        </Card>
      </section>

      {/* Panic Section */}
      <section className="mb-8">
        <Card 
          title="Emergency Panic Button" 
          subtitle="For immediate, life-threatening emergencies"
          className="bg-red-50 border-2 border-red-200"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              The Panic Button is designed for critical, life-threatening situations where 
              you need immediate help. When activated, it will:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Send instant alerts to all nearby volunteers</li>
              <li>Share your current location automatically</li>
              <li>Trigger emergency response protocols</li>
              <li>Notify local emergency services if available</li>
            </ul>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-yellow-800 font-medium">
                ⚠️ Only use the Panic Button in genuine emergencies. False alarms can 
                divert resources from people who truly need help.
              </p>
            </div>
            <div className="flex justify-center mt-6">
              <div className="relative">
                <PanicButton onPanic={handlePanic} />
                <p className="text-center text-sm text-gray-600 mt-20">
                  Click the button above for emergencies
                </p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Panic Confirmation Modal */}
      {showPanicModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="panic-modal-title"
        >
          <Card className="max-w-md w-full">
            <h2 id="panic-modal-title" className="text-xl font-bold text-red-600 mb-4">
              Confirm Emergency Alert
            </h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to activate the panic button? This will send an 
              emergency alert to all nearby volunteers and emergency services.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="primary"
                onClick={confirmPanic}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Yes, Send Alert
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowPanicModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default Help;
