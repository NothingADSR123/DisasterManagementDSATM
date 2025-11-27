/**
 * Performance Test Suite for HeatmapLayer
 * Run this to verify the component handles large datasets efficiently
 */

import { useRef, useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import HeatmapLayer from './HeatmapLayer';

export default function HeatmapPerformanceTest() {
  const heatmapRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Generate random points around a center location
   */
  const generatePoints = (count, center = { lat: 12.9716, lng: 77.5946 }) => {
    const points = [];
    const spread = 0.5; // degrees

    for (let i = 0; i < count; i++) {
      points.push({
        lat: center.lat + (Math.random() - 0.5) * spread,
        lng: center.lng + (Math.random() - 0.5) * spread,
        intensity: Math.random()
      });
    }

    return points;
  };

  /**
   * Test performance with different dataset sizes
   */
  const runPerformanceTest = async (pointCount) => {
    setIsProcessing(true);
    const startTime = performance.now();

    // Generate points
    const generationStart = performance.now();
    const newPoints = generatePoints(pointCount);
    const generationTime = performance.now() - generationStart;

    // Update component
    const renderStart = performance.now();
    setPoints(newPoints);
    
    // Wait for render to complete
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });

    const renderTime = performance.now() - renderStart;
    const totalTime = performance.now() - startTime;

    setPerformanceMetrics({
      pointCount,
      generationTime: generationTime.toFixed(2),
      renderTime: renderTime.toFixed(2),
      totalTime: totalTime.toFixed(2),
      fps: (1000 / renderTime).toFixed(2)
    });

    setIsProcessing(false);
  };

  /**
   * Test ref API methods
   */
  const testRefAPI = () => {
    if (!heatmapRef.current) {
      alert('Heatmap ref not available. Add some points first.');
      return;
    }

    console.log('Testing Ref API...');

    // Test fitToBounds
    console.log('1. Testing fitToBounds()');
    heatmapRef.current.fitToBounds();

    // Test getLayer
    setTimeout(() => {
      console.log('2. Testing getLayer()');
      const layer = heatmapRef.current.getLayer();
      console.log('Layer:', layer);
    }, 1000);

    // Test clear
    setTimeout(() => {
      console.log('3. Testing clear()');
      heatmapRef.current.clear();
    }, 2000);

    // Test forceUpdate
    setTimeout(() => {
      console.log('4. Testing forceUpdate()');
      heatmapRef.current.forceUpdate();
    }, 3000);

    // Test setOptions
    setTimeout(() => {
      console.log('5. Testing setOptions()');
      heatmapRef.current.setOptions({
        radius: 40,
        blur: 50,
        gradient: {
          0.0: 'green',
          0.5: 'yellow',
          1.0: 'red'
        }
      });
    }, 4000);

    console.log('Ref API test sequence started. Check console and map.');
  };

  /**
   * Simulate real-time data stream
   */
  const startRealTimeSimulation = () => {
    let count = 0;
    const interval = setInterval(() => {
      if (count >= 100) {
        clearInterval(interval);
        alert('Real-time simulation completed (100 points added)');
        return;
      }

      const newPoint = {
        lat: 12.9716 + (Math.random() - 0.5) * 0.2,
        lng: 77.5946 + (Math.random() - 0.5) * 0.2,
        intensity: Math.random()
      };

      setPoints(prev => [...prev.slice(-500), newPoint]); // Keep last 500
      count++;
    }, 100); // Add point every 100ms
  };

  /**
   * Test chunked update behavior
   */
  const testChunkedUpdate = async () => {
    console.log('Testing chunked update with 5000 points...');
    const largeDataset = generatePoints(5000);
    
    const start = performance.now();
    setPoints(largeDataset);
    
    // Monitor when update completes
    requestIdleCallback(() => {
      const duration = performance.now() - start;
      console.log(`Chunked update completed in ${duration.toFixed(2)}ms`);
      alert(`Chunked update test: ${duration.toFixed(2)}ms for 5000 points`);
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>HeatmapLayer Performance Test Suite</h2>

      {/* Control Panel */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: '#f3f4f6', 
        borderRadius: '8px' 
      }}>
        <h3>Performance Tests</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <button onClick={() => runPerformanceTest(100)} disabled={isProcessing}>
            100 Points
          </button>
          <button onClick={() => runPerformanceTest(500)} disabled={isProcessing}>
            500 Points
          </button>
          <button onClick={() => runPerformanceTest(1000)} disabled={isProcessing}>
            1,000 Points
          </button>
          <button onClick={() => runPerformanceTest(5000)} disabled={isProcessing}>
            5,000 Points
          </button>
          <button onClick={() => runPerformanceTest(10000)} disabled={isProcessing}>
            10,000 Points
          </button>
        </div>

        <h3>Feature Tests</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <button onClick={testRefAPI} disabled={points.length === 0}>
            Test Ref API
          </button>
          <button onClick={startRealTimeSimulation}>
            Real-time Simulation
          </button>
          <button onClick={testChunkedUpdate}>
            Test Chunked Update
          </button>
          <button onClick={() => setPoints([])}>
            Clear All Points
          </button>
        </div>

        {/* Performance Metrics Display */}
        {performanceMetrics && (
          <div style={{ 
            marginTop: '15px', 
            padding: '10px', 
            backgroundColor: '#dbeafe', 
            borderRadius: '4px' 
          }}>
            <h4>Performance Metrics</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td><strong>Point Count:</strong></td>
                  <td>{performanceMetrics.pointCount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td><strong>Generation Time:</strong></td>
                  <td>{performanceMetrics.generationTime} ms</td>
                </tr>
                <tr>
                  <td><strong>Render Time:</strong></td>
                  <td>{performanceMetrics.renderTime} ms</td>
                </tr>
                <tr>
                  <td><strong>Total Time:</strong></td>
                  <td>{performanceMetrics.totalTime} ms</td>
                </tr>
                <tr>
                  <td><strong>Estimated FPS:</strong></td>
                  <td>{performanceMetrics.fps}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Current Status */}
        <div style={{ marginTop: '10px' }}>
          <strong>Current Points:</strong> {points.length.toLocaleString()}
          {isProcessing && <span style={{ marginLeft: '10px', color: '#f59e0b' }}>⏳ Processing...</span>}
        </div>
      </div>

      {/* Map Display */}
      <div style={{ height: '600px', border: '2px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
        <MapContainer 
          center={[12.9716, 77.5946]} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <HeatmapLayer ref={heatmapRef} points={points} />
        </MapContainer>
      </div>

      {/* Test Results Guide */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#fef3c7', 
        borderRadius: '8px' 
      }}>
        <h3>Expected Results</h3>
        <ul>
          <li><strong>100-500 points:</strong> Should render instantly (&lt;50ms)</li>
          <li><strong>1,000 points:</strong> Should render smoothly (&lt;100ms)</li>
          <li><strong>5,000 points:</strong> May use chunked updates (~200-500ms)</li>
          <li><strong>10,000 points:</strong> Uses requestIdleCallback, should not freeze UI (~500-1000ms)</li>
        </ul>
        
        <h3>What to Test</h3>
        <ol>
          <li>Click different point count buttons - UI should remain responsive</li>
          <li>Test "Ref API" - watch console and map for automated tests</li>
          <li>Try "Real-time Simulation" - should smoothly add points without lag</li>
          <li>Open browser DevTools Performance tab to verify no long tasks</li>
        </ol>
      </div>
    </div>
  );
}
