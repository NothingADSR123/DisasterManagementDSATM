/**
 * Map Fixtures
 * Seeds development data for help requests, volunteers, and shelters on map
 * 
 * @module mapFixtures
 */

import { put } from '../db.js';

/**
 * Seed map data fixtures
 */
export async function seedMapFixtures() {
  console.log('[MapFixtures] Seeding development data...');

  try {
    // Seed Help Requests (SOS points)
    const helpRequests = [
      {
        id: 'help-1',
        lat: 12.9716,
        lng: 77.5946,
        latitude: 12.9716,
        longitude: 77.5946,
        type: 'Medical Emergency',
        severity: 'High',
        description: 'Person needs immediate medical attention',
        contact: '+91 9876543210',
        timestamp: Date.now() - 1000 * 60 * 5, // 5 mins ago
        status: 'pending'
      },
      {
        id: 'help-2',
        lat: 12.9820,
        lng: 77.6030,
        latitude: 12.9820,
        longitude: 77.6030,
        type: 'Food & Water',
        severity: 'Medium',
        description: 'Family of 4 needs food and water supplies',
        contact: '+91 9876543211',
        timestamp: Date.now() - 1000 * 60 * 15, // 15 mins ago
        status: 'pending'
      },
      {
        id: 'help-3',
        lat: 12.9600,
        lng: 77.5850,
        latitude: 12.9600,
        longitude: 77.5850,
        type: 'Rescue',
        severity: 'High',
        description: 'Trapped in building, needs rescue',
        contact: '+91 9876543212',
        timestamp: Date.now() - 1000 * 60 * 30, // 30 mins ago
        status: 'pending'
      },
      {
        id: 'help-4',
        lat: 12.9750,
        lng: 77.6100,
        latitude: 12.9750,
        longitude: 77.6100,
        type: 'Shelter',
        severity: 'Medium',
        description: 'Need temporary shelter for the night',
        contact: '+91 9876543213',
        timestamp: Date.now() - 1000 * 60 * 45, // 45 mins ago
        status: 'pending'
      }
    ];

    // Seed Volunteers (Can Help points)
    const volunteers = [
      {
        id: 'vol-1',
        lat: 12.9680,
        lng: 77.5920,
        latitude: 12.9680,
        longitude: 77.5920,
        name: 'Rahul Kumar',
        skills: 'First Aid, Medical Training',
        contact: '+91 9988776655',
        available: true,
        timestamp: Date.now() - 1000 * 60 * 10
      },
      {
        id: 'vol-2',
        lat: 12.9800,
        lng: 77.6000,
        latitude: 12.9800,
        longitude: 77.6000,
        name: 'Priya Sharma',
        skills: 'Food Distribution, Logistics',
        contact: '+91 9988776656',
        available: true,
        timestamp: Date.now() - 1000 * 60 * 20
      },
      {
        id: 'vol-3',
        lat: 12.9650,
        lng: 77.5900,
        latitude: 12.9650,
        longitude: 77.5900,
        name: 'Amit Patel',
        skills: 'Search & Rescue, Emergency Response',
        contact: '+91 9988776657',
        available: true,
        timestamp: Date.now() - 1000 * 60 * 25
      },
      {
        id: 'vol-4',
        lat: 12.9780,
        lng: 77.6050,
        latitude: 12.9780,
        longitude: 77.6050,
        name: 'Sneha Reddy',
        skills: 'Medical Support, Counseling',
        contact: '+91 9988776658',
        available: true,
        timestamp: Date.now() - 1000 * 60 * 35
      }
    ];

    // Seed Shelters
    const shelters = [
      {
        id: 'shelter-1',
        name: 'Central Community Shelter',
        lat: 12.9700,
        lng: 77.5970,
        latitude: 12.9700,
        longitude: 77.5970,
        capacity: 200,
        available: 85,
        occupied: 115,
        address: 'MG Road, Bangalore',
        facilities: ['Food', 'Water', 'Medical', 'Bedding'],
        contact: '+91 8080808080',
        timestamp: Date.now()
      },
      {
        id: 'shelter-2',
        name: 'Sports Complex Relief Center',
        lat: 12.9650,
        lng: 77.6080,
        latitude: 12.9650,
        longitude: 77.6080,
        capacity: 300,
        available: 145,
        occupied: 155,
        address: 'Indiranagar, Bangalore',
        facilities: ['Food', 'Water', 'Medical'],
        contact: '+91 8080808081',
        timestamp: Date.now()
      },
      {
        id: 'shelter-3',
        name: 'School Emergency Shelter',
        lat: 12.9800,
        lng: 77.5900,
        latitude: 12.9800,
        longitude: 77.5900,
        capacity: 150,
        available: 50,
        occupied: 100,
        address: 'Koramangala, Bangalore',
        facilities: ['Food', 'Water', 'Bedding'],
        contact: '+91 8080808082',
        timestamp: Date.now()
      }
    ];

    // Write to IndexedDB
    console.log('[MapFixtures] Seeding help requests...');
    for (const request of helpRequests) {
      await put('requests', request);
    }

    console.log('[MapFixtures] Seeding volunteers...');
    for (const volunteer of volunteers) {
      await put('volunteers', volunteer);
    }

    console.log('[MapFixtures] Seeding shelters...');
    for (const shelter of shelters) {
      await put('shelters', shelter);
    }

    console.log('[MapFixtures] Seeding complete!');
    
    return {
      helpRequests: helpRequests.length,
      volunteers: volunteers.length,
      shelters: shelters.length
    };

  } catch (error) {
    console.error('[MapFixtures] Error seeding data:', error);
    throw error;
  }
}
