import '../styles/index.css';

export default function Terms({ onBack, backHref = '/' }) {
  return (
    <main className="inspector-shell">
      <article className="inspector-card inspector-terms-page">
        <p className="inspector-eyebrow">WEBHOOK INSPECTOR</p>
        <h1>Terms of Service</h1>
        <p className="inspector-muted">Last updated: October 8, 2026</p>

        <h2>Using the service</h2>
        <p>
          Use Webhook Inspector only with webhook traffic and endpoints you are
          authorized to access. You are responsible for the payloads you inspect
          and the destinations to which you replay them.
        </p>

        <h2>Webhook data</h2>
        <p>
          Webhook events shown in the feed are held in memory for the current
          page session and are not stored. The destination URL, schema, and
          optional live-feed URL are stored in this browser's local storage.
          Replaying sends the payload directly from the browser to the endpoint
          you configure.
        </p>

        <h2>Browser-only service</h2>
        <p>
          No account or registration is required. The app does not provide a
          hosted webhook receiver, automatically forward incoming requests, or
          share feeds across browsers. Your destination must allow browser
          requests through its CORS policy.
        </p>

        <h2>Credentials</h2>
        <p>
          Any optional Authorization header value is held in page memory and
          sent directly to your configured endpoint. Do not use it on a shared
          or untrusted device.
        </p>

        <h2>Availability and responsibility</h2>
        <p>
          The service is provided as-is and may change or be unavailable.
          You are responsible for complying with applicable laws and protecting
          any credentials or personal data included in webhook payloads.
        </p>

        <h2>Free service</h2>
        <p>
          Webhook Inspector is free to use. Local payload correction
          suggestions are optional, best-effort guidance based on your schema;
          review them and validate the payload before replaying. Suggestions
          are generated in your browser and are not sent to an AI or correction
          provider.
        </p>

        {onBack ? (
          <button
            className="inspector-terms-back"
            type="button"
            onClick={onBack}
          >
            Back
          </button>
        ) : (
          <a className="inspector-terms-back" href={backHref}>
            Back
          </a>
        )}
      </article>
    </main>
  );
}
