# Chrome Web Store listing copy

This file is the source of truth for the rezm.ai Smart Apply extension's
Chrome Web Store listing. Edit here and copy-paste into the developer
dashboard at https://chrome.google.com/webstore/devconsole.

History note: a previous submission was rejected (Apr 30, 2026 — violation
type "Spam and Placement in the Store") for an excessive-keywords bullet
that listed eight ATS platform names by name. The current copy below
intentionally avoids platform-name stacking; if you want to mention one
or two illustrative platforms in a future update, do so in flowing prose,
not as a comma-separated list.

---

## Name

```
rezm.ai — Smart Apply
```

## Short description (132 char limit)

```
Auto-fill job applications with your rezm.ai profile. AI tailors your resume to each role and tracks every job you apply to.
```

## Detailed description

```
Apply to jobs faster, with less typing and a better-targeted resume for every role.

The rezm.ai Smart Apply extension reads your rezm.ai profile, fills application forms in one click, and attaches your resume PDF — no more copy-pasting your name, email, work history, or LinkedIn URL on every site.

What it does

• One-click Auto-Fill. Populates standard fields (contact info, location, work authorization, EEO questions, and more) using the data already in your profile.

• Smart Tailor & Fill. Generates a resume variant tailored to the specific job description before filling, and reports an honest match score so you know how well your background fits the role.

• Apply Mode for multi-step wizards. After your first click, the extension keeps filling fields as you move through each step of the application — resume upload, personal info, additional files, screening questions — without another click.

• AI answers for open-ended questions. For prompts like "Why this company?" the extension drafts a response from your real profile data and the job description. You review before submitting.

• Job tracking. Every application is saved to your rezm.ai dashboard with company, role, status, applied date, and the variant used. The extension detects duplicates so you don't track the same job twice.

• PDF preview. See the exact resume PDF that will be uploaded before you submit.

Works on standard HTML application forms and on major application platforms used across the industry. You stay in control — the extension only fills fields and attaches your resume; it never submits the application on your behalf.

A free rezm.ai account is required to sign in. Smart Tailor and AI-answered questions are included in the Pro and Premium plans.

Privacy: your profile data only leaves your browser to talk to rezm.ai's own servers. The extension never reads or transmits page content from sites unrelated to job applications.
```

## Category

`Productivity`

## Single purpose

```
Auto-fill job application forms with the user's stored rezm.ai profile and (optionally) an AI-tailored resume variant for the job, then track the application in the user's rezm.ai dashboard.
```

## Permission justifications

- **`activeTab`** — needed to read the current job-application page's form
  fields and write profile data into them at the user's request
  (popup-button click).
- **`storage`** — stores the user's authentication token (issued by
  rezm.ai after sign-in) and a per-tab Apply Mode cache
  (`chrome.storage.session`) so multi-step application wizards keep
  filling without requiring another popup click on each step.
- **Host permission `https://*.rezm.ai/*`** — the extension's only
  network counterpart. The popup, content script, and service worker
  all call rezm.ai endpoints (profile lookup, resume PDF, job
  tracking, AI answers) over HTTPS using the user's bearer token.
- **Content script `<all_urls>`** — application forms live on tens of
  thousands of unique career-site domains; we cannot enumerate them.
  The script only reads form fields and writes data when the user
  triggers Auto-Fill from the popup. It does not transmit page
  content to any server other than rezm.ai, and only for the
  application-form data the user has requested be filled.
