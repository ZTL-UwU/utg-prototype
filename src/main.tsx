import { createRoot } from 'react-dom/client';

import App from './App';

// No Strict Mode because Pixi is not designed for double rendering
createRoot(document.getElementById('root')!).render(<App />);
