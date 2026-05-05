import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/landing/animations";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rezm.ai";
const LAST_UPDATED = "April 28, 2026";
const CONTACT_EMAIL = "privacy@rezm.ai";

export const metadata: Metadata = {
  title: "Privacy Policy — rezm.ai",
  description:
    "How rezm.ai collects, uses, stores, and protects your data across our website, dashboard, and Smart Apply browser extension.",
  alternates: { canonical: `${APP_URL}/privacy` },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <FadeIn>
        <p className="text-xs uppercase tracking-wider text-brand font-semibold">
          Legal
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Last updated: {LAST_UPDATED}
        </p>
      </FadeIn>

      <div className="prose prose-zinc dark:prose-invert mt-10 max-w-none prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-8 prose-p:leading-relaxed prose-li:leading-relaxed">
        <p>
          rezm.ai (&quot;rezm.ai&quot;, &quot;we&quot;, &quot;us&quot;) builds tools that help
          professionals create a secure online resume profile and apply to jobs
          more efficiently. This policy explains what personal data we collect,
          why we collect it, how it is stored and shared, and the rights you
          have over it. It applies to:
        </p>
        <ul>
          <li>
            The rezm.ai website and dashboard at{" "}
            <Link href="/">rezm.ai</Link> and <code>*.rezm.ai</code> subdomains.
          </li>
          <li>
            The <strong>rezm.ai — Smart Apply</strong> browser extension
            distributed through the Chrome Web Store.
          </li>
          <li>
            Our public APIs used by the extension and any official integrations.
          </li>
        </ul>

        <h2 id="summary">In short</h2>
        <ul>
          <li>
            We collect only the data we need to run the product you signed up
            for.
          </li>
          <li>
            We do not sell your personal data, ever.
          </li>
          <li>
            We do not show ads and do not share your data with advertisers.
          </li>
          <li>
            We use product analytics (PostHog) to understand how rezm.ai is
            used. These cookies only load after you click <em>Accept</em> in
            the consent banner; we never share this data with advertisers and
            do not track you across the web.
          </li>
          <li>
            You can export or delete your data at any time from the dashboard
            or by emailing{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </li>
        </ul>

        <h2 id="data-we-collect">1. Data we collect</h2>

        <h3>1.1 Account information</h3>
        <p>
          When you create an account we collect your email address and a hashed
          password (or, if you sign in via a social provider, the basic profile
          fields that provider returns: name, email, avatar URL). We also store
          your chosen subdomain and account preferences.
        </p>

        <h3>1.2 Profile content you provide</h3>
        <p>
          To build your resume profile and fill applications, you provide
          information such as your full name, contact details (email, phone,
          mailing address), professional history (job titles, employers,
          dates, descriptions), education, skills, links to your LinkedIn or
          portfolio, work-authorization status, and any optional EEO
          (Equal Employment Opportunity) self-identification fields. You
          control which fields to add and which to make public.
        </p>

        <h3>1.3 Resume files and uploads</h3>
        <p>
          PDFs, images (avatar, project covers), and any other files you
          upload are stored in our managed object storage and served only to
          you, to people you share with, and — when you click Smart Apply — to
          the application page you are filling.
        </p>

        <h3>1.4 Job application activity</h3>
        <p>
          When you use Smart Apply (in the dashboard or the browser
          extension), we collect:
        </p>
        <ul>
          <li>The URL and title of the job posting page you are applying on.</li>
          <li>
            The job description text scraped from that page, used by our AI to
            generate a tailored resume variant and draft answers to long-form
            questions.
          </li>
          <li>
            Records of which jobs you saved, applied to, or asked us to track
            — including the AI-generated resume variant and answer drafts.
          </li>
        </ul>

        <h3>1.5 Authentication tokens (extension)</h3>
        <p>
          The Smart Apply extension stores a short-lived rezm.ai bearer token
          in <code>chrome.storage.local</code> on your device after you sign
          in. The token, your email, and the token&apos;s expiration timestamp
          are the only values stored locally by the extension. Clicking
          &quot;Disconnect&quot; in the extension popup deletes them.
        </p>

        <h3>1.6 Visitor analytics on your public profile</h3>
        <p>
          When someone visits your public profile at{" "}
          <code>yourname.rezm.ai</code>, we record an aggregate, cookie-free
          page view: the timestamp, country (derived from IP and immediately
          discarded), referrer, and rough device class. We do not place
          tracking cookies, do not fingerprint visitors, and do not share this
          data with third parties. Visitor IP addresses are hashed before
          storage and used only for de-duplicating views and rate-limiting.
        </p>

        <h3>1.7 Communications you send through the platform</h3>
        <p>
          If you have a paid plan that includes platform email or a platform
          phone number, messages sent to those endpoints are stored so we can
          deliver them to you. We do not read this content for marketing or
          training purposes.
        </p>

        <h3>1.8 Technical and security logs</h3>
        <p>
          Our servers retain short-lived request logs (IP address, user agent,
          timestamp, request path, response code) for security, abuse
          prevention, and debugging. These logs are deleted on a rolling basis
          (typically within 30 days).
        </p>

        <h3>1.9 Payment information</h3>
        <p>
          Subscription payments are processed by Stripe. We never see or store
          your full card number. We do receive metadata necessary to operate
          your subscription: the last 4 digits, card brand, billing country,
          and the Stripe customer/subscription IDs.
        </p>

        <h2 id="how-we-use">2. How we use your data</h2>
        <ul>
          <li>
            <strong>Provide the product.</strong> Render your profile, fill
            out applications, generate AI-tailored resumes, send messages
            through your platform email or phone number, export PDFs.
          </li>
          <li>
            <strong>Account management.</strong> Authenticate you, send
            transactional emails (password resets, billing receipts, security
            alerts), and respond to support requests.
          </li>
          <li>
            <strong>AI features.</strong> Send the relevant subset of your
            profile and the job description to our AI provider so it can
            generate a tailored resume variant or draft answers. We do not
            allow our AI providers to train models on your data — see Section
            5.
          </li>
          <li>
            <strong>Improve the product.</strong> Aggregate metrics about
            feature usage so we know what to build next. When you accept
            cookies, this includes PostHog product analytics events keyed to
            an anonymous distinct ID (and, if you are signed in, to your
            account ID). We do not use your resume content for product
            analytics.
          </li>
          <li>
            <strong>Security and abuse prevention.</strong> Detect fraud, rate
            limit, and investigate policy violations.
          </li>
          <li>
            <strong>Legal compliance.</strong> Comply with applicable laws,
            respond to lawful requests, and enforce our Terms.
          </li>
        </ul>
        <p>
          We do <strong>not</strong> use your data to determine
          creditworthiness, for lending decisions, or for advertising.
        </p>

        <h2 id="extension-specifics">3. Smart Apply extension — what it does and does not do</h2>
        <p>
          The Smart Apply extension is a Manifest V3 Chrome extension. Its
          single purpose is to help you fill out job applications using your
          rezm.ai profile.
        </p>
        <ul>
          <li>
            The content script is registered to run on all sites because job
            applications live on thousands of different domains and ATS
            providers; we cannot enumerate them in advance.
          </li>
          <li>
            On a given page the extension performs <strong>no work</strong> until
            you explicitly click Auto-Fill, Smart Tailor &amp; Fill, AI Answer
            Remaining Questions, or Track This Job in the popup — or open a URL
            we generated containing the <code>rezm_auto_apply</code> parameter.
          </li>
          <li>
            When you click one of those actions, the extension reads the URL
            and visible text of the active tab and sends it to{" "}
            <code>https://*.rezm.ai/*</code> over HTTPS to fetch profile fields,
            generate a tailored resume, or draft answers.
          </li>
          <li>
            The extension does <strong>not</strong> read or transmit data from
            tabs you are not actively interacting with. It does not log
            keystrokes, mouse movements, or page content unrelated to job
            applications.
          </li>
          <li>
            The extension does not run remote code: all of its JavaScript is
            included in the published package; nothing is loaded via{" "}
            <code>eval</code>, dynamic <code>import()</code> of remote URLs, or
            external <code>&lt;script&gt;</code> tags.
          </li>
        </ul>

        <h2 id="sharing">4. When we share data</h2>
        <p>We share personal data only in the following limited situations:</p>
        <ul>
          <li>
            <strong>With you.</strong> Your public profile is visible to
            anyone who visits its URL. You decide which sections are public.
          </li>
          <li>
            <strong>With the application page you are filling.</strong> When
            you click Auto-Fill or Smart Tailor &amp; Fill, the extension
            writes profile fields into the form on the page in front of you.
            You always review the page and click the site&apos;s own Submit
            button — submission is never automated.
          </li>
          <li>
            <strong>Service providers (sub-processors).</strong> We use
            vetted vendors who process data on our behalf under contractual
            confidentiality and security obligations. Current sub-processors
            include:
            <ul>
              <li>Supabase — managed Postgres database and authentication.</li>
              <li>Vercel — application hosting.</li>
              <li>
                Anthropic and OpenAI — AI inference for resume tailoring and
                answer drafting. Data is sent through their API endpoints
                under terms that prohibit training on our customers&apos; data.
              </li>
              <li>Stripe — subscription billing and payment processing.</li>
              <li>Resend — transactional email delivery.</li>
              <li>Twilio — phone and SMS routing for paid platform numbers.</li>
              <li>Cloudflare — DNS, CDN, and DDoS protection.</li>
              <li>
                PostHog — product analytics. Only receives data after you
                accept cookies.
              </li>
            </ul>
          </li>
          <li>
            <strong>Legal requests.</strong> We will disclose data when
            required by valid legal process, or when we believe in good faith
            that disclosure is necessary to protect rights, safety, or
            property.
          </li>
          <li>
            <strong>Business transfers.</strong> If rezm.ai is involved in a
            merger, acquisition, or asset sale, your data may be transferred
            as part of that transaction. You will be notified before your
            data becomes subject to a different privacy policy.
          </li>
        </ul>
        <p>
          We <strong>do not sell</strong> personal data and <strong>do not
          share</strong> personal data for cross-context behavioral advertising
          (as those terms are defined under the CCPA/CPRA).
        </p>

        <h2 id="ai">5. AI processing</h2>
        <p>
          When you use AI features (Smart Tailor &amp; Fill, AI Answer
          Remaining Questions, AI Resume Review), we send the relevant subset
          of your profile and the job description to our AI providers. We use
          their API products under terms that:
        </p>
        <ul>
          <li>Forbid the provider from training models on inputs or outputs.</li>
          <li>Limit retention of inputs and outputs for abuse monitoring only (typically 30 days or less).</li>
          <li>Process data in regions covered by appropriate transfer mechanisms.</li>
        </ul>

        <h2 id="storage">6. Where data is stored and how it is protected</h2>
        <p>
          Data is stored in the United States and the European Union depending
          on the service. All traffic between you and rezm.ai is encrypted in
          transit with TLS 1.2 or higher. Data at rest is encrypted using the
          standard encryption provided by our cloud providers. Access to
          production data is restricted to a small number of staff and is
          logged.
        </p>

        <h2 id="retention">7. Data retention</h2>
        <ul>
          <li>
            Account and profile data: retained while your account is active,
            and for up to 30 days after deletion to allow recovery, then
            permanently deleted.
          </li>
          <li>
            Resume variants and job application records: retained while your
            account is active. You can delete individual items at any time.
          </li>
          <li>
            Server access logs: rolling deletion within 30 days.
          </li>
          <li>
            Billing records: retained for the period required by tax and
            accounting law (typically 7 years).
          </li>
          <li>
            Extension local storage: deleted whenever you click
            &quot;Disconnect&quot; in the popup or uninstall the extension.
          </li>
        </ul>

        <h2 id="rights">8. Your rights</h2>
        <p>
          Depending on where you live, you may have rights under laws such as
          GDPR (EU/UK), CCPA/CPRA (California), and similar state and
          national privacy laws, including the right to:
        </p>
        <ul>
          <li>Access the personal data we hold about you.</li>
          <li>Correct inaccurate data.</li>
          <li>Delete your data.</li>
          <li>Receive a copy of your data in a portable format.</li>
          <li>Object to or restrict certain processing.</li>
          <li>Withdraw consent (where processing is based on consent).</li>
          <li>Lodge a complaint with your local data protection authority.</li>
        </ul>
        <p>
          You can exercise most of these rights directly from the dashboard
          (Settings → Account → Export / Delete). You may also email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will
          respond within 30 days.
        </p>

        <h2 id="cookies">9. Cookies and similar technologies</h2>
        <p>
          rezm.ai uses two categories of cookies and local storage:
        </p>
        <ul>
          <li>
            <strong>Strictly necessary.</strong> Authentication cookies that
            keep you signed in, your theme preference, and the cookie-consent
            choice itself. These load without consent because the product
            cannot function without them.
          </li>
          <li>
            <strong>Product analytics (PostHog).</strong> When you click
            <em> Accept</em> in our cookie banner, we load PostHog, which sets
            first-party cookies and uses local storage to assign you an
            anonymous distinct ID, capture pageviews and clicks, and — once
            you sign in — associate that ID with your account so we can debug
            issues and improve the product. If you click <em>Reject</em>, or
            close the banner without choosing, PostHog is not loaded and no
            analytics cookies are set. You can change your choice at any time
            by clearing rezm.ai site data in your browser; the banner will
            reappear on your next visit.
          </li>
        </ul>
        <p>
          We do not use third-party advertising cookies and do not allow our
          analytics provider to share your data with advertisers.
        </p>

        <h2 id="children">10. Children</h2>
        <p>
          rezm.ai is not directed to children under 16. We do not knowingly
          collect personal data from children. If you believe a child has
          provided us with personal data, please contact us and we will
          delete it.
        </p>

        <h2 id="international">11. International transfers</h2>
        <p>
          If you access rezm.ai from outside the country where our servers
          are located, your data will be transferred to, processed, and
          stored in that country. For transfers from the EEA, UK, and
          Switzerland we rely on Standard Contractual Clauses or other
          approved mechanisms.
        </p>

        <h2 id="changes">12. Changes to this policy</h2>
        <p>
          We will update this policy when our practices change. The
          &quot;Last updated&quot; date at the top reflects the most recent
          revision. For material changes we will notify you by email or
          through an in-product notice before the change takes effect.
        </p>

        <h2 id="contact">13. Contact us</h2>
        <p>
          Questions, requests, or complaints? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We aim to
          respond within five business days.
        </p>
      </div>
    </div>
  );
}
