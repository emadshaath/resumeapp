// field-maps.js — ATS-specific field selectors for major job application platforms

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
      location: '[name*="location"]',
    },
  },
  lever: {
    detect: () => !!document.querySelector(".application-form, .postings-btn-wrapper"),
    selectors: {
      full_name: 'input[name="name"]',
      email: 'input[name="email"]',
      phone: 'input[name="phone"]',
      resume: '.application-upload input[type="file"], input[type="file"]',
      linkedin: 'input[name="urls[LinkedIn]"]',
      website: 'input[name="urls[Portfolio]"], input[name="urls[Other]"]',
      current_company: 'input[name="org"]',
    },
  },
  workday: {
    detect: () =>
      !!document.querySelector('[data-automation-id="workday"], .css-1q2dra3') ||
      window.location.hostname.includes("myworkday") ||
      window.location.hostname.includes("workday"),
    selectors: {
      first_name: '[data-automation-id="legalNameSection_firstName"], input[aria-label*="First"]',
      last_name: '[data-automation-id="legalNameSection_lastName"], input[aria-label*="Last"]',
      email: '[data-automation-id="email"], input[aria-label*="Email"]',
      phone: '[data-automation-id="phone"], input[aria-label*="Phone"]',
      resume: 'input[type="file"]',
    },
  },
  icims: {
    detect: () =>
      !!document.querySelector(".iCIMS_MainWrapper") ||
      window.location.hostname.includes("icims"),
    selectors: {
      first_name: '[id*="FirstName"], input[name*="FirstName"]',
      last_name: '[id*="LastName"], input[name*="LastName"]',
      email: '[id*="Email"], input[name*="Email"]',
      phone: '[id*="Phone"], input[name*="Phone"]',
      resume: 'input[type="file"]',
    },
  },
  generic: {
    detect: () => true,
    selectors: {},
  },
};

/**
 * Detect which ATS platform the current page uses
 */
function detectPlatform() {
  for (const [name, platform] of Object.entries(FIELD_MAPS)) {
    if (name !== "generic" && platform.detect()) return name;
  }
  return "generic";
}

/**
 * Generic field matching — matches profile fields to form fields by
 * analyzing name, label, placeholder, and aria attributes
 */
const FIELD_PATTERNS = {
  first_name: /first.?name|given.?name|fname|vorname/i,
  last_name: /last.?name|family.?name|surname|lname|nachname/i,
  full_name: /^name$|full.?name|your.?name|applicant.?name/i,
  email: /e?.?mail|email.?address/i,
  phone: /phone|tel|mobile|cell/i,
  location: /location|city|address/i,
  current_title: /current.?title|job.?title|position/i,
  current_company: /current.?company|company|employer|organization/i,
  linkedin: /linkedin/i,
  website: /website|portfolio|url|homepage/i,
  headline: /headline|summary|objective|about/i,
  years_experience: /years?.?(?:of)?.?experience|experience.?years/i,
  education_summary: /education|degree|university|school/i,
  skills_summary: /skills|technologies|competencies/i,
};

// Exported for use in content.js
if (typeof module !== "undefined") {
  module.exports = { FIELD_MAPS, FIELD_PATTERNS, detectPlatform };
}
