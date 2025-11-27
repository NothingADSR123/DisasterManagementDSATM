import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// import Test from './Test.jsx'

console.log('main.jsx loading...');

window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  document.body.innerHTML = `<div style="padding: 20px; background: #fee; color: #c00;"><h1>Error!</h1><pre>${e.error?.stack || e.error}</pre></div>`;
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  document.body.innerHTML = `<div style="padding: 20px; background: #ffc; color: #880;"><h1>Promise Error!</h1><pre>${e.reason?.stack || e.reason}</pre></div>`;
});

try {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  console.log('React app rendered');
} catch (error) {
  console.error('Render error:', error);
  document.body.innerHTML = `<div style="padding: 20px; background: #fee; color: #c00;"><h1>Render Error!</h1><pre>${error.stack}</pre></div>`;
}
