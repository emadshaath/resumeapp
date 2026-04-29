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
});

// Drop the cache the moment a tab closes — keeps storage tidy and prevents
// stale state from leaking into a recycled tab id.
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(applyModeKey(tabId)).catch(() => {});
});
