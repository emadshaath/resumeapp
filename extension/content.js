// content.js — Injected into job application pages
// Scans forms, matches fields to profile data, fills values

// ─── ATS Platform Detection ───
const FIELD_MAPS = {
  greenhouse: {
    detect: () => !!document.querySelector("#application_form, .application--form"),
    selectors: {
      first_name: "#first_name",
      last_name: "#last_name",
      email: "#email",
      phone: "#phone",
      resume: '#resume_file input[type="file"], input[name="resume"]',
      linkedin: '[name*="linkedin"], [placeholder*="LinkedIn"]',
      website: '[name*="website"], [name*="portfolio"]',
    },
  },
  lever: {
    detect: () => !!document.querySelector(".application-form, .postings-btn-wrapper"),
    selectors: {
      full_name: 'input[name="name"]',
      email: 'input[name="email"]',
      phone: 'input[name="phone"]',
      resume: 'input[type="file"]',
      linkedin: 'input[name="urls[LinkedIn]"]',
      website: 'input[name="urls[Portfolio]"]',
    },
  },
  workday: {
    detect: () =>
      !!document.querySelector('[data-automation-id="workday"]') ||
      window.location.hostname.includes("myworkday"),
    selectors: {
      first_name: '[data-automation-id="legalNameSection_firstName"], input[aria-label*="First"]',
      last_name: '[data-automation-id="legalNameSection_lastName"], input[aria-label*="Last"]',
      email: '[data-automation-id="email"], input[aria-label*="Email"]',
      phone: '[data-automation-id="phone"], input[aria-label*="Phone"]',
      resume: 'input[type="file"]',
    },
  },
};

const FIELD_PATTERNS = {
  first_name: /first.?name|given.?name|fname/i,
  last_name: /last.?name|family.?name|surname|lname/i,
  full_name: /^name$|full.?name|your.?name/i,
  email: /e?.?mail/i,
  phone: /phone|tel|mobile|cell/i,
  location: /location|city|address/i,
  current_title: /current.?title|job.?title|position/i,
  current_company: /current.?company|company|employer/i,
  linkedin: /linkedin/i,
  website: /website|portfolio|url/i,
  headline: /headline|summary|objective/i,
  years_experience: /years?.?(?:of)?.?experience/i,
  education_summary: /education|degree|university/i,
  skills_summary: /skills|technologies/i,
};

// ─── Listen for fill commands from popup ───
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EXECUTE_FILL") {
    const result = fillForm(message.fields, message.pdfUrl);
    sendResponse(result);
  }
});

// ─── Main fill logic ───
function fillForm(profileFields, pdfUrl) {
  const platform = detectPlatform();
  const platformSelectors = FIELD_MAPS[platform]?.selectors || {};
  let filledCount = 0;

  // Phase 1: Try platform-specific selectors first
  for (const [fieldKey, selector] of Object.entries(platformSelectors)) {
    if (fieldKey === "resume") continue; // Handle file inputs separately
    const el = document.querySelector(selector);
    const value = profileFields[fieldKey];
    if (el && value) {
      setFieldValue(el, value);
      filledCount++;
    }
  }

  // Phase 2: Generic matching for remaining fields
  const allInputs = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, select'
  );

  for (const input of allInputs) {
    if (input.value && input.value.trim()) continue; // Skip already-filled fields

    const matchedField = matchField(input);
    if (matchedField && profileFields[matchedField]) {
      setFieldValue(input, profileFields[matchedField]);
      filledCount++;
    }
  }

  // Phase 3: Handle file upload (resume PDF)
  if (pdfUrl) {
    const fileSelector = platformSelectors.resume || 'input[type="file"]';
    const fileInput = document.querySelector(fileSelector);
    if (fileInput) {
      attachPDF(fileInput, pdfUrl);
    }
  }

  return { success: true, filled: filledCount, platform };
}

// ─── Field matching ───
function matchField(element) {
  const name = (element.name || "").toLowerCase();
  const id = (element.id || "").toLowerCase();
  const placeholder = (element.placeholder || "").toLowerCase();
  const label = getLabel(element);
  const ariaLabel = (element.getAttribute("aria-label") || "").toLowerCase();

  const searchText = `${name} ${id} ${placeholder} ${label} ${ariaLabel}`;

  for (const [fieldKey, pattern] of Object.entries(FIELD_PATTERNS)) {
    if (pattern.test(searchText)) return fieldKey;
  }

  return null;
}

function getLabel(element) {
  // Try aria-labelledby
  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const labelEl = document.getElementById(labelledBy);
    if (labelEl) return labelEl.textContent.toLowerCase();
  }

  // Try <label for="id">
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) return label.textContent.toLowerCase();
  }

  // Try parent label
  const parentLabel = element.closest("label");
  if (parentLabel) return parentLabel.textContent.toLowerCase();

  // Try preceding label sibling
  const prev = element.previousElementSibling;
  if (prev && prev.tagName === "LABEL") return prev.textContent.toLowerCase();

  return "";
}

// ─── Set field value (works with React/Angular forms) ───
function setFieldValue(element, value) {
  // Set native value
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, "value"
  )?.set;
  const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, "value"
  )?.set;

  if (element.tagName === "TEXTAREA" && nativeTextareaValueSetter) {
    nativeTextareaValueSetter.call(element, value);
  } else if (nativeInputValueSetter) {
    nativeInputValueSetter.call(element, value);
  } else {
    element.value = value;
  }

  // Trigger events for React/Angular/Vue form bindings
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new Event("blur", { bubbles: true }));

  // Visual feedback
  element.style.transition = "background-color 0.3s";
  element.style.backgroundColor = "#ecfdf5";
  setTimeout(() => {
    element.style.backgroundColor = "";
  }, 2000);
}

// ─── PDF attachment via DataTransfer API ───
async function attachPDF(fileInput, pdfUrl) {
  try {
    const response = await fetch(pdfUrl, { credentials: "include" });
    if (!response.ok) return;

    const blob = await response.blob();
    const file = new File([blob], "Resume.pdf", { type: "application/pdf" });

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    fileInput.dispatchEvent(new Event("input", { bubbles: true }));
  } catch {
    // PDF attachment failed silently — user can manually upload
  }
}

// ─── Platform detection ───
function detectPlatform() {
  for (const [name, platform] of Object.entries(FIELD_MAPS)) {
    if (platform.detect()) return name;
  }
  return "generic";
}

// ─── Auth token listener (from bridge page) ───
window.addEventListener("message", (event) => {
  if (event.data?.type === "REZMAI_AUTH_TOKEN") {
    chrome.runtime.sendMessage({
      type: "SAVE_TOKEN",
      token: event.data.token,
      user: event.data.user,
      expires_at: event.data.expires_at,
    });
  }
});
