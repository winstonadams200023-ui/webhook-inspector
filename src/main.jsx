import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';

const Home = lazy(() => import('./pages/Home.jsx'));
const Terms = lazy(() => import('./pages/Terms.jsx'));

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('App root element was not found.');
}

const page = window.location.pathname === '/terms' ? (
  <Terms />
) : (
  <Home
    streamUrl={import.meta.env.VITE_WEBHOOK_STREAM_URL}
    userEndpoint={import.meta.env.VITE_USER_ENDPOINT}
  />
);

createRoot(rootElement).render(
  <StrictMode>
    <Suspense fallback={<main className="inspector-shell"><p role="status">Loading…</p></main>}>
      {page}
    </Suspense>
  </StrictMode>,
);
