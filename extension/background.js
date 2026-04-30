// background.js — Service worker for rezm.ai extension

// Apply Mode caches the resolved profile + variant per tab so the content
// script can keep filling form fields as the user moves through a multi-
// step wizard (Apple, Workday, etc.). State lives in chrome.storage.session
// — auto-cleared when the browser closes.
function applyModeKey(tabId) {
  return `apply_mode_${tabId}`;
}

function resolveTabId(message, sender) {
  // Popup messages have no sender.tab, so the popup must pass tabId
  // explicitly. Content-script messages get tabId from sender.tab.
  return message.tabId ?? sender?.tab?.id ?? null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SAVE_TOKEN") {
    chrome.storage.local.set({
      token: message.token,
      user: message.user,
      expires_at: message.expires_at,
    }, () => sendResponse({ success: true }));
    return true;
  }

  if (message.type === "GET_TOKEN") {
    chrome.storage.local.get(["token", "user", "expires_at"], (data) => {
      sendResponse(data);
    });
    return true;
  }

  if (message.type === "CLEAR_TOKEN") {
    chrome.storage.local.remove(
      ["token", "user", "expires_at"],
      () => sendResponse({ success: true })
    );
    return true;
  }

  if (message.type === "SET_APPLY_MODE") {
    const tabId = resolveTabId(message, sender);
    if (!tabId) {
      sendResponse({ success: false, error: "missing tabId" });
      return;
    }
    chrome.storage.session.set(
      { [applyModeKey(tabId)]: message.data || null },
      () => sendResponse({ success: true })
    );
    return true;
  }

  if (message.type === "GET_APPLY_MODE") {
    const tabId = resolveTabId(message, sender);
    if (!tabId) {
      sendResponse(null);
      return;
    }
    const key = applyModeKey(tabId);
    chrome.storage.session.get([key], (data) => {
      sendResponse(data?.[key] || null);
    });
    return true;
  }

  if (message.type === "CLEAR_APPLY_MODE") {
    const tabId = resolveTabId(message, sender);
    if (!tabId) {
      sendResponse({ success: false });
      return;
    }
    chrome.storage.session.remove(
      [applyModeKey(tabId)],
      () => sendResponse({ success: true })
    );
    return true;
  }

  // Generic CORS-bypassing relay for content scripts.
  // MV3 content scripts inherit the host page's CORS posture, so direct
  // fetch() to rezm.ai from a page like jobs.apple.com is rejected by
  // the browser's preflight check. Routing the request through the
  // service worker (which runs in the extension's own origin and gets
  // the manifest's host_permissions) bypasses that.
  // Caller passes { url, method?, headers?, body?, binary? }.
  // Response: { ok, status, body, binary }; for binary requests `body`
  // is a plain Array<number> of bytes (JSON-serializable so it can
  // travel across the message bridge), otherwise it is the response text.
  if (message.type === "API_FETCH") {
    fetch(message.url, {
      method: message.method || "GET",
      headers: message.headers || {},
      body:
        message.body !== undefined && message.body !== null
          ? message.body
          : undefined,
    })
      .then(async (response) => {
        const isBinary = !!message.binary;
        let body;
        if (isBinary) {
          const buf = await response.arrayBuffer();
          body = Array.from(new Uint8Array(buf));
        } else {
          body = await response.text();
        }
        sendResponse({
          ok: response.ok,
          status: response.status,
          body,
          binary: isBinary,
        });
      })
      .catch((err) => {
        sendResponse({ ok: false, status: 0, error: String(err) });
      });
    return true;
  }
});

// Drop the cache the moment a tab closes — keeps storage tidy and prevents
// stale state from leaking into a recycled tab id.
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(applyModeKey(tabId)).catch(() => {});
});
