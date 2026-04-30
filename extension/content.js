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
  linkedin: /linkedin|linked.?in/i,
  linkedin_url: /linkedin.?(?:profile|url)|linked.?in/i,
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

// ─── Default answers for common questions (overridden by profile prefs) ───
const DEFAULT_ANSWERS = {
  work_authorization: { preferred: ["yes", "true", "authorized"], value: "Yes" },
  work_setting: { preferred: ["remote", "hybrid"], value: "Remote" },
  contact_preference: { preferred: ["email", "text", "sms"], value: "Email" },
};

// ─── Patterns for EEO / demographic fields ───
const EEO_PATTERNS = {
  gender_identity: /gender|i.?identify.?my.?gender/i,
  pronouns: /pronoun/i,
  race_ethnicity: /race|ethnicity|ethnic/i,
  veteran_status: /veteran/i,
  disability_status: /disability|disabilities|ada\b/i,
  lgbtq_identity: /lgbtq|sexual.?orientation|lgb/i,
  sponsorship_required: /sponsorship|visa.?status|h.?1b|immigration|will.?you.?(?:now|in.?the.?future).?require/i,
  how_heard_default: /how.?did.?you.?hear|how.?did.?you.?find|where.?did.?you.?hear|referral.?source/i,
  salary_expectation: /salary|compensation|pay.?expectation|minimum.?required.?(?:yearly|annual)/i,
  notice_period: /(?:when|earliest).?(?:can.?you|could.?you)?.?start|notice.?period|start.?date|availability/i,
};

// ─── Map stored preference values to form-friendly display values ───
const PREF_VALUE_MAP = {
  gender_identity: { male: "Male", female: "Female", non_binary: "Non-binary", other: "Other", prefer_not_to_say: "I prefer not to say" },
  pronouns: { "he/him": "He/Him", "she/her": "She/Her", "they/them": "They/Them", other: "Other", prefer_not_to_say: "I prefer not to say" },
  race_ethnicity: {
    american_indian: "American Indian", asian: "Asian", black: "Black or African American",
    hispanic: "Hispanic", middle_eastern: "Middle Eastern", pacific_islander: "Pacific Islander",
    white: "White", two_or_more: "Two or more", other: "Other", prefer_not_to_say: "I prefer not to say",
  },
  veteran_status: { veteran: "I am a veteran", not_veteran: "I am not a veteran", prefer_not_to_say: "I prefer not to say" },
  disability_status: { yes: "Yes", no: "No", prefer_not_to_say: "I prefer not to say" },
  lgbtq_identity: { yes: "Yes", no: "No", prefer_not_to_say: "I prefer not to say" },
  work_authorization: { yes: "Yes", no: "No" },
  sponsorship_required: { yes: "Yes", no: "No", future: "Yes, in the future" },
  preferred_work_setting: { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" },
};

// ─── Listen for fill commands from popup ───
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EXECUTE_FILL") {
    const result = fillForm(message.fields, message.pdfBlob);
    sendResponse(result);
    // Async: fill anything the regex pass left empty via AI Answers.
    // Fires after sendResponse so the popup's filled-fields list is
    // not blocked on the AI round-trip.
    runAIAnswersOnPage(message.job_context).catch(() => {});
  }
  if (message.type === "ATTACH_PDF") {
    attachPDFFromBlob(message.blob);
    sendResponse({ success: true });
  }
  if (message.type === "SCRAPE_JOB") {
    const details = scrapeJobDetails();
    sendResponse(details);
  }
  if (message.type === "EXTRACT_QUESTIONS") {
    const questions = extractFormQuestions();
    // Strip any non-serializable data before sending
    sendResponse(questions.map(({ _element, ...rest }) => rest));
  }
  if (message.type === "APPLY_AI_ANSWERS") {
    const filled = applyAIAnswers(message.answers);
    sendResponse({ success: true, filled });
  }
  if (message.type === "APPLY_MODE_START") {
    // Idempotent — initApplyMode's attach helpers all guard against
    // double-binding. Forces the observer to attach right away even when
    // the wizard opens inline without a navigation (Apple, modal flows).
    initApplyMode().catch(() => {});
    sendResponse({ success: true });
  }
  if (message.type === "APPLY_MODE_STOP") {
    stopApplyMode("popup-stopped");
    sendResponse({ success: true });
  }
});

// ─── Main fill logic ───
function fillForm(profileFields, pdfBlob) {
  const platform = detectPlatform();
  const platformSelectors = FIELD_MAPS[platform]?.selectors || {};
  const filledFields = [];

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
      filledFields.push(fieldEntry(el, fieldKey, value));
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
      filledFields.push(fieldEntry(input, matchedField, fields[matchedField]));
    }
  }

  // Phase 3: Handle <select> dropdowns
  const allSelects = document.querySelectorAll("select");
  for (const select of allSelects) {
    if (select.value && select.selectedIndex > 0) continue;
    const filled = fillSelect(select, fields);
    if (filled) {
      const opt = select.options[select.selectedIndex];
      filledFields.push(fieldEntry(select, getLabel(select) || select.name || select.id, opt ? opt.text : select.value));
    }
  }

  // Phase 4: Handle radio button groups
  fillRadioGroups(fields, filledFields);

  // Phase 5: Handle checkboxes (e.g., "I agree to receive text messages")
  fillCheckboxes(fields, filledFields);

  // Phase 6: Handle file upload (resume PDF)
  if (pdfBlob) {
    if (attachPDFFromBlob(pdfBlob)) {
      filledFields.push({ label: "Resume", value: "Resume.pdf", type: "file", selector: "input[type=file]" });
    }
  } else {
    // Try to find and fill any file input with a visual indicator
    const fileSelector = platformSelectors.resume || 'input[type="file"]';
    const fileInput = document.querySelector(fileSelector);
    if (fileInput) {
      highlightElement(fileInput, "#fef3c7"); // Yellow highlight to draw attention
    }
  }

  return { success: true, filled: filledFields.length, filledFields, platform };
}

function fieldEntry(el, label, value) {
  const tag = el.tagName ? el.tagName.toLowerCase() : "input";
  const type = el.type ? `${tag}:${el.type}` : tag;
  const labelStr = String(label || el.name || el.id || "field").trim().replace(/\s+/g, " ").slice(0, 80);
  let valueStr;
  if (el.tagName === "SELECT") {
    const opt = el.options[el.selectedIndex];
    valueStr = opt ? opt.text : String(value);
  } else {
    valueStr = String(value);
  }
  return {
    label: labelStr,
    value: valueStr.slice(0, 200),
    type,
    selector: cssPath(el),
  };
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

  // Try matching EEO/preference fields from stored profile prefs
  for (const [prefKey, pattern] of Object.entries(EEO_PATTERNS)) {
    if (pattern.test(searchText) && fields[prefKey]) {
      const storedValue = fields[prefKey];
      const displayMap = PREF_VALUE_MAP[prefKey];
      const displayValue = displayMap ? (displayMap[storedValue] || storedValue) : storedValue;
      // Try display value first, then stored value
      const matched = selectBestOption(select, displayValue) || selectBestOption(select, storedValue);
      if (matched) return true;
    }
  }

  // Try matching to common question patterns (fallback defaults)
  for (const [questionKey, pattern] of Object.entries(SELECT_PATTERNS)) {
    if (pattern.test(searchText)) {
      // Check if user has a stored preference that overrides the default
      if (questionKey === "work_setting" && fields.preferred_work_setting) {
        const displayMap = PREF_VALUE_MAP.preferred_work_setting;
        const val = displayMap[fields.preferred_work_setting] || fields.preferred_work_setting;
        const matched = selectBestOption(select, val);
        if (matched) return true;
      }

      const defaults = DEFAULT_ANSWERS[questionKey];
      if (defaults) {
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
  const normalize = (s) => s.toLowerCase().replace(/[\s\u00a0]+/g, " ").trim();
  const target = normalize(targetValue);
  const options = Array.from(select.options).filter((o) => o.value !== "" && !o.disabled);

  // Exact match (normalized)
  for (const opt of options) {
    if (normalize(opt.value) === target || normalize(opt.text) === target) {
      select.value = opt.value;
      triggerEvents(select);
      highlightElement(select);
      return true;
    }
  }

  // Partial/substring match
  for (const opt of options) {
    const optText = normalize(opt.text);
    const optVal = normalize(opt.value);
    if (optVal.includes(target) || optText.includes(target) ||
        target.includes(optVal) || target.includes(optText)) {
      select.value = opt.value;
      triggerEvents(select);
      highlightElement(select);
      return true;
    }
  }

  // Word overlap fallback — pick option with highest word overlap
  const targetWords = target.split(/\s+/).filter((w) => w.length > 2);
  if (targetWords.length > 0) {
    let bestOpt = null;
    let bestScore = 0;
    for (const opt of options) {
      const optWords = normalize(opt.text).split(/\s+/);
      const overlap = targetWords.filter((w) => optWords.some((ow) => ow.includes(w) || w.includes(ow))).length;
      const score = overlap / targetWords.length;
      if (score > bestScore && score >= 0.4) {
        bestScore = score;
        bestOpt = opt;
      }
    }
    if (bestOpt) {
      select.value = bestOpt.value;
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
function fillRadioGroups(fields, filledFields) {
  let filled = 0;
  const radioGroups = {};

  const recordRadio = (radio, questionLabel) => {
    if (filledFields) {
      filledFields.push({
        label: String(questionLabel || radio.name || "").trim().replace(/\s+/g, " ").slice(0, 80) || (radio.name || "radio"),
        value: (getLabel(radio) || radio.value || "").trim().slice(0, 200),
        type: "radio",
        selector: cssPath(radio),
      });
    }
  };

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
    const questionLabelDisplay = container
      ? container.textContent.trim().replace(/\s+/g, " ").slice(0, 80)
      : (getLabel(radios[0]) || groupName);

    let matched = false;

    // Try matching EEO/preference patterns from stored profile prefs
    for (const [prefKey, pattern] of Object.entries(EEO_PATTERNS)) {
      if (pattern.test(questionText) && fields[prefKey]) {
        const storedValue = fields[prefKey];
        const displayMap = PREF_VALUE_MAP[prefKey];
        const displayValue = displayMap ? (displayMap[storedValue] || storedValue) : storedValue;
        const radioMatch = radios.find((r) => {
          const rl = getLabel(r).toLowerCase();
          const rv = r.value.toLowerCase();
          const dv = displayValue.toLowerCase();
          const sv = storedValue.toLowerCase();
          return rl.includes(dv) || dv.includes(rl) || rv.includes(sv) || sv.includes(rv) ||
                 rl === dv || rv === sv;
        });
        if (radioMatch) {
          radioMatch.checked = true;
          triggerEvents(radioMatch);
          recordRadio(radioMatch, questionLabelDisplay);
          filled++;
          matched = true;
          break;
        }
      }
    }
    if (matched) continue;

    // Work authorization: select based on stored pref or default "Yes"
    if (SELECT_PATTERNS.work_authorization.test(questionText)) {
      const prefValue = fields.work_authorization || "yes";
      const target = prefValue === "no" ? "no" : "yes";
      const yesRadio = radios.find((r) => {
        const rv = r.value.toLowerCase();
        const rl = getLabel(r).toLowerCase();
        return rv === target || rl === target;
      });
      if (yesRadio) {
        yesRadio.checked = true;
        triggerEvents(yesRadio);
        recordRadio(yesRadio, questionLabelDisplay);
        filled++;
        continue;
      }
    }

    // Work setting preference
    if (SELECT_PATTERNS.work_setting.test(questionText)) {
      const prefs = fields.preferred_work_setting
        ? [fields.preferred_work_setting]
        : ["remote", "hybrid"];
      for (const pref of prefs) {
        const match = radios.find((r) =>
          r.value.toLowerCase().includes(pref) ||
          getLabel(r).includes(pref)
        );
        if (match) {
          match.checked = true;
          triggerEvents(match);
          recordRadio(match, questionLabelDisplay);
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
          recordRadio(match, questionLabelDisplay);
          filled++;
          break;
        }
      }
    }
  }

  return filled;
}

// ─── Fill checkboxes ───
function fillCheckboxes(fields, filledFields) {
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
        if (filledFields) {
          filledFields.push({
            label: labelText.trim().replace(/\s+/g, " ").slice(0, 80) || (cb.name || "checkbox"),
            value: "checked",
            type: "checkbox",
            selector: cssPath(cb),
          });
        }
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

// Cheap visibility test for the AI-question scan — skips hidden steps
// of multi-step wizards where the future fields are mounted but not yet
// shown.
function isVisibleInput(el) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return false;
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden";
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

// Build a short CSS-path-style selector for debugging/visibility.
function cssPath(el) {
  if (!el || !el.tagName) return "";
  if (el.id) return "#" + el.id;
  const tag = el.tagName.toLowerCase();
  if (el.name) return `${tag}[name="${el.name}"]`;
  const cls = (typeof el.className === "string" ? el.className : "")
    .trim()
    .split(/\s+/)
    .filter((c) => c && /^[a-zA-Z0-9_-]+$/.test(c))
    .slice(0, 2)
    .join(".");
  return cls ? `${tag}.${cls}` : tag;
}

// ─── PDF attachment via blob passed from background ───
// Returns true when the file was successfully assigned to the input,
// false when the browser couldn't accept it programmatically.
function attachPDFFromBlob(blobData) {
  const fileInputs = document.querySelectorAll('input[type="file"]');
  if (fileInputs.length === 0) return false;

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
    return true;
  } catch (e) {
    // DataTransfer may not be supported — highlight for manual upload
    highlightElement(target, "#fef3c7");
    return false;
  }
}

// ─── Platform detection ───
function detectPlatform() {
  for (const [name, platform] of Object.entries(FIELD_MAPS)) {
    if (platform.detect()) return name;
  }
  return "generic";
}

// ─── Extract form questions for AI answering ───
function extractFormQuestions() {
  const questions = [];
  let idx = 0;

  // Textareas — these are almost always open-ended questions
  document.querySelectorAll("textarea").forEach((el) => {
    if (el.value && el.value.trim().length > 10) return; // already answered
    const label = getLabel(el);
    if (!label || label.length < 5) return;
    questions.push({
      id: el.id || el.name || `textarea_${idx}`,
      question: label,
      type: "textarea",
      required: el.required || el.getAttribute("aria-required") === "true",
      _element: null, // stripped before sending to API
    });
    idx++;
  });

  // Text-like inputs — anything left empty after the regex pass goes to
  // the AI, regardless of whether it looks like a "question". This is
  // what catches LinkedIn URL, personal website, salary, custom company
  // questions, etc. The AI Answers endpoint already loads the user's
  // full profile + preferences, so it can map "LinkedIn URL" → the
  // stored linkedin_url just as well as it composes essay answers.
  const textInputSel =
    'input[type="text"]:not([type="hidden"]), input[type="email"], input[type="tel"], input[type="url"], input[type="number"], input:not([type])';
  document.querySelectorAll(textInputSel).forEach((el) => {
    if (el.value && el.value.trim()) return; // already filled
    if (!isVisibleInput(el)) return;
    const label = getLabel(el);
    if (!label || label.length < 3) return;
    questions.push({
      id: el.id || el.name || `text_${idx}`,
      question: label,
      type: "text",
      required: el.required || el.getAttribute("aria-required") === "true",
    });
    idx++;
  });

  // Unfilled selects (that weren't handled by basic fill)
  document.querySelectorAll("select").forEach((el) => {
    if (el.value && el.selectedIndex > 0) return; // already selected
    const label = getLabel(el);
    if (!label || label.length < 5) return;
    const options = Array.from(el.options)
      .filter((o) => o.value && !o.disabled && o.value !== "")
      .map((o) => o.text.trim());
    if (options.length === 0) return;
    questions.push({
      id: el.id || el.name || `select_${idx}`,
      question: label,
      type: "select",
      options,
      required: el.required || el.getAttribute("aria-required") === "true",
    });
    idx++;
  });

  // Unfilled radio groups
  const radioGroups = {};
  document.querySelectorAll('input[type="radio"]').forEach((radio) => {
    const name = radio.name;
    if (!name) return;
    if (!radioGroups[name]) radioGroups[name] = [];
    radioGroups[name].push(radio);
  });

  for (const [groupName, radios] of Object.entries(radioGroups)) {
    if (radios.some((r) => r.checked)) continue; // already answered
    const container = radios[0].closest("fieldset, .field, .form-group, [class*=question], [role=radiogroup]");
    const questionText = container ? container.querySelector("label, legend, [class*=label]")?.textContent?.trim() : getLabel(radios[0]);
    if (!questionText || questionText.length < 5) continue;
    const options = radios.map((r) => {
      const radioLabel = getLabel(r);
      return radioLabel || r.value;
    });
    questions.push({
      id: groupName,
      question: questionText,
      type: "radio",
      options,
      required: radios[0].required || radios[0].getAttribute("aria-required") === "true",
    });
    idx++;
  }

  // Unfilled checkboxes with question-like labels (skip consent ones already handled)
  document.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    if (cb.checked) return;
    const label = getLabel(cb);
    if (!label || label.length < 10) return;
    if (/agree.?to.?receive|opt.?in|i.?agree|i.?consent|i.?acknowledge/i.test(label)) return; // handled by basic fill
    questions.push({
      id: cb.id || cb.name || `checkbox_${idx}`,
      question: label,
      type: "checkbox",
      required: cb.required,
    });
    idx++;
  });

  return questions;
}

// ─── Apply AI-generated answers to the form ───
function applyAIAnswers(answers) {
  let filled = 0;

  for (const { id, answer } of answers) {
    if (!answer) continue;

    // Try to find the element by id, name, or our indexed ids
    let element = document.getElementById(id) || document.querySelector(`[name="${id}"]`);

    // For textareas and text inputs
    if (element && (element.tagName === "TEXTAREA" || element.tagName === "INPUT")) {
      if (element.type === "checkbox") {
        const shouldCheck = /^true$/i.test(answer);
        if (shouldCheck !== element.checked) {
          element.checked = shouldCheck;
          triggerEvents(element);
          highlightElement(element, "#ede9fe");
          filled++;
        }
      } else {
        setFieldValue(element, answer);
        highlightElement(element, "#ede9fe"); // Purple tint for AI answers
        filled++;
      }
      continue;
    }

    // For selects
    if (element && element.tagName === "SELECT") {
      const matched = selectBestOption(element, answer);
      if (matched) {
        highlightElement(element, "#ede9fe");
        filled++;
      }
      continue;
    }

    // For radio groups (id is the group name)
    const radios = document.querySelectorAll(`input[type="radio"][name="${id}"]`);
    if (radios.length > 0) {
      const answerLower = answer.toLowerCase();
      for (const radio of radios) {
        const radioLabel = getLabel(radio).toLowerCase();
        const radioValue = radio.value.toLowerCase();
        if (radioLabel.includes(answerLower) || answerLower.includes(radioLabel) ||
            radioValue.includes(answerLower) || answerLower.includes(radioValue) ||
            radioLabel === answerLower || radioValue === answerLower) {
          radio.checked = true;
          triggerEvents(radio);
          highlightElement(radio.closest("label") || radio, "#ede9fe");
          filled++;
          break;
        }
      }
      continue;
    }

    // Fallback: try matching by indexed id pattern (textarea_0, text_1, select_2, etc.)
    const idxMatch = id.match(/^(textarea|text|select|checkbox)_(\d+)$/);
    if (idxMatch) {
      const [, elType, idxStr] = idxMatch;
      const idx = parseInt(idxStr);
      let els;
      if (elType === "textarea") els = document.querySelectorAll("textarea");
      else if (elType === "text") els = document.querySelectorAll('input[type="text"], input:not([type])');
      else if (elType === "select") els = document.querySelectorAll("select");
      else if (elType === "checkbox") els = document.querySelectorAll('input[type="checkbox"]');

      // Count to the right index (skipping already-filled ones as we did during extraction)
      if (els) {
        let count = 0;
        for (const el of els) {
          // Match the same filtering logic from extractFormQuestions
          if (elType === "textarea" && el.value && el.value.trim().length > 10) continue;
          if ((elType === "text") && el.value && el.value.trim()) continue;
          if (elType === "select" && el.selectedIndex > 0) continue;
          if (elType === "checkbox" && el.checked) continue;

          if (count === idx) {
            if (elType === "select") {
              selectBestOption(el, answer);
            } else if (elType === "checkbox") {
              el.checked = /^true$/i.test(answer);
              triggerEvents(el);
            } else {
              setFieldValue(el, answer);
            }
            highlightElement(el, "#ede9fe");
            filled++;
            break;
          }
          count++;
        }
      }
    }
  }

  return filled;
}

// ─── Scrape job details from the page ───
function scrapeJobDetails() {
  const details = {
    job_title: null,
    company_name: null,
    description: null,
    location: null,
    remote_type: null,
  };

  // Title: structured data > OG tag > h1
  const ldJson = document.querySelector('script[type="application/ld+json"]');
  if (ldJson) {
    try {
      const ld = JSON.parse(ldJson.textContent);
      const posting = ld["@type"] === "JobPosting" ? ld : ld["@graph"]?.find((n) => n["@type"] === "JobPosting");
      if (posting) {
        details.job_title = posting.title || null;
        details.company_name = posting.hiringOrganization?.name || null;
        details.description = posting.description
          ? posting.description.replace(/<[^>]*>/g, " ").substring(0, 3000)
          : null;
        details.location = posting.jobLocation?.address?.addressLocality || null;
        if (posting.jobLocationType === "TELECOMMUTE") details.remote_type = "remote";
      }
    } catch {
      // ignore
    }
  }

  // Fallback: OG tags
  if (!details.job_title) {
    const og = document.querySelector('meta[property="og:title"]');
    if (og) details.job_title = og.content;
  }

  // Fallback: page title
  if (!details.job_title) {
    details.job_title = document.title.split("|")[0].split("-")[0].trim() || document.title;
  }

  // Fallback: company from domain or meta
  if (!details.company_name) {
    const ogSite = document.querySelector('meta[property="og:site_name"]');
    if (ogSite) {
      details.company_name = ogSite.content;
    } else {
      details.company_name = window.location.hostname.replace("www.", "").split(".")[0];
      // Capitalize
      details.company_name = details.company_name.charAt(0).toUpperCase() + details.company_name.slice(1);
    }
  }

  // Fallback: description from ATS-specific selectors
  if (!details.description) {
    const descSelectors = [
      ".job-description",
      '[class*="job-description"]',
      '[class*="jobDescription"]',
      '[data-automation-id="jobDescription"]',
      "#job-description",
      ".posting-page .content",
      ".description .content",
      '[class*="posting-description"]',
      "article",
    ];
    for (const sel of descSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim().length > 50) {
        details.description = el.textContent.trim().substring(0, 3000);
        break;
      }
    }
  }

  // Location fallback: look for location elements
  if (!details.location) {
    const locSelectors = [
      '[class*="location"]',
      '[class*="Location"]',
      '[data-automation-id="locations"]',
      ".posting-categories .location",
    ];
    for (const sel of locSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim().length < 100) {
        details.location = el.textContent.trim();
        break;
      }
    }
  }

  return details;
}

// ─── Auth token listener (from bridge page) ───
// Only accept tokens posted from the rezm.ai auth bridge — never from arbitrary
// third-party pages. Both source-window and origin are verified.
const TRUSTED_AUTH_ORIGIN = "https://rezm.ai";

// Tag the rezm.ai dashboard so the in-app "Install the extension" prompt
// can auto-hide for users who already have the extension. Best-effort —
// any host that ends in rezm.ai (or is rezm.ai itself) gets the marker.
(function markExtensionPresent() {
  try {
    const host = window.location.hostname;
    if (host === "rezm.ai" || host.endsWith(".rezm.ai")) {
      document.documentElement.setAttribute("data-rezmai-extension", "1");
    }
  } catch {
    // ignore — content script may run before document.documentElement exists
  }
})();

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.origin !== TRUSTED_AUTH_ORIGIN) return;
  if (event.data?.type !== "REZMAI_AUTH_TOKEN") return;
  if (typeof event.data.token !== "string" || !event.data.token) return;

  chrome.runtime.sendMessage({
    type: "SAVE_TOKEN",
    token: event.data.token,
    user: event.data.user,
    expires_at: event.data.expires_at,
  });
});

// ─── Auto-apply: URL param handler ───
// When a job page is opened with ?rezm_auto_apply=<candidate_id>, pull the
// pre-drafted fields + AI answers from the API, fill the form, and show a
// review bar. Submission stays user-initiated (user clicks the page's Submit).
const REZMAI_API_BASE = "https://rezm.ai";

(function initAutoApply() {
  try {
    const params = new URLSearchParams(window.location.search);
    const candidateId = params.get("rezm_auto_apply");
    if (!candidateId) return;

    // Wait for page to settle before running
    const start = () => runAutoApply(candidateId).catch((err) => {
      console.warn("[rezm.ai] auto-apply failed:", err);
      showAutoApplyToast("Auto-apply failed: " + (err.message || err));
    });

    if (document.readyState === "complete") {
      setTimeout(start, 800);
    } else {
      window.addEventListener("load", () => setTimeout(start, 800), { once: true });
    }
  } catch (err) {
    console.warn("[rezm.ai] auto-apply init error:", err);
  }
})();

async function runAutoApply(candidateId) {
  const token = await getStoredToken();
  if (!token) {
    showAutoApplyToast(
      "Connect the rezm.ai extension first (click the extension icon).",
      true
    );
    return;
  }

  const res = await fetch(`${REZMAI_API_BASE}/api/extension/candidate/${candidateId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`candidate fetch ${res.status}`);
  }
  const data = await res.json();

  // Fetch resume PDF as blob (optional — not all pages need the upload)
  let pdfBlob = null;
  if (data.resume_pdf_url) {
    try {
      const pdfRes = await fetch(`${REZMAI_API_BASE}${data.resume_pdf_url}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (pdfRes.ok) {
        const buf = await pdfRes.arrayBuffer();
        // Convert to structure fillForm expects (see attachPDFFromBlob)
        pdfBlob = {
          data: Array.from(new Uint8Array(buf)),
          type: "application/pdf",
          name: "resume.pdf",
        };
      }
    } catch (err) {
      console.warn("[rezm.ai] resume PDF fetch failed:", err);
    }
  }

  // Fill standard fields via existing logic
  const filled = fillForm(data.fields, pdfBlob);

  // Match AI answers to detected form questions by text similarity
  let answersFilled = 0;
  if (Array.isArray(data.ai_answers) && data.ai_answers.length > 0) {
    const formQuestions = extractFormQuestions();
    const matched = matchAnswersToQuestions(data.ai_answers, formQuestions);
    if (matched.length > 0) {
      const result = applyAIAnswers(matched);
      answersFilled = typeof result === "number" ? result : (result?.filled ?? matched.length);
    }
  }

  showAutoApplyBar(candidateId, filled, answersFilled, data);
}

function getStoredToken() {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: "GET_TOKEN" }, (resp) => {
        if (!resp || !resp.token) {
          resolve(null);
          return;
        }
        if (resp.expires_at && Date.now() / 1000 > resp.expires_at) {
          resolve(null);
          return;
        }
        resolve(resp.token);
      });
    } catch {
      resolve(null);
    }
  });
}

function normalizeText(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchAnswersToQuestions(preDrafted, formQuestions) {
  const out = [];
  const used = new Set();
  for (const { question, answer } of preDrafted) {
    if (!answer || answer === "[needs user input]") continue;
    const nq = normalizeText(question);
    let best = null;
    let bestScore = 0;
    for (const fq of formQuestions) {
      if (used.has(fq.id)) continue;
      const label = normalizeText(fq.label || fq.question || "");
      const score = similarity(nq, label);
      if (score > bestScore) {
        bestScore = score;
        best = fq;
      }
    }
    if (best && bestScore >= 0.4) {
      used.add(best.id);
      out.push({ id: best.id, answer });
    }
  }
  return out;
}

function similarity(a, b) {
  if (!a || !b) return 0;
  const aWords = new Set(a.split(" ").filter((w) => w.length > 2));
  const bWords = new Set(b.split(" ").filter((w) => w.length > 2));
  if (aWords.size === 0 || bWords.size === 0) return 0;
  let overlap = 0;
  for (const w of aWords) if (bWords.has(w)) overlap++;
  return overlap / Math.min(aWords.size, bWords.size);
}

function showAutoApplyBar(candidateId, fieldCount, answerCount, data) {
  if (document.getElementById("rezmai-auto-apply-bar")) return;

  const bar = document.createElement("div");
  bar.id = "rezmai-auto-apply-bar";
  bar.style.cssText = [
    "position:fixed",
    "bottom:16px",
    "right:16px",
    "z-index:2147483647",
    "background:#111827",
    "color:#fff",
    "border-radius:12px",
    "padding:14px 18px",
    "box-shadow:0 10px 30px rgba(0,0,0,0.25)",
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    "font-size:13px",
    "max-width:360px",
  ].join(";");

  const company = data?.fields?.current_company || "";
  const msg = [
    `<div style="font-weight:600;margin-bottom:4px">rezm.ai auto-apply</div>`,
    `<div style="opacity:0.85;margin-bottom:8px">Filled ${fieldCount} field${fieldCount === 1 ? "" : "s"}${answerCount > 0 ? ` and ${answerCount} answer${answerCount === 1 ? "" : "s"}` : ""}. Review and click Submit when ready.${company ? "" : ""}</div>`,
    `<div style="display:flex;gap:8px">`,
    `<button id="rezmai-aa-dismiss" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.3);padding:6px 10px;border-radius:6px;cursor:pointer;font-size:12px">Dismiss</button>`,
    `</div>`,
  ].join("");
  bar.innerHTML = msg;
  document.body.appendChild(bar);

  bar.querySelector("#rezmai-aa-dismiss").addEventListener("click", () => bar.remove());

  // Hook the page's submit button(s): when user clicks, flag candidate as submitted.
  // Using capture phase so we run before the page's own handler.
  const hookSubmit = () => {
    document.addEventListener(
      "click",
      (e) => {
        const t = e.target;
        if (!t || !(t instanceof HTMLElement)) return;
        const btn = t.closest('button[type="submit"], input[type="submit"], button.application-form-submit, button[data-testid*="submit"], button[aria-label*="Submit"]');
        if (!btn) return;
        // Fire-and-forget; don't block the real submission
        markCandidateSubmitted(candidateId).catch((err) =>
          console.warn("[rezm.ai] mark-submitted failed:", err)
        );
      },
      true
    );
  };
  hookSubmit();
}

function showAutoApplyToast(message, isError) {
  const el = document.createElement("div");
  el.style.cssText = [
    "position:fixed",
    "bottom:16px",
    "right:16px",
    "z-index:2147483647",
    `background:${isError ? "#991b1b" : "#111827"}`,
    "color:#fff",
    "border-radius:8px",
    "padding:10px 14px",
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    "font-size:13px",
    "max-width:360px",
  ].join(";");
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 6000);
}

// ─── AI Answers (auto, in-page) ───
// Run /api/extension/ai-answers from the content script after every
// fillForm so any field the regex pass missed (LinkedIn URL, custom
// questions, free-text essays, exotic dropdowns) gets a second pass
// from Claude. The endpoint is Premium-gated — on 403 we silently
// no-op so free-tier users see no error.
let aiAnswersInFlight = false;

async function runAIAnswersOnPage(jobContext) {
  if (aiAnswersInFlight) return 0;
  aiAnswersInFlight = true;
  try {
    const token = await getStoredToken();
    if (!token) return 0;
    const rawQuestions = extractFormQuestions();
    const questions = rawQuestions.map(({ _element, ...rest }) => rest);
    if (questions.length === 0) return 0;

    const ctx = jobContext || {
      job_title: document.title,
      company_name: window.location.hostname,
    };
    const res = await fetch(`${REZMAI_API_BASE}/api/extension/ai-answers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ questions, job_context: ctx }),
    });
    if (!res.ok) return 0; // 403 (free tier), 429, etc. — silently skip
    const data = await res.json();
    if (!Array.isArray(data.answers) || data.answers.length === 0) return 0;
    const filled = applyAIAnswers(data.answers);
    return filled || 0;
  } catch {
    return 0;
  } finally {
    aiAnswersInFlight = false;
  }
}

async function markCandidateSubmitted(candidateId) {
  const token = await getStoredToken();
  if (!token) return;
  await fetch(
    `${REZMAI_API_BASE}/api/auto-apply/candidates/${candidateId}/mark-submitted`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

// ─── Apply Mode ───
// Once the user runs Auto-Fill or Smart Tailor, popup.js writes a
// per-tab cache via background.js. This script reads that cache and
// keeps the form filled as the user navigates a multi-step wizard
// (Apple Careers, Workday, iCIMS, etc.). It is safe-by-default — the
// existing skip-if-non-empty checks inside fillForm mean we never
// overwrite anything the user has typed.
let applyModeState = null;          // cached { fields, resume_pdf_url, ... }
let applyModePdfBytes = null;       // bytes of the resume PDF, fetched lazily
let applyModeLastFireMs = 0;        // cooldown anchor — at most one fire/s
let applyModeFillTimer = null;      // debounce timer
let applyModeIdleTimer = null;      // 30-min idle auto-stop
let applyModeObserver = null;
let applyModeSubmitHandler = null;  // capture-phase click listener (see below)
let applyModeNavHandler = null;     // popstate listener
let applyModeOriginalPushState = null;
let applyModeOriginalReplaceState = null;
let applyModeShadowRoot = null;     // ShadowRoot for the on-page banner (CSS isolation)

const APPLY_MODE_DEBOUNCE_MS = 500;
const APPLY_MODE_COOLDOWN_MS = 1000;
const APPLY_MODE_IDLE_MS = 30 * 60 * 1000; // auto-stop after 30 min of no fills

function getApplyModeState() {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: "GET_APPLY_MODE" }, (resp) => {
        if (chrome.runtime.lastError) resolve(null);
        else resolve(resp || null);
      });
    } catch {
      resolve(null);
    }
  });
}

async function initApplyMode() {
  const state = await getApplyModeState();
  if (!state || !state.fields) return;
  // Origin guard: if the user navigated to a different site after caching,
  // drop the cached state — don't risk filling the wrong app with this
  // profile. Clear from storage too so the cache doesn't linger until
  // the tab closes.
  if (state.urlOrigin && state.urlOrigin !== window.location.origin) {
    try { chrome.runtime.sendMessage({ type: "CLEAR_APPLY_MODE" }, () => {}); } catch {}
    return;
  }
  // Idle timeout survives page reloads — if the cache is stale by more
  // than the idle window, auto-stop and clear before doing any work.
  if (state.lastFillAt && Date.now() - state.lastFillAt > APPLY_MODE_IDLE_MS) {
    try { chrome.runtime.sendMessage({ type: "CLEAR_APPLY_MODE" }, () => {}); } catch {}
    return;
  }

  applyModeState = state;
  attachApplyModeObserver();
  attachApplyModeSubmitGuard();
  attachApplyModeNavGuard();
  bumpApplyModeIdleTimer();
  renderApplyModeBanner();
  // Schedule one initial check in case the page already mounted form
  // fields (e.g., the user navigated to step 2 within the same tab).
  scheduleApplyModeFill();
}

function attachApplyModeObserver() {
  if (applyModeObserver) return;
  applyModeObserver = new MutationObserver(() => scheduleApplyModeFill());
  applyModeObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function scheduleApplyModeFill() {
  if (!applyModeState) return;
  if (applyModeFillTimer) clearTimeout(applyModeFillTimer);
  applyModeFillTimer = setTimeout(runApplyModeFill, APPLY_MODE_DEBOUNCE_MS);
}

async function runApplyModeFill() {
  applyModeFillTimer = null;
  if (!applyModeState) return;

  // Cooldown: never re-fire within COOLDOWN_MS of the last fill — keeps
  // the observer from chasing its own tail when a fill mutates the DOM.
  const now = Date.now();
  const wait = APPLY_MODE_COOLDOWN_MS - (now - applyModeLastFireMs);
  if (wait > 0) {
    applyModeFillTimer = setTimeout(runApplyModeFill, wait);
    return;
  }

  // Skip cheaply when there is nothing to do.
  if (!hasEmptyFillableFields()) return;

  applyModeLastFireMs = now;

  // Fetch the PDF on demand the first time a file input appears in the
  // wizard. Cached afterwards so subsequent steps don't re-download.
  let pdfBlob = applyModePdfBytes;
  if (!pdfBlob && document.querySelector('input[type="file"]') && applyModeState.resume_pdf_url) {
    pdfBlob = await fetchApplyModePdfBytes(applyModeState.resume_pdf_url);
    if (pdfBlob) applyModePdfBytes = pdfBlob;
  }

  const result = fillForm(applyModeState.fields, pdfBlob || null);
  if (result?.filled > 0) {
    applyModeState.fillCount = (applyModeState.fillCount || 0) + 1;
    applyModeState.totalFilled = (applyModeState.totalFilled || 0) + result.filled;
    applyModeState.lastFillAt = now;
    if (Array.isArray(result.filledFields) && result.filledFields.length > 0) {
      // Latest step's fields — what the user sees in the popup if they
      // close and reopen mid-wizard. Cumulative counts stay on the
      // on-page banner.
      applyModeState.lastFilledFields = result.filledFields;
    }
    persistApplyModeState();
    renderApplyModeBanner();
    bumpApplyModeIdleTimer();
  }

  // Run AI Answers on whatever the regex pass left empty — same auto-
  // trigger as the popup-driven path, but fired per wizard step so
  // each new mount of fields gets the AI second pass too.
  runAIAnswersOnPage({
    job_title: applyModeState.jobTitle,
    company_name: applyModeState.companyName,
  }).catch(() => {});
}

function persistApplyModeState() {
  if (!applyModeState) return;
  try {
    chrome.runtime.sendMessage({ type: "SET_APPLY_MODE", data: applyModeState }, () => {});
  } catch {
    // best-effort — banner state stays in-memory regardless
  }
}

function hasEmptyFillableFields() {
  // Text-like inputs and textareas
  const textInputs = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea'
  );
  for (const el of textInputs) {
    if (!el.value || !el.value.trim()) return true;
  }
  // Selects with no chosen option
  for (const sel of document.querySelectorAll("select")) {
    if (!sel.value || sel.selectedIndex <= 0) return true;
  }
  // File inputs without an attached file
  for (const file of document.querySelectorAll('input[type="file"]')) {
    if (!file.files || file.files.length === 0) return true;
  }
  // Radio groups with nothing selected
  const radios = document.querySelectorAll('input[type="radio"]');
  const groups = new Set();
  for (const r of radios) if (r.name) groups.add(r.name);
  for (const name of groups) {
    let any = false;
    for (const r of document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)) {
      if (r.checked) { any = true; break; }
    }
    if (!any) return true;
  }
  return false;
}

async function fetchApplyModePdfBytes(pdfUrl) {
  try {
    const token = await getStoredToken();
    if (!token) return null;
    const url = pdfUrl.startsWith("http") ? pdfUrl : `${REZMAI_API_BASE}${pdfUrl}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return Array.from(new Uint8Array(buf));
  } catch {
    return null;
  }
}

// ─── Apply Mode banner ───
// Read the visible step indicator (e.g. "Step 2 of 4") for cosmetic
// display only. Returns null when nothing usable is detected.
function detectStepLabel() {
  // ARIA progressbar with valuenow/valuemax
  const bar = document.querySelector('[role="progressbar"][aria-valuenow]');
  if (bar) {
    const now = bar.getAttribute("aria-valuenow");
    const max = bar.getAttribute("aria-valuemax");
    if (now && max && Number(max) > 1) return `step ${now} of ${max}`;
  }
  // aria-current="step" inside an ordered list (Workday, modern wizards)
  const current = document.querySelector('[aria-current="step"]');
  if (current) {
    const list = current.closest("ol, ul, [role='list']");
    if (list) {
      const items = list.querySelectorAll("li, [role='listitem']");
      if (items.length > 1) {
        const idx = Array.from(items).indexOf(current.closest("li, [role='listitem']")) + 1;
        if (idx > 0) return `step ${idx} of ${items.length}`;
      }
    }
  }
  // Step indicator class with li/.step children
  const stepIndicator = document.querySelector(
    ".steps, .step-indicator, .wizard-progress, .progress-steps, [class*='stepper']"
  );
  if (stepIndicator) {
    const items = stepIndicator.querySelectorAll("li, .step, [class*='step-item']");
    if (items.length > 1) {
      const activeIdx = Array.from(items).findIndex((el) =>
        /(^|\s)(active|current|is-active|is-current|step--current)(\s|$)/.test(el.className || "")
      );
      if (activeIdx >= 0) return `step ${activeIdx + 1} of ${items.length}`;
      return `${items.length} steps`;
    }
  }
  // Fallback: scan visible heading text for "Step N of M"
  const headings = document.querySelectorAll("h1, h2, h3, [aria-live]");
  for (const h of headings) {
    const txt = (h.textContent || "").trim();
    const m = /step\s+(\d+)\s+(?:of|\/)\s+(\d+)/i.exec(txt);
    if (m) return `step ${m[1]} of ${m[2]}`;
  }
  return null;
}

function renderApplyModeBanner() {
  if (!applyModeState) return;

  // Mount once; subsequent calls just re-paint the inner content. The
  // banner lives in a closed Shadow DOM so the host page's CSS (Apple,
  // Workday, etc.) cannot touch it. This was needed because some sites
  // ship aggressive resets like `* { line-height: 0 }` that collapsed
  // the banner's text on top of itself.
  let host = document.getElementById("rezmai-apply-mode-host");
  let shadow;
  if (!host) {
    host = document.createElement("div");
    host.id = "rezmai-apply-mode-host";
    host.style.cssText = [
      "all:initial",
      "position:fixed",
      "bottom:16px",
      "right:16px",
      "z-index:2147483646",
    ].join(";") + ";";
    shadow = host.attachShadow({ mode: "closed" });
    applyModeShadowRoot = shadow;
    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; }
      * { box-sizing: border-box; }
      .bar {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color: #fff;
        background: #0f172a;
        border: 1px solid rgba(124, 58, 237, 0.6);
        border-radius: 12px;
        padding: 12px 14px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        max-width: 340px;
        min-width: 240px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 6px 0;
        line-height: 1.4;
      }
      .row + .row { margin-top: 0; }
      .dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #7c3aed;
        box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.25);
        flex-shrink: 0;
      }
      .label { font-weight: 700; }
      .sep { opacity: 0.5; }
      .company {
        opacity: 0.85;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
        flex: 1;
      }
      .title {
        opacity: 0.75;
        margin: 0 0 6px 0;
        line-height: 1.4;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .stats {
        opacity: 0.85;
        margin: 0 0 8px 0;
        line-height: 1.4;
      }
      .actions { display: flex; gap: 6px; margin: 0; padding: 0; }
      button.stop {
        appearance: none;
        background: transparent;
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.3);
        padding: 5px 10px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 600;
        font-family: inherit;
        line-height: 1.2;
      }
      button.stop:hover { background: rgba(255, 255, 255, 0.08); }
    `;
    shadow.appendChild(style);
    const root = document.createElement("div");
    root.className = "bar";
    shadow.appendChild(root);
    document.body.appendChild(host);
  } else {
    shadow = applyModeShadowRoot;
  }

  const company = applyModeState.companyName || "this job";
  const title = applyModeState.jobTitle || "";
  const stepLabel = detectStepLabel();
  const fillCount = applyModeState.fillCount || 0;
  const totalFilled = applyModeState.totalFilled || 0;
  const root = shadow.querySelector(".bar");
  if (!root) return;

  root.innerHTML = `
    <div class="row">
      <span class="dot"></span>
      <span class="label">Apply Mode</span>
      <span class="sep">·</span>
      <span class="company">${escapeBannerText(company)}</span>
    </div>
    ${title ? `<div class="title">${escapeBannerText(title)}</div>` : ""}
    <div class="stats">
      ${stepLabel ? `${escapeBannerText(stepLabel)} · ` : ""}${fillCount} fill${fillCount === 1 ? "" : "s"}${totalFilled ? ` · ${totalFilled} field${totalFilled === 1 ? "" : "s"} total` : ""}
    </div>
    <div class="actions">
      <button type="button" class="stop">Stop Apply Mode</button>
    </div>
  `;
  const stopBtn = root.querySelector("button.stop");
  if (stopBtn) stopBtn.addEventListener("click", () => stopApplyMode("user-stopped"));
}

function escapeBannerText(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function removeApplyModeBanner() {
  const host = document.getElementById("rezmai-apply-mode-host");
  if (host) host.remove();
  applyModeShadowRoot = null;
  // Tidy up any old DOM left behind by a pre-Shadow-DOM build of the
  // extension if it's still mounted in this tab.
  const legacy = document.getElementById("rezmai-apply-mode-bar");
  if (legacy) legacy.remove();
}

function bumpApplyModeIdleTimer() {
  if (applyModeIdleTimer) clearTimeout(applyModeIdleTimer);
  applyModeIdleTimer = setTimeout(
    () => stopApplyMode("idle-timeout"),
    APPLY_MODE_IDLE_MS
  );
}

// Capture-phase click listener that ends Apply Mode when the user
// triggers an "actually submit the application" button. We deliberately
// only match strong text/data-testid signals to avoid stopping on a
// "Next" or "Save Draft" click.
function attachApplyModeSubmitGuard() {
  if (applyModeSubmitHandler) return;
  applyModeSubmitHandler = (e) => {
    if (!applyModeState) return;
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const btn = t.closest('button, input[type="submit"], a[role="button"]');
    if (!btn) return;
    const txt = (btn.textContent || btn.value || btn.getAttribute("aria-label") || "")
      .trim()
      .toLowerCase();
    const testid = (btn.getAttribute("data-testid") || "").toLowerCase();
    const isFinalSubmit =
      /submit\s+(?:my\s+)?application/.test(txt) ||
      /send\s+(?:my\s+)?application/.test(txt) ||
      /(?:finish|complete)\s+(?:my\s+)?application/.test(txt) ||
      /submit-application|send-application|application-submit/.test(testid);
    if (!isFinalSubmit) return;
    // Fire-and-forget — don't block the real click handler.
    setTimeout(() => stopApplyMode("application-submitted"), 0);
  };
  document.addEventListener("click", applyModeSubmitHandler, true);
}

function detachApplyModeSubmitGuard() {
  if (applyModeSubmitHandler) {
    document.removeEventListener("click", applyModeSubmitHandler, true);
    applyModeSubmitHandler = null;
  }
}

// SPA route changes don't reload the content script, so we listen for
// pushState/replaceState/popstate and re-check origin. Same-origin
// navigations (typical wizard step transitions) are left alone.
function attachApplyModeNavGuard() {
  if (applyModeNavHandler) return;
  const checkOrigin = () => {
    if (!applyModeState) return;
    if (
      applyModeState.urlOrigin &&
      applyModeState.urlOrigin !== window.location.origin
    ) {
      stopApplyMode("cross-origin-nav");
    }
  };
  applyModeNavHandler = checkOrigin;
  window.addEventListener("popstate", applyModeNavHandler);
  applyModeOriginalPushState = history.pushState;
  applyModeOriginalReplaceState = history.replaceState;
  history.pushState = function (...args) {
    const r = applyModeOriginalPushState.apply(this, args);
    try { checkOrigin(); } catch {}
    return r;
  };
  history.replaceState = function (...args) {
    const r = applyModeOriginalReplaceState.apply(this, args);
    try { checkOrigin(); } catch {}
    return r;
  };
}

function detachApplyModeNavGuard() {
  if (applyModeNavHandler) {
    window.removeEventListener("popstate", applyModeNavHandler);
    applyModeNavHandler = null;
  }
  if (applyModeOriginalPushState) {
    history.pushState = applyModeOriginalPushState;
    applyModeOriginalPushState = null;
  }
  if (applyModeOriginalReplaceState) {
    history.replaceState = applyModeOriginalReplaceState;
    applyModeOriginalReplaceState = null;
  }
}

function stopApplyMode(reason) {
  applyModeState = null;
  applyModePdfBytes = null;
  if (applyModeFillTimer) {
    clearTimeout(applyModeFillTimer);
    applyModeFillTimer = null;
  }
  if (applyModeIdleTimer) {
    clearTimeout(applyModeIdleTimer);
    applyModeIdleTimer = null;
  }
  if (applyModeObserver) {
    applyModeObserver.disconnect();
    applyModeObserver = null;
  }
  detachApplyModeSubmitGuard();
  detachApplyModeNavGuard();
  removeApplyModeBanner();
  try {
    chrome.runtime.sendMessage({ type: "CLEAR_APPLY_MODE" }, () => {});
  } catch {
    // tab may already be closing — best-effort
  }
  if (reason) console.info("[rezm.ai] Apply Mode stopped:", reason);
}

(function bootstrapApplyMode() {
  // Stagger slightly so platform-specific frameworks have time to mount
  // their initial DOM before we read it.
  const start = () => initApplyMode().catch(() => {});
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(start, 400);
  } else {
    window.addEventListener("DOMContentLoaded", () => setTimeout(start, 400), { once: true });
  }
})();
