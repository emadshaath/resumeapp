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

// ─── Field patterns for generic matching ───
const FIELD_PATTERNS = {
  first_name: /first.?name|given.?name|fname/i,
  last_name: /last.?name|family.?name|surname|lname/i,
  full_name: /^name$|full.?name|your.?name|applicant.?name/i,
  email: /e?.?mail|email.?addr/i,
  phone: /phone|tel(?:ephone)?|mobile|cell/i,
  city: /^city$/i,
  location: /^location$/i,
  state: /^state$|province|region/i,
  zip_code: /zip|postal|postcode/i,
  address: /^address$|street.?address|address.?line/i,
  current_title: /current.?title|job.?title|most.?recent.?title|position/i,
  current_company: /current.?company|company|employer|organization/i,
  linkedin: /linkedin/i,
  website: /website|portfolio|personal.?url|homepage/i,
  headline: /headline|summary|objective|about/i,
  years_experience: /years?.?(?:of)?.?experience|experience.?years|how.?many.?years/i,
  education_summary: /education|degree|university|school/i,
  skills_summary: /skills|technologies|competencies/i,
};

// ─── Patterns for dropdowns/radios/checkboxes ───
const SELECT_PATTERNS = {
  work_authorization: /authorized.?to.?work|work.?auth|eligible.?to.?work|legally.?authorized|right.?to.?work/i,
  work_setting: /work.?setting|work.?arrangement|remote|on.?site|hybrid|where.?would.?you/i,
  years_experience: /years?.?(?:of)?.?(?:work)?.?experience|how.?many.?years/i,
  contact_preference: /how.?(?:would|do).?you.?like.?to.?be.?contacted|contact.?(?:method|preference)|communication/i,
  education_level: /education.?level|highest.?degree|degree.?level/i,
};

// ─── Default answers for common questions ───
const DEFAULT_ANSWERS = {
  work_authorization: { preferred: ["yes", "true", "authorized"], value: "Yes" },
  work_setting: { preferred: ["remote", "hybrid"], value: "Remote" },
  contact_preference: { preferred: ["email", "text", "sms"], value: "Email" },
};

// ─── Listen for fill commands from popup ───
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EXECUTE_FILL") {
    const result = fillForm(message.fields, message.pdfBlob);
    sendResponse(result);
  }
  if (message.type === "ATTACH_PDF") {
    attachPDFFromBlob(message.blob);
    sendResponse({ success: true });
  }
});

// ─── Main fill logic ───
function fillForm(profileFields, pdfBlob) {
  const platform = detectPlatform();
  const platformSelectors = FIELD_MAPS[platform]?.selectors || {};
  let filledCount = 0;

  // Add derived fields
  const fields = { ...profileFields };
  if (fields.location) {
    const parts = fields.location.split(",").map((s) => s.trim());
    if (parts.length >= 2) {
      fields.city = fields.city || parts[0];
      fields.state = fields.state || parts[1];
    }
    if (parts.length >= 3) {
      fields.country = fields.country || parts[2];
    }
  }

  // Phase 1: Platform-specific selectors
  for (const [fieldKey, selector] of Object.entries(platformSelectors)) {
    if (fieldKey === "resume") continue;
    const el = document.querySelector(selector);
    const value = fields[fieldKey];
    if (el && value) {
      setFieldValue(el, value);
      filledCount++;
    }
  }

  // Phase 2: Generic matching for text inputs and textareas
  const allInputs = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]):not([type="image"]), textarea'
  );

  for (const input of allInputs) {
    const type = input.type || "text";
    // Skip checkboxes and radios for now — handle separately
    if (type === "checkbox" || type === "radio") continue;
    if (input.value && input.value.trim()) continue;

    const matchedField = matchField(input);
    if (matchedField && fields[matchedField]) {
      setFieldValue(input, fields[matchedField]);
      filledCount++;
    }
  }

  // Phase 3: Handle <select> dropdowns
  const allSelects = document.querySelectorAll("select");
  for (const select of allSelects) {
    if (select.value && select.selectedIndex > 0) continue;
    const filled = fillSelect(select, fields);
    if (filled) filledCount++;
  }

  // Phase 4: Handle radio button groups
  filledCount += fillRadioGroups(fields);

  // Phase 5: Handle checkboxes (e.g., "I agree to receive text messages")
  filledCount += fillCheckboxes(fields);

  // Phase 6: Handle file upload (resume PDF)
  if (pdfBlob) {
    attachPDFFromBlob(pdfBlob);
  } else {
    // Try to find and fill any file input with a visual indicator
    const fileSelector = platformSelectors.resume || 'input[type="file"]';
    const fileInput = document.querySelector(fileSelector);
    if (fileInput) {
      highlightElement(fileInput, "#fef3c7"); // Yellow highlight to draw attention
    }
  }

  return { success: true, filled: filledCount, platform };
}

// ─── Fill <select> dropdowns ───
function fillSelect(select, fields) {
  const labelText = getLabel(select);
  const name = (select.name || "").toLowerCase();
  const id = (select.id || "").toLowerCase();
  const searchText = `${name} ${id} ${labelText}`;

  // Try matching to a profile field first
  for (const [fieldKey, pattern] of Object.entries(FIELD_PATTERNS)) {
    if (pattern.test(searchText) && fields[fieldKey]) {
      const matched = selectBestOption(select, fields[fieldKey]);
      if (matched) return true;
    }
  }

  // Try matching to common question patterns
  for (const [questionKey, pattern] of Object.entries(SELECT_PATTERNS)) {
    if (pattern.test(searchText)) {
      const defaults = DEFAULT_ANSWERS[questionKey];
      if (defaults) {
        // Try preferred values
        for (const pref of defaults.preferred) {
          const matched = selectBestOption(select, pref);
          if (matched) return true;
        }
      }

      // For years_experience, try to match from profile
      if (questionKey === "years_experience" && fields.years_experience) {
        const years = parseInt(fields.years_experience);
        const matched = selectExperienceOption(select, years);
        if (matched) return true;
      }
    }
  }

  // State field
  if (/^state$/i.test(searchText) && fields.state) {
    const matched = selectBestOption(select, fields.state);
    if (matched) return true;
  }

  return false;
}

function selectBestOption(select, targetValue) {
  const target = targetValue.toLowerCase();
  const options = Array.from(select.options);

  // Exact match
  for (const opt of options) {
    if (opt.value.toLowerCase() === target || opt.text.toLowerCase() === target) {
      select.value = opt.value;
      triggerEvents(select);
      highlightElement(select);
      return true;
    }
  }

  // Partial match
  for (const opt of options) {
    if (
      opt.value.toLowerCase().includes(target) ||
      opt.text.toLowerCase().includes(target) ||
      target.includes(opt.value.toLowerCase()) ||
      target.includes(opt.text.toLowerCase())
    ) {
      if (opt.value === "" || opt.disabled) continue;
      select.value = opt.value;
      triggerEvents(select);
      highlightElement(select);
      return true;
    }
  }

  return false;
}

function selectExperienceOption(select, years) {
  const options = Array.from(select.options);
  for (const opt of options) {
    const text = opt.text.toLowerCase();
    // Match ranges like "4-5 years", "6-10 years", "10+ years"
    const rangeMatch = text.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (rangeMatch) {
      const min = parseInt(rangeMatch[1]);
      const max = parseInt(rangeMatch[2]);
      if (years >= min && years <= max) {
        select.value = opt.value;
        triggerEvents(select);
        highlightElement(select);
        return true;
      }
    }
    // Match "10+ years"
    const plusMatch = text.match(/(\d+)\+/);
    if (plusMatch && years >= parseInt(plusMatch[1])) {
      select.value = opt.value;
      triggerEvents(select);
      highlightElement(select);
      return true;
    }
    // Match "Less than a year"
    if (years < 1 && /less.?than|none|0/i.test(text)) {
      select.value = opt.value;
      triggerEvents(select);
      highlightElement(select);
      return true;
    }
  }
  return false;
}

// ─── Fill radio button groups ───
function fillRadioGroups(fields) {
  let filled = 0;
  const radioGroups = {};

  // Group radios by name
  document.querySelectorAll('input[type="radio"]').forEach((radio) => {
    const name = radio.name;
    if (!name) return;
    if (!radioGroups[name]) radioGroups[name] = [];
    radioGroups[name].push(radio);
  });

  for (const [groupName, radios] of Object.entries(radioGroups)) {
    // Check if any already selected
    if (radios.some((r) => r.checked)) continue;

    // Get the group's label/question text
    const container = radios[0].closest("fieldset, .field, .form-group, [class*=question], [role=radiogroup]");
    const questionText = container
      ? container.textContent.toLowerCase()
      : getLabel(radios[0]);

    // Work authorization: select "Yes"
    if (SELECT_PATTERNS.work_authorization.test(questionText)) {
      const yesRadio = radios.find((r) =>
        /^yes$/i.test(r.value) || /^yes$/i.test(getLabel(r))
      );
      if (yesRadio) {
        yesRadio.checked = true;
        triggerEvents(yesRadio);
        filled++;
        continue;
      }
    }

    // Work setting preference
    if (SELECT_PATTERNS.work_setting.test(questionText)) {
      for (const pref of ["remote", "hybrid"]) {
        const match = radios.find((r) =>
          r.value.toLowerCase().includes(pref) ||
          getLabel(r).includes(pref)
        );
        if (match) {
          match.checked = true;
          triggerEvents(match);
          filled++;
          break;
        }
      }
      continue;
    }

    // Contact preference: prefer email or text
    if (SELECT_PATTERNS.contact_preference.test(questionText)) {
      for (const pref of ["text", "sms", "email"]) {
        const match = radios.find((r) =>
          r.value.toLowerCase().includes(pref) ||
          getLabel(r).includes(pref)
        );
        if (match) {
          match.checked = true;
          triggerEvents(match);
          filled++;
          break;
        }
      }
    }
  }

  return filled;
}

// ─── Fill checkboxes ───
function fillCheckboxes(fields) {
  let filled = 0;
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');

  for (const cb of checkboxes) {
    if (cb.checked) continue;
    const labelText = getLabel(cb);

    // Agree to receive text messages
    if (/agree.?to.?receive|opt.?in|i.?agree|i.?consent/i.test(labelText)) {
      // Only check positive consent checkboxes, not opt-out ones
      if (!/do.?not|opt.?out|unsubscribe/i.test(labelText)) {
        cb.checked = true;
        triggerEvents(cb);
        filled++;
      }
    }
  }

  return filled;
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

  // Try parent container with label-like text
  const parent = element.closest(".field, .form-group, .form-field, [class*=field]");
  if (parent) {
    const labelChild = parent.querySelector("label, .label, [class*=label]");
    if (labelChild) return labelChild.textContent.toLowerCase();
  }

  return "";
}

// ─── Set field value (works with React/Angular forms) ───
function setFieldValue(element, value) {
  if (element.tagName === "SELECT") {
    selectBestOption(element, value);
    return;
  }

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

  triggerEvents(element);
  highlightElement(element);
}

function triggerEvents(element) {
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new Event("blur", { bubbles: true }));
  // React 16+ synthetic event support
  const nativeEvent = new Event("change", { bubbles: true });
  Object.defineProperty(nativeEvent, "simulated", { value: true });
  element.dispatchEvent(nativeEvent);
}

function highlightElement(element, color = "#ecfdf5") {
  element.style.transition = "background-color 0.3s, outline 0.3s";
  element.style.backgroundColor = color;
  element.style.outline = "2px solid #10b981";
  setTimeout(() => {
    element.style.backgroundColor = "";
    element.style.outline = "";
  }, 2000);
}

// ─── PDF attachment via blob passed from background ───
function attachPDFFromBlob(blobData) {
  const fileInputs = document.querySelectorAll('input[type="file"]');
  if (fileInputs.length === 0) return;

  // Find the resume file input (first one, or one matching resume/cv patterns)
  let target = fileInputs[0];
  for (const fi of fileInputs) {
    const label = getLabel(fi);
    const name = (fi.name || "").toLowerCase();
    const accept = (fi.accept || "").toLowerCase();
    if (/resume|cv|document|attachment|upload/i.test(`${label} ${name}`) || accept.includes("pdf")) {
      target = fi;
      break;
    }
  }

  try {
    const uint8 = new Uint8Array(blobData);
    const blob = new Blob([uint8], { type: "application/pdf" });
    const file = new File([blob], "Resume.pdf", { type: "application/pdf" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    target.files = dataTransfer.files;
    triggerEvents(target);
    highlightElement(target, "#ecfdf5");
  } catch (e) {
    // DataTransfer may not be supported — highlight for manual upload
    highlightElement(target, "#fef3c7");
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
