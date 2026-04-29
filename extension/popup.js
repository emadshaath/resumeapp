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
  clearJobBanner();
  clearFillUI();
  window.__existingJob = null;
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

  // Fire-and-forget: look up whether the active tab is already tracked
  // and surface the banner. Failures are swallowed (banner stays hidden).
  loadJobBanner();
}

async function loadJobBanner() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const pageUrl = tab?.url || "";
    if (!pageUrl || !pageUrl.startsWith("http")) {
      window.__existingJob = null;
      clearJobBanner();
      return;
    }
    const existing = await lookupExistingJob(pageUrl);
    window.__existingJob = existing;
    renderJobBanner(existing);
  } catch (e) {
    console.warn("[rezm.ai] job banner lookup failed:", e);
  }
}

async function handleFill() {
  const btn = document.getElementById("fill-btn");
  const resultDiv = document.getElementById("result");
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Filling...';
  clearFillUI();

  try {
    // Get current tab URL to find matching job variant
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const pageUrl = tab?.url || "";

    // Reuse the banner-resolved match. Fall back to a fresh lookup in case
    // the user clicked Auto-Fill before the banner finished loading.
    let existing = window.__existingJob;
    if (!existing && pageUrl) {
      existing = await lookupExistingJob(pageUrl);
      window.__existingJob = existing;
    }
    const matchingJob = existing?.job || null;

    if (matchingJob?.status === "applied") {
      const when = matchingJob.applied_date
        ? ` on ${formatDate(matchingJob.applied_date)}`
        : "";
      const ok = window.confirm(
        `You already applied to this job${when}. Re-fill the form anyway?`
      );
      if (!ok) {
        resultDiv.innerHTML = `<div class="result success">Cancelled — existing application kept.</div>`;
        return;
      }
    }

    const variantParam = matchingJob?.variant_id ? `?variant=${matchingJob.variant_id}` : "";

    // Fetch profile fields (variant-aware when reusing an existing application)
    const profileRes = await apiFetch(`/api/autofill/profile${variantParam}`);
    if (!profileRes.ok) throw new Error("Failed to fetch profile");
    const { fields, resume_pdf_url } = await profileRes.json();

    // Fetch the PDF as a blob to pass to content script (cross-origin safe)
    let pdfBlob = null;
    let pdfBuffer = null;
    try {
      const pdfRes = await apiFetch(resume_pdf_url);
      if (pdfRes.ok) {
        pdfBuffer = await pdfRes.arrayBuffer();
        pdfBlob = Array.from(new Uint8Array(pdfBuffer));
      }
    } catch (e) {
      console.warn("Could not fetch PDF for auto-attach:", e);
    }

    // Send to content script and capture the structured fill report
    const fillResult = await sendFillMessage(tab.id, {
      type: "EXECUTE_FILL",
      fields,
      pdfBlob,
    });
    renderFilledFields(fillResult.filledFields);
    renderPdfPreview(pdfBuffer);

    resultDiv.innerHTML = `<div class="result success">Form filled! Review and submit.</div>
      <button class="btn btn-accent" id="ai-answer-btn" style="margin-top:8px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        AI Answer Remaining Questions
      </button>`;
    const aiBtn = document.getElementById("ai-answer-btn");
    if (aiBtn) aiBtn.addEventListener("click", () => handleAIAnswers(tab));

    // Auto-track only when this is a brand-new job for the user. If it
    // was already tracked we leave the existing row (and its status)
    // alone — the banner already showed the user what's stored.
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
      // Refresh the banner so the next click shows the now-tracked state.
      loadJobBanner();
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

async function handleAIAnswers(tab, jobContext) {
  const btn = document.getElementById("ai-answer-btn") || document.getElementById("ai-answer-btn-smart");
  const resultDiv = document.getElementById("result");
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Scanning questions...';

  try {
    // Step 1: Extract unanswered questions from the page
    const questions = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_QUESTIONS" }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error("Could not read form. Refresh and try again."));
        } else {
          resolve(response || []);
        }
      });
    });

    if (!questions || questions.length === 0) {
      resultDiv.innerHTML = '<div class="result success">No unanswered questions found!</div>';
      btn.remove();
      return;
    }

    btn.innerHTML = `<div class="spinner"></div> AI answering ${questions.length} questions...`;

    // Step 2: Get job context if we don't have it
    let jobInfo = jobContext;
    if (!jobInfo) {
      jobInfo = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_JOB" }, (response) => {
          resolve(response || { job_title: tab.title, company_name: new URL(tab.url).hostname });
        });
      });
    }

    // Step 3: Send questions to AI endpoint
    const aiRes = await apiFetch("/api/extension/ai-answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questions,
        job_context: {
          job_title: jobInfo.job_title,
          company_name: jobInfo.company_name,
          description: jobInfo.description || null,
        },
      }),
    });

    const aiData = await aiRes.json();

    if (!aiRes.ok) {
      if (aiData.upgrade_required) {
        throw new Error(aiData.error);
      }
      throw new Error(aiData.error || "AI answering failed");
    }

    // Step 4: Apply answers to the form
    btn.innerHTML = '<div class="spinner"></div> Filling answers...';
    const fillResult = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, {
        type: "APPLY_AI_ANSWERS",
        answers: aiData.answers,
      }, (response) => {
        resolve(response || { filled: 0 });
      });
    });

    resultDiv.innerHTML = `<div class="result success">
      AI answered ${fillResult.filled} question${fillResult.filled !== 1 ? "s" : ""}!<br>
      <span style="font-size:11px;opacity:0.8;color:#7c3aed;">Purple-highlighted = AI answers — please review before submitting</span>
    </div>`;
  } catch (err) {
    resultDiv.innerHTML += `<div class="result error" style="margin-top:8px;">${err.message}</div>`;
  }

  btn.remove();
}

async function handleSmartFill() {
  const btn = document.getElementById("smart-fill-btn");
  const resultDiv = document.getElementById("result");
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Analyzing job...';
  clearFillUI();

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
    let pdfBuffer = null;
    try {
      const pdfRes = await apiFetch(smartData.resume_pdf_url);
      if (pdfRes.ok) {
        pdfBuffer = await pdfRes.arrayBuffer();
        pdfBlob = Array.from(new Uint8Array(pdfBuffer));
      }
    } catch (e) {
      console.warn("Could not fetch tailored PDF:", e);
    }

    // Step 4: Fill the form with tailored fields + PDF
    btn.innerHTML = '<div class="spinner"></div> Filling form...';
    const fillResult = await sendFillMessage(tab.id, {
      type: "EXECUTE_FILL",
      fields: smartData.fields,
      pdfBlob,
    });
    renderFilledFields(fillResult.filledFields);
    renderPdfPreview(pdfBuffer);

    const detailParts = [];
    if (smartData.reused) detailParts.push("Reused existing variant");
    if (smartData.limit_reached) detailParts.push("⚠️ variant limit reached — using default profile");
    renderMatchBadge(
      smartData.match_score,
      detailParts.length ? detailParts.join(" · ") : "Resume vs. this job description"
    );

    resultDiv.innerHTML = `<div class="result success">
      Smart filled!<br>
      <span style="font-size:11px;opacity:0.8">Variant saved to dashboard</span>
    </div>
    <button class="btn btn-accent" id="ai-answer-btn-smart" style="margin-top:8px;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      AI Answer Remaining Questions
    </button>`;
    const aiBtnSmart = document.getElementById("ai-answer-btn-smart");
    if (aiBtnSmart) aiBtnSmart.addEventListener("click", () => handleAIAnswers(tab, jobDetails));

    // Smart-fill creates/updates the job_application + variant — refresh
    // the banner so a follow-up Auto-Fill click sees the new variant.
    loadJobBanner();
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function formatDate(s) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return String(s);
  }
}

// Tracking IDs that distinguish two different postings on the same host
// (everything else — utm_*, share params, etc. — is dropped so a
// shared-from-LinkedIn URL still matches a directly-pasted one).
const JOB_URL_QUERY_WHITELIST = ["gh_jid", "currentJobId", "jobId", "job_id"];

function normalizeJobUrl(raw) {
  try {
    const u = new URL(raw);
    u.hash = "";
    const kept = new URLSearchParams();
    for (const key of JOB_URL_QUERY_WHITELIST) {
      const v = u.searchParams.get(key);
      if (v) kept.set(key, v);
    }
    u.search = kept.toString();
    let s = u.toString();
    if (s.endsWith("/") && u.pathname.length > 1) s = s.slice(0, -1);
    return s;
  } catch {
    return raw;
  }
}

async function findJobByUrl(url) {
  try {
    const res = await apiFetch(`/api/jobs?job_url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const jobs = (data && data.jobs) || [];
    if (jobs.length === 0) return null;
    if (jobs.length === 1) return jobs[0];
    // Prefer rows that already have a variant attached, then most recent.
    const sorted = [...jobs].sort((a, b) => {
      const variantBias = (b.variant_id ? 1 : 0) - (a.variant_id ? 1 : 0);
      if (variantBias !== 0) return variantBias;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    return sorted[0];
  } catch {
    return null;
  }
}

// Resolve whether the active tab matches an existing job_application row.
// Tries the exact tab URL first (uses the new ?job_url= server filter),
// then falls back to a normalized variant for share-param cases.
// Enriches with the variant's display name when one is attached.
async function lookupExistingJob(pageUrl) {
  if (!pageUrl) return null;
  let job = await findJobByUrl(pageUrl);
  if (!job) {
    const normalized = normalizeJobUrl(pageUrl);
    if (normalized && normalized !== pageUrl) {
      job = await findJobByUrl(normalized);
    }
  }
  if (!job) return null;

  let variant = null;
  if (job.variant_id) {
    try {
      const r = await apiFetch(`/api/variants/${job.variant_id}`);
      if (r.ok) {
        const data = await r.json();
        variant = data.variant || null;
      }
    } catch {
      // Variant deleted or unreachable — fall through with id-only display.
    }
  }
  return { job, variant };
}

function clearJobBanner() {
  const el = document.getElementById("job-banner");
  if (!el) return;
  el.hidden = true;
  el.innerHTML = "";
  el.className = "";
}

function renderJobBanner(existing) {
  const el = document.getElementById("job-banner");
  if (!el) return;
  if (!existing || !existing.job) {
    clearJobBanner();
    return;
  }
  const { job, variant } = existing;
  const status = String(job.status || "saved").toLowerCase();
  const statusClass = status === "applied" ? "applied strong" : "saved";
  const statusBadge = status.toUpperCase();
  const dateLine = job.applied_date
    ? `Applied ${formatDate(job.applied_date)}`
    : (job.created_at ? `Tracked ${formatDate(job.created_at)}` : "");
  const variantName = variant?.name
    ? variant.name
    : (job.variant_id ? "(unnamed variant)" : "—");
  const score =
    job.match_score != null
      ? `${job.match_score}% match`
      : (variant?.match_score != null ? `${variant.match_score}% match` : "score n/a");

  el.className = `banner ${statusClass}`;
  el.hidden = false;
  el.innerHTML = `
    <div class="row">
      <div>
        <div class="title">${escapeHtml(job.company_name || "(unknown)")} · ${escapeHtml(job.job_title || "")}</div>
        ${dateLine ? `<div class="meta">${escapeHtml(dateLine)}</div>` : ""}
      </div>
      <span class="badge">${escapeHtml(statusBadge)}</span>
    </div>
    <div class="meta" style="margin-top:6px;">
      Variant: <strong>${escapeHtml(variantName)}</strong> · ${escapeHtml(score)}
    </div>
    <div class="actions">
      <button class="btn-small" id="regen-variant-btn">Generate new variant</button>
    </div>
  `;

  const regen = document.getElementById("regen-variant-btn");
  if (regen) regen.addEventListener("click", () => {
    window.__existingJob = null;
    clearJobBanner();
    handleSmartFill();
  });
}

// Wrap chrome.tabs.sendMessage so we can await the structured response
// from content.js. Resolves to a default empty result on errors so callers
// can treat the fill UI uniformly.
function sendFillMessage(tabId, payload) {
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, payload, (response) => {
        if (chrome.runtime.lastError || !response) {
          resolve({ success: false, filled: 0, filledFields: [] });
        } else {
          resolve(response);
        }
      });
    } catch (e) {
      resolve({ success: false, filled: 0, filledFields: [] });
    }
  });
}

// Reset the per-fill panels so a re-click doesn't show stale data while
// the next request is in flight.
function clearFillUI() {
  const fields = document.getElementById("filled-fields");
  const list = document.getElementById("filled-fields-list");
  if (fields) fields.hidden = true;
  if (list) list.innerHTML = "";
  clearMatchBadge();
  clearPdfPreview();
}

function clearMatchBadge() {
  const panel = document.getElementById("match-panel");
  const badge = document.getElementById("match-badge");
  const detail = document.getElementById("match-detail");
  if (panel) panel.hidden = true;
  if (badge) {
    badge.textContent = "--%";
    badge.classList.remove("high", "low");
  }
  if (detail) detail.textContent = "Resume vs. job description";
}

// Show the Smart-Tailor match score as a prominent badge. score is the
// 0-100 integer returned by /api/extension/smart-fill; detail is an
// optional sub-line (e.g., "Reused existing variant").
function renderMatchBadge(score, detail) {
  const panel = document.getElementById("match-panel");
  const badge = document.getElementById("match-badge");
  const detailEl = document.getElementById("match-detail");
  if (!panel || !badge) return;
  if (score == null || Number.isNaN(Number(score))) {
    clearMatchBadge();
    return;
  }
  const n = Math.max(0, Math.min(100, Math.round(Number(score))));
  badge.textContent = `${n}%`;
  badge.classList.toggle("high", n >= 75);
  badge.classList.toggle("low", n < 50);
  if (detailEl) detailEl.textContent = detail || "Resume vs. job description";
  panel.hidden = false;
}

// Track the active object URL so we can revoke it before creating the next
// one — keeps memory clean when the user runs Auto-Fill repeatedly.
let currentPdfBlobUrl = null;
const PDF_INLINE_MAX_BYTES = 6_000_000;

function clearPdfPreview() {
  const panel = document.getElementById("pdf-preview");
  const frame = document.getElementById("pdf-frame");
  const fallback = document.getElementById("pdf-fallback");
  const openBtn = document.getElementById("open-pdf-btn");
  if (panel) panel.hidden = true;
  if (frame) frame.removeAttribute("src");
  if (fallback) fallback.hidden = true;
  if (openBtn) openBtn.onclick = null;
  if (currentPdfBlobUrl) {
    URL.revokeObjectURL(currentPdfBlobUrl);
    currentPdfBlobUrl = null;
  }
}

// Build a blob URL from the fetched PDF bytes and show it in the popup.
// Inline iframe rendering is skipped for very large files (the popup is
// ~380px wide and Chrome can choke on big PDFs), but the Open-in-tab
// button is always wired up.
function renderPdfPreview(buffer) {
  const panel = document.getElementById("pdf-preview");
  const frame = document.getElementById("pdf-frame");
  const fallback = document.getElementById("pdf-fallback");
  const openBtn = document.getElementById("open-pdf-btn");
  if (!panel || !frame || !openBtn) return;
  if (!buffer || !buffer.byteLength) {
    clearPdfPreview();
    return;
  }
  const blob = new Blob([buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  if (currentPdfBlobUrl) URL.revokeObjectURL(currentPdfBlobUrl);
  currentPdfBlobUrl = url;

  if (buffer.byteLength <= PDF_INLINE_MAX_BYTES) {
    frame.src = url;
    frame.hidden = false;
    if (fallback) fallback.hidden = true;
  } else {
    frame.removeAttribute("src");
    frame.hidden = true;
    if (fallback) fallback.hidden = false;
  }
  openBtn.onclick = () => window.open(url, "_blank");
  panel.hidden = false;
}

function renderFilledFields(filledFields) {
  const panel = document.getElementById("filled-fields");
  const list = document.getElementById("filled-fields-list");
  const count = document.getElementById("filled-count");
  if (!panel || !list || !count) return;
  if (!Array.isArray(filledFields) || filledFields.length === 0) {
    panel.hidden = true;
    return;
  }
  count.textContent = filledFields.length;
  list.innerHTML = filledFields
    .map(
      (f) => `
        <div class="field-row">
          <span class="label">${escapeHtml(f.label || "field")}</span>
          <span class="type">${escapeHtml(f.type || "")}</span>
          <span class="value">${escapeHtml(f.value || "")}</span>
        </div>
      `
    )
    .join("");
  panel.hidden = false;
}
