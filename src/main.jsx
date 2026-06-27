import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Set production API base URL if defined in build env, or clean stale local host records
const envApiUrl = import.meta.env.VITE_API_BASE_URL;
if (envApiUrl) {
  localStorage.setItem('vmk_api_base_url', envApiUrl);
} else {
  const cachedUrl = localStorage.getItem('vmk_api_base_url');
  if (!cachedUrl || cachedUrl.includes('localhost')) {
    localStorage.setItem('vmk_api_base_url', 'https://168-231-112-221.sslip.io');
  }
}

// Override window.alert globally to use custom React Modal
window.alert = (message) => {
  const event = new CustomEvent('show-custom-alert', { detail: { message } });
  window.dispatchEvent(event);
};


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

