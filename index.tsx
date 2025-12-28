
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Garante que o objeto process exista no navegador para evitar ReferenceErrors
if (typeof window !== 'undefined' && !(window as any).process) {
  (window as any).process = { 
    env: {
      API_KEY: "" // O valor real será injetado pelo ambiente se disponível
    } 
  };
}

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
