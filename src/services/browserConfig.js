const storageKey = 'webhook-inspector-settings';
const oldWorkspaceKey = 'webhook-inspector-workspace-key';
const pendingTermsKey = 'webhook-inspector-pending-terms';

export const defaultBrowserConfig = {
  endpointUrl: '',
  payloadSchema: '{\n  \n}',
  streamUrl: '',
};

function clearLegacyAuthSettings() {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (
      key === oldWorkspaceKey ||
      key === pendingTermsKey ||
      /^sb-[\w-]+-auth-token$/.test(key ?? '')
    ) {
      localStorage.removeItem(key);
    }
  }
}

export function loadBrowserConfig() {
  clearLegacyAuthSettings();
  const stored = localStorage.getItem(storageKey);
  if (!stored) return { ...defaultBrowserConfig };

  const config = JSON.parse(stored);
  return {
    endpointUrl: typeof config.endpointUrl === 'string' ? config.endpointUrl : '',
    payloadSchema: typeof config.payloadSchema === 'string'
      ? config.payloadSchema
      : defaultBrowserConfig.payloadSchema,
    streamUrl: typeof config.streamUrl === 'string' ? config.streamUrl : '',
  };
}

export function saveBrowserConfig(config) {
  const nextConfig = {
    endpointUrl: config.endpointUrl,
    payloadSchema: config.payloadSchema,
    streamUrl: config.streamUrl,
  };
  localStorage.setItem(storageKey, JSON.stringify(nextConfig));
  return nextConfig;
}
