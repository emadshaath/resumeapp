// background.js — Service worker for rezm.ai extension

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
});
