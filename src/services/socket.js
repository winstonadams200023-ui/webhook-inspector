export function connectWebhookFeed({
  url,
  eventName = 'webhook',
  onEvent,
  onStatus,
}) {
  if (url) {
    let active = true;
    let socket;
    import('socket.io-client').then(({ io }) => {
      if (!active) return;
      socket = io(url);
      socket.on('connect', () => onStatus?.('connected'));
      socket.on('disconnect', () => onStatus?.('disconnected'));
      socket.on('connect_error', () => onStatus?.('disconnected'));
      socket.on(eventName, onEvent);
    }).catch((error) => {
      if (active) {
        console.error('Could not load the webhook feed client.', error);
        onStatus?.('disconnected');
      }
    });

    return () => {
      active = false;
      socket?.disconnect();
    };
  }

  onStatus?.('idle');
  return () => {};
}
