import test from 'node:test';
import assert from 'node:assert/strict';
import { replayWebhook } from '../src/services/api.js';

test('sends JSON directly to the browser-configured endpoint', async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(null, { status: 202 });
  };

  try {
    const result = await replayWebhook({
      endpoint: 'https://hooks.example.com/receive',
      payload: { event: 'test' },
      authorizationToken: 'Bearer example-token',
    });

    assert.equal(result.status, 202);
    assert.equal(request.url, 'https://hooks.example.com/receive');
    assert.equal(request.options.credentials, 'omit');
    assert.equal(request.options.headers.Authorization, 'Bearer example-token');
    assert.deepEqual(JSON.parse(request.options.body), { event: 'test' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('reports non-success responses from the destination', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('invalid payload', { status: 422 });

  try {
    await assert.rejects(
      replayWebhook({
        endpoint: 'https://hooks.example.com/receive',
        payload: {},
      }),
      (error) => {
        assert.match(error.message, /HTTP 422/);
        assert.equal(error.response.status, 422);
        assert.equal(error.response.data, 'invalid payload');
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
