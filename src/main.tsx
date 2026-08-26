import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import './styles.css';
import 'maplibre-gl/dist/maplibre-gl.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/:code?" element={<App />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
