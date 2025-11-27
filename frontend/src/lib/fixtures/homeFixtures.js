/**
 * Home Page Fixtures
 * Seeds development data for evacuation notifications, crowd reports, and shelters
 * 
 * @module homeFixtures
 */

import { put } from '../db.js';

/**
 * Seed home page data fixtures
 * @param {Object} idb - IndexedDB instance (optional, uses db.js by default)
 */
export async function seedHomeFixtures(idb) {
  console.log('[HomeFixtures] Seeding development data...');

  try {
    // Seed evacuation notifications
    const evacuations = [
      {
        id: 'evac-1',
        title: 'Flood Warning - North District',
        zone: 'North District',
        severity: 'high',
        message: 'Immediate evacuation recommended due to rising water levels',
        createdAt: Date.now() - 1000 * 60 * 15, // 15 mins ago
        read: false
      },
      {
        id: 'evac-2',
        title: 'Shelter Available - Community Center',
        zone: 'Central District',
        severity: 'medium',
        message: 'Emergency shelter now open at Central Community Center',
        createdAt: Date.now() - 1000 * 60 * 45, // 45 mins ago
        read: false
      },
      {
        id: 'evac-3',
        title: 'Road Closure - Highway 101',
        zone: 'East District',
        severity: 'medium',
        message: 'Highway 101 closed due to landslide. Use alternate routes.',
        createdAt: Date.now() - 1000 * 60 * 120, // 2 hours ago
        read: true
      }
    ];

    for (const evac of evacuations) {
      await put('evacuationNotifications', evac);
    }

    // Seed crowd reports
    const crowdReports = [
      {
        id: 'crowd-1',
        lat: 12.9716,
        lng: 77.5946,
        severity: 'high',
        density: 85,
        description: 'High crowd density at main shelter',
        timestamp: Date.now() - 1000 * 60 * 10
      },
      {
        id: 'crowd-2',
        lat: 12.9352,
        lng: 77.6245,
        severity: 'high',
        density: 92,
        description: 'Critical crowding at evacuation point',
        timestamp: Date.now() - 1000 * 60 * 20
      },
      {
        id: 'crowd-3',
        lat: 12.9500,
        lng: 77.6000,
        severity: 'medium',
        density: 65,
        description: 'Moderate crowds at relief center',
        timestamp: Date.now() - 1000 * 60 * 30
      },
      {
        id: 'crowd-4',
        lat: 12.9800,
        lng: 77.5800,
        severity: 'medium',
        density: 58,
        description: 'Steady flow at medical tent',
        timestamp: Date.now() - 1000 * 60 * 40
      },
      {
        id: 'crowd-5',
        lat: 12.9100,
        lng: 77.6100,
        severity: 'low',
        density: 35,
        description: 'Light activity at food distribution',
        timestamp: Date.now() - 1000 * 60 * 50
      },
      {
        id: 'crowd-6',
        lat: 12.9600,
        lng: 77.5700,
        severity: 'low',
        density: 28,
        description: 'Minimal crowds at west shelter',
        timestamp: Date.now() - 1000 * 60 * 60
      }
    ];

    for (const report of crowdReports) {
      await put('crowdReports', report);
    }

    // Seed shelters
    const shelters = [
      {
        id: 'shelter-1',
        lat: 12.9716,
        lng: 77.5946,
        name: 'Central Relief Shelter',
        capacity: 500,
        available: 182,
        address: '123 Main Street, Bangalore',
        contact: '+91-9876543212',
        amenities: ['Medical', 'Food', 'Water', 'Beds'],
        lastUpdated: Date.now() - 1000 * 60 * 5
      },
      {
        id: 'shelter-2',
        lat: 12.9352,
        lng: 77.6245,
        name: 'Community Hall North',
        capacity: 300,
        available: 245,
        address: '456 North Avenue, Bangalore',
        contact: '+91-9876543213',
        amenities: ['Food', 'Water', 'Beds'],
        lastUpdated: Date.now() - 1000 * 60 * 8
      },
      {
        id: 'shelter-3',
        lat: 12.9500,
        lng: 77.6000,
        name: 'Sports Complex Shelter',
        capacity: 800,
        available: 523,
        address: '789 Stadium Road, Bangalore',
        contact: '+91-9876543214',
        amenities: ['Medical', 'Food', 'Water', 'Beds', 'Showers'],
        lastUpdated: Date.now() - 1000 * 60 * 12
      },
      {
        id: 'shelter-4',
        lat: 12.9100,
        lng: 77.6100,
        name: 'School Emergency Center',
        capacity: 200,
        available: 87,
        address: '321 School Lane, Bangalore',
        contact: '+91-9876543215',
        amenities: ['Food', 'Water'],
        lastUpdated: Date.now() - 1000 * 60 * 15
      }
    ];

    for (const shelter of shelters) {
      await put('shelters', shelter);
    }

    console.log('[HomeFixtures] ✅ Seeded:', {
      evacuations: evacuations.length,
      crowdReports: crowdReports.length,
      shelters: shelters.length
    });

    return {
      evacuations: evacuations.length,
      crowdReports: crowdReports.length,
      shelters: shelters.length
    };

  } catch (error) {
    console.error('[HomeFixtures] Failed to seed data:', error);
    throw error;
  }
}

export default { seedHomeFixtures };
