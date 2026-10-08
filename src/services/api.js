export async function replayWebhook({ endpoint, payload, authorizationToken = '' }) {
  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
      ...(authorizationToken ? { Authorization: authorizationToken } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const responseText = await response.text();
    let details = responseText;
    try {
      details = responseText ? JSON.parse(responseText) : null;
    } catch {
      // Retain non-JSON response text for diagnostics.
    }
    const error = new Error(`Endpoint returned HTTP ${response.status}`);
    error.response = { data: details, status: response.status };
    throw error;
  }

  return { status: response.status };
}
