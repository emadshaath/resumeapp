"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Check,
  CreditCard,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Crown,
  ClipboardList,
} from "lucide-react";

interface ProfileBilling {
  tier: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    features: [
      "Public profile page",
      "Up to 3 resume sections",
      "1 AI review per month",
      "Basic analytics (view count)",
      "Contact form (5/day)",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 12,
    features: [
      "Everything in Free",
      "Unlimited resume sections",
      "10 AI reviews per month",
      "Platform email (forwarding)",
      "Full analytics dashboard",
      "Full SEO controls",
      "3 profile templates",
      "Contact form (50/day)",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 29,
    popular: true,
    features: [
      "Everything in Pro",
      "Unlimited AI reviews",
      "Platform email (inbox mode)",
      "Platform phone number",
      "Voicemail with transcription",
      "Analytics export",
      "All templates + custom CSS",
      "Custom domain support",
      "Unlimited contact form",
    ],
  },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab = tabParam === "billing" ? "billing" : tabParam === "apply" ? "apply" : "account";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-zinc-500 mt-1">Manage your account and subscription.</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="apply">Application Preferences</TabsTrigger>
          <TabsTrigger value="billing">Billing & Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <AccountTab />
        </TabsContent>

        <TabsContent value="apply">
          <ApplicationPreferencesTab />
        </TabsContent>

        <TabsContent value="billing">
          <BillingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AccountTab() {
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = createClient();

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Password updated successfully.");
      setNewPassword("");
    }
    setSaving(false);
  }

  async function handleDeleteAccount() {
    if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
    alert("Please contact support to delete your account.");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Change Password</CardTitle>
          <CardDescription>Update your account password.</CardDescription>
        </CardHeader>
        <form onSubmit={handlePasswordUpdate}>
          <CardContent className="space-y-4">
            {message && (
              <div className="rounded-md bg-brand-muted p-3 text-sm text-brand">
                {message}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Updating..." : "Update password"}
            </Button>
          </CardContent>
        </form>
      </Card>

      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="text-lg text-red-600">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleDeleteAccount}>
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

interface AppPrefs {
  work_authorization: string | null;
  sponsorship_required: string | null;
  gender_identity: string | null;
  pronouns: string | null;
  race_ethnicity: string | null;
  veteran_status: string | null;
  disability_status: string | null;
  lgbtq_identity: string | null;
  salary_expectation: string | null;
  notice_period: string | null;
  preferred_work_setting: string | null;
  how_heard_default: string | null;
}

const APP_PREF_FIELDS: (keyof AppPrefs)[] = [
  "work_authorization", "sponsorship_required", "gender_identity", "pronouns",
  "race_ethnicity", "veteran_status", "disability_status", "lgbtq_identity",
  "salary_expectation", "notice_period", "preferred_work_setting", "how_heard_default",
];

function ApplicationPreferencesTab() {
  const [prefs, setPrefs] = useState<AppPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("profiles")
        .select(APP_PREF_FIELDS.join(", "))
        .eq("id", user.id)
        .single();

      if (data) setPrefs(data as unknown as AppPrefs);
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!prefs) return;
    setSaving(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        work_authorization: prefs.work_authorization || null,
        sponsorship_required: prefs.sponsorship_required || null,
        gender_identity: prefs.gender_identity || null,
        pronouns: prefs.pronouns || null,
        race_ethnicity: prefs.race_ethnicity || null,
        veteran_status: prefs.veteran_status || null,
        disability_status: prefs.disability_status || null,
        lgbtq_identity: prefs.lgbtq_identity || null,
        salary_expectation: prefs.salary_expectation || null,
        notice_period: prefs.notice_period || null,
        preferred_work_setting: prefs.preferred_work_setting || null,
        how_heard_default: prefs.how_heard_default || null,
      })
      .eq("id", user.id);

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Application preferences saved." });
    }
    setSaving(false);
  }

  function updatePref(key: keyof AppPrefs, value: string) {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: value });
  }

  if (loading) {
    return <div className="py-12 text-center text-zinc-500">Loading preferences...</div>;
  }

  if (!prefs) {
    return <div className="py-12 text-center text-zinc-500">Profile not found.</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {message && (
        <div className={`rounded-md p-3 text-sm ${message.type === "success" ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Application Preferences
          </CardTitle>
          <CardDescription>
            Pre-fill common job application questions. These are stored securely and only used to auto-fill forms via the Chrome extension. All fields are optional.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Work Authorization */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="work_authorization">Authorized to work in the US?</Label>
              <select
                id="work_authorization"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                value={prefs.work_authorization || ""}
                onChange={(e) => updatePref("work_authorization", e.target.value)}
              >
                <option value="">Not set</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sponsorship_required">Require visa sponsorship?</Label>
              <select
                id="sponsorship_required"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                value={prefs.sponsorship_required || ""}
                onChange={(e) => updatePref("sponsorship_required", e.target.value)}
              >
                <option value="">Not set</option>
                <option value="no">No</option>
                <option value="yes">Yes, now</option>
                <option value="future">Yes, in the future</option>
              </select>
            </div>
          </div>

          {/* Work Preferences */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="preferred_work_setting">Preferred work setting</Label>
              <select
                id="preferred_work_setting"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                value={prefs.preferred_work_setting || ""}
                onChange={(e) => updatePref("preferred_work_setting", e.target.value)}
              >
                <option value="">Not set</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notice_period">Notice period</Label>
              <select
                id="notice_period"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                value={prefs.notice_period || ""}
                onChange={(e) => updatePref("notice_period", e.target.value)}
              >
                <option value="">Not set</option>
                <option value="immediate">Immediately available</option>
                <option value="1 week">1 week</option>
                <option value="2 weeks">2 weeks</option>
                <option value="3 weeks">3 weeks</option>
                <option value="1 month">1 month</option>
                <option value="2 months">2 months</option>
                <option value="3 months">3 months</option>
              </select>
            </div>
          </div>

          {/* Salary & Source */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="salary_expectation">Salary expectation (USD/year)</Label>
              <Input
                id="salary_expectation"
                placeholder="e.g. 120000 or 100000-130000"
                value={prefs.salary_expectation || ""}
                onChange={(e) => updatePref("salary_expectation", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="how_heard_default">Default &quot;How did you hear?&quot;</Label>
              <Input
                id="how_heard_default"
                placeholder="e.g. LinkedIn, Company website, Referral"
                value={prefs.how_heard_default || ""}
                onChange={(e) => updatePref("how_heard_default", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EEO / Demographics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Demographic Information (EEO)</CardTitle>
          <CardDescription>
            Many applications ask voluntary EEO questions. Set your answers once here and they&apos;ll be auto-filled consistently. Select &quot;Prefer not to say&quot; for any you&apos;d like to skip.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gender_identity">Gender identity</Label>
              <select
                id="gender_identity"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                value={prefs.gender_identity || ""}
                onChange={(e) => updatePref("gender_identity", e.target.value)}
              >
                <option value="">Not set</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non_binary">Non-binary</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pronouns">Pronouns</Label>
              <select
                id="pronouns"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                value={prefs.pronouns || ""}
                onChange={(e) => updatePref("pronouns", e.target.value)}
              >
                <option value="">Not set</option>
                <option value="he/him">He/Him</option>
                <option value="she/her">She/Her</option>
                <option value="they/them">They/Them</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="race_ethnicity">Race / Ethnicity</Label>
              <select
                id="race_ethnicity"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                value={prefs.race_ethnicity || ""}
                onChange={(e) => updatePref("race_ethnicity", e.target.value)}
              >
                <option value="">Not set</option>
                <option value="american_indian">American Indian / Alaskan Native</option>
                <option value="asian">Asian</option>
                <option value="black">Black or African American</option>
                <option value="hispanic">Hispanic / Latinx</option>
                <option value="middle_eastern">Middle Eastern or North African</option>
                <option value="pacific_islander">Pacific Islander or Native Hawaiian</option>
                <option value="white">White</option>
                <option value="two_or_more">Two or more races</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="veteran_status">Veteran status</Label>
              <select
                id="veteran_status"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                value={prefs.veteran_status || ""}
                onChange={(e) => updatePref("veteran_status", e.target.value)}
              >
                <option value="">Not set</option>
                <option value="veteran">I am a veteran</option>
                <option value="not_veteran">I am not a veteran</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="disability_status">Disability status</Label>
              <select
                id="disability_status"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                value={prefs.disability_status || ""}
                onChange={(e) => updatePref("disability_status", e.target.value)}
              >
                <option value="">Not set</option>
                <option value="yes">Yes, I have a disability</option>
                <option value="no">No, I do not have a disability</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lgbtq_identity">LGBTQIA+ identity</Label>
              <select
                id="lgbtq_identity"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                value={prefs.lgbtq_identity || ""}
                onChange={(e) => updatePref("lgbtq_identity", e.target.value)}
              >
                <option value="">Not set</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </form>
  );
}

function BillingTab() {
  const [profile, setProfile] = useState<ProfileBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("profiles")
        .select("tier, stripe_customer_id, stripe_subscription_id")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data as ProfileBilling);
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  async function handleCheckout(planId: string) {
    setCheckoutLoading(planId);
    setError(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
      } else if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      setError("Network error. Please try again.");
    }

    setCheckoutLoading(null);
  }

  async function handlePortal() {
    setPortalLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
      } else if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      setError("Network error. Please try again.");
    }

    setPortalLoading(false);
  }

  if (loading) {
    return <div className="py-12 text-center text-zinc-500">Loading billing...</div>;
  }

  const currentTier = profile?.tier || "free";
  const tierLevel = { free: 0, pro: 1, premium: 2 }[currentTier] || 0;

  return (
    <div className="space-y-6">
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300 flex items-center gap-2">
          <Check className="h-4 w-4 flex-shrink-0" />
          Your subscription is now active! Enjoy your new features.
        </div>
      )}
      {canceled && (
        <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          Checkout was canceled. You can try again anytime.
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Badge
                variant={currentTier === "premium" ? "default" : currentTier === "pro" ? "secondary" : "outline"}
                className="text-sm px-3 py-1"
              >
                {currentTier === "premium" && <Crown className="h-3.5 w-3.5 mr-1" />}
                {currentTier === "pro" && <Sparkles className="h-3.5 w-3.5 mr-1" />}
                {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
              </Badge>
              {currentTier !== "free" && (
                <span className="text-sm text-zinc-500">
                  ${PLANS.find((p) => p.id === currentTier)?.price}/month
                </span>
              )}
            </div>
            {profile?.stripe_subscription_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePortal}
                disabled={portalLoading}
                className="self-start sm:self-auto"
              >
                {portalLoading ? "Opening..." : "Manage Subscription"}
                <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => {
          const planLevel = { free: 0, pro: 1, premium: 2 }[plan.id] || 0;
          const isCurrent = currentTier === plan.id;
          const isDowngrade = planLevel < tierLevel;
          const isUpgrade = planLevel > tierLevel;

          return (
            <Card
              key={plan.id}
              className={`relative ${isCurrent ? "border-brand ring-1 ring-brand" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge>Most Popular</Badge>
                </div>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription>
                  {plan.price === 0 ? (
                    <span className="text-2xl font-bold text-zinc-900 dark:text-white">Free</span>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-zinc-900 dark:text-white">
                        ${plan.price}
                      </span>
                      <span className="text-zinc-500">/month</span>
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="text-sm flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-zinc-600 dark:text-zinc-400">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : isDowngrade ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handlePortal}
                    disabled={portalLoading || !profile?.stripe_subscription_id}
                  >
                    {profile?.stripe_subscription_id ? "Downgrade via Portal" : "Current Plan: Free"}
                  </Button>
                ) : isUpgrade ? (
                  <Button
                    className="w-full"
                    onClick={() => handleCheckout(plan.id)}
                    disabled={checkoutLoading !== null}
                  >
                    {checkoutLoading === plan.id ? "Redirecting..." : `Upgrade to ${plan.name}`}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Billing Info */}
      {profile?.stripe_customer_id && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-500">Billing Management</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
            <p>
              Use the Stripe Customer Portal to update your payment method, view invoices,
              or cancel your subscription.
            </p>
            <Button variant="outline" size="sm" onClick={handlePortal} disabled={portalLoading}>
              {portalLoading ? "Opening..." : "Open Customer Portal"}
              <ExternalLink className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
