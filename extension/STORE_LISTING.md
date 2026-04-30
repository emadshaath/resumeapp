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
Apply to more jobs in less time. rezm.ai Smart Apply fills out job applications for you, tailors your resume to each role with AI, and drafts thoughtful answers to open-ended questions — so you can focus on the interviews, not the paperwork.

What it does

One-click auto-fill — Completes the standard fields on any job application: name, email, phone, address, LinkedIn, portfolio, work authorization, years of experience, demographic/EEO questions, and more. Your resume PDF is attached automatically.

Smart Tailor & Fill — Reads the job posting from the page, uses AI to generate a resume variant matched to the role, shows a match score, and fills the form with the tailored version. The variant is saved to your dashboard for later.

AI Answer Remaining Questions — Detects the open-ended questions left on the page ("Why do you want to work here?", "Tell us about a challenge you overcame", custom screener questions) and drafts answers grounded in your profile and the job description. AI-written fields are highlighted so you can review before submitting.

Track every application — Save jobs to your rezm.ai dashboard in one click. Tracked jobs sync with status, company, title, and URL so nothing falls through the cracks.

Why install it

Save hours per week. A typical application takes 10–20 minutes to fill out by hand. Smart Apply gets you to Review & Submit in seconds.

Send a tailored resume every time. Generic resumes get ignored. AI-tailored variants match the keywords and priorities recruiters and ATS filters are looking for — without you rewriting from scratch.

Never stare at a blank essay box. Long-form questions are the #1 reason candidates abandon applications. AI drafts give you a strong starting point you can edit in seconds.

Works where you already apply. Compatible with most application platforms — standard HTML forms, modern career sites, and custom company portals.

You stay in control. The extension never clicks Submit for you. Every field is highlighted, every AI answer is marked for review, and you approve each application before it's sent.

Your data stays yours. The extension talks only to your rezm.ai account over HTTPS. It doesn't read pages you aren't applying on, and it doesn't sell or share your data.

How it works

Sign in once with your rezm.ai account from the extension popup.

Navigate to any job posting or application page.

Click Auto-Fill for standard fields, or Smart Tailor & Fill to generate a role-specific resume first.

Review the filled fields (highlighted green; AI answers highlighted purple), then click the site's own Submit button.
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
