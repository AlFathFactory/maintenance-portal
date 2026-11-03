import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './i18n';
import './styles/globals.css';
import './app/AppShell.css';
import './shared/styles/buttons.css';
import './features/equipment/dashboard.css';
import './shared/styles/components.css';
import './styles/utilities.css';
import './features/equipment/equipment.css';
import './features/maintenance/maintenance.css';
import './features/teams/teams.css';
import './shared/styles/modal.css';
import './shared/styles/forms.css';
import './styles/print.css';

const root = document.getElementById('app');
if (!root) throw new Error('App root is missing');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
