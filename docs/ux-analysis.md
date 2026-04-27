# Resumeapp UX Analysis

A synthesis of three parallel reviews: a mid-career multi-applicant persona, a career-switcher heavy-variant persona, and a heuristic audit. The unifying theme: the product is technically composed of well-built features, but those features feel like four siblings rather than a chain. Users cannot form a stable mental model of how Profile, Resume Builder, Variants, and Jobs relate, which makes everything downstream feel disconnected.

## 1. Executive summary

- **The architecture is a chain; the UI presents it as a list.** Profile data feeds the Resume Builder, which produces sections and blocks, which get snapshotted into Variants, which attach to Jobs and feed Quick Apply. The sidebar shows these as siblings, so users never internalize the flow.
- **Terminology fights itself in three places.** Profile vs. Profile Theme vs. Profile Template, Section vs. Block, and Theme vs. Template each collapse two distinct concepts into one label.
- **Variants are frozen snapshots, but the UI implies live overlays.** Users edit base content expecting variants to update; they do not. There is no stale indicator, no refresh, no clone, no compare.
- **Reciprocal navigation is missing on every join.** Job to Variant lives only in a drawer; Variant to Job is plain text; deleting either side silently orphans the other.
- **Onboarding teaches the glamorous features (Smart Tailor, Variants) but skips the foundation (Resume Builder).** New users land in Variants without ever being shown how to fill the sections that variants are built from.
- **The single highest-leverage fix is restructuring the sidebar into a "Resume Hub" group plus a "Job Applications" group**, which makes the producer-consumer relationship visible at every page load.

## 2. The mental model gap

### 2a. Intended model (what the system was designed around)

```
+-----------+      +------------------+      +-------------------+
|  Profile  | ---> |  Resume Builder  | ---> |   Base Resume     |
|  (data)   |      | sections + blocks|      | (canonical doc)   |
+-----------+      +------------------+      +-------------------+
                                                       |
                                                       | snapshot
                                                       v
+-------------------+   1:1 link   +---------------------------+
|  Job Application  | <----------- |  Variant (frozen snapshot)|
|  (URL, status)    |              |  resolved_resume + blocks |
+-------------------+              +---------------------------+
                                                       |
                                                       v
                                            +---------------------+
                                            |  Quick Apply / PDF  |
                                            |  uses ?variant=...  |
                                            +---------------------+
```

Profile is the source of truth for personal data. Resume Builder turns sections into a laid-out document with blocks. Each Variant is a frozen snapshot taken from the base for a specific Job. Quick Apply autofills using the variant tied to the job.

### 2b. Perceived model (what users see in the sidebar)

```
+----------+   +------------------+   +----------------+   +-------------+
|  Profile |   |  Resume Builder  |   | Smart Variants |   | Job Tracker |
+----------+   +------------------+   +----------------+   +-------------+
     ?               ?                       ?                   ?
     +---------------+-----------------------+-------------------+
                              |
                          (no arrows)
```

Four equal items, no producer-consumer cues, no scent that one feeds another. The persona reports describe this as "they're listed as siblings"; the heuristic audit confirms it as the top high-severity finding. Every other complaint cascades from this single IA mistake: when users cannot see the chain, they cannot predict that editing the base will not propagate, that Quick Apply pulls from variant snapshots, or that a job carries a tailored resume.

This is the root cause of the disconnection feeling. Naming, copy, and lifecycle gaps amplify it, but flattening a five-stage pipeline into a flat sidebar is the architectural error.

## 3. Per-feature findings

### Onboarding & Dashboard

The import-resume-then-pick-theme onboarding is the strongest first-run experience in the app. It breaks down the moment users hit the dashboard: the Quick Start checklist names features but never the relationship between them. The tour walks Smart Tailor and Variants but skips Resume Builder entirely (`onboarding-client.tsx` lines 854-961), so the foundational concept of sections and blocks is never taught. The dashboard "Sections" card is a passive stat instead of a CTA into the Builder. Persona A asked for a mental-model diagram in onboarding; that single addition would prevent most downstream confusion.

### Profile

Three tabs (Profile, Profile Theme, Application Preferences) overload the noun "Profile" and conflate two distinct customization concepts. "Profile Theme" tab contains both color (theme) and layout (template) controls (`profile/page.tsx`, `template-picker.tsx` lines 116, 177). "Application Preferences" actually configures Chrome-extension form prefill, which is unparseable from the label. Saving Profile data does not regenerate the resume, and that boundary is never communicated.

### Resume Designer

The 3-pane builder is well-built on desktop. Vocabulary is the killer: a "section" is a content bucket and a "block" is a visual canvas unit, and the UI uses both without ever defining either. The "Add to Canvas" toggle is an implicit coupling that hides where content actually appears. There is no Design vs. Preview separation, so users cannot tell which view is the source of truth. The page also has no link onward to Variants, which is where most users will spend their time.

### Variants

The data model is sophisticated: `resolved_resume`, `blocks_snapshot`, and `pdf_settings_snapshot` freeze the variant at creation, with overlay rendering at view time. The UI never communicates this. There is no clone, no compare, no refresh, no stale indicator, and no orphan handling when the linked job is deleted. The "default variant" badge has no explanation of what it defaults for. The `source` badge ("ai" / "manual") and "Emphasis" (high/normal/low) tags are unexplained. Files: `variants/page.tsx`, `variants/[id]/page.tsx`, `variant-diff.tsx`.

### Job Tracker

The Kanban with URL parsing is the best UX in the app, per Persona A. The disconnect is at the seams: the JobDetailDrawer is the only place where Smart Tailor is discoverable (`jobs/page.tsx` JobDetailDrawer lines 1031-1058), and there is no surface from a Job back out to its Variants list. Quick Apply runs from the drawer but never explains whether autofill comes from variant or base.

## 4. Cross-feature disconnects

These problems live between features rather than inside any one of them.

**Data sync silence.** Editing the base resume does not update existing variants. There is no UI signal of variant impact when base changes, and no stale indicator on variants whose source has moved. Conversely, profile_theme is live (not snapshotted) while pdf_settings is frozen, so visual changes propagate inconsistently with no explanation.

**Reciprocal navigation gaps.** Job to Variant exists only inside the JobDetailDrawer. Variant to Job is text-only without an affordance. Deleting a Job silently orphans variants; deleting a Variant offers no warning that a Job's Quick Apply will fall back to base. The Variants empty state tells users to use Job Tracker but does not mention the Resume Builder prerequisite (`variants/page.tsx` lines 99-101).

**Terminology drift across features.** "Theme" means color in Profile and a gradient in Onboarding step 3 (`onboarding-client.tsx` lines 800-806). "Profile" refers to both the user-data screen and the public page at `/p/[slug]`. "Default variant" is implicit: nobody is told whether default applies to PDF download, Quick Apply, or share link.

**Implementation jargon leaks.** "Snapshot" and "resolved_resume" surface in error logs. "Block" appears as a UI label without any inline definition.

## 5. Jargon table

| Term | Where it appears | What users think it means | What it actually means | Recommendation |
|------|------------------|---------------------------|------------------------|----------------|
| Block | Resume Builder canvas | A paragraph or widget | Zone+type combo for PDF layout (BlockType / BlockZone in `database.ts`) | Rename to "Layout slot" or define inline on first use |
| Section | Resume Builder list | A category like Experience | Correct, but confused with BlockZone | Keep, but add tooltip distinguishing from Block |
| Theme | Profile, Onboarding | Overall visual style | Color accent (Profile) or color gradient (Onboarding) | Rename to "Accent color" |
| Template | Profile Theme tab | Document layout | Layout of the public profile page (`template-picker.tsx`) | Rename to "Profile layout" |
| Profile | Sidebar, public URL | Personal-data screen | Both data screen AND public page at `/p/[slug]` | Split: "Profile Data" vs. "Public Page" |
| Default variant | Variant card badge | Some kind of fallback | Used by PDF and Quick Apply when no variant chosen | Add tooltip: "Used by PDF download and Quick Apply when no job is selected" |
| Smart Tailor | JobDetailDrawer | AI rewrites resume somehow | AI generates a Variant for this job | Add help text per audit recommendation |
| Quick Apply | JobDetailDrawer, sidebar | One-click application | Chrome-extension autofill from a variant | Define inline; clarify Chrome dependency |
| Snapshot / Resolved resume | Error logs | DB internals (confusing) | Frozen variant payload | Strip from user-facing logs |
| Application Preferences | Profile tab | App-wide settings | Chrome-extension form prefill defaults | Rename to "Autofill Defaults (Chrome)" |
| Emphasis (high/normal/low) | VariantDiff badges | Importance of a bullet | Affects rendered PDF weighting | Tooltip explaining PDF effect |
| Source (ai/manual) | Variant card badge | Where data came from | Whether AI or human authored the variant | Tooltip; consider "AI-generated" / "Hand-edited" |

## 6. Composability scorecard

| Pair | Current | Target | Lever |
|------|---------|--------|-------|
| Profile to Resume Designer | 2/5 | 4/5 | Add "Open in Builder" link from Profile; show profile data preview in Builder header |
| Resume Designer to Variants | 1/5 | 4/5 | Add "Tailor for a job" CTA in Builder; show variant count in header |
| Variants to Jobs (V to J) | 2/5 | 5/5 | Replace text with linked card; "Back to Job" button in variant detail |
| Jobs to Variants (J to V) | 2/5 | 5/5 | "View Variants for this Job" surfaced outside the drawer |
| Profile to Variants | 1/5 | 3/5 | Note in Profile Theme tab that color propagates live; styling is frozen at variant creation |
| Onboarding to ongoing workflow | 2/5 | 4/5 | Add Resume Builder step to tour; show pipeline diagram |

## 7. Top 5 mental-model fixes

### 7.1 Restructure sidebar into a Resume Hub and Job Applications group
**Problem.** Sidebar siblings hide the Profile to Builder to Variants to Jobs pipeline. Every disconnection complaint cascades from this.
**Change.** Adopt the audit's proposed grouping: Resume Hub (Profile and Contact, Resume Builder, Variants), Job Applications (Job Tracker, Quick Apply), Communications, Reviews and Insights.
**Files.** `src/components/dashboard/sidebar.tsx`.
**Why it lifts the model.** Visual grouping encodes the producer-consumer chain at every page load, doing IA work that no amount of in-page copy can match.

### 7.2 Rename "Smart Variants" to "Tailored Variants" with subtext
**Problem.** "Smart" is a marketing modifier; "Variants" alone reads as branches. Users do not see that variants are AI-tailored copies tied to jobs.
**Change.** Rename label to "Tailored Variants" with subtext "AI versions per job."
**Files.** `src/components/dashboard/sidebar.tsx` line 65.
**Why.** A two-word label change embeds the entire variant-to-job relationship.

### 7.3 Bidirectional navigation between Job and Variant
**Problem.** Job to Variant lives only in the drawer; Variant to Job is plain text; orphans on either delete are silent.
**Change.** Add "View Variants for this Job" affordance on JobDetailDrawer outside the Smart Tailor section. Add "Back to Job" button in variant detail. Add confirmation dialogs warning of orphans on delete on either side.
**Files.** `src/app/(dashboard)/dashboard/jobs/page.tsx` around line 870, `src/app/(dashboard)/dashboard/variants/[id]/page.tsx`.
**Why.** Reciprocal nav makes the join visible and recoverable; it is the cheapest way to teach that a Variant belongs to a Job.

### 7.4 Unify Theme and Template terminology
**Problem.** "Profile Theme" tab contains both color and layout; "Theme" means different things in Profile and Onboarding; "Template" sounds like a resume template but is the public-page layout.
**Change.** Split or relabel: "Accent Colors" and "Profile Layout (Template)" as separate subheadings or tabs. Use "Accent" consistently across Profile and Onboarding.
**Files.** `src/app/(dashboard)/dashboard/profile/page.tsx` line 190, `src/components/profile/template-picker.tsx` lines 116 and 177, `src/components/onboarding/onboarding-client.tsx` lines 800-806.
**Why.** Removes one of the three head-on terminology collisions and makes Profile customization predictable.

### 7.5 Teach the pipeline in onboarding
**Problem.** Onboarding skips Resume Builder, so the foundational concept of sections and blocks never lands. Users learn Variants without knowing where their content came from.
**Change.** Add a Resume Builder step to the tour and a one-screen pipeline diagram (Profile to Sections to Blocks to Variants to Jobs) shown once on first dashboard load.
**Files.** `src/components/onboarding/onboarding-client.tsx` lines 854-961.
**Why.** A single diagram does what dozens of inline tooltips cannot: it teaches the chain.
