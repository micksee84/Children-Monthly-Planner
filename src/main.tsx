import {createRoot} from 'react-dom/client';
import App from './App.tsx';
// Brand fonts are bundled with the app (not loaded from Google Fonts) so they
// are always there for printing and PDF export, even offline.
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-500.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
