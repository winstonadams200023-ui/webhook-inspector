import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultBrowserConfig,
  loadBrowserConfig,
  saveBrowserConfig,
} from '../src/services/browserConfig.js';

test('loads defaults and persists browser-local settings', () => {
  const originalStorage = globalThis.localStorage;
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      get length() { return values.size; },
      getItem: (key) => values.get(key) ?? null,
      key: (index) => [...values.keys()][index] ?? null,
      removeItem: (key) => values.delete(key),
      setItem: (key, value) => values.set(key, value),
    },
  });

  try {
    assert.deepEqual(loadBrowserConfig(), defaultBrowserConfig);
    const settings = {
      endpointUrl: 'https://hooks.example.com/receive',
      payloadSchema: '{"type":"object"}',
      streamUrl: 'https://feed.example.com',
      ignoredSetting: true,
    };
    assert.deepEqual(saveBrowserConfig(settings), {
      endpointUrl: settings.endpointUrl,
      payloadSchema: settings.payloadSchema,
      streamUrl: settings.streamUrl,
    });
    assert.deepEqual(loadBrowserConfig(), {
      endpointUrl: settings.endpointUrl,
      payloadSchema: settings.payloadSchema,
      streamUrl: settings.streamUrl,
    });
  } finally {
    if (originalStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalStorage,
      });
    }
  }
});

test('clears legacy authentication and workspace tokens from local storage', () => {
  const originalStorage = globalThis.localStorage;
  const values = new Map([
    ['webhook-inspector-workspace-key', 'old-workspace-secret'],
    ['webhook-inspector-pending-terms', 'old-terms-version'],
    ['sb-project-auth-token', 'old-auth-session'],
    ['unrelated-setting', 'retain'],
  ]);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      get length() { return values.size; },
      getItem: (key) => values.get(key) ?? null,
      key: (index) => [...values.keys()][index] ?? null,
      removeItem: (key) => values.delete(key),
      setItem: (key, value) => values.set(key, value),
    },
  });

  try {
    loadBrowserConfig();
    assert.equal(values.has('webhook-inspector-workspace-key'), false);
    assert.equal(values.has('webhook-inspector-pending-terms'), false);
    assert.equal(values.has('sb-project-auth-token'), false);
    assert.equal(values.get('unrelated-setting'), 'retain');
  } finally {
    if (originalStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalStorage,
      });
    }
  }
});

test('surfaces invalid saved settings instead of silently discarding them', () => {
  const originalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => '{invalid-json' },
  });

  try {
    assert.throws(() => loadBrowserConfig(), SyntaxError);
  } finally {
    if (originalStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalStorage,
      });
    }
  }
});
