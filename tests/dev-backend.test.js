import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { after, before, test } from 'node:test';
import { io } from 'socket.io-client';

let backend;
let baseUrl;
let socket;
let output = '';

before(async () => {
  const portServer = createServer();
  portServer.listen(0, '127.0.0.1');
  await once(portServer, 'listening');
  const { port } = portServer.address();
  await new Promise((resolve, reject) => {
    portServer.close((error) => (error ? reject(error) : resolve()));
  });

  baseUrl = `http://127.0.0.1:${port}`;
  backend = spawn(process.execPath, ['server/index.js'], {
    cwd: new URL('..', import.meta.url),
    env: {
      ...process.env,
      TEST_BACKEND_PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  backend.stdout.setEncoding('utf8').on('data', (chunk) => {
    output += chunk;
  });
  backend.stderr.setEncoding('utf8').on('data', (chunk) => {
    output += chunk;
  });

  await waitForBackend();
  socket = io(baseUrl, { reconnection: false });
  await once(socket, 'connect');
});

after(async () => {
  socket?.disconnect();
  if (backend && backend.exitCode === null) {
    const exited = once(backend, 'exit');
    backend.kill('SIGTERM');
    await exited;
  }
});

test('reports a healthy, non-persistent test backend', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', storage: 'none' });
});

test('forwards a replayed JSON payload to the webhook feed', async () => {
  const payloadReceived = once(socket, 'webhook');
  const response = await fetch(`${baseUrl}/test/endpoint`, {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:5173',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event: 'test', message: 'round-trip' }),
  });

  assert.equal(response.status, 202);
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.deepEqual(await response.json(), { received: true, event: 'webhook' });
  assert.deepEqual((await payloadReceived)[0], {
    event: 'test',
    message: 'round-trip',
  });
});

test('rejects malformed JSON without broadcasting it', async () => {
  const response = await fetch(`${baseUrl}/test/endpoint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{invalid',
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /^Invalid JSON:/);
});

test('restricts browser preflight to the local preview origins', async () => {
  const response = await fetch(`${baseUrl}/test/endpoint`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://untrusted.example' },
  });

  assert.equal(response.status, 403);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});

test('allows local replay authorization headers during browser preflight', async () => {
  const response = await fetch(`${baseUrl}/test/endpoint`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Headers': 'authorization,content-type',
    },
  });

  assert.equal(response.status, 204);
  assert.match(response.headers.get('access-control-allow-headers'), /Authorization/);
});

async function waitForBackend() {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (backend.exitCode !== null) {
      throw new Error(`Test backend exited early: ${output}`);
    }

    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  throw new Error(`Timed out waiting for test backend: ${output}`);
}
