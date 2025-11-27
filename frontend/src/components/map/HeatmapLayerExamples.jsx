/**
 * HeatmapLayer Usage Examples
 * Demonstrates how to use the enhanced HeatmapLayer component
 */

import { useRef, useEffect, useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import HeatmapLayer from './HeatmapLayer';

/**
 * Example 1: Basic Usage
 */
export function BasicHeatmapExample() {
  const [points, setPoints] = useState([
    { lat: 12.9716, lng: 77.5946, intensity: 0.8 },
    { lat: 12.9352, lng: 77.6245, intensity: 0.6 },
    { lat: 12.9500, lng: 77.6000, intensity: 1.0 },
  ]);

  return (
    <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: '500px' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <HeatmapLayer points={points} />
    </MapContainer>
  );
}

/**
 * Example 2: Using Ref API
 */
export function HeatmapWithRefExample() {
  const heatmapRef = useRef(null);
  const [points, setPoints] = useState([
    { lat: 12.9716, lng: 77.5946, intensity: 0.8 },
    { lat: 12.9352, lng: 77.6245, intensity: 0.6 },
    { lat: 12.9500, lng: 77.6000, intensity: 1.0 },
  ]);

  // Fit bounds to show all points
  const handleFitBounds = () => {
    if (heatmapRef.current) {
      heatmapRef.current.fitToBounds();
    }
  };

  // Clear the heatmap
  const handleClear = () => {
    if (heatmapRef.current) {
      heatmapRef.current.clear();
    }
  };

  // Update options
  const handleUpdateOptions = () => {
    if (heatmapRef.current) {
      heatmapRef.current.setOptions({
        radius: 30,
        blur: 40,
        gradient: {
          0.0: 'green',
          0.5: 'yellow',
          1.0: 'red'
        }
      });
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={handleFitBounds}>Fit Bounds</button>
        <button onClick={handleClear}>Clear Heatmap</button>
        <button onClick={handleUpdateOptions}>Update Options</button>
      </div>
      
      <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: '500px' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <HeatmapLayer ref={heatmapRef} points={points} />
      </MapContainer>
    </div>
  );
}

/**
 * Example 3: Large Dataset (Performance Test)
 */
export function LargeDatasetExample() {
  const heatmapRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Generate random points for testing
  const generateRandomPoints = (count) => {
    setIsLoading(true);
    
    const baseLatLng = { lat: 12.9716, lng: 77.5946 };
    const newPoints = [];
    
    for (let i = 0; i < count; i++) {
      newPoints.push({
        lat: baseLatLng.lat + (Math.random() - 0.5) * 0.2,
        lng: baseLatLng.lng + (Math.random() - 0.5) * 0.2,
        intensity: Math.random()
      });
    }
    
    setPoints(newPoints);
    setIsLoading(false);
  };

  return (
    <div>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={() => generateRandomPoints(100)}>100 Points</button>
        <button onClick={() => generateRandomPoints(1000)}>1,000 Points</button>
        <button onClick={() => generateRandomPoints(5000)}>5,000 Points</button>
        <button onClick={() => generateRandomPoints(10000)}>10,000 Points</button>
        {isLoading && <span> Loading...</span>}
        <span> Current: {points.length} points</span>
      </div>
      
      <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: '500px' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <HeatmapLayer ref={heatmapRef} points={points} />
      </MapContainer>
    </div>
  );
}

/**
 * Example 4: Custom Options
 */
export function CustomOptionsExample() {
  const [points] = useState([
    { lat: 12.9716, lng: 77.5946, intensity: 0.8 },
    { lat: 12.9352, lng: 77.6245, intensity: 0.6 },
    { lat: 12.9500, lng: 77.6000, intensity: 1.0 },
  ]);

  const customOptions = {
    radius: 30,
    blur: 40,
    maxZoom: 15,
    max: 1.0,
    minOpacity: 0.3,
    gradient: {
      0.0: '#0000ff',
      0.25: '#00ff00',
      0.5: '#ffff00',
      0.75: '#ff9900',
      1.0: '#ff0000'
    }
  };

  return (
    <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: '500px' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <HeatmapLayer points={points} options={customOptions} />
    </MapContainer>
  );
}

/**
 * Example 5: Real-time Updates
 */
export function RealTimeUpdateExample() {
  const [points, setPoints] = useState([]);
  const heatmapRef = useRef(null);

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      const newPoint = {
        lat: 12.9716 + (Math.random() - 0.5) * 0.1,
        lng: 77.5946 + (Math.random() - 0.5) * 0.1,
        intensity: Math.random()
      };
      
      setPoints(prevPoints => [...prevPoints.slice(-50), newPoint]); // Keep last 50 points
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <p>Points: {points.length} (auto-updating every second)</p>
      <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: '500px' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <HeatmapLayer ref={heatmapRef} points={points} />
      </MapContainer>
    </div>
  );
}

/**
 * Example 6: Dynamic Data from API
 */
export function DynamicDataExample() {
  const heatmapRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadDataFromAPI = async () => {
    setLoading(true);
    try {
      // Example: Fetch from your API
      const response = await fetch('/api/disaster-zones');
      const data = await response.json();
      
      // Transform API data to heatmap format
      const heatmapPoints = data.map(zone => ({
        lat: zone.latitude,
        lng: zone.longitude,
        intensity: zone.severity / 10 // Normalize severity to 0-1
      }));
      
      setPoints(heatmapPoints);
      
      // Auto-fit bounds after loading
      setTimeout(() => {
        if (heatmapRef.current) {
          heatmapRef.current.fitToBounds();
        }
      }, 500);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={loadDataFromAPI} disabled={loading}>
        {loading ? 'Loading...' : 'Load Disaster Zones'}
      </button>
      
      <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: '500px' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <HeatmapLayer ref={heatmapRef} points={points} />
      </MapContainer>
    </div>
  );
}

/**
 * Example 7: Multiple Heatmaps with Different Gradients
 */
export function MultipleHeatmapsExample() {
  const [medicalPoints] = useState([
    { lat: 12.9716, lng: 77.5946, intensity: 0.8 },
    { lat: 12.9352, lng: 77.6245, intensity: 0.6 },
  ]);

  const [firePoints] = useState([
    { lat: 12.9500, lng: 77.6000, intensity: 1.0 },
    { lat: 12.9600, lng: 77.6100, intensity: 0.7 },
  ]);

  const medicalOptions = {
    gradient: {
      0.0: '#0000ff',
      0.5: '#00ffff',
      1.0: '#00ff00'
    }
  };

  const fireOptions = {
    gradient: {
      0.0: '#ffff00',
      0.5: '#ff9900',
      1.0: '#ff0000'
    }
  };

  return (
    <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: '500px' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <HeatmapLayer points={medicalPoints} options={medicalOptions} />
      <HeatmapLayer points={firePoints} options={fireOptions} />
    </MapContainer>
  );
}

export default {
  BasicHeatmapExample,
  HeatmapWithRefExample,
  LargeDatasetExample,
  CustomOptionsExample,
  RealTimeUpdateExample,
  DynamicDataExample,
  MultipleHeatmapsExample
};
