import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import App from '#client/App.tsx';
import { createClientStore } from '#client/clientStore.ts';
import { loadSavedSession } from '#client/savedSession.ts';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

const store = createClientStore(loadSavedSession());

createRoot(container).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
