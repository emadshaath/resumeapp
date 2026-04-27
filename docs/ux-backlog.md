# Resumeapp UX Backlog

Prioritized fix list synthesized from three reviews. Items are grouped into three tiers by impact. Every entry references at least one file path so it can be picked up cold.

## Tier 1 — Mental-model unblockers

### 1. Restructure sidebar into Resume Hub + Job Applications groups
- **Problem**: Profile, Resume Builder, Variants, and Job Tracker are sidebar siblings. Users never see the producer-consumer pipeline, so every downstream feature feels disconnected.
- **Proposed fix**: Adopt the proposed sidebar grouping: Resume Hub (Profile and Contact, Resume Builder, Variants), Job Applications (Job Tracker, Quick Apply), Communications, Reviews and Insights. Add subtle visual nesting.
- **Affected files**:
  - `src/components/dashboard/sidebar.tsx`
- **Effort**: M
- **Impact**: H
- **Category**: IA

### 2. Rename "Smart Variants" to "Tailored Variants" with subtext
- **Problem**: "Smart Variants" reads as a marketing label and does not communicate that each variant is an AI-tailored copy tied to a job.
- **Proposed fix**: Rename to "Tailored Variants" with subtext "AI versions per job" in the sidebar entry.
- **Affected files**:
  - `src/components/dashboard/sidebar.tsx` (line 65)
- **Effort**: S
- **Impact**: H
- **Category**: Copy

### 3. Add a pipeline diagram to onboarding
- **Problem**: Onboarding teaches Smart Tailor and Variants but skips Resume Builder. Users land in Variants without understanding that variants snapshot from a base resume.
- **Proposed fix**: Add a single one-screen diagram (Profile to Sections to Blocks to Variants to Jobs) and a tour step covering Resume Builder.
- **Affected files**:
  - `src/components/onboarding/onboarding-client.tsx` (lines 854-961)
- **Effort**: M
- **Impact**: H
- **Category**: New UI

### 4. Split "Profile Theme" into "Accent Colors" and "Profile Layout"
- **Problem**: One tab labeled "Profile Theme" contains color (theme) and layout (template) controls — two unrelated concepts collapsed into one label.
- **Proposed fix**: Split into two subheadings or tabs: "Accent Colors" and "Profile Layout (Template)." Use "Accent" consistently across Profile and Onboarding.
- **Affected files**:
  - `src/app/(dashboard)/dashboard/profile/page.tsx` (line 190)
  - `src/components/profile/template-picker.tsx` (lines 116, 177)
  - `src/components/onboarding/onboarding-client.tsx` (lines 800-806)
- **Effort**: M
- **Impact**: H
- **Category**: Copy + IA

### 5. Rename "Application Preferences" tab
- **Problem**: The label suggests app-wide settings, but the tab actually configures Chrome-extension form prefill.
- **Proposed fix**: Rename to "Autofill Defaults (Chrome)" and add one-line help text describing the Chrome extension dependency.
- **Affected files**:
  - `src/app/(dashboard)/dashboard/profile/page.tsx`
- **Effort**: S
- **Impact**: M
- **Category**: Copy

### 6. Define "Block" inline on first use in Resume Builder
- **Problem**: "Block" appears in UI without definition. Users read it as paragraph or widget; it is actually a zone+type combo for PDF layout.
- **Proposed fix**: Either rename to "Layout slot" or add a one-sentence inline definition the first time the term appears, plus a hover tooltip elsewhere.
- **Affected files**:
  - Resume Builder components (3-pane builder area; section list and canvas)
- **Effort**: S
- **Impact**: M
- **Category**: Help text

### 7. Add a "Variant created — what next?" post-tailor modal
- **Problem**: After saving a Variant, users do not know whether to apply, edit further, or set as default. The flow exits silently.
- **Proposed fix**: Show a small modal or inline panel post-save with three CTAs: "View in Job Tracker," "Edit Variant," "Set as default."
- **Affected files**:
  - `src/components/variants/variant-diff.tsx`
  - `src/app/(dashboard)/dashboard/jobs/page.tsx` (JobDetailDrawer lines 1031-1058)
- **Effort**: M
- **Impact**: H
- **Category**: New UI

## Tier 2 — Lifecycle and reciprocity

### 8. Bidirectional Job <-> Variant navigation
- **Problem**: Job to Variant lives only in the JobDetailDrawer; Variant to Job is plain text. Users cannot traverse the join in either direction without context loss.
- **Proposed fix**: Add a "View Variants for this Job" link on the Job card and outside the drawer. Add a "Back to Job" button in variant detail.
- **Affected files**:
  - `src/app/(dashboard)/dashboard/jobs/page.tsx` (around line 870)
  - `src/app/(dashboard)/dashboard/variants/[id]/page.tsx`
- **Effort**: M
- **Impact**: H
- **Category**: New UI + IA

### 9. Stale-variant indicator after base edits
- **Problem**: Variants are frozen snapshots, but users edit the base expecting cascade. Variants drift out of sync silently.
- **Proposed fix**: Add a "Stale" badge on variants whose underlying base resume has changed since snapshot. Surface in variants list and on the variant detail page.
- **Affected files**:
  - `src/app/(dashboard)/dashboard/variants/page.tsx`
  - `src/app/(dashboard)/dashboard/variants/[id]/page.tsx`
- **Effort**: L
- **Impact**: H
- **Category**: New UI + Data model

### 10. "Refresh / Re-tailor" button on stale variants
- **Problem**: Even when users notice drift, there is no path to refresh a variant from the new base without re-running the entire AI flow from scratch.
- **Proposed fix**: Add a "Refresh from base" action on variant cards that re-runs the snapshot (and optionally the AI tailor) with confirmation. Warn that local edits will be replaced.
- **Affected files**:
  - `src/app/(dashboard)/dashboard/variants/[id]/page.tsx`
  - `src/components/variants/variant-diff.tsx`
- **Effort**: L
- **Impact**: H
- **Category**: New UI

### 11. Clone variant action
- **Problem**: Career-switcher persona builds 3+ variants and has to rerun the AI for near-duplicates. There is no "duplicate this variant."
- **Proposed fix**: Add "Clone" action to the variant card menu that copies snapshot, blocks_snapshot, and pdf_settings_snapshot under a new name.
- **Affected files**:
  - `src/app/(dashboard)/dashboard/variants/page.tsx`
  - `src/app/(dashboard)/dashboard/variants/[id]/page.tsx`
- **Effort**: M
- **Impact**: M
- **Category**: New UI

### 12. Variant comparison view
- **Problem**: Users cannot compare two variants side by side to decide which to use or which to clone.
- **Proposed fix**: Add a multi-select on the variants list with a "Compare" action that opens a side-by-side diff using the existing diff component.
- **Affected files**:
  - `src/app/(dashboard)/dashboard/variants/page.tsx`
  - `src/components/variants/variant-diff.tsx`
- **Effort**: L
- **Impact**: M
- **Category**: New UI

### 13. Orphan warning on Job delete
- **Problem**: Deleting a Job silently orphans linked Variants. Variants list shows them with a missing job reference and no path back.
- **Proposed fix**: On Job delete, if linked variants exist, show a confirmation listing affected variants with options: keep variants (unlink), delete variants, cancel.
- **Affected files**:
  - `src/app/(dashboard)/dashboard/jobs/page.tsx`
- **Effort**: M
- **Impact**: M
- **Category**: New UI

### 14. Orphan warning on Variant delete
- **Problem**: Deleting a Variant affects the linked Job's Quick Apply (falls back to base) without warning.
- **Proposed fix**: Confirmation dialog on Variant delete that names the linked Job and explains the Quick Apply fallback to base.
- **Affected files**:
  - `src/app/(dashboard)/dashboard/variants/page.tsx`
  - `src/app/(dashboard)/dashboard/variants/[id]/page.tsx`
- **Effort**: S
- **Impact**: M
- **Category**: Copy + New UI

### 15. Document the "default variant" concept
- **Problem**: The "default" badge appears with no explanation. Users do not know what "default" controls (PDF, Quick Apply, share link).
- **Proposed fix**: Add a tooltip on the default badge: "Used by PDF download and Quick Apply when no variant is selected." Mirror in variant settings UI.
- **Affected files**:
  - `src/app/(dashboard)/dashboard/variants/page.tsx`
  - `src/app/(dashboard)/dashboard/variants/[id]/page.tsx`
- **Effort**: S
- **Impact**: M
- **Category**: Help text

### 16. Rewrite Variants empty state to include Resume Builder prerequisite
- **Problem**: The empty state tells users to use Job Tracker but never mentions that a base resume must exist first.
- **Proposed fix**: Rewrite the empty state with two ordered steps: (1) Build your base resume in Resume Builder, (2) Add a job in Job Tracker, then tailor a variant. Link both.
- **Affected files**:
  - `src/app/(dashboard)/dashboard/variants/page.tsx` (lines 99-101)
- **Effort**: S
- **Impact**: M
- **Category**: Copy

### 17. Add Smart Tailor help text in JobDetailDrawer
- **Problem**: Smart Tailor is the only place to create variants but offers no explanation of what AI does, that users can edit before save, or that re-tailor replaces.
- **Proposed fix**: Add help text in the drawer explaining: AI rewrites your base resume for this job, you can edit before saving, re-running replaces the prior variant.
- **Affected files**:
  - `src/app/(dashboard)/dashboard/jobs/page.tsx` (JobDetailDrawer lines 1031-1058)
- **Effort**: S
- **Impact**: H
- **Category**: Help text

## Tier 3 — Polish and clarity

### 18. Save-confirmation state in long-form editors
- **Problem**: Variant Editor and Resume Designer use a vanishing badge as the only save signal, so users cannot tell whether their last edit landed.
- **Proposed fix**: Replace vanishing badge with a persistent "Saved at HH:MM" status next to the title; turn red and re-prompt on save failure.
- **Affected files**:
  - `src/app/(dashboard)/dashboard/variants/[id]/page.tsx`
  - Resume Builder components
- **Effort**: M
- **Impact**: M
- **Category**: New UI

### 19. Strip "snapshot" and "resolved_resume" from user-facing errors
- **Problem**: DB internals leak into error toasts and logs visible to users.
- **Proposed fix**: Audit error pathways in the variants stack; replace internal terms with plain-language messages.
- **Affected files**:
  - `src/app/(dashboard)/dashboard/variants/[id]/page.tsx`
  - `src/components/variants/variant-diff.tsx`
- **Effort**: S
- **Impact**: L
- **Category**: Copy

### 20. Tooltip on VariantDiff "Emphasis" badges
- **Problem**: high / normal / low emphasis badges appear in the diff with no explanation of effect on the rendered PDF.
- **Proposed fix**: Hover tooltip on each badge: "Affects how prominently this bullet is rendered in the PDF (size and weight)."
- **Affected files**:
  - `src/components/variants/variant-diff.tsx`
- **Effort**: S
- **Impact**: L
- **Category**: Help text

### 21. Tooltip on Variant "source" badge
- **Problem**: ai / manual badges appear without explanation; users cannot tell what difference it makes.
- **Proposed fix**: Replace with "AI-generated" / "Hand-edited" labels and add tooltip describing the practical difference.
- **Affected files**:
  - `src/app/(dashboard)/dashboard/variants/page.tsx`
  - `src/app/(dashboard)/dashboard/variants/[id]/page.tsx`
- **Effort**: S
- **Impact**: L
- **Category**: Copy

### 22. Convert Dashboard "Sections" stat into a Resume Builder CTA
- **Problem**: The Sections card is a passive stat. Most users have no path from dashboard to the Builder where sections are managed.
- **Proposed fix**: Make the card clickable, route to Resume Builder, and add a "Manage sections" CTA.
- **Affected files**:
  - Dashboard landing components
- **Effort**: S
- **Impact**: L
- **Category**: IA

### 23. Disambiguate "Publish Profile" toggle  *(subsumed by #27)*
- **Problem**: A single toggle is conflated with multiple publish concepts (public page, share link, search visibility).
- **Proposed fix**: Replace the single toggle with explicit toggles: "Public page on /p/[slug]," "Searchable," each with a one-line description.
- **Affected files**:
  - `src/app/(dashboard)/dashboard/profile/page.tsx`
- **Effort**: M
- **Impact**: M
- **Category**: New UI + Copy
- **Status**: Folded into #27 — the dedicated visibility surface naturally hosts both toggles as separate rows; implementing #27 satisfies #23.

### 24. Note theme-vs-styling freeze behavior in Profile
- **Problem**: profile_theme is live (changes propagate to all variants) while pdf_settings is frozen at variant creation. Users cannot predict which visual changes propagate.
- **Proposed fix**: Add a note in the Accent Colors section: "Color changes apply to existing variants. Layout and styling changes apply only to new variants."
- **Affected files**:
  - `src/app/(dashboard)/dashboard/profile/page.tsx`
  - `src/components/profile/template-picker.tsx`
- **Effort**: S
- **Impact**: M
- **Category**: Help text

### 25. Quick Apply autofill source indicator
- **Problem**: Quick Apply does not say whether it autofills from variant or base.
- **Proposed fix**: Show a one-line source indicator at the top of the Quick Apply drawer: "Autofilling from variant 'Senior PM at Acme'" or "Autofilling from base resume."
- **Affected files**:
  - `src/app/(dashboard)/dashboard/jobs/page.tsx` (JobDetailDrawer)
- **Effort**: S
- **Impact**: M
- **Category**: Copy + New UI

### 27. Move profile visibility to a dedicated Public Profile page
- **Problem**: The publish toggle currently lives at the bottom of the Profile tab (`profile/page.tsx` lines 469–489), buried as the 5th card after Photo, Basic Info, Accent Colors, and Profile URL. Multiple distinct frictions stack:
  1. **Toggle is gated behind a form Save** — `is_published` is bundled into the `handleSave` payload (line 149), so flipping the switch alone does nothing until the user clicks "Save changes" at line 492. Wrong affordance for a binary live/draft action; shares its error surface with slug-validation failures.
  2. **"Profile" is overloaded** — same tab edits private contact data AND configures whether a public website exists. Header copy "Update your personal information and profile settings" gives no signal that this page also hosts the one-click public-launch switch.
  3. **Quick Start sends users to `/dashboard/profile`** but lands them at the *top* of a long form — they have to scroll past every personal-info field to reach the publish step.
  4. **Sidebar shows no Live/Draft indicator** — visibility state is invisible from navigation; users must click into Profile or Overview to know whether their site is live.
  5. **`/dashboard/settings` is empty of visibility controls** — users with SaaS muscle memory check Settings first ("make my site public") and find only Account and Billing.
- **Proposed fix**: Create a new `/dashboard/public-profile` route, sibling to Profile under the Resume Hub sidebar group. The page hosts everything that's *only* about the public site:
  - **Visibility row** (page hero): instant-toggle Switch wired to a standalone PATCH (not a form Save). Subsumes #23 by splitting into two explicit rows: "Public page on /p/[slug]" and "Searchable" (the second only enabled when the first is on).
  - **Profile URL** card: slug field with "Copy" and "Open ↗" actions.
  - **Profile Layout** card: the existing TemplatePicker, moved here. Add note: "Layout for your public page only. Resume PDF styling lives in Resume Builder."
  - **Sidebar Live/Draft dot** on the new Public Profile entry — green when published, grey when draft. Reflects state at a glance from anywhere.

  **Accent Colors stays on Profile** — it applies to both the public page AND the resume PDF (the description copy from Phase 1 #4 already names both surfaces). Moving it under "Public Profile" would re-create the mislabeling Phase 1 just fixed.

  Update Quick Start step in `dashboard/page.tsx` line 156 to deep-link to `/dashboard/public-profile`. Add a redirect from `/dashboard/profile?tab=theme` (legacy template-picker tab) to the new route.
- **Affected files**:
  - New: `src/app/(dashboard)/dashboard/public-profile/page.tsx`
  - `src/app/(dashboard)/dashboard/profile/page.tsx` — remove the Publish card (lines 469–489), the Profile URL card (lines 448–467), the legacy `?tab=theme` TabsContent rendering the TemplatePicker, and the `is_published` field from `handleSave`. Profile keeps Photo, Basic Info, Accent Colors, and the Autofill Defaults tab.
  - `src/components/dashboard/sidebar.tsx` — add Public Profile entry in Resume Hub between Profile and Resume Builder; add Live/Draft dot rendering.
  - `src/app/(dashboard)/dashboard/page.tsx` — update Quick Start step (line 156) to deep-link to `/dashboard/public-profile`; consider adding a "Public Profile" status tile alongside the existing Live/Draft badge.
  - `src/components/dashboard/template-picker.tsx` — minor copy clarification ("Layout applies to public page only").
- **Effort**: M (1–1.5 days; new route, sidebar IA tweak, Profile-tab refactor, instant-PATCH for the toggle, redirect for legacy `?tab=theme`).
- **Impact**: H (closes a top-cited friction surfaced during the persona retest; introduces glanceable visibility state in the sidebar).
- **Category**: IA + New UI + Copy
- **Subsumes**: #23 (single-toggle disambiguation is delivered as part of the new visibility row).
- **Migration concerns**: Bookmarks pointing at `/dashboard/profile` keep working for personal-info edits. Deep links to `/dashboard/profile?tab=theme` need to redirect to `/dashboard/public-profile` to preserve any external links to the template picker.

## Tier 4 — New features (beyond UX cleanup)

### 26. AI cover letter generation per job
- **Problem**: There is no cover letter feature. Engineers applying to mission-driven companies, career switchers, and high-priority targets need a per-job cover letter that sounds genuine — not a generic AI-written paragraph. Current users either skip cover letters entirely or write them in a separate tool, defeating the integrated workflow that variants and Quick Apply established. AI-written full-letter drafts are easy to spot ("thrilled to apply", "unique blend of skills", "leverage synergies") so the feature has to be designed around AI structuring + human voice, not AI prose generation.
- **Proposed fix**: Reuse the Smart Tailor infrastructure for letters but with a different output shape:
  - New `cover_letter_drafts` table linked to `job_application_id` and optionally `variant_id` — fields: `id`, `profile_id`, `job_application_id`, `variant_id`, `bullet_points` (JSONB array of AI-suggested talking points), `body` (user's edited markdown), `created_at`, `updated_at`.
  - New `voice_sample` (text) column on `profiles` — captured once during onboarding or in Profile settings, used to seed the AI's tone-matching.
  - New `POST /api/cover-letters/generate` endpoint that takes `{ job_id, variant_id? }`, calls Claude with the variant's resolved resume + the job description + the user's voice sample, and returns 3-5 specific talking points (not prose).
  - New "Generate Cover Letter" button in the JobDetailDrawer alongside Smart Tailor; opens an editor modal with the AI bullet points plus a markdown text area for the user to compose the actual letter from those points.
  - "Copy Cover Letter" tile on the Quick Apply page next to email/phone/skills.
  - Optional: a "Voice Sample" prompt step in onboarding asking the user to paste 200 words of their own writing (a Slack message, a journal entry, anything).
- **Affected files**:
  - New: `src/app/api/cover-letters/generate/route.ts`
  - New: `src/app/api/cover-letters/[id]/route.ts` (GET, PUT, DELETE)
  - New: `src/lib/cover-letter/index.ts` (mirrors `src/lib/tailor/index.ts`)
  - New: `src/components/jobs/cover-letter-editor.tsx`
  - Modify: `src/types/database.ts` (CoverLetterDraft interface, profiles.voice_sample)
  - Modify: `src/app/(dashboard)/dashboard/jobs/page.tsx` (JobDetailDrawer button)
  - Modify: `src/app/(dashboard)/dashboard/jobs/[id]/apply/page.tsx` (Copy tile)
  - Modify: `src/app/(dashboard)/dashboard/profile/page.tsx` (voice sample field)
  - Migration: `cover_letter_drafts` table + `profiles.voice_sample` column
- **Effort**: L (1-2 weeks; non-trivial schema, API, UI, prompt design)
- **Impact**: H (closes a real gap; differentiates from generic AI-letter tools by anchoring on user's actual resume + voice + variant)
- **Category**: New feature (Data model + API + AI + New UI)
- **Design constraints**:
  - AI returns talking points, not prose, so the user always writes the final letter.
  - Voice sample is one-time setup; the AI references it for tone, not content.
  - The editor explicitly displays "These are talking points, not a finished letter — write in your own voice using the points above."
  - Letter draft is keyed per job, optionally seeded from the linked variant. Re-tailor on the variant does not silently overwrite the letter (letters are independent artifacts).
