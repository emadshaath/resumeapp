// background.js — Service worker for rezm.ai extension

// Listen for auth token from the auth bridge page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SAVE_TOKEN") {
    chrome.storage.local.set({
      token: message.token,
      user: message.user,
      expires_at: message.expires_at,
    });
    sendResponse({ success: true });
  }

  if (message.type === "GET_TOKEN") {
    chrome.storage.local.get(["token", "user", "expires_at"], (data) => {
      sendResponse(data);
    });
    return true; // Keep channel open for async response
  }

  if (message.type === "CLEAR_TOKEN") {
    chrome.storage.local.remove(["token", "user", "expires_at"]);
    sendResponse({ success: true });
  }

  if (message.type === "FILL_FORM") {
    // Forward to content script in active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "EXECUTE_FILL",
          fields: message.fields,
          pdfUrl: message.pdfUrl,
        });
      }
    });
    sendResponse({ success: true });
  }
});
