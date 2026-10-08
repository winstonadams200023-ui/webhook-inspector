import { useEffect, useRef, useState } from 'react';
import PayloadEditor from './PayloadEditor.jsx';
import CorrectionSettings from './CorrectionSettings.jsx';
import WebhookFeed from './WebhookFeed.jsx';
import '../styles/index.css';

const initialPayload = '{\n  \n}';

export default function Dashboard({
  browserConfig,
  onBrowserConfigChange,
  userEndpoint,
  demoMode = false,
}) {
  const [payload, setPayload] = useState(initialPayload);
  const [originalPayload, setOriginalPayload] = useState(initialPayload);
  const [autoCorrectionEnabled, setAutoCorrectionEnabled] = useState(false);
  const selectedPayloadTimeout = useRef(null);

  useEffect(() => () => {
    if (selectedPayloadTimeout.current !== null) {
      window.clearTimeout(selectedPayloadTimeout.current);
    }
  }, []);

  function handleUsePayload(value, expiresAt, originalValue = value) {
    setPayload(value);
    setOriginalPayload(originalValue);
    if (selectedPayloadTimeout.current !== null) {
      window.clearTimeout(selectedPayloadTimeout.current);
    }
    selectedPayloadTimeout.current = window.setTimeout(
      () => {
        setPayload(initialPayload);
        setOriginalPayload(initialPayload);
      },
      Math.max(0, expiresAt - Date.now()),
    );
  }

  return (
    <main className="inspector-shell">
      <header className="inspector-header">
        <div>
          <p className="inspector-eyebrow">WEBHOOK INSPECTOR</p>
          <h1>Dashboard</h1>
          <p className="inspector-muted">Inspect incoming requests and replay payloads.</p>
        </div>
        <CorrectionSettings
          autoCorrectionEnabled={autoCorrectionEnabled}
          onAutoCorrectionEnabledChange={setAutoCorrectionEnabled}
        />
      </header>

      <div className="inspector-grid">
        <WebhookFeed
          streamUrl={browserConfig.streamUrl}
          onStreamUrlChange={(streamUrl) => onBrowserConfigChange({
            ...browserConfig,
            streamUrl,
          })}
          demoMode={demoMode}
          autoCorrectionEnabled={autoCorrectionEnabled}
          onUseSuggestion={handleUsePayload}
        />
        <PayloadEditor
          userEndpoint={userEndpoint}
          browserConfig={browserConfig}
          onBrowserConfigChange={onBrowserConfigChange}
          demoMode={demoMode}
          payload={payload}
          isPayloadEdited={payload !== originalPayload}
          onPayloadChange={setPayload}
        />
      </div>
    </main>
  );
}
