import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './context/LanguageContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);

// Register Offshore Marine Service Worker for PWA and Offline Marine Intelligence
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('🐋 [ORCA Marine PWA] Service Worker registered successfully! Scope:', registration.scope);
      })
      .catch((err) => {
        console.warn('🐋 [ORCA Marine PWA] Service Worker registration failed:', err);
      });
  });
}

