import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './style.css';

const root = document.getElementById('app');
if (!root) throw new Error('App root is missing');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
