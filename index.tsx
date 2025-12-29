
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// GUIDELINE: Do not define process.env or request that the user update the API_KEY in the code.
// The variable is assumed to be pre-configured and accessible in the execution context.

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
