import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Offshore Marine Service Worker for PWA and Offline Marine Intelligence
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('🐋 [ORCA Marine] Service Worker registered successfully! Scope:', registration.scope);
      })
      .catch((err) => {
        console.warn('🐋 [ORCA Marine] Service Worker registration failed:', err);
      });
  });
}

