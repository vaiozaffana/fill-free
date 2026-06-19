import type { MappedData } from '../lib/types';

interface FillPlaywrightMessage {
  action: 'fill-playwright';
  data: MappedData;
}

interface RelayResponse {
  ok: boolean;
}

const PLAYWRIGHT_ENDPOINT = 'http://localhost:3333/fill';

function isFillPlaywrightMessage(message: unknown): message is FillPlaywrightMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { action?: unknown }).action === 'fill-playwright'
  );
}

/**
 * Relay file-mode fills from the popup to the local Playwright companion app.
 * Returns `true` to keep the message channel open for the async response.
 */
chrome.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse: (response: RelayResponse) => void) => {
    if (!isFillPlaywrightMessage(message)) return undefined;

    fetch(PLAYWRIGHT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message.data),
    })
      .then((res) => sendResponse({ ok: res.ok }))
      .catch(() => sendResponse({ ok: false }));

    return true; // keep channel open for async sendResponse
  },
);
