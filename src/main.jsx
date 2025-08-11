// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';   // ← これがないと ReferenceError
import App from './App';
import './index.css';                      // Tailwind を含む CSS

// React 18 以降の書き方 (Vite テンプレートと同じ)
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
