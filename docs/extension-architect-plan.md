# Extension Architecture Plan

> Scope: technical architecture only. UX flows live in `extension-ux-plan.md`; HR/product flows in `extension-hr-product-plan.md`. This document does not encroach on either.

## 1. Executive Summary

The Rezm.ai browser extension (MV3, ~1.7 KLOC) currently treats every popup interaction as a stateless one-shot, has zero session model across SPA navigation, exact-string-matches URLs for dedup, ships PDFs as untyped byte arrays, and lives in two duplicated source trees. The result is duplicate variants, duplicate tracking rows, broken fills on multi-page wizards, and no way to re-attach a previously-generated artifact. This plan proposes: (a) a single source tree with a build step; (b) a background-service-worker-owned **ApplicationSession** state machine keyed by canonical job identity; (c) a site-adapter registry with confidence scoring and per-ATS adapters; (d) a server-anchored PDF artifact pipeline with `(variant_id, render_hash)` identity; (e) a canonical-URL + ATS-id dedup layer with a server endpoint and a small client-side hint cache; (f) a server-computed match-score with sub-800ms first paint via embedding reuse. Twelve sequenced milestones, M1 (unify+session) through M12 (telemetry-driven adapter healing).

## 2. Current-State Diagnosis

User-reported symptoms mapped to architectural causes. Line numbers reference `/home/user/resumeapp/extension/popup.js` (the duplicated copy in `rezmai-extension/popup.js` is byte-identical except for the icons README).

| # | Symptom | Root cause | Evidence |
|---|---------|-----------|----------|
| S1 | "Smart Fill creates a new variant every time I move to page 2 of the wizard" | URL is the only identity key; multi-page ATS wizards change `pageUrl` between steps; backend treats unmatched URL as a new application. | `popup.js:96-98` `find((j) => j.job_url === pageUrl)`; `handleSmartFill` always POSTs to `/api/extension/smart-fill` with the new URL when no row matches. |
| S2 | "I have two tracking rows for the same job" | `handleFill` auto-creates a tracking row whenever it cannot match by URL, with no canonicalization, no ATS-id parsing, no company normalization. | `popup.js:134-146`. |
| S3 | "Company column says 'boards' for Greenhouse jobs" | URL hostname split is treated as company name. | `popup.js:141`: `new URL(pageUrl).hostname.replace("www.","").split(".")[0]`. |
| S4 | "Resume PDF is huge / popup feels slow" | PDF is materialized in popup memory and shipped as a JS array of bytes (`Array.from(new Uint8Array(buffer))`) over `chrome.runtime.sendMessage`. No identity, no caching, no streaming. | `popup.js:116, 300`. |
| S5 | "Workday / Lever multi-step forms break after navigating" | Popup is amnesiac across navigation. No `chrome.storage.session` use. No `tabId`-keyed session. Background does not own state. | `background.js` (27 LOC) is only a token KV. |
| S6 | "If the network blips, the click is lost" | No retry, no backoff, no offline queue, no idempotency keys on backend writes. | popup uses raw `fetch` with no error envelope; smart-fill creates rows on every retry. |
| S7 | "Fields filled wrong on Ashby/iCIMS" | Generic heuristic content script; no per-site adapter; no shadow-DOM/iframe traversal verified; no confidence scoring. | `content.js` is a single 1183-LOC file with no registry. |
| S8 | "AI answers don't show until I reopen the popup" | Popup window is the only UI surface; closing it discards in-flight promises; no progress is mirrored in background or content. | `handleAIAnswers` keeps state in popup-local closures. |
| S9 | "Two checked-in extension folders are confusing" | `extension/` and `rezmai-extension/` are byte-identical (verified by `diff -rq`) except `extension/icons/README.md`. No build step disambiguates. | filesystem. |
| S10 | "Match score is missing or appears late" | No score endpoint integrated into the extension; popup never asks for one. | `popup.html` has no score widget. |

These ten symptoms collapse to four architectural deficits: **(D1) no session model**, **(D2) no canonical job identity**, **(D3) no artifact identity for the PDF**, **(D4) no per-site adapter framework**. The remainder of the plan attacks those four.



## 3. Target Architecture

### 3.1 Components

```
+-----------------------------+        +-----------------------------+
|         Popup (UI)          |        |     Options / Side Panel    |
|  - thin view of session     |        |  (future, optional)         |
|  - dispatches user intents  |        +-----------------------------+
+--------------+--------------+
               | runtime.connect("popup")  (long-lived Port)
               v
+--------------------------------------------------------------+
|          Background Service Worker (ApplicationSession owner)|
|  - SessionStore (chrome.storage.session, tabId-keyed)        |
|  - ArtifactCache (chrome.storage.local, LRU, hashed)         |
|  - TokenStore (chrome.storage.local) [unchanged surface]     |
|  - APIClient (retry, backoff, idempotency-key, telemetry)    |
|  - SiteAdapterRegistry resolver                              |
|  - AlarmScheduler (heartbeat for revival)                    |
+----+----------------------------------+----------------------+
     | runtime.sendMessage / Port       | fetch (CORS to api.rezm.ai)
     v                                  v
+----------------------+        +----------------------+
|   Content Script     |        |   Backend (Next.js)  |
|  - SiteAdapter       |        |  /api/extension/*    |
|  - DOMObserver       |        |  /api/variants/*     |
|  - FieldDetector     |        |  /api/jobs/*         |
|  - Filler            |        |  /api/match-score    |
+----------------------+        +----------------------+
```

The **service worker is the single source of truth** for session state. Popup and content are stateless views/effectors. This survives popup close, content-script reload on SPA navigation, and (with `chrome.alarms` heartbeat) service-worker eviction.

### 3.2 Message-passing contract

All messages use a discriminated union with `type`, `sessionId?`, `requestId`, `payload`. Long-lived flows (`SmartFill`, `AIAnswers`) use a **Port** so the background can stream progress. One-shot reads (`GET_SESSION`) use `sendMessage`.

| From | To | Channel | Messages |
|------|----|---------|----------|
| Popup | BG | Port `popup` | `INTENT_SMART_FILL`, `INTENT_FILL`, `INTENT_AI_ANSWERS`, `INTENT_TRACK`, `GET_SESSION`, `RESUME_SESSION`, `DISCARD_VARIANT` |
| BG | Popup | Port `popup` | `SESSION_UPDATED`, `PROGRESS`, `ERROR`, `ARTIFACT_READY` |
| BG | Content | `tabs.sendMessage` | `SCRAPE_JOB`, `EXTRACT_QUESTIONS`, `EXECUTE_FILL{artifactRef}`, `APPLY_AI_ANSWERS`, `PROBE_ADAPTER` |
| Content | BG | `runtime.sendMessage` | `JOB_SCRAPED`, `QUESTIONS_EXTRACTED`, `FILL_RESULT`, `ADAPTER_TELEMETRY`, `NAVIGATION_HINT` |

`EXECUTE_FILL` carries an **`artifactRef`** (`{variantId, renderHash, blobUrl}`) instead of bytes. Content fetches the blob from `blobUrl` (a `URL.createObjectURL` URL minted by the background from its cached `Blob`). This eliminates the megabyte-sized message bug (S4).

### 3.3 State ownership

| State | Lives in | Lifetime | Why |
|-------|----------|----------|-----|
| `authToken` | `chrome.storage.local` | until logout | already there |
| `userPrefs` (autosubmit defaults, locale) | `chrome.storage.local` | persistent | survives restarts |
| `artifactCache` index `{variantId -> {hash, sizeBytes, mtime}}` | `chrome.storage.local` | LRU 50 MB | reuse across sessions |
| `sessions[tabId]` `ApplicationSession` | `chrome.storage.session` | tab/browser lifetime | survives SW eviction, dies with browser |
| `lastJobIdHint` | `chrome.storage.session` | tab lifetime | quick repaint |
| In-flight requests `requestId -> AbortController` | SW memory only | until resolved | recreated on SW revival |
| Adapter telemetry buffer | SW memory + periodic POST | flushed every 60s | best-effort |

### 3.4 ApplicationSession model

```ts
type ApplicationSession = {
  sessionId: string;            // uuid, server-issued via /api/extension/session
  tabId: number;
  jobIdentity: {
    canonicalUrl: string;
    atsVendor: ATSVendor | "unknown";
    atsJobId: string | null;
    normalizedTitle: string | null;
    normalizedCompany: string | null;
    confidence: "exact" | "high" | "medium" | "low";
  };
  trackingRowId: string | null; // server jobs.id once persisted
  variantId: string | null;     // current chosen variant
  variantRenderHash: string | null;
  state: "idle" | "scraping" | "matched" | "tailoring" | "ready"
       | "filling" | "answering" | "submitted" | "error";
  steps: WizardStep[];          // populated by adapter
  currentStep: number;
  artifacts: { resumePdf?: ArtifactRef; coverLetter?: ArtifactRef };
  errors: ErrorEntry[];
  createdAt: number;
  updatedAt: number;
};
```

### 3.5 State machine

```
        +---------+   SCRAPE_JOB ok    +---------+
        |  idle   |------------------->| scraping|
        +----+----+                    +----+----+
             |                              | identity resolved
             |                              v
             |                         +---------+
             |                         | matched |
             |                         +----+----+
             |                              | user clicks Tailor or Smart Fill
             |                              v
             |                         +-----------+
             |                         | tailoring |
             |                         +-----+-----+
             |                               | variant + pdf hash
             |                               v
             |   user clicks Fill      +---------+
             +-----------------------> |  ready  |
                                       +----+----+
                                            |
                              +-------------+--------------+
                              v                            v
                         +---------+                  +-----------+
                         | filling |----ok----------->| answering |
                         +----+----+                  +-----+-----+
                              | err                         | ok
                              v                             v
                         +--------+                   +-----------+
                         | error  |<------err---------| submitted |
                         +--------+                   +-----------+
```

Transitions are pure functions on `(state, event) -> state`. Each transition emits `SESSION_UPDATED` to subscribed popup ports. `NAVIGATION_HINT` from content (sent on `MutationObserver` URL change) is a no-op for state but triggers `jobIdentity` re-resolution; if the identity remains the same, the session is **reused** — solving S1.

### 3.6 SW revival

`chrome.alarms.create("session-heartbeat", {periodInMinutes: 1})` rehydrates `sessions` from `chrome.storage.session` on each fire so a long-form session survives the 30s SW idle timeout.



## 4. Site-Adapter Framework

### 4.1 Registry

A `SiteAdapterRegistry` is loaded by the content script at `document_idle`. Each adapter declares:

```ts
interface SiteAdapter {
  vendor: ATSVendor;                  // "greenhouse" | "lever" | "workday" | ...
  matches(loc: Location, doc: Document): number;  // 0..1 confidence
  parseJob(doc: Document): ScrapedJob;            // title, company, jd, atsJobId
  detectFields(root: ParentNode): DetectedField[];
  fill(field: DetectedField, value: FieldValue): FillResult;
  attachResume(field: DetectedField, blob: Blob, name: string): Promise<FillResult>;
  observeWizard(cb: (step: WizardStep) => void): () => void;
}
```

Resolution: registry calls `matches()` on every adapter; the highest score >= 0.6 wins, else falls back to `GenericAdapter`. Score is `SESSION_UPDATED` to popup so the UI can show "Detected: Greenhouse (0.92)".

### 4.2 Generic detector with confidence

`GenericAdapter` builds candidate `(input, label)` pairs by scoring across signals:

| Signal | Weight |
|--------|--------|
| `<label for>` resolves | 0.30 |
| `aria-labelledby` resolves | 0.25 |
| Wrapping `<label>` text | 0.20 |
| Adjacent text within 80px (vertical) | 0.10 |
| `name`/`id` token match | 0.10 |
| `placeholder` token match | 0.05 |

Per-field `FieldKind` is inferred from token bag (Levenshtein + a small synonym dictionary `firstName|fname|given_name|...`). Total per-field confidence = sum of matched signal weights, normalized. Filling occurs only above 0.55. Below threshold → emit `ADAPTER_TELEMETRY{kind: "low_confidence", domSnippet, vendor, url}` for offline learning.

### 4.3 Per-ATS adapters

| ATS | URL pattern | Adapter responsibilities |
|-----|------------|--------------------------|
| Greenhouse | `boards.greenhouse.io/{org}/jobs/{id}`, `job-boards.greenhouse.io/{org}/jobs/{id}` | parse `data-mapped-id`, `#first_name`, hidden `application[answers_attributes]`, file via `<input type=file>` (works directly). |
| Lever | `jobs.lever.co/{org}/{uuid}` | multi-step `posting-apply` page; resume input is a real `<input type=file>` but custom-styled wrapper; click trigger label first. |
| Workday | `*.myworkdayjobs.com/*` and tenant subdomains | React + iframe + virtualized list; needs `MutationObserver` on app root; resume "Upload" button opens hidden input — must `dispatchEvent` synthetic click and use `DataTransfer` to set files. Multi-page wizard: detect via stepper aria-roles. |
| Ashby | `jobs.ashbyhq.com/{org}/{uuid}` | shadow-root form; adapter must `querySelector` deep into the host; fields are `react-hook-form` controlled — set value AND dispatch `input`/`change` with React's value setter. |
| iCIMS | `careers-*.icims.com/jobs/*/job` | iframe-hosted form; adapter detects iframe `src=jobs.icims.com` and re-injects detector inside it (requires `all_frames: true`). |
| Taleo | `*.taleo.net/careersection/*` | classic server-rendered; conventional labels work, but file upload is multi-step (separate "Upload Resume" page). Adapter models that page as its own wizard step. |

### 4.4 Shadow DOM and iframes

- `manifest.json` content script runs with `"all_frames": true, "match_origin_as_fallback": true` so iCIMS-style iframes are covered.
- Detector recursively walks `node.shadowRoot` when present (open shadow only; closed shadow is unreachable — adapter must surface a "manual fill" hint).
- For Workday hidden file inputs, use:
  ```js
  const dt = new DataTransfer();
  dt.items.add(new File([blob], filename, {type: "application/pdf"}));
  input.files = dt.files;
  input.dispatchEvent(new Event("change", {bubbles: true}));
  ```

### 4.5 Telemetry-driven healing

Each adapter emits `ADAPTER_TELEMETRY` events: `{vendor, url, fieldKind, selectorPath, confidence, success, durationMs}`. Background batches and POSTs to `/api/extension/telemetry`. A weekly job clusters low-confidence selectors per vendor → engineering ticket. No PII; selector paths are sanitized (no values).



## 5. PDF Artifact Pipeline

### 5.1 Identity

A PDF is identified by `(variant_id, render_hash)` where `render_hash = sha256(pdf_bytes)` computed server-side at render. Existing migration `00021_variant_pdf_snapshot` already stores rendered PDFs; we add a `render_hash` column (see Section 8) and expose it on every variant payload.

### 5.2 Server endpoints

- `GET /api/variants/{id}/pdf` — returns `application/pdf` with headers:
  - `ETag: "<render_hash>"`
  - `X-Variant-Render-Hash: <render_hash>`
  - `X-Variant-Id: <id>`
  - `Cache-Control: private, max-age=300`
- `HEAD /api/variants/{id}/pdf` — same headers, no body. Used by background to verify cache freshness before refetching.

### 5.3 Background fetch + cache

```
Popup INTENT_FILL
  -> BG resolves session.variantId
  -> BG checks artifactCache[variantId]
       hit && hash matches HEAD -> reuse cached Blob
       else -> GET /api/variants/{id}/pdf, store Blob + hash
  -> BG mints blobUrl = URL.createObjectURL(blob)
  -> BG sends EXECUTE_FILL{artifactRef:{variantId, renderHash, blobUrl, filename}}
  -> Content fetch(blobUrl) -> Blob -> attach via SiteAdapter.attachResume
  -> Content computes sha256(receivedBytes) and asserts === renderHash
  -> Content emits FILL_RESULT{verifiedHash}
```

This **tamper-evident chain** means the popup, content, and ATS file input are all bound to the same artifact. If a future "auto-submit" step runs server-side after the user clicks Submit, the server can re-fetch the application from the ATS (where supported) and verify the same hash was uploaded.

### 5.4 Attach mechanics by ATS

| ATS | Strategy |
|-----|----------|
| Greenhouse | direct `input.files = dt.files` |
| Lever | click visible label, then `input.files = dt.files`, then `change` event |
| Workday | locate hidden `<input type=file>` two ancestors above the visible "Upload" button; same DataTransfer trick; **then** click the appearing "Replace" button to confirm — Workday otherwise discards the file on next render |
| Ashby | shadow-root piercing then DataTransfer + React-aware value setter |
| iCIMS | iframe-resident input, same DataTransfer; iframe must have content script injected (manifest `all_frames: true`) |
| Taleo | navigates to dedicated upload page; adapter waits for that route, then attaches |

### 5.5 Failure modes

- **CSP forbids object URLs** (rare): fall back to `chrome.runtime.getURL` of a SW-served data URL via `chrome.scripting.executeScript({world:"MAIN"})` injection.
- **Hash mismatch** at content side: abort fill, mark session `error`, ask popup to refetch.
- **Drag-and-drop only uploaders** (some Workday tenants): adapter dispatches synthetic `dragenter/dragover/drop` with `DataTransfer`.



## 6. Dedup Architecture

### 6.1 URL canonicalization

```
canonicalize(url):
  u = new URL(url)
  u.hash = ""
  drop tracking params: utm_*, gh_src, gh_jid (but keep gh_jid as ats hint), src, ref, source, mc_*, fbclid, gclid
  if vendor-known: rewrite to canonical form (e.g., greenhouse: https://boards.greenhouse.io/{org}/jobs/{id})
  lowercase host
  strip trailing slash
  return u.toString()
```

### 6.2 ATS URL parsers

| Vendor | Pattern | Extract |
|--------|---------|---------|
| Greenhouse | `boards.greenhouse.io/{org}/jobs/{id}` or `job-boards.greenhouse.io/{org}/jobs/{id}` | `{org, atsJobId: id}` |
| Lever | `jobs.lever.co/{org}/{uuid}` | `{org, atsJobId: uuid}` |
| Workday | `*.myworkdayjobs.com/{lang}/{site}/job/{loc}/{slug}_{R-id}` | `{tenant, atsJobId: R-id}` |
| Ashby | `jobs.ashbyhq.com/{org}/{uuid}` | `{org, atsJobId: uuid}` |
| iCIMS | `careers-{org}.icims.com/jobs/{id}/{slug}/job` | `{org, atsJobId: id}` |
| Taleo | `*.taleo.net/careersection/*/jobdetail.ftl?job={id}` | `{tenant, atsJobId: id}` |
| SmartRecruiters | `jobs.smartrecruiters.com/{org}/{id}` | `{org, atsJobId: id}` |
| Bamboo | `{org}.bamboohr.com/careers/{id}` | `{org, atsJobId: id}` |

These supplant the broken `hostname.split(".")[0]` heuristic at `popup.js:141` (S3).

### 6.3 Title and company normalization

```
normalizeCompany(s):
  lower; trim; strip punctuation
  drop suffixes: "inc", "llc", "ltd", "co", "corp", "gmbh", "plc", "ag", "sa"
  collapse whitespace
  return result

normalizeTitle(s):
  lower; trim
  strip seniority adornment to a tag set: ["sr","senior","jr","junior","staff","principal","lead","ii","iii","iv"]
  drop department parens, drop location after " - " if matches city list
  canonicalize role synonyms (sde -> software engineer, swe -> software engineer)
  return {core, seniority[]}
```

### 6.4 Match-confidence tiers

| Tier | Rule | Action |
|------|------|--------|
| **exact** | same `(atsVendor, atsJobId)` | reuse session + tracking row + variant |
| **high** | same `canonicalUrl` | reuse |
| **medium** | same `(normalizedCompany, normalizedTitle.core)` and posted-within-30d | offer "looks like the same job — link?" |
| **low** | same `normalizedCompany` only | no auto-link; show in dedup hints panel |

### 6.5 Server endpoint contract

```
POST /api/extension/jobs/resolve
req:  { canonicalUrl, atsVendor, atsJobId, normalizedCompany, normalizedTitle, jdHash }
resp: {
  match: "exact" | "high" | "medium" | "low" | "none",
  job: { id, ... } | null,
  variant: { id, renderHash } | null,
  candidates?: Job[]   // for medium/low
}
```

This single endpoint replaces the popup's current pattern of "list all jobs, find by URL string" (`popup.js:96-98`). Eliminates S1 + S2.

### 6.6 Client-side hint cache

`chrome.storage.local.dedupHints: { [canonicalUrl]: {jobId, variantId, hash, mtime} }` — 7-day TTL, 500-entry LRU. Used to skip the resolve roundtrip when the user re-opens the same posting.

### 6.7 DB indexes (see Section 8 for migration)

```
CREATE UNIQUE INDEX jobs_user_ats_idx
  ON jobs(user_id, ats_vendor, ats_job_id)
  WHERE ats_job_id IS NOT NULL;

CREATE INDEX jobs_user_canonical_url_idx
  ON jobs(user_id, canonical_url);

CREATE INDEX jobs_user_norm_company_title_idx
  ON jobs(user_id, normalized_company, normalized_title_core, posted_at DESC);
```



## 7. Match-Score / ATS-Score Architecture

### 7.1 Where it runs

Server-side, reusing the existing tailor-pipeline embeddings. Client never recomputes; client only requests + caches.

### 7.2 Two scores, one endpoint

- **Match score (semantic)**: cosine(jd_embedding, profile_embedding) → 0..100. Drives "good fit" badges.
- **ATS score (keyword/format)**: rule-based — coverage of JD's required-skill bag in the variant text + format heuristics (no tables, no images, single-column, parsable PDF). Drives "ATS-safe" badge.

```
GET /api/extension/match-score?jobId={id}&variantId={id}
resp: {
  matchScore: 0..100,
  atsScore: 0..100,
  breakdown: {
    skillsCovered: ["typescript","postgres", ...],
    skillsMissing: ["kubernetes"],
    formatIssues: []
  },
  computedAt: ISO,
  cacheKey: "<jdHash>:<variantHash>"
}
```

### 7.3 Latency budget

Target: **first paint < 800 ms** from popup open. Achieved by:

1. Background warms the score on `JOB_SCRAPED` (before user clicks anything) — fire-and-forget POST.
2. Server checks Redis/Postgres cache by `(jdHash, variantHash)`. Hit → ~50 ms total.
3. Miss → embed JD only if not cached (profile embedding is precomputed) → ~400 ms with batched OpenAI/Voyage call.
4. ATS score is pure CPU on extracted variant text → <50 ms.
5. Popup subscribes via Port; receives `SCORE_READY` whenever it lands.

Hard cap: server returns 503 with `Retry-After: 2` if the embedding queue exceeds 1s p95; client shows "Calculating..." and retries once.

### 7.4 Reuse of existing tailor pipeline

The tailor flow already produces JD + variant embeddings during `/api/variants/generate`. Score endpoint **must** read those rather than recomputing. New columns: `jobs.jd_embedding vector(1536)`, `profile_variants.text_embedding vector(1536)` (if not already present).

### 7.5 Failure modes

- Embedding provider down → return cached score with `stale: true`, or rule-only ATS score.
- No variant chosen yet → return generic profile-vs-JD score (uses default profile embedding).
- Score becomes stale (`variantHash` changes after re-tailor) → background invalidates the popup view; popup shows spinner.



## 8. Data-Model Changes

New migration `00030_extension_dedup_and_score.sql` (additive, RLS-safe):

```sql
-- jobs: dedup identity columns
ALTER TABLE jobs
  ADD COLUMN canonical_url        text,
  ADD COLUMN ats_vendor           text,                 -- enum-like text
  ADD COLUMN ats_job_id           text,
  ADD COLUMN normalized_company   text,
  ADD COLUMN normalized_title_core text,
  ADD COLUMN normalized_title_seniority text[],
  ADD COLUMN posted_at            timestamptz,
  ADD COLUMN jd_hash              text,
  ADD COLUMN jd_embedding         vector(1536);

CREATE UNIQUE INDEX jobs_user_ats_idx
  ON jobs(user_id, ats_vendor, ats_job_id)
  WHERE ats_job_id IS NOT NULL;
CREATE INDEX jobs_user_canonical_url_idx ON jobs(user_id, canonical_url);
CREATE INDEX jobs_user_norm_co_title_idx
  ON jobs(user_id, normalized_company, normalized_title_core, posted_at DESC);

-- profile_variants: artifact identity
ALTER TABLE profile_variants
  ADD COLUMN render_hash    text,
  ADD COLUMN text_embedding vector(1536),
  ADD COLUMN text_hash      text;

CREATE INDEX profile_variants_render_hash_idx
  ON profile_variants(user_id, render_hash);

-- match-score cache (server-owned, optional table or use Redis)
CREATE TABLE match_scores (
  user_id        uuid NOT NULL,
  job_id         uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  variant_id     uuid REFERENCES profile_variants(id) ON DELETE CASCADE,
  match_score    smallint NOT NULL,
  ats_score      smallint NOT NULL,
  breakdown      jsonb    NOT NULL,
  jd_hash        text     NOT NULL,
  variant_hash   text,
  computed_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid))
);
ALTER TABLE match_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY match_scores_owner ON match_scores
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- adapter telemetry (best-effort, low-PII)
CREATE TABLE extension_adapter_telemetry (
  id           bigserial PRIMARY KEY,
  user_id      uuid,
  vendor       text,
  url_host     text,
  field_kind   text,
  selector     text,
  confidence   real,
  success      boolean,
  duration_ms  integer,
  ext_version  text,
  created_at   timestamptz DEFAULT now()
);
-- writable only via service role; readable by ops dashboards.
```

Existing tables touched: none structurally renamed; `jobs.job_url` is preserved for backward compatibility, but `canonical_url` becomes the lookup key.

RLS: all new columns inherit existing per-user RLS on `jobs`/`profile_variants`. `match_scores` gets its own owner policy. `extension_adapter_telemetry` is service-role-write, owner-read (for the user's own rows).



## 9. API Changes

Stub.

## 10. Migration / Rollout

Stub.

## 11. Risks, Open Questions, Non-Goals

Stub.

## 12. Sequenced Milestones

Stub.
