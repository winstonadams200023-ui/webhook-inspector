# Webhook Inspector

Webhook Inspector is a free, static browser app. It requires no account,
registration, or database. Payloads stay in memory; destination settings and
the optional live-feed URL stay in that browser's local storage. An optional
Express webhook receiver is included for browser-compatible CORS and live
Socket.IO feeds; it must be hosted separately from the static site.

## What it can do

- Edit JSON, validate it against a local JSON Schema, and send it directly from
  the browser to an HTTPS endpoint.
- Make optional, best-effort payload correction suggestions locally. Review
  suggestions before using them.
- Display temporary events from a Socket.IO feed that you provide. Events are
  held in memory and expire after 20 seconds.

Because requests come directly from the browser, destination servers must
allow cross-origin requests (CORS). Some webhook providers do not allow browser
requests. The optional Express receiver accepts JSON at `/webhook`, emits it to
connected Socket.IO clients, and does not store or forward payloads. It does
not synchronize saved settings between browsers.

The optional authorization header value is held in page memory and sent
directly to the configured destination. Do not use this feature on a shared or
untrusted computer.

## Run locally

Requirements: Node.js 20+ and npm.

```sh
npm ci
npm test
cp .env.example .env.development.local
npm run dev:backend
```

In another terminal, run `npm run dev`. The local demo backend listens at
`http://localhost:4000`; the UI connects to its Socket.IO feed and can replay
JSON to its `/test/endpoint` route. The server keeps no persistent storage.

`npm run build` creates a static production bundle; `npm run preview` serves
that bundle locally. No Supabase project or VITE service credentials are
needed.

## Deploy to Netlify (recommended)

1. Push this project to a GitHub repository.
2. In Netlify, choose **Add new site → Import an existing project**, select
   the GitHub repository, and authorize access.
3. Netlify reads `netlify.toml`, builds with `npm run build`, and publishes
   `dist/`.
4. In Render, create a new Blueprint and select the same GitHub repository.
   Render reads `render.yaml` and configures the Node receiver's build,
   start command, and `/health` check. When prompted for `ALLOWED_ORIGINS`,
   enter the exact Netlify site origin (for example,
   `https://your-site.netlify.app`, with no trailing slash). Do not use `*`.
   After Render deploys, copy the receiver URL, such as
   `https://webhook-inspector-receiver.onrender.com`.
5. In Netlify's environment settings, set:

   ```text
   VITE_USER_ENDPOINT=https://your-webhook-inspector-receiver.onrender.com/webhook
   VITE_WEBHOOK_STREAM_URL=https://your-webhook-inspector-receiver.onrender.com
   ```

   Replace the example host with the actual Render URL. Redeploy Netlify after
   changing build environment variables. The receiver's `ALLOWED_ORIGINS` must
   match the Netlify origin exactly.

`netlify.toml` also provides the SPA fallback needed for direct navigation to
routes such as `/terms`. Netlify's free plan and limits may change; check
Netlify's current plan details before relying on it for production usage.

The Render free web service may sleep when idle and can have plan limits.
Check Render's current plan and uptime terms before relying on it for
production webhook traffic. The receiver keeps no event queue, so feed events
are delivered only to browsers connected when the request arrives.

The static frontend requires no secrets. `VITE_USER_ENDPOINT` and
`VITE_WEBHOOK_STREAM_URL` are public URLs, not credentials. Other static hosts
can serve the build too, but may need their own SPA fallback configuration.

## Privacy and limitations

Webhook payloads and feed events are not persisted by the app or included
Express receiver. The browser stores the destination URL, JSON Schema, and
optional live-feed URL in local storage. Clearing site data removes those
settings. Each visitor's browser is independent.

**CORS is not authentication.** The receiver accepts POST requests without
authentication, so anyone who can reach its public URL can submit events and
send them to connected feed clients. Do not put secrets in webhook payloads
unless you add authentication and abuse protections appropriate to your use.
The origin allowlist only controls browser access and does not block
server-to-server callers.

Run the checks before deployment:

```sh
npm ci
npm test
npm run build
```

## Project structure

```text
public/
  favicon.svg
  logo.svg
  manifest.json
src/
  components/
  pages/
  services/
  styles/
server/
  index.js
  .env.example
tests/
index.html
package.json
vite.config.js
netlify.toml
render.yaml
```
