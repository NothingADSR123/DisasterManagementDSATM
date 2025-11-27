import React from 'react';
import CanHelpPanel from '../components/forms/CanHelpPanel';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/useToast.jsx';

function Volunteer() {
  const { showToast } = useToast();

  const handleOffer = (data) => {
    console.log('Volunteer offer submitted:', data);
    showToast(`Thank you for volunteering, ${data.name}! Your offer has been recorded.`, 'success', 4000);
  };

  const handleViewNearby = () => {
    console.log('Viewing nearby requests');
    showToast('Nearby requests will be shown on the map (Maps team implementation)', 'info', 3000);
  };

  // Static volunteer tips
  const volunteerTips = [
    {
      id: 1,
      title: 'Safety First',
      description: 'Never put yourself in danger. Assess the situation before offering help.',
      icon: '🛡️',
    },
    {
      id: 2,
      title: 'Communicate Clearly',
      description: 'Keep those in need informed about your ETA and what help you can provide.',
      icon: '💬',
    },
    {
      id: 3,
      title: 'Know Your Limits',
      description: 'Only offer help within your skill set and physical capabilities.',
      icon: '⚖️',
    },
    {
      id: 4,
      title: 'Stay Connected',
      description: 'Keep your phone charged and maintain communication with coordination team.',
      icon: '📱',
    },
    {
      id: 5,
      title: 'Respect Privacy',
      description: 'Handle personal information of those you help with care and confidentiality.',
      icon: '🔒',
    },
  ];

  // Static reputation data
  const reputationData = {
    name: 'Guest Volunteer',
    level: 'Beginner',
    helpedCount: 0,
    rating: 0,
    badges: [],
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Page Header */}
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Volunteer to Help</h1>
        <p className="text-lg text-gray-600">
          Join our community of volunteers and make a difference during emergencies. 
          Your skills and time can save lives.
        </p>
      </section>

      {/* Volunteer Registration Panel */}
      <section className="mb-12">
        <CanHelpPanel onOffer={handleOffer} />
      </section>

      {/* View Nearby Requests */}
      <section className="mb-12">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Active Help Requests
              </h3>
              <p className="text-gray-600">
                View people in your area who need assistance
              </p>
            </div>
            <Button variant="primary" onClick={handleViewNearby}>
              View Nearby Requests
            </Button>
          </div>
        </Card>
      </section>

      {/* Reputation Card */}
      <section className="mb-12">
        <Card title="Your Reputation" subtitle="Build trust by helping others">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{reputationData.helpedCount}</p>
              <p className="text-sm text-gray-600 mt-1">People Helped</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">
                {reputationData.rating > 0 ? `${reputationData.rating.toFixed(1)}★` : 'N/A'}
              </p>
              <p className="text-sm text-gray-600 mt-1">Rating</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-3xl font-bold text-purple-600">{reputationData.level}</p>
              <p className="text-sm text-gray-600 mt-1">Level</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-3xl font-bold text-yellow-600">{reputationData.badges.length}</p>
              <p className="text-sm text-gray-600 mt-1">Badges</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 text-center">
            Help others to increase your reputation and unlock new badges!
          </p>
        </Card>
      </section>

      {/* Volunteer Tips */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Volunteer Tips</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {volunteerTips.map((tip) => (
            <Card key={tip.id}>
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
    </div>
  );
}

export default Volunteer;
