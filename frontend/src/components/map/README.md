# MapView Component

## Overview
The `MapView` component is a comprehensive React component for displaying interactive maps with offline support, real-time data updates, and disaster management features.

## Features

### 🗺️ Map Display
- **Leaflet Integration**: Uses React-Leaflet for rendering interactive maps
- **Responsive Design**: Fully responsive map container that adapts to all screen sizes
- **Custom Markers**: Distinct icons for help requests, volunteers, and shelters
- **Popups**: Interactive popups with detailed information and action buttons

### 📡 Offline Support
- **IndexedDB Storage**: Local data persistence using IndexedDB
- **Offline Queue**: Actions are queued when offline and synced when connection is restored
- **Service Worker**: Map tiles are cached for offline viewing
- **Offline Indicator**: Visual indicator when in offline mode

### 🎯 Interactive Features
- **Help Request Markers** (🆘): Red markers showing locations needing assistance
- **Volunteer Markers** (🤝): Blue markers showing available volunteers
- **Shelter Markers** (🏠): Green markers showing shelter locations
- **Heatmap Layer**: Visualizes danger zones based on severity
- **Routing**: Turn-by-turn directions using Leaflet Routing Machine

### 📊 Real-time Data
- **Live Updates**: Subscribes to data changes in IndexedDB
- **Auto-refresh**: Marker data updates every 2 seconds
- **Event System**: Custom events for inter-component communication

## Installation

```bash
npm install leaflet react-leaflet leaflet.heat leaflet-routing-machine
```

## Usage

### Basic Implementation

```jsx
import MapView from './components/map/MapView';

function App() {
  return (
    <div className="App">
      <MapView />
    </div>
  );
}
```

### Customizing Map Center

Edit the `DEFAULT_CENTER` constant in `MapView.jsx`:

```javascript
// Change to your disaster area coordinates
const DEFAULT_CENTER = [12.9716, 77.5946]; // [latitude, longitude]
const DEFAULT_ZOOM = 13;
```

### Using Different Tile Providers

#### Mapbox
```jsx
<TileLayer
  attribution='© Mapbox'
  url="https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}"
  id="mapbox/streets-v11"
  accessToken="YOUR_MAPBOX_TOKEN"
/>
```

#### Local Offline Tiles
```jsx
<TileLayer
  attribution='Offline tiles'
  url="/tiles/{z}/{x}/{y}.png"
  maxZoom={19}
/>
```

## Child Components

### Shelters.jsx
Renders shelter markers with:
- Name, capacity, availability
- Contact information
- "Get Directions" button

### HeatmapLayer.jsx
Displays danger zones using:
- Color gradient (blue → red)
- Adjustable intensity
- Configurable radius and blur

### RoutingControl.jsx
Provides navigation with:
- Turn-by-turn directions
- Distance and time estimates
- Draggable waypoints (optional)

## Custom Events

### Listening for Events

```javascript
// Route request
window.addEventListener('map:route', (event) => {
  const { from, to, type, id } = event.detail;
  console.log('Route requested:', from, to);
});

// Route found
window.addEventListener('map:routeFound', (event) => {
  const { distance, time, coordinates } = event.detail;
  console.log('Route found:', distance, time);
});

// WebRTC connection request
window.addEventListener('webrtc:connect', (event) => {
  const { id } = event.detail;
  console.log('Connect to volunteer:', id);
});

// Add help request
window.addEventListener('map:addHelpRequest', (event) => {
  const { lat, lng } = event.detail;
  console.log('Add help request at:', lat, lng);
});
```

### Triggering Events

```javascript
// Request route
window.dispatchEvent(new CustomEvent('map:route', {
  detail: {
    from: [12.9716, 77.5946],
    to: [12.9352, 77.6245],
    type: 'shelter',
    id: 123
  }
}));
```

## IndexedDB Structure

### Stores

1. **helpRequests**: Help requests (Need Help)
   - `id`, `lat`, `lng`, `type`, `severity`, `description`, `contact`

2. **volunteers**: Volunteer locations (Can Help)
   - `id`, `lat`, `lng`, `name`, `skills`, `contact`

3. **shelters**: Shelter locations
   - `id`, `lat`, `lng`, `name`, `capacity`, `available`, `address`, `contact`

4. **offlineQueue**: Offline action queue
   - `id`, `type`, `timestamp`, `status`, `data`

### API Methods

```javascript
import { getAll, add, update, remove, subscribe, STORES } from '../lib/idb';

// Get all help requests
const requests = await getAll(STORES.HELP_REQUESTS);

// Add new help request
await add(STORES.HELP_REQUESTS, {
  lat: 12.9716,
  lng: 77.5946,
  type: 'Medical',
  severity: 'High',
  description: 'Need medical supplies'
});

// Subscribe to changes
const unsubscribe = subscribe(STORES.HELP_REQUESTS, (data) => {
  console.log('Help requests updated:', data);
});
```

## Offline Queue

### Adding Actions to Queue

```javascript
import { offlineQueue } from '../lib/offlineQueue';

// Queue an action
await offlineQueue.add({
  type: 'accept',
  id: 123
});

// Queue custom action
await offlineQueue.add({
  type: 'addHelpRequest',
  data: {
    lat: 12.9716,
    lng: 77.5946,
    description: 'Help needed'
  }
});
```

### Queue Processing

The queue automatically processes when:
- Connection is restored (online event)
- New action is added while online

## Service Worker Setup

### Register Service Worker

Add to `main.jsx` or `App.jsx`:

```javascript
// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
}
```

### Pre-cache Tiles

```javascript
// Cache tiles for specific area
const cacheTilesForArea = async (bounds, zoomLevels) => {
  const tiles = generateTileUrls(bounds, zoomLevels);
  
  const channel = new MessageChannel();
  navigator.serviceWorker.controller.postMessage({
    type: 'CACHE_TILES',
    tiles
  }, [channel.port2]);
  
  return new Promise((resolve) => {
    channel.port1.onmessage = (event) => {
      if (event.data.success) resolve();
    };
  });
};
```

## Styling

The component includes comprehensive CSS in `MapView.css` with:
- Offline indicator styles
- Marker customization
- Popup styling
- Responsive design
- Accessibility features
- Print styles

## Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Tips

1. **Limit Markers**: For large datasets (>500 markers), use clustering
2. **Debounce Updates**: Avoid updating markers on every data change
3. **Lazy Load Tiles**: Only load tiles for visible area
4. **Optimize Heatmap**: Reduce point count for better performance
5. **Use Virtual Scrolling**: For large lists in popups

## Troubleshooting

### Markers not showing
- Check that data has `lat`/`lng` or `latitude`/`longitude` properties
- Verify coordinates are valid numbers
- Check browser console for errors

### Map tiles not loading
- Verify internet connection
- Check tile URL in browser network tab
- Ensure CORS headers are set for custom tile servers

### Offline mode not working
- Verify service worker is registered
- Check IndexedDB in browser DevTools
- Ensure HTTPS (service workers require secure context)

### Route not displaying
- Verify both `from` and `to` coordinates are provided
- Check OSRM service availability
- Look for routing errors in console

## Contributing

To add new features:

1. Create new child component in `components/map/`
2. Import and use in `MapView.jsx`
3. Add custom events as needed
4. Update this README

## License

MIT
