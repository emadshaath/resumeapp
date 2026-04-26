# Resumeapp UX Roadmap

A phased TODO list derived from `docs/ux-backlog.md`. Each phase closes a specific mental-model gap and ships as a coherent release. Items reference backlog numbers; full detail and file paths live in the backlog.

Phasing rationale: copy and terminology fixes ship first because they are cheap, low-risk, and set the vocabulary for everything downstream. Structural IA changes follow once the language is stable. Lifecycle and reciprocity work next, because it requires the new sidebar groupings to make sense. Power features and polish ship last.

---

## Phase 1 — Terminology pass

**Goal**: stop the language from fighting itself. Users currently see Profile/Theme/Template, Section/Block, and AI/manual collapsed into shared labels. Until this is fixed, every later help text would be built on quicksand.

**Estimated duration**: ~3 days, all small items, no schema changes.

**Exit criteria**: a fresh reader of the Profile, Resume Builder, and Variants pages can correctly explain what each label controls without opening the codebase.

- [ ] **#2** Rename "Smart Variants" to "Tailored Variants" with subtext "AI versions per job" — `src/components/dashboard/sidebar.tsx`
- [ ] **#4** Split "Profile Theme" tab into "Accent Colors" and "Profile Layout (Template)" — `src/app/(dashboard)/dashboard/profile/page.tsx`, `template-picker.tsx`, onboarding theme step
- [ ] **#5** Rename "Application Preferences" to "Autofill Defaults (Chrome)" with one-line help — `src/app/(dashboard)/dashboard/profile/page.tsx`
- [ ] **#6** Define "Block" inline on first use in Resume Builder (or rename to "Layout slot") — Resume Builder components
- [ ] **#19** Strip "snapshot" and "resolved_resume" from user-facing errors — variants stack
- [ ] **#20** Hover tooltip on VariantDiff "Emphasis" high/normal/low badges — `src/components/variants/variant-diff.tsx`
- [ ] **#21** Replace "ai"/"manual" badges with "AI-generated"/"Hand-edited" — variants pages

---

## Phase 2 — Connect the chain

**Goal**: make the producer-consumer pipeline visible at every page load. This is the structural fix that addresses the user's original "things feel disconnected" complaint.

**Estimated duration**: ~1.5 weeks. #1 and #3 are the heaviest items.

**Exit criteria**: a new user who finishes onboarding can describe the Profile → Resume Builder → Variants → Jobs flow before opening any feature.

- [ ] **#1** Restructure sidebar into "Resume Hub" and "Job Applications" groups — `src/components/dashboard/sidebar.tsx`
- [ ] **#3** Add a one-screen pipeline diagram to onboarding plus a Resume Builder tour step — `onboarding-client.tsx` lines 854-961
- [ ] **#16** Rewrite Variants empty state with the Resume Builder prerequisite as step 1 — `variants/page.tsx` lines 99-101
- [ ] **#17** Add Smart Tailor help text in JobDetailDrawer (what AI does, edit before save, re-tailor replaces) — `jobs/page.tsx` lines 1031-1058
- [ ] **#7** "Variant created — what next?" post-tailor modal with three CTAs (View in Job Tracker / Edit Variant / Set as default) — `variant-diff.tsx`, `jobs/page.tsx`
- [ ] **#8** Bidirectional Job ↔ Variant navigation (View Variants for this Job; Back to Job) — `jobs/page.tsx`, `variants/[id]/page.tsx`

---

## Phase 3 — Lifecycle clarity

**Goal**: fix the silent drift and silent orphans between base resume, variants, and jobs. This is the career-switcher persona's central pain.

**Estimated duration**: ~1.5 weeks. #9 and #10 are large; #13/#14/#15/#24/#25 are small but should ship together.

**Exit criteria**: editing the base resume, deleting a job, or deleting a variant always surfaces the consequences for the linked entities.

- [ ] **#9** Stale-variant indicator on variants whose base has changed since snapshot — variants list and detail pages
- [ ] **#10** "Refresh / Re-tailor from base" action on variant cards with confirmation — `variants/[id]/page.tsx`, `variant-diff.tsx`
- [ ] **#13** Orphan warning on Job delete (list affected variants, choose keep/delete) — `jobs/page.tsx`
- [ ] **#14** Orphan warning on Variant delete (name the linked Job, explain Quick Apply fallback) — variants pages
- [ ] **#15** Default-variant tooltip explaining what it controls (PDF + Quick Apply) — variants pages
- [ ] **#24** Note theme-vs-styling freeze behavior near Accent Colors — `profile/page.tsx`, `template-picker.tsx`
- [ ] **#25** Quick Apply autofill source indicator ("from variant X" / "from base") — JobDetailDrawer

---

## Phase 4 — Power features

**Goal**: turn variants from a one-shot AI flow into a manageable library. Wait for Phase 3 because users need stale and orphan signals before they will trust clone and compare.

**Estimated duration**: ~1 week.

**Exit criteria**: a career-switcher with 5+ variants can manage them without re-running AI on near-duplicates.

- [ ] **#11** Clone variant action that copies snapshot, blocks_snapshot, and pdf_settings_snapshot — variants pages
- [ ] **#12** Variant comparison view (multi-select + side-by-side diff using existing component) — `variants/page.tsx`, `variant-diff.tsx`

---

## Phase 5 — Polish

**Goal**: tighten the rough edges users hit daily but rarely call out.

**Estimated duration**: ~3-5 days.

**Exit criteria**: no save-state ambiguity, no passive stat cards, no overloaded toggles.

- [ ] **#18** Persistent "Saved at HH:MM" state in Variant Editor and Resume Designer — variants and Resume Builder
- [ ] **#22** Convert Dashboard "Sections" stat card into a Resume Builder CTA — Dashboard landing
- [ ] **#23** Disambiguate "Publish Profile" toggle into explicit "Public page" / "Searchable" toggles — `profile/page.tsx`

---

## Cross-phase notes

- **Sequencing**: Phase 1 must land before Phase 3 help text references new terms ("Accent Colors," "AI-generated"). Phase 2 sidebar changes must land before Phase 3 reciprocal navigation lands at the new locations.
- **Parallelizable**: within a phase, items can ship in parallel. Phase 1 can run a single contributor for ~3 days; Phases 2 and 3 each fit a pair of contributors over a week and a half.
- **Skippable for MVP**: Phases 4 and 5 are not blockers for the "things feel disconnected" complaint. Ship Phases 1-3 if scope is tight.
- **Tracking**: each checkbox maps to a backlog entry in `docs/ux-backlog.md`; convert directly to tickets without reformatting.
