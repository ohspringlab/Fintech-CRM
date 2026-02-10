import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Suppress non-critical Stripe analytics CORS errors
// This is a known Stripe.js issue that doesn't affect payment functionality
// The error occurs when Stripe.js tries to send analytics to r.stripe.com

// Suppress unhandled promise rejections from Stripe analytics
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason?.message || reason?.toString() || '';
  const stack = reason?.stack || '';
  const errorString = `${message} ${stack}`;
  
  // Check if this is a Stripe analytics error
  if (errorString.includes('r.stripe.com') || 
      (errorString.includes('Failed to fetch') && errorString.includes('stripe')) ||
      (errorString.includes('FetchError') && errorString.includes('stripe')) ||
      (errorString.includes('ERR_FAILED') && errorString.includes('stripe')) ||
      (message.includes('Error fetching') && message.includes('r.stripe.com'))) {
    // Suppress Stripe analytics errors
    event.preventDefault();
    return;
  }
}, true); // Use capture phase to catch earlier

// Suppress console errors for Stripe analytics
const originalError = console.error;
console.error = (...args: any[]) => {
  const errorString = args.map(arg => 
    typeof arg === 'string' ? arg : 
    arg?.message || arg?.toString() || JSON.stringify(arg)
  ).join(' ');
  
  // Suppress Stripe analytics CORS errors
  if (errorString.includes('r.stripe.com') || 
      (errorString.includes('CORS') && errorString.includes('stripe')) ||
      (errorString.includes('POST https://r.stripe.com')) ||
      (errorString.includes('FetchError') && errorString.includes('stripe')) ||
      (errorString.includes('Error fetching') && errorString.includes('r.stripe.com')) ||
      (errorString.includes('ERR_FAILED') && errorString.includes('stripe')) ||
      (errorString.includes('Access to fetch') && errorString.includes('r.stripe.com'))) {
    return; // Suppress this error
  }
  originalError.apply(console, args);
};

// Also suppress network errors in the console
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const warnString = args.map(arg => 
    typeof arg === 'string' ? arg : 
    arg?.message || arg?.toString() || JSON.stringify(arg)
  ).join(' ');
  
  // Suppress Stripe analytics warnings
  if (warnString.includes('r.stripe.com') || 
      (warnString.includes('CORS') && warnString.includes('stripe'))) {
    return; // Suppress this warning
  }
  originalWarn.apply(console, args);
};

createRoot(document.getElementById("root")!).render(<App />);
