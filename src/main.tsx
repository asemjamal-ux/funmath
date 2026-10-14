import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import '@fontsource/baloo-2/latin-600.css';
import '@fontsource/baloo-2/latin-700.css';
import '@fontsource/baloo-2/latin-800.css';
import '@fontsource/baloo-bhaijaan-2/arabic-600.css';
import '@fontsource/baloo-bhaijaan-2/arabic-700.css';
import '@fontsource/baloo-bhaijaan-2/arabic-800.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/cairo/arabic-400.css';
import '@fontsource/cairo/arabic-600.css';
import '@fontsource/cairo/arabic-700.css';
import '@fontsource/noto-sans-arabic/arabic-400.css';
import '@fontsource/noto-sans-arabic/arabic-600.css';
import '@fontsource/noto-sans-arabic/arabic-700.css';
import './styles/tokens.css';
import './styles/globals.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/playful.css';
import './styles/front.css';
import './styles/worksheets.css';
import { App, preloadRoute } from './app/App';
import { useApp } from './app/store';
import { registerServiceWorker } from './components/UpdatePrompt';
import { appClock } from './services/clock';
import { pruneOldResponses } from './services/storage/repo';
import { isLocale, loadMessages } from './services/i18n';

// Fetch the catalogue and route chunk for this URL while IndexedDB opens (NFR-01).
const urlLocale = location.pathname.split('/')[1];
if (isLocale(urlLocale)) void loadMessages(urlLocale);
preloadRoute(location.pathname);

void (async () => {
  await useApp.getState().init();
  void pruneOldResponses(appClock.now());
  void registerServiceWorker();
})();

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
