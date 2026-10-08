import { useState } from 'react';
import Dashboard from '../components/Dashboard.jsx';
import {
  defaultBrowserConfig,
  loadBrowserConfig,
  saveBrowserConfig,
} from '../services/browserConfig.js';
import '../styles/index.css';

function loadInitialConfig(defaultStreamUrl) {
  try {
    const config = loadBrowserConfig();
    return {
      config: { ...config, streamUrl: config.streamUrl || defaultStreamUrl || '' },
      error: '',
    };
  } catch (error) {
    return {
      config: { ...defaultBrowserConfig },
      error: `Could not load browser settings: ${error.message}`,
    };
  }
}

export default function Home({ streamUrl, userEndpoint }) {
  const demoMode = import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === 'true';
  const [initial] = useState(() => loadInitialConfig(streamUrl));
  const [browserConfig, setBrowserConfig] = useState(initial.config);
  const [configError, setConfigError] = useState(initial.error);

  function updateBrowserConfig(nextConfig) {
    const savedConfig = saveBrowserConfig(nextConfig);
    setBrowserConfig(savedConfig);
    setConfigError('');
    return savedConfig;
  }

  return (
    <>
      <Dashboard
        browserConfig={browserConfig}
        onBrowserConfigChange={updateBrowserConfig}
        userEndpoint={userEndpoint}
        demoMode={demoMode}
      />
      {configError && (
        <p className="inspector-feedback inspector-feedback-error inspector-config-error" role="alert">
          {configError}
        </p>
      )}
    </>
  );
}
