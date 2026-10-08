import Ajv from 'ajv';
import { useEffect, useState } from 'react';
import { replayWebhook } from '../services/api.js';
import '../styles/index.css';

export default function PayloadEditor({
  userEndpoint,
  browserConfig,
  onBrowserConfigChange,
  demoMode = false,
  payload,
  isPayloadEdited = false,
  onPayloadChange,
}) {
  const [endpoint, setEndpoint] = useState(
    browserConfig.endpointUrl || userEndpoint || '',
  );
  const [schema, setSchema] = useState(browserConfig.payloadSchema);
  const [authorizationToken, setAuthorizationToken] = useState('');
  const [isSavingEndpoint, setIsSavingEndpoint] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setEndpoint(browserConfig.endpointUrl || userEndpoint || '');
    setSchema(browserConfig.payloadSchema);
  }, [browserConfig.endpointUrl, browserConfig.payloadSchema, userEndpoint]);

  function parseSchema() {
    const parsedSchema = JSON.parse(schema);
    if (!parsedSchema || typeof parsedSchema !== 'object' || Array.isArray(parsedSchema)) {
      throw new Error('JSON Schema must be an object.');
    }
    new Ajv({ allErrors: true }).compile(parsedSchema);
    return parsedSchema;
  }

  function validatePayload(parsedPayload, parsedSchema) {
    const validate = new Ajv({ allErrors: true }).compile(parsedSchema);
    if (!validate(parsedPayload)) {
      throw new Error(
        `Payload does not match the JSON Schema: ${
          (validate.errors ?? []).map((error) => `${error.instancePath || '/'} ${error.message}`).join('; ')
        }`,
      );
    }
  }

  function validateEndpoint() {
    let parsedEndpoint;
    try {
      parsedEndpoint = new URL(endpoint);
    } catch {
      throw new Error('Enter a valid HTTPS endpoint URL.');
    }
    const isLocalDemoEndpoint = demoMode &&
      ['localhost', '127.0.0.1', '[::1]'].includes(parsedEndpoint.hostname) &&
      parsedEndpoint.protocol === 'http:';
    if (
      (parsedEndpoint.protocol !== 'https:' && !isLocalDemoEndpoint) ||
      parsedEndpoint.username ||
      parsedEndpoint.password
    ) {
      throw new Error('Replay destinations must use HTTPS, except for localhost in the local demo.');
    }
    return parsedEndpoint.href;
  }

  function handleSaveEndpoint(event) {
    event.preventDefault();
    setFeedback(null);
    setIsSavingEndpoint(true);
    try {
      const endpointUrl = validateEndpoint();
      parseSchema();
      onBrowserConfigChange({
        ...browserConfig,
        endpointUrl,
        payloadSchema: schema,
      });
      setFeedback({ type: 'success', message: 'Destination and JSON Schema saved in this browser.' });
    } catch (error) {
      setFeedback({ type: 'error', message: `Could not save settings: ${error.message}` });
    } finally {
      setIsSavingEndpoint(false);
    }
  }

  async function handleReplay(event) {
    event.preventDefault();
    setFeedback(null);

    try {
      const parsedPayload = JSON.parse(payload);
      const parsedSchema = parseSchema();
      validatePayload(parsedPayload, parsedSchema);
      const endpointUrl = validateEndpoint();

      setIsReplaying(true);
      const response = await replayWebhook({
        endpoint: endpointUrl,
        payload: parsedPayload,
        authorizationToken,
      });
      setFeedback({
        type: 'success',
        message: `${isPayloadEdited ? 'Modified payload resent' : 'Payload sent'} (HTTP ${response.status}).`,
      });
    } catch (error) {
      const message = error instanceof TypeError
        ? 'The browser could not reach the endpoint. Check the URL, network connection, and endpoint CORS policy.'
        : error.response?.data
          ? `${error.message}: ${JSON.stringify(error.response.data)}`
          : error.message;
      setFeedback({ type: 'error', message: `Replay failed: ${message}` });
    } finally {
      setIsReplaying(false);
    }
  }

  return (
    <section className="inspector-card" aria-labelledby="payload-editor-title">
      <div className="inspector-card-heading">
        <div>
          <h2 id="payload-editor-title">Payload editor</h2>
          <p className="inspector-muted">Edit JSON and send it directly from this browser.</p>
        </div>
      </div>

      {!demoMode && (
        <form onSubmit={handleSaveEndpoint}>
          <label className="inspector-label" htmlFor="replay-endpoint">
            Replay destination (HTTPS)
          </label>
          <input
            className="inspector-input"
            id="replay-endpoint"
            type="url"
            value={endpoint}
            onChange={(event) => setEndpoint(event.target.value)}
            placeholder="https://your-service.example.com/webhooks"
            required
            disabled={isSavingEndpoint}
          />
          <label className="inspector-label" htmlFor="replay-auth-token">
            Optional Authorization header value (kept in memory only)
          </label>
          <input
            className="inspector-input"
            id="replay-auth-token"
            type="password"
            value={authorizationToken}
            onChange={(event) => setAuthorizationToken(event.target.value)}
            autoComplete="off"
          />
          <label className="inspector-label" htmlFor="payload-schema">
            Expected payload (JSON Schema, Draft 7)
          </label>
          <textarea
            className="inspector-code-editor inspector-schema-editor"
            id="payload-schema"
            value={schema}
            onChange={(event) => setSchema(event.target.value)}
            spellCheck="false"
            required
          />
          <button
            className="inspector-button inspector-button-secondary"
            type="submit"
            disabled={isSavingEndpoint}
          >
            {isSavingEndpoint ? 'Saving…' : 'Save settings in this browser'}
          </button>
          <p className="inspector-muted">
            Requests are sent from this browser. Your endpoint must allow
            cross-origin browser requests (CORS); some webhook providers
            require a server-side relay instead.
          </p>
        </form>
      )}

      <form onSubmit={handleReplay}>
        <label className="inspector-label" htmlFor="payload-json">
          JSON payload
        </label>
        <textarea
          className="inspector-code-editor"
          id="payload-json"
          value={payload}
          onChange={(event) => onPayloadChange(event.target.value)}
          spellCheck="false"
          required
        />
        <button
          className="inspector-button"
          type="submit"
          disabled={isReplaying || !endpoint}
        >
          {isReplaying ? 'Sending…' : isPayloadEdited ? 'Resend' : 'Send'}
        </button>
      </form>
      {feedback && (
        <p
          className={`inspector-feedback inspector-feedback-${feedback.type}`}
          role={feedback.type === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      )}
    </section>
  );
}
