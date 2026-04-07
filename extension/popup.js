// popup.js — Extension popup UI logic

const API_BASE = "https://rezm.ai"; // Change to localhost for dev
const statusSection = document.getElementById("status-section");
const actionSection = document.getElementById("action-section");

let currentToken = null;
let currentUser = null;

// Initialize
init();

async function init() {
  const data = await getToken();
  if (data.token) {
    currentToken = data.token;
    currentUser = data.user;
    showConnected();
  } else {
    showDisconnected();
  }
}

function getToken() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_TOKEN" }, resolve);
  });
}

function showDisconnected() {
  statusSection.innerHTML = `
    <div class="status disconnected">
      <div class="dot"></div>
      Not connected
    </div>
  `;
  actionSection.innerHTML = `
    <button class="btn btn-primary" id="connect-btn">
      Connect to rezm.ai
    </button>
    <p style="font-size:11px;color:#6b7280;text-align:center;margin-top:10px;">
      Sign in to auto-fill job applications
    </p>
  `;
  document.getElementById("connect-btn").addEventListener("click", () => {
    chrome.tabs.create({ url: `${API_BASE}/extension/auth` });
  });
}

function showConnected() {
  statusSection.innerHTML = `
    <div class="status connected">
      <div class="dot"></div>
      Connected as ${currentUser?.email || "User"}
    </div>
  `;
  actionSection.innerHTML = `
    <button class="btn btn-primary" id="fill-btn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      Auto-Fill This Form
    </button>
    <button class="btn btn-secondary" id="track-btn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
      Track This Job
    </button>
    <div class="divider"></div>
    <button class="btn btn-danger" id="disconnect-btn">
      Disconnect
    </button>
    <div id="result"></div>
  `;

  document.getElementById("fill-btn").addEventListener("click", handleFill);
  document.getElementById("track-btn").addEventListener("click", handleTrack);
  document.getElementById("disconnect-btn").addEventListener("click", handleDisconnect);
}

async function handleFill() {
  const btn = document.getElementById("fill-btn");
  const resultDiv = document.getElementById("result");
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Filling...';

  try {
    // Get current tab URL to find matching job variant
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const pageUrl = tab?.url || "";

    // Try to find a job application for this URL
    const jobRes = await apiFetch(`/api/jobs?search=${encodeURIComponent(pageUrl)}`);
    const jobData = jobRes.ok ? await jobRes.json() : null;
    const matchingJob = jobData?.jobs?.find((j) => j.job_url === pageUrl);
    const variantParam = matchingJob?.variant_id ? `?variant=${matchingJob.variant_id}` : "";

    // Fetch profile fields
    const profileRes = await apiFetch(`/api/autofill/profile${variantParam}`);
    if (!profileRes.ok) throw new Error("Failed to fetch profile");
    const { fields, resume_pdf_url } = await profileRes.json();

    // Send to content script
    chrome.tabs.sendMessage(tab.id, {
      type: "EXECUTE_FILL",
      fields,
      pdfUrl: `${API_BASE}${resume_pdf_url}`,
    });

    resultDiv.innerHTML = '<div class="result success">Form filled! Review and submit.</div>';

    // Auto-track if not already tracked
    if (!matchingJob && pageUrl.startsWith("http")) {
      await apiFetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_url: pageUrl,
          job_title: tab.title || "Unknown",
          company_name: new URL(pageUrl).hostname.replace("www.", "").split(".")[0],
          status: "applied",
          source: "extension",
        }),
      });
    }
  } catch (err) {
    resultDiv.innerHTML = `<div class="result error">${err.message}</div>`;
  }

  btn.disabled = false;
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    Auto-Fill This Form
  `;
}

async function handleTrack() {
  const btn = document.getElementById("track-btn");
  const resultDiv = document.getElementById("result");
  btn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Parse URL to create job application
    const parseRes = await apiFetch("/api/jobs/parse-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: tab.url }),
    });

    let jobData = { job_title: tab.title, company_name: new URL(tab.url).hostname };
    if (parseRes.ok) {
      const { parsed } = await parseRes.json();
      jobData = { ...jobData, ...parsed };
    }

    await apiFetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...jobData,
        job_url: tab.url,
        status: "saved",
        source: "extension",
      }),
    });

    resultDiv.innerHTML = '<div class="result success">Job tracked! Check your dashboard.</div>';
  } catch (err) {
    resultDiv.innerHTML = `<div class="result error">${err.message}</div>`;
  }

  btn.disabled = false;
}

async function handleDisconnect() {
  chrome.runtime.sendMessage({ type: "CLEAR_TOKEN" });
  currentToken = null;
  currentUser = null;
  showDisconnected();
}

async function apiFetch(path, options = {}) {
  const tokenData = await getToken();
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${tokenData.token}`,
    },
  });
}
