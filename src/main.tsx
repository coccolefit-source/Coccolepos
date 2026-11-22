import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalFeedbackHost from './components/GlobalFeedbackHost';
import { OfflineIndicator } from './components/PWAInstallButton';
import './index.css';
import './lib/realtimeProductivityModule';
import './lib/realtimeSalesModule';
import './lib/realtimeInventoryModule';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary moduleName="Coccole Fit POS">
      <OfflineIndicator />
      <App />
      <GlobalFeedbackHost />
    </ErrorBoundary>
  </StrictMode>,
);
