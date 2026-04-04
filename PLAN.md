# Resume Profile Platform - Implementation Plan

## Context

**Problem**: Professionals need a clean, secure way to share resume/portfolio information via a dedicated URL (subdomain), with built-in communication channels (email + phone) that protect their personal contact details from spam and scams.

**Current state**: The repo contains a placeholder React 17 + AWS Amplify app with a basic GraphQL resume schema. This will be a **full rewrite** to a modern stack.

**Outcome**: A SaaS platform where users create resume profiles at `slug.resumedomain.com`, with AI-powered review, secure email/phone provisioning, visitor analytics, and SEO — all managed from a dashboard.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 15 (App Router, TypeScript) | SSR for SEO, middleware for subdomain routing, API routes, ISR for profile caching, Vercel-native |
| **Database & Auth** | Supabase (Postgres + GoTrue + Storage) | RLS for data isolation, built-in auth (email/OAuth), realtime, storage for avatars/assets |
| **UI** | Tailwind CSS + shadcn/ui | Accessible components you own (not a dependency), fully themeable for premium templates later |
| **Deployment** | Vercel | Native Next.js support, wildcard subdomains, edge functions, preview deploys |
| **Email (outbound)** | Resend | Developer-first, React email templates, custom domain sending, generous free tier |
| **Email (inbound)** | Cloudflare Email Routing | Free, routes `user@domain.com` to webhook or forwarding address |
| **Phone/Voice** | Twilio | See comparison below |
| **AI Review** | Claude API (Anthropic) | Structured analysis, tool use for section-by-section scoring |
| **Payments** | Stripe | Checkout, Billing, Customer Portal, Webhooks |
| **CAPTCHA** | Cloudflare Turnstile | Privacy-friendly, free, no user friction |
| **Analytics** | Custom (Supabase) + Vercel Analytics | Privacy-respecting, no cookie banners needed |

### Twilio vs Sinch Decision: **Twilio wins**

| Factor | Twilio | Sinch |
|--------|--------|-------|
| Phone provisioning | 100+ countries, instant API | Fewer countries, less mature API |
| Voice/Voicemail | TwiML call flows, built-in voicemail | Capable but smaller ecosystem |
| Call screening | Built-in `<Gather>`, screening add-ons | Manual implementation |
| Spam protection | Add-on marketplace (Nomorobo) | Limited |
| Docs & community | Best-in-class | Adequate but sparser |
| Vercel compat | Webhook-driven, stateless | Less battle-tested |
| Pricing | ~$1/mo per number + $0.0085/min | Slightly cheaper but fewer features |

**Verdict**: Twilio. The call screening and spam protection add-ons directly address the anti-scam requirement.

### Resend Evaluation: **Approved with Cloudflare pairing**

- Resend handles **outbound**: transactional emails, contact notifications, AI review results
- Resend supports React-based email templates via `@react-email/components`
- Free tier: 100 emails/day (sufficient for launch)
- **Gap**: Resend doesn't handle inbound email natively
- **Solution**: Cloudflare Email Routing (free) catches inbound mail at `user@resumedomain.com` and forwards to a webhook (`/api/webhooks/email/inbound`) for processing

---

## Pricing Tiers

| Feature | Free | Pro ($12/mo) | Premium ($29/mo) |
|---------|------|-------------|------------------|
| Public profile | Yes | Yes | Yes |
| Resume sections | 3 max | Unlimited | Unlimited |
| Custom slug/subdomain | Yes | Yes | Yes |
| AI review | 1/month | 10/month | Unlimited + priority |
| Platform email | No | Yes (forward only) | Yes (forward + inbox) |
| Platform phone | No | No | Yes (forward + voicemail) |
| Visitor analytics | Basic (views count) | Full dashboard | Full + export |
| SEO controls | Auto-generated | Full control | Full + JSON-LD override |
| Profile templates | Default only | 3 templates | All templates + custom CSS |
| Contact form | Yes (5/day limit) | Yes (50/day) | Unlimited |
| Custom domain | No | No | Yes (`resume.johndoe.com`) |

---

## Database Schema (Supabase / Postgres)

### Core Tables (16 tables)

```sql
-- CORE
profiles                -- extends auth.users: slug, name, headline, tier, stripe IDs
resume_sections         -- flexible ordered sections: type, title, display_order, visibility

-- SECTION CONTENT
experiences             -- company, position, dates, description, highlights (JSONB)
educations              -- institution, degree, field, dates, gpa
skills                  -- name, proficiency, category
certifications          -- name, issuer, dates, credential_url
projects                -- name, description, url, technologies (JSONB)
custom_sections         -- markdown content for freeform sections

-- COMMUNICATION
platform_emails         -- email_address, routing_mode (forward|inbox), forward_to
email_messages          -- from, subject, body, is_read, is_spam, spam_score
platform_phones         -- phone_number, twilio_sid, routing_mode (forward|voicemail|both)
voicemails              -- caller, recording_url, transcription, is_spam

-- ENGAGEMENT
contact_submissions     -- sender info, message, spam_score, captcha_passed, ip_hash
ai_reviews              -- scores, recommendations (JSONB), model_used, tokens
page_views              -- visitor_id, referrer, UTM params, geo, device, session_duration

-- CONFIG
seo_settings            -- meta_title, meta_description, og_image, keywords, json_ld
templates               -- name, slug, tier_required, config (JSONB)
profile_templates       -- links profile to chosen template + custom overrides
```

### Row Level Security Strategy
- **Profile data**: Owner has full CRUD; public can SELECT if `is_published = true`
- **Communication tables**: Owner-only access; inserts via service role in API routes
- **Contact submissions**: Public INSERT via service role (with CAPTCHA); owner can SELECT
- **Page views**: INSERT via service role (tracking endpoint); owner can SELECT
- **AI reviews**: Owner-only

---

## Architecture: Subdomain Routing

```
middleware.ts logic:
1. Extract hostname from request
2. Strip port (dev) and www prefix
3. Route decision:
   - resumedomain.com         -> serve marketing/dashboard normally
   - app.resumedomain.com     -> serve dashboard routes
   - <slug>.resumedomain.com  -> NextResponse.rewrite('/p/<slug>')
4. Vercel config: wildcard domain *.resumedomain.com
5. Local dev: detect localhost, use ?profile=slug query param fallback
```

---

## Architecture: Service Integration Flow

```
                         Internet
                            |
                     [Cloudflare DNS]
                     *.resumedomain.com
                       /          \
              [Vercel Edge]    [Cloudflare Email Routing]
              middleware.ts     inbound -> webhook
                    |                  |
              [Next.js App]            |
             /     |      \            |
   (marketing) (dashboard) (profile)   |
              \    |      /            |
              [API Routes] <-----------+
            /   |    |    \
     Supabase Stripe Claude Twilio/Resend
```

**Key flows**:
- **Profile view**: subdomain -> middleware rewrite -> SSR/ISR from Supabase -> render with JSON-LD -> client tracker fires beacon
- **Contact form**: CAPTCHA validate -> spam score -> store in DB -> notify owner via Resend
- **Inbound email**: Cloudflare -> webhook -> spam filter -> store in email_messages -> forward if configured
- **Phone call**: Twilio webhook -> TwiML response -> screen caller -> forward or record voicemail -> transcribe -> store

---

## Project Structure

```
resumeapp/
├── middleware.ts                        # Subdomain routing
├── next.config.ts
├── tailwind.config.ts
├── supabase/
│   └── migrations/                     # Numbered SQL migrations
├── src/
│   ├── app/
│   │   ├── (marketing)/                # Landing, pricing, features
│   │   │   ├── page.tsx                # Landing page
│   │   │   └── pricing/page.tsx
│   │   ├── (auth)/                     # Login, signup, callback
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── callback/route.ts
│   │   ├── (dashboard)/                # Authenticated area
│   │   │   └── dashboard/
│   │   │       ├── page.tsx            # Overview
│   │   │       ├── profile/page.tsx    # Edit profile basics
│   │   │       ├── sections/page.tsx   # Drag-drop section manager
│   │   │       ├── ai-review/page.tsx
│   │   │       ├── messages/page.tsx   # Email inbox
│   │   │       ├── voicemails/page.tsx
│   │   │       ├── contacts/page.tsx   # Form submissions
│   │   │       ├── analytics/page.tsx
│   │   │       ├── communication/page.tsx  # Email & phone settings
│   │   │       ├── seo/page.tsx
│   │   │       └── billing/page.tsx
│   │   ├── p/[slug]/page.tsx           # Public profile (subdomain target)
│   │   ├── api/
│   │   │   ├── webhooks/{stripe,email,twilio}/route.ts
│   │   │   ├── contact/route.ts
│   │   │   ├── ai/review/route.ts
│   │   │   └── analytics/track/route.ts
│   │   ├── sitemap.ts
│   │   └── robots.ts
│   ├── components/
│   │   ├── ui/                         # shadcn/ui primitives
│   │   ├── marketing/                  # Hero, pricing table, CTA
│   │   ├── dashboard/                  # Sidebar, editors, charts
│   │   ├── profile/                    # Public profile renderers
│   │   └── shared/                     # Header, footer, loading
│   ├── lib/
│   │   ├── supabase/{client,server,admin,middleware}.ts
│   │   ├── stripe/{client,config,webhooks}.ts
│   │   ├── twilio/{client,twiml}.ts
│   │   ├── resend/client.ts
│   │   ├── claude/{client,prompts,schemas}.ts
│   │   ├── seo/{json-ld,meta}.ts
│   │   ├── rate-limit.ts
│   │   ├── captcha.ts                  # Turnstile verification
│   │   └── spam-filter.ts
│   ├── hooks/                          # use-profile, use-sections, etc.
│   ├── types/                          # database.ts (generated), domain types
│   └── emails/                         # React Email templates
└── tests/
```

---

## Implementation Phases

### Phase 1: Foundation (Complexity: L)
**Goal**: New Next.js project, Supabase integration, auth, basic profile CRUD, landing page

**Steps**:
1. Initialize Next.js 15 project with TypeScript, Tailwind, shadcn/ui
2. Remove all legacy Amplify code and dependencies
3. Set up Supabase project + local dev with `supabase init`
4. Create database migrations for `profiles`, `resume_sections`, and all content tables
5. Configure RLS policies
6. Implement Supabase auth (email/password + Google OAuth)
7. Build auth pages: signup, login, forgot password, OAuth callback
8. Build dashboard layout with sidebar navigation
9. Build profile editor (basic info: name, slug, headline, avatar)
10. Build section manager with drag-and-drop ordering
11. Build section content editors (experience, education, skills, etc.)
12. Build landing page with hero, feature grid, pricing preview
13. Deploy to Vercel with environment variables

**Key files**: `middleware.ts`, `src/app/(auth)/`, `src/app/(dashboard)/`, `src/app/(marketing)/page.tsx`, `supabase/migrations/`

---

### Phase 2: Public Profile + Subdomain Routing + SEO (Complexity: L)
**Goal**: Render beautiful public profiles via subdomain URLs with full SEO

**Steps**:
1. Implement subdomain routing in `middleware.ts`
2. Configure Vercel wildcard domain `*.resumedomain.com`
3. Build profile page at `src/app/p/[slug]/page.tsx` with SSR/ISR
4. Create section renderer components (experience, education, skills, etc.)
5. Implement single-page profile template (clean, professional design)
6. Add JSON-LD structured data (Person schema, JobPosting references)
7. Add dynamic meta tags and Open Graph support
8. Build `sitemap.ts` generating entries for all published profiles
9. Build `robots.ts` with appropriate rules
10. Add contact form component with Cloudflare Turnstile CAPTCHA
11. Implement `/api/contact` route with rate limiting and spam scoring
12. Create `seo_settings` table and dashboard SEO editor

**Key files**: `middleware.ts`, `src/app/p/[slug]/page.tsx`, `src/components/profile/`, `src/lib/seo/`

---

### Phase 3: AI Resume Review (Complexity: M)
**Goal**: Claude-powered resume analysis with section-by-section recommendations

**Steps**:
1. Set up Claude API client in `src/lib/claude/`
2. Design system prompts for resume review (overall + per-section)
3. Define structured output schema (scores, recommendations, ATS check)
4. Build `/api/ai/review` route with auth check and tier-based rate limiting
5. Build AI review dashboard page with results display
6. Store review history in `ai_reviews` table
7. Add "quick suggestions" inline in the section editor
8. Implement tier limits (free: 1/mo, pro: 10/mo, premium: unlimited)

**Key files**: `src/lib/claude/`, `src/app/api/ai/review/route.ts`, `src/app/(dashboard)/dashboard/ai-review/page.tsx`

---

### Phase 4: Email System (Complexity: L)
**Goal**: Platform email addresses with forwarding and inbox

**Steps**:
1. Set up Resend with custom domain (`resumedomain.com`)
2. Set up Cloudflare Email Routing for inbound mail
3. Build email provisioning: assign `slug@resumedomain.com` on profile creation
4. Build `/api/webhooks/email/inbound` to receive Cloudflare-forwarded emails
5. Implement spam scoring on inbound emails (headers, content analysis)
6. Build email forwarding logic (Resend sends to personal email)
7. Build in-app inbox UI in dashboard (Pro+ feature)
8. Build communication settings page (routing mode toggle)
9. Add email notification templates (React Email) for contact form, welcome, etc.
10. Rate limit inbound to prevent abuse

**Key files**: `src/lib/resend/`, `src/app/api/webhooks/email/`, `src/app/(dashboard)/dashboard/messages/`, `src/emails/`

---

### Phase 5: Phone System (Complexity: XL)
**Goal**: Twilio-powered phone numbers with forwarding, voicemail, and call screening

**Steps**:
1. Set up Twilio account and configure API credentials
2. Build phone number provisioning API (`/api/phone/provision`)
3. Build TwiML voice handler (`/api/webhooks/twilio/voice`)
   - Call screening: announce caller, press 1 to accept
   - Forward mode: connect to personal number
   - Voicemail mode: play greeting, record message
   - Both mode: try forward first, fall back to voicemail
4. Implement voicemail transcription (Twilio built-in)
5. Build voicemail inbox in dashboard
6. Build phone settings page (routing mode, custom greeting upload)
7. Add spam call detection (Twilio Nomorobo add-on)
8. Store voicemails with transcriptions in DB
9. Handle number lifecycle (release on downgrade/cancellation)

**Key files**: `src/lib/twilio/`, `src/app/api/webhooks/twilio/`, `src/app/(dashboard)/dashboard/voicemails/`, `src/app/(dashboard)/dashboard/communication/`

---

### Phase 6: Visitor Analytics (Complexity: M)
**Goal**: Privacy-respecting visitor tracking with dashboard charts

**Steps**:
1. Build tracking beacon endpoint (`/api/analytics/track`)
2. Build client-side tracker component (fires on profile view)
3. Collect: page views, referrers, UTM params, geo (from IP via edge), device/browser
4. Use hashed visitor IDs (no cookies, privacy-friendly)
5. Build analytics dashboard with charts (Recharts or similar)
   - Views over time, unique visitors, top referrers
   - Geographic breakdown, device stats
6. Implement tier-based access (free: view count only, pro+: full dashboard)
7. Add data retention policy (auto-delete after 90 days for free, 1 year for paid)

**Key files**: `src/app/api/analytics/track/route.ts`, `src/components/profile/visitor-tracker.tsx`, `src/app/(dashboard)/dashboard/analytics/page.tsx`

---

### Phase 7: Billing & Subscriptions (Complexity: L)
**Goal**: Stripe integration for plan upgrades with feature gating

**Steps**:
1. Set up Stripe products and prices for Free/Pro/Premium
2. Build Stripe Checkout flow for upgrades
3. Build `/api/webhooks/stripe` for subscription lifecycle events
4. Implement feature gating middleware (check tier before feature access)
5. Build billing dashboard page (current plan, usage, invoices)
6. Integrate Stripe Customer Portal for self-serve management
7. Handle downgrades gracefully (release phone numbers, disable inbox, etc.)
8. Add upgrade prompts in dashboard when hitting tier limits

**Key files**: `src/lib/stripe/`, `src/app/api/webhooks/stripe/route.ts`, `src/app/(dashboard)/dashboard/billing/page.tsx`

---

### Phase 8: Premium Features (Complexity: M) - Future
**Goal**: Multiple profile templates, custom CSS, custom domains

**Steps**:
1. Build template system with `templates` and `profile_templates` tables
2. Create 3-5 profile templates (minimal, modern, creative, executive, developer)
3. Build template picker in dashboard
4. Add custom CSS editor for Premium users
5. Implement custom domain support (CNAME verification flow)
6. Build template preview system

---

## Security Considerations (All Phases)

| Layer | Measure |
|-------|---------|
| **Auth** | Supabase GoTrue + RLS on every table, JWT verification in API routes |
| **API routes** | Rate limiting (Upstash Redis or Vercel KV), input validation (Zod) |
| **Contact form** | Cloudflare Turnstile CAPTCHA, server-side spam scoring, IP-based rate limits |
| **Email** | SPF/DKIM/DMARC on sending domain, spam scoring on inbound, content filtering |
| **Phone** | Twilio Nomorobo spam detection, call screening (announce + press key), recording consent |
| **Profile slugs** | Reserved word blocklist (admin, api, www, app, etc.), sanitization |
| **Data** | RLS policies, no raw IPs stored (hashed), GDPR-aware data retention |
| **XSS** | React's built-in escaping, sanitize any markdown/HTML in custom sections (DOMPurify) |
| **CSRF** | SameSite cookies via Supabase auth, origin checking on API routes |
| **Secrets** | All API keys in Vercel env vars, never client-exposed; Supabase anon key vs service role separation |

---

## Environment Variables Needed

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_POOL_SID=

# Resend
RESEND_API_KEY=

# Claude API
ANTHROPIC_API_KEY=

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# App
NEXT_PUBLIC_APP_URL=https://resumedomain.com
NEXT_PUBLIC_APP_DOMAIN=resumedomain.com
```

---

## Verification & Testing Strategy

1. **Unit tests**: Vitest for utility functions (slug validation, spam scoring, meta generation)
2. **Integration tests**: Test API routes with mock Supabase client
3. **E2E tests**: Playwright for critical flows (signup -> create profile -> view public page)
4. **Manual verification per phase**:
   - Phase 1: Sign up, create profile, add sections, view dashboard
   - Phase 2: Visit `slug.resumedomain.com`, check SEO tags with Lighthouse, submit contact form
   - Phase 3: Run AI review, verify recommendations display
   - Phase 4: Send email to platform address, verify forwarding/inbox
   - Phase 5: Call platform number, test forwarding and voicemail
   - Phase 6: Visit profile, check analytics dashboard updates
   - Phase 7: Upgrade plan via Stripe test mode, verify feature unlock

---

## Phase 1 Starting Checklist

1. `npx create-next-app@latest . --typescript --tailwind --app --src-dir`
2. `npx supabase init`
3. `npx shadcn@latest init`
4. Remove all `amplify/` directory and AWS dependencies
5. Create `.env.local` from `.env.example`
6. Write first migration: `profiles` table + RLS
7. Build auth flow
8. Build dashboard shell
9. Deploy to Vercel
