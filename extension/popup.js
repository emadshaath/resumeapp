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
    <button class="btn btn-accent" id="smart-fill-btn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
      Smart Tailor &amp; Fill
    </button>
    <p class="smart-hint">AI-tailors your resume for this job, then fills the form</p>
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
  document.getElementById("smart-fill-btn").addEventListener("click", handleSmartFill);
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

    // Fetch the PDF as a blob to pass to content script (cross-origin safe)
    let pdfBlob = null;
    try {
      const pdfRes = await apiFetch(resume_pdf_url);
      if (pdfRes.ok) {
        const buffer = await pdfRes.arrayBuffer();
        pdfBlob = Array.from(new Uint8Array(buffer));
      }
    } catch (e) {
      console.warn("Could not fetch PDF for auto-attach:", e);
    }

    // Send to content script
    chrome.tabs.sendMessage(tab.id, {
      type: "EXECUTE_FILL",
      fields,
      pdfBlob,
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

async function handleSmartFill() {
  const btn = document.getElementById("smart-fill-btn");
  const resultDiv = document.getElementById("result");
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Analyzing job...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Step 1: Scrape job details from the page via content script
    btn.innerHTML = '<div class="spinner"></div> Scraping job details...';
    const jobDetails = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_JOB" }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error("Could not read page. Refresh and try again."));
        } else {
          resolve(response || {});
        }
      });
    });

    if (!jobDetails.job_title) {
      throw new Error("Could not detect job details on this page.");
    }

    // Step 2: Call smart-fill endpoint (creates job + generates variant + returns fields)
    btn.innerHTML = '<div class="spinner"></div> AI tailoring resume...';
    const smartRes = await apiFetch("/api/extension/smart-fill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_title: jobDetails.job_title,
        company_name: jobDetails.company_name || "Unknown",
        job_url: tab.url,
        description: jobDetails.description || null,
        location: jobDetails.location || null,
        remote_type: jobDetails.remote_type || null,
      }),
    });

    const smartData = await smartRes.json();

    if (!smartRes.ok) {
      if (smartData.upgrade_required) {
        throw new Error(smartData.error);
      }
      throw new Error(smartData.error || "Smart fill failed");
    }

    // Step 3: Fetch the tailored PDF as blob
    btn.innerHTML = '<div class="spinner"></div> Preparing tailored PDF...';
    let pdfBlob = null;
    try {
      const pdfRes = await apiFetch(smartData.resume_pdf_url);
      if (pdfRes.ok) {
        const buffer = await pdfRes.arrayBuffer();
        pdfBlob = Array.from(new Uint8Array(buffer));
      }
    } catch (e) {
      console.warn("Could not fetch tailored PDF:", e);
    }

    // Step 4: Fill the form with tailored fields + PDF
    btn.innerHTML = '<div class="spinner"></div> Filling form...';
    chrome.tabs.sendMessage(tab.id, {
      type: "EXECUTE_FILL",
      fields: smartData.fields,
      pdfBlob,
    });

    const score = smartData.match_score ? ` (${smartData.match_score}% match)` : "";
    const reused = smartData.reused ? " (reused existing)" : "";
    const limited = smartData.limit_reached ? " ⚠️ Using default profile (variant limit reached)" : "";

    resultDiv.innerHTML = `<div class="result success">
      Smart filled!${score}${reused}${limited}<br>
      <span style="font-size:11px;opacity:0.8">Variant saved to dashboard</span>
    </div>`;
  } catch (err) {
    resultDiv.innerHTML = `<div class="result error">${err.message}</div>`;
  }

  btn.disabled = false;
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
    Smart Tailor &amp; Fill
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
