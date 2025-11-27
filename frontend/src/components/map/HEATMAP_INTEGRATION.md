# HeatmapLayer Integration Guide

## Quick Start

### Step 1: Import the Component

```jsx
import HeatmapLayer from './components/map/HeatmapLayer';
```

### Step 2: Prepare Your Data

```javascript
const points = [
  { lat: 12.9716, lng: 77.5946, intensity: 0.8 },
  { lat: 12.9352, lng: 77.6245, intensity: 0.6 },
  { lat: 12.9500, lng: 77.6000, intensity: 1.0 },
];
```

### Step 3: Add to Your Map

```jsx
<MapContainer center={[12.9716, 77.5946]} zoom={13}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  <HeatmapLayer points={points} />
</MapContainer>
```

## Integration Scenarios

### Scenario 1: Disaster Management Dashboard

**Use Case:** Show emergency hotspots with real-time severity data

```jsx
import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import HeatmapLayer from './components/map/HeatmapLayer';
import { getAll, subscribe, STORES } from './lib/idb';

function DisasterDashboard() {
  const heatmapRef = useRef(null);
  const [emergencyPoints, setEmergencyPoints] = useState([]);

  useEffect(() => {
    // Load initial data
    const loadEmergencies = async () => {
      const helpRequests = await getAll(STORES.HELP_REQUESTS);
      
      const points = helpRequests.map(req => ({
        lat: req.lat,
        lng: req.lng,
        intensity: req.severity === 'High' ? 1.0 : 
                   req.severity === 'Medium' ? 0.6 : 0.3
      }));
      
      setEmergencyPoints(points);
      
      // Auto-fit to show all emergencies
      setTimeout(() => {
        if (heatmapRef.current) {
          heatmapRef.current.fitToBounds();
        }
      }, 500);
    };

    loadEmergencies();

    // Subscribe to real-time updates
    const unsubscribe = subscribe(STORES.HELP_REQUESTS, (data) => {
      const points = data.map(req => ({
        lat: req.lat,
        lng: req.lng,
        intensity: req.severity === 'High' ? 1.0 : 
                   req.severity === 'Medium' ? 0.6 : 0.3
      }));
      setEmergencyPoints(points);
    });

    return unsubscribe;
  }, []);

  return (
    <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: '100vh' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <HeatmapLayer 
        ref={heatmapRef}
        points={emergencyPoints}
        options={{
          gradient: {
            0.0: '#00ff00', // Low severity - green
            0.5: '#ffff00', // Medium - yellow
            1.0: '#ff0000'  // High severity - red
          }
        }}
      />
    </MapContainer>
  );
}
```

### Scenario 2: API Integration

**Use Case:** Load heatmap data from a backend API

```jsx
import { useState, useRef } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import HeatmapLayer from './components/map/HeatmapLayer';

function APIIntegratedHeatmap() {
  const heatmapRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadDisasterZones = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/disaster-zones');
      const data = await response.json();
      
      // Transform API response to heatmap format
      const heatmapPoints = data.zones.map(zone => ({
        lat: zone.coordinates.latitude,
        lng: zone.coordinates.longitude,
        intensity: zone.risk_level / 10 // Normalize to 0-1
      }));
      
      setPoints(heatmapPoints);
      
      // Auto-fit bounds after loading
      setTimeout(() => {
        if (heatmapRef.current) {
          heatmapRef.current.fitToBounds();
        }
      }, 500);
    } catch (error) {
      console.error('Error loading disaster zones:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={loadDisasterZones} disabled={loading}>
        {loading ? 'Loading...' : 'Load Disaster Zones'}
      </button>
      
      <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: '600px' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <HeatmapLayer ref={heatmapRef} points={points} />
      </MapContainer>
    </div>
  );
}
```

### Scenario 3: Multi-Layer Heatmaps

**Use Case:** Show different types of emergencies with different colors

```jsx
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import HeatmapLayer from './components/map/HeatmapLayer';

function MultiLayerHeatmap() {
  const [medicalEmergencies, setMedicalEmergencies] = useState([]);
  const [fireIncidents, setFireIncidents] = useState([]);
  const [floodZones, setFloodZones] = useState([]);

  useEffect(() => {
    // Load different emergency types from IndexedDB or API
    loadEmergencyData();
  }, []);

  const loadEmergencyData = async () => {
    const helpRequests = await getAll(STORES.HELP_REQUESTS);
    
    // Separate by type
    setMedicalEmergencies(
      helpRequests
        .filter(r => r.type === 'Medical')
        .map(r => ({ lat: r.lat, lng: r.lng, intensity: 0.8 }))
    );
    
    setFireIncidents(
      helpRequests
        .filter(r => r.type === 'Fire')
        .map(r => ({ lat: r.lat, lng: r.lng, intensity: 1.0 }))
    );
    
    setFloodZones(
      helpRequests
        .filter(r => r.type === 'Flood')
        .map(r => ({ lat: r.lat, lng: r.lng, intensity: 0.7 }))
    );
  };

  return (
    <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: '100vh' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {/* Medical emergencies - blue */}
      <HeatmapLayer 
        points={medicalEmergencies}
        options={{
          gradient: {
            0.0: '#0000ff',
            0.5: '#00ffff',
            1.0: '#00ff00'
          }
        }}
      />
      
      {/* Fire incidents - red */}
      <HeatmapLayer 
        points={fireIncidents}
        options={{
          gradient: {
            0.0: '#ffff00',
            0.5: '#ff9900',
            1.0: '#ff0000'
          }
        }}
      />
      
      {/* Flood zones - cyan */}
      <HeatmapLayer 
        points={floodZones}
        options={{
          gradient: {
            0.0: '#00ffff',
            0.5: '#0099ff',
            1.0: '#0000ff'
          }
        }}
      />
    </MapContainer>
  );
}
```

### Scenario 4: Time-Based Heatmap

**Use Case:** Show how emergency patterns change over time

```jsx
import { useState, useRef } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import HeatmapLayer from './components/map/HeatmapLayer';

function TimeBasedHeatmap() {
  const heatmapRef = useRef(null);
  const [timeRange, setTimeRange] = useState('24h'); // 24h, 7d, 30d
  const [points, setPoints] = useState([]);

  const loadDataForTimeRange = async (range) => {
    const now = Date.now();
    const timeRanges = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const cutoffTime = now - timeRanges[range];
    
    const helpRequests = await getAll(STORES.HELP_REQUESTS);
    const filtered = helpRequests.filter(r => r.timestamp > cutoffTime);
    
    const heatmapPoints = filtered.map(r => ({
      lat: r.lat,
      lng: r.lng,
      intensity: calculateIntensity(r, now)
    }));
    
    setPoints(heatmapPoints);
    setTimeRange(range);
  };

  const calculateIntensity = (request, now) => {
    const age = now - request.timestamp;
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    // Newer requests are more intense
    const timeFactor = 1 - (age / maxAge);
    const severityFactor = request.severity === 'High' ? 1.0 : 
                          request.severity === 'Medium' ? 0.6 : 0.3;
    
    return Math.max(0.1, timeFactor * severityFactor);
  };

  return (
    <div>
      <div style={{ padding: '10px', background: '#f3f4f6' }}>
        <button onClick={() => loadDataForTimeRange('24h')}>Last 24 Hours</button>
        <button onClick={() => loadDataForTimeRange('7d')}>Last 7 Days</button>
        <button onClick={() => loadDataForTimeRange('30d')}>Last 30 Days</button>
        <span style={{ marginLeft: '10px' }}>
          Current: {timeRange} ({points.length} incidents)
        </span>
      </div>
      
      <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: '600px' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <HeatmapLayer ref={heatmapRef} points={points} />
      </MapContainer>
    </div>
  );
}
```

### Scenario 5: Interactive Heatmap with Controls

**Use Case:** User-controlled heatmap visualization

```jsx
import { useState, useRef } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import HeatmapLayer from './components/map/HeatmapLayer';

function InteractiveHeatmap() {
  const heatmapRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [options, setOptions] = useState({
    radius: 25,
    blur: 35,
    maxZoom: 13,
    gradient: {
      0.0: 'blue',
      0.5: 'yellow',
      1.0: 'red'
    }
  });

  const updateRadius = (value) => {
    const newOptions = { ...options, radius: parseInt(value) };
    setOptions(newOptions);
    if (heatmapRef.current) {
      heatmapRef.current.setOptions(newOptions);
    }
  };

  const updateBlur = (value) => {
    const newOptions = { ...options, blur: parseInt(value) };
    setOptions(newOptions);
    if (heatmapRef.current) {
      heatmapRef.current.setOptions(newOptions);
    }
  };

  return (
    <div>
      <div style={{ padding: '10px', background: '#f3f4f6' }}>
        <label>
          Radius: {options.radius}
          <input 
            type="range" 
            min="10" 
            max="50" 
            value={options.radius}
            onChange={(e) => updateRadius(e.target.value)}
          />
        </label>
        
        <label style={{ marginLeft: '20px' }}>
          Blur: {options.blur}
          <input 
            type="range" 
            min="10" 
            max="60" 
            value={options.blur}
            onChange={(e) => updateBlur(e.target.value)}
          />
        </label>
        
        <button 
          onClick={() => heatmapRef.current?.fitToBounds()}
          style={{ marginLeft: '20px' }}
        >
          Fit Bounds
        </button>
      </div>
      
      <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: '600px' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <HeatmapLayer ref={heatmapRef} points={points} options={options} />
      </MapContainer>
    </div>
  );
}
```

## Common Patterns

### Pattern 1: Loading State

```jsx
function HeatmapWithLoading() {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData().then(data => {
      setPoints(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div>Loading heatmap data...</div>;
  }

  return (
    <MapContainer>
      <HeatmapLayer points={points} />
    </MapContainer>
  );
}
```

### Pattern 2: Error Handling

```jsx
function HeatmapWithErrorHandling() {
  const [points, setPoints] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData()
      .then(setPoints)
      .catch(err => {
        console.error('Error loading heatmap data:', err);
        setError(err.message);
      });
  }, []);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <MapContainer>
      <HeatmapLayer points={points} />
    </MapContainer>
  );
}
```

### Pattern 3: Conditional Rendering

```jsx
function ConditionalHeatmap({ showHeatmap }) {
  const [points, setPoints] = useState([]);

  return (
    <MapContainer>
      <TileLayer url="..." />
      {showHeatmap && <HeatmapLayer points={points} />}
    </MapContainer>
  );
}
```

## Best Practices

1. **Always use useRef for programmatic control**
   ```jsx
   const heatmapRef = useRef(null);
   <HeatmapLayer ref={heatmapRef} points={points} />
   ```

2. **Normalize intensity values to 0-1 range**
   ```javascript
   const intensity = value / maxValue; // Always 0-1
   ```

3. **Use memoization for expensive data transformations**
   ```jsx
   const heatmapPoints = useMemo(() => 
     rawData.map(transformToHeatmapPoint),
     [rawData]
   );
   ```

4. **Delay fitToBounds calls after data loads**
   ```javascript
   setTimeout(() => heatmapRef.current?.fitToBounds(), 500);
   ```

5. **Clean up on unmount (automatic with component)**

## Troubleshooting Integration Issues

### Issue: Heatmap not updating when points change

**Solution:** Ensure points array reference changes
```javascript
// ❌ Bad - same array reference
points.push(newPoint);
setPoints(points);

// ✅ Good - new array reference
setPoints([...points, newPoint]);
```

### Issue: Performance degradation with many updates

**Solution:** Batch updates
```javascript
// Batch multiple point additions
const newPoints = [...existingPoints, ...additionalPoints];
setPoints(newPoints);
```

### Issue: Ref methods not working

**Solution:** Check ref is defined before calling
```javascript
if (heatmapRef.current) {
  heatmapRef.current.fitToBounds();
}
```

## Testing Your Integration

1. **Test with small dataset** (10-100 points)
2. **Test with medium dataset** (1,000 points)
3. **Test with large dataset** (10,000+ points)
4. **Test real-time updates**
5. **Test ref API methods**
6. **Test on mobile devices**

Use `HeatmapPerformanceTest.jsx` for comprehensive testing.

## Need Help?

- Review `HEATMAP_README.md` for detailed API documentation
- Check `HeatmapLayerExamples.jsx` for working examples
- Run `HeatmapPerformanceTest.jsx` to verify performance
