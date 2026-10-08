import { useEffect, useRef, useState } from 'react';
import { connectWebhookFeed } from '../services/socket.js';
import { suggestPayloadCorrection } from '../services/correction.js';
import '../styles/index.css';

const maxVisibleEvents = 100;
const eventRetentionMs = 20_000;

function removeExpiredEvents(setEvents) {
  const now = Date.now();
  setEvents((currentEvents) =>
    currentEvents.filter((event) => event.expiresAt > now),
  );
}

function formatPayload(data) {
  if (typeof data !== 'string') return JSON.stringify(data, null, 2);
  try {
    return JSON.stringify(JSON.parse(data), null, 2);
  } catch {
    return data;
  }
}

function normalizeEvent(data) {
  const isInspectorEvent = data?.type === 'webhook-inspector-event';
  const rawPayload = isInspectorEvent ? data.payload : data;
  return {
    id: isInspectorEvent && data.id ? data.id : `${Date.now()}-${Math.random()}`,
    receivedAt: isInspectorEvent && data.receivedAt ? new Date(data.receivedAt) : new Date(),
    expiresAt: Date.now() + eventRetentionMs,
    rawPayload,
    payload: formatPayload(rawPayload),
    validation: isInspectorEvent ? data.validation : null,
    schema: isInspectorEvent ? data.schema : null,
    forwarded: isInspectorEvent ? data.forwarded : null,
    forwardError: isInspectorEvent ? data.forwardError : '',
    suggestion: null,
  };
}

export default function WebhookFeed({
  streamUrl,
  onStreamUrlChange,
  demoMode = false,
  autoCorrectionEnabled = false,
  onUseSuggestion,
}) {
  const [events, setEvents] = useState([]);
  const [streamUrlInput, setStreamUrlInput] = useState(streamUrl ?? '');
  const [streamUrlError, setStreamUrlError] = useState('');
  const autoCorrectionEnabledRef = useRef(autoCorrectionEnabled);
  const [connectionState, setConnectionState] = useState(streamUrl ? 'connecting' : 'idle');

  useEffect(() => {
    if (events.length === 0) return undefined;

    const nextExpiry = Math.min(...events.map((event) => event.expiresAt));
    const timeoutId = window.setTimeout(
      () => removeExpiredEvents(setEvents),
      Math.max(0, nextExpiry - Date.now()),
    );
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') removeExpiredEvents(setEvents);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [events]);

  useEffect(() => {
    autoCorrectionEnabledRef.current = autoCorrectionEnabled;
    setEvents((currentEvents) => currentEvents.map((event) => {
      if (!autoCorrectionEnabled || event.validation?.valid !== false || !event.schema) {
        return { ...event, suggestion: null };
      }
      return {
        ...event,
        suggestion: suggestPayloadCorrection(
          event.rawPayload,
          event.schema,
          event.validation.errors,
        ),
      };
    }));
  }, [autoCorrectionEnabled]);

  useEffect(() => {
    setStreamUrlInput(streamUrl ?? '');
    setEvents([]);
  }, [streamUrl]);

  useEffect(() => {
    if (!streamUrl) {
      setConnectionState('idle');
      return undefined;
    }

    setConnectionState('connecting');
    return connectWebhookFeed({
      url: streamUrl,
      onStatus: setConnectionState,
      onEvent: (data) => {
        const feedEvent = normalizeEvent(data);
        if (
          autoCorrectionEnabledRef.current &&
          feedEvent.validation?.valid === false &&
          feedEvent.schema
        ) {
          feedEvent.suggestion = suggestPayloadCorrection(
            feedEvent.rawPayload,
            feedEvent.schema,
            feedEvent.validation.errors,
          );
        }
        setEvents((currentEvents) =>
          [feedEvent, ...currentEvents].slice(0, maxVisibleEvents),
        );
      },
    });
  }, [streamUrl]);

  function handleStreamUrlSubmit(event) {
    event.preventDefault();
    setStreamUrlError('');
    try {
      const nextUrl = streamUrlInput.trim();
      if (nextUrl) {
        const parsedUrl = new URL(nextUrl);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          throw new Error('Enter an HTTP or HTTPS Socket.IO URL.');
        }
      }
      onStreamUrlChange(nextUrl);
    } catch (error) {
      setStreamUrlError(`Could not save feed URL: ${error.message}`);
    }
  }

  return (
    <section className="inspector-card" aria-labelledby="webhook-feed-title">
      <div className="inspector-card-heading">
        <div>
          <h2 id="webhook-feed-title">Webhook feed</h2>
          <p className="inspector-muted">
            Events are kept in memory only and expire after 20 seconds.
          </p>
        </div>
        <span className={`inspector-status inspector-status-${connectionState}`}>
          {connectionState}
        </span>
      </div>

      {!streamUrl && (
        <p className="inspector-empty">
          No live feed is connected. Use a Socket.IO feed URL or inspect payloads manually.
        </p>
      )}
      {streamUrl && events.length === 0 && (
        <p className="inspector-empty">Waiting for webhook events…</p>
      )}
      {events.length > 0 && (
        <ol className="inspector-event-list">
          {events.map((event) => (
            <li className="inspector-event" key={event.id}>
              <time dateTime={event.receivedAt.toISOString()}>
                {event.receivedAt.toLocaleTimeString()}
              </time>
              {event.validation && (
                <p className={`inspector-event-result ${event.validation.valid ? 'is-valid' : 'is-invalid'}`}>
                  {event.validation.valid
                    ? event.forwarded
                      ? 'Schema matched · forwarded automatically'
                      : event.forwarded === false
                        ? 'Schema matched · not forwarded'
                        : 'Received from stream'
                    : 'Schema mismatch'}
                </p>
              )}
              <pre>{event.payload}</pre>
              {event.validation?.errors?.length > 0 && (
                <ul className="inspector-validation-errors">
                  {event.validation.errors.map((validationError, index) => (
                    <li key={`${event.id}-error-${index}`}>
                      {validationError.instancePath || '/'}: {validationError.message}
                    </li>
                  ))}
                </ul>
              )}
              {event.forwardError && (
                <p className="inspector-feedback inspector-feedback-error" role="alert">
                  Forwarding failed: {event.forwardError}
                </p>
              )}
              <button
                className="inspector-button inspector-button-secondary"
                type="button"
                onClick={() => onUseSuggestion?.(event.payload, event.expiresAt, event.payload)}
              >
                Edit this payload
              </button>
              {event.validation?.valid === false && autoCorrectionEnabled && (
                <div className="inspector-correction-suggestion">
                  {event.suggestion ? (
                    <>
                      <p className="inspector-muted">
                        Local correction suggestion · review it before replaying:
                      </p>
                      <pre>{formatPayload(event.suggestion)}</pre>
                      <button
                        className="inspector-button"
                        type="button"
                        onClick={() => onUseSuggestion?.(
                          formatPayload(event.suggestion),
                          event.expiresAt,
                          event.payload,
                        )}
                      >
                        Use suggestion in editor
                      </button>
                    </>
                  ) : (
                    <p className="inspector-muted">
                      No safe automatic suggestion was found. Edit the payload manually.
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {!demoMode && (
        <section className="inspector-ingest-settings" aria-labelledby="live-feed-settings-title">
          <h3 id="live-feed-settings-title">Optional live feed</h3>
          <p className="inspector-muted">
            Connect to an existing Socket.IO server that emits a
            <code> webhook</code> event. This browser-only app does not host
            webhook ingestion or share feeds between browsers.
          </p>
          <form onSubmit={handleStreamUrlSubmit}>
            <label className="inspector-label" htmlFor="feed-url">
              Socket.IO server URL
            </label>
            <input
              className="inspector-input"
              id="feed-url"
              type="url"
              placeholder="https://your-socket-server.example.com"
              value={streamUrlInput}
              onChange={(event) => setStreamUrlInput(event.target.value)}
            />
            <button className="inspector-button inspector-button-secondary" type="submit">
              Save feed URL in this browser
            </button>
          </form>
          {streamUrlError && (
            <p className="inspector-feedback inspector-feedback-error" role="alert">
              {streamUrlError}
            </p>
          )}
        </section>
      )}
    </section>
  );
}
