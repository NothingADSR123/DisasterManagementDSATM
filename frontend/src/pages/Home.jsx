import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

function Home() {
  // Static dummy data for recent activity
  const recentActivity = [
    { id: 1, type: 'help', user: 'John D.', action: 'requested medical assistance', time: '5 min ago', urgency: 'High' },
    { id: 2, type: 'volunteer', user: 'Sarah M.', action: 'offered transport services', time: '12 min ago', urgency: 'Medium' },
    { id: 3, type: 'help', user: 'Alex K.', action: 'needs food supplies', time: '20 min ago', urgency: 'Low' },
    { id: 4, type: 'volunteer', user: 'Mike R.', action: 'provided shelter information', time: '35 min ago', urgency: 'Medium' },
    { id: 5, type: 'help', user: 'Emma L.', action: 'requested search and rescue', time: '1 hour ago', urgency: 'High' },
  ];

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'High':
        return 'text-red-600 bg-red-100';
      case 'Medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'Low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
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

      {/* CTA Cards */}
      <section className="grid md:grid-cols-2 gap-6 mb-12">
        <Link to="/help" className="block transition-transform hover:scale-105">
          <Card className="h-full bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 hover:border-red-300 cursor-pointer">
            <div className="text-center py-8">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-red-600"
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">I Need Help</h2>
              <p className="text-gray-700 mb-4">
                Request assistance during an emergency
              </p>
              <Button variant="primary" className="mx-auto">
                Get Help Now
              </Button>
            </div>
          </Card>
        </Link>

        <Link to="/volunteer" className="block transition-transform hover:scale-105">
          <Card className="h-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 hover:border-blue-300 cursor-pointer">
            <div className="text-center py-8">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-blue-600"
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">I Can Help</h2>
              <p className="text-gray-700 mb-4">
                Volunteer to assist others in need
              </p>
              <Button variant="primary" className="mx-auto">
                Volunteer Now
              </Button>
            </div>
          </Card>
        </Link>
      </section>

      {/* Recent Activity */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>
          <Link to="/map">
            <Button variant="secondary">
              View Map
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          {recentActivity.map((activity) => (
            <Card key={activity.id} className="hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'help' ? 'bg-red-500' : 'bg-blue-500'
                  }`}></div>
                  <div>
                    <p className="font-semibold text-gray-900">{activity.user}</p>
                    <p className="text-sm text-gray-600">{activity.action}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getUrgencyColor(activity.urgency)}`}>
                    {activity.urgency}
                  </span>
                  <span className="text-sm text-gray-500">{activity.time}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
