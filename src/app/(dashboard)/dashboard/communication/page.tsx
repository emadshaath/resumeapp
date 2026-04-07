"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Mail,
  Shield,
  Inbox,
  Forward,
  Check,
  AlertCircle,
  Lock,
  Phone,
  PhoneForwarded,
  Voicemail,
  Trash2,
} from "lucide-react";
import { getEffectiveTier } from "@/lib/stripe/feature-gate";
import type { Tier } from "@/types/database";

/* ───────── Email types & tab ───────── */

type EmailRoutingMode = "forward" | "inbox";

interface PlatformEmailData {
  id: string;
  email_address: string;
  routing_mode: EmailRoutingMode;
  forward_to: string | null;
  is_active: boolean;
}

function EmailTab({ profile }: { profile: { tier: string; slug: string; email: string } | null }) {
  const [platformEmail, setPlatformEmail] = useState<PlatformEmailData | null>(null);
  const [forwardTo, setForwardTo] = useState("");
  const [routingMode, setRoutingMode] = useState<EmailRoutingMode>("forward");
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: emailData } = await supabase
        .from("platform_emails")
        .select("*")
        .eq("profile_id", user.id)
        .single();

      if (emailData) {
        setPlatformEmail(emailData as PlatformEmailData);
        setForwardTo(emailData.forward_to || "");
        setRoutingMode(emailData.routing_mode as EmailRoutingMode);
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function provisionEmail() {
    setProvisioning(true);
    setError(null);

    const res = await fetch("/api/email/provision", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: emailData } = await supabase
          .from("platform_emails")
          .select("*")
          .eq("profile_id", user.id)
          .single();
        if (emailData) {
          setPlatformEmail(emailData as PlatformEmailData);
          setForwardTo(emailData.forward_to || "");
          setRoutingMode(emailData.routing_mode as EmailRoutingMode);
        }
      }
    }
    setProvisioning(false);
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!platformEmail) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    if (routingMode === "inbox" && profile?.tier !== "premium") {
      setError("In-app inbox requires a Premium plan. Please use forwarding mode.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("platform_emails")
      .update({
        routing_mode: routingMode,
        forward_to: routingMode === "forward" ? forwardTo : platformEmail.forward_to,
      })
      .eq("id", platformEmail.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setPlatformEmail({
        ...platformEmail,
        routing_mode: routingMode,
        forward_to: routingMode === "forward" ? forwardTo : platformEmail.forward_to,
      });
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="py-20 text-center text-zinc-500">Loading email settings...</div>;
  }

  const isFree = profile?.tier === "free";
  const isPremium = profile?.tier === "premium";

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300 flex items-center gap-2">
          <Check className="h-4 w-4 flex-shrink-0" />
          Settings saved successfully.
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Platform Email
              </CardTitle>
              <CardDescription>
                Get a professional email address at your profile domain.
              </CardDescription>
            </div>
            {platformEmail && (
              <Badge variant="success">Active</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isFree ? (
            <div className="text-center py-6">
              <Lock className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-500 mb-4">
                Platform email is available on Pro and Premium plans.
              </p>
              <Button variant="outline" onClick={() => router.push("/dashboard/settings?tab=billing")}>
                Upgrade Plan
              </Button>
            </div>
          ) : !platformEmail ? (
            <div className="text-center py-6">
              <Mail className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="font-medium mb-1">
                Get your email: <span className="font-mono">{profile?.slug}@rezm.ai</span>
              </p>
              <p className="text-sm text-zinc-500 mb-4">
                Receive professional emails without exposing your personal address.
              </p>
              <Button onClick={provisionEmail} disabled={provisioning}>
                {provisioning ? "Setting up..." : "Activate Platform Email"}
              </Button>
            </div>
          ) : (
            <form onSubmit={saveSettings} className="space-y-6">
              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500">Your platform email</p>
                    <p className="text-lg font-mono font-medium mt-0.5">
                      {platformEmail.email_address}
                    </p>
                  </div>
                  <Badge variant={platformEmail.is_active ? "success" : "secondary"}>
                    {platformEmail.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-medium">Email Routing</Label>
                <p className="text-sm text-zinc-500">
                  Choose how incoming emails are handled.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setRoutingMode("forward")}
                    className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all ${
                      routingMode === "forward"
                        ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                    }`}
                  >
                    <Forward className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                    <div>
                      <p className="font-medium text-sm">Forward</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Emails forwarded to your personal inbox
                      </p>
                    </div>
                    {routingMode === "forward" && (
                      <Badge variant="default" className="mt-1">Selected</Badge>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => isPremium && setRoutingMode("inbox")}
                    className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all ${
                      !isPremium ? "opacity-50 cursor-not-allowed" : ""
                    } ${
                      routingMode === "inbox"
                        ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                    }`}
                  >
                    <Inbox className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                    <div>
                      <p className="font-medium text-sm flex items-center gap-2">
                        In-App Inbox
                        {!isPremium && <Badge variant="secondary" className="text-xs">Premium</Badge>}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Read and reply to emails within the dashboard
                      </p>
                    </div>
                    {routingMode === "inbox" && (
                      <Badge variant="default" className="mt-1">Selected</Badge>
                    )}
                  </button>
                </div>
              </div>

              {routingMode === "forward" && (
                <div className="space-y-2">
                  <Label htmlFor="forwardTo">Forward emails to</Label>
                  <Input
                    id="forwardTo"
                    type="email"
                    value={forwardTo}
                    onChange={(e) => setForwardTo(e.target.value)}
                    placeholder="your-personal@email.com"
                    required={routingMode === "forward"}
                  />
                  <p className="text-xs text-zinc-500">
                    Incoming emails to {platformEmail.email_address} will be forwarded here.
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Email Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            All incoming emails are automatically scanned for spam and phishing attempts.
            Suspicious emails are flagged and stored separately.
          </p>
          <p>
            Your personal email address is never exposed to senders. All communication
            goes through your platform email address.
          </p>
          <p>
            Contact form submissions include additional protections: rate limiting,
            CAPTCHA verification, and content-based spam scoring.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── Phone types & tab ───────── */

type PhoneRoutingMode = "forward" | "voicemail" | "both";

interface PlatformPhoneData {
  id: string;
  phone_number: string;
  routing_mode: PhoneRoutingMode;
  forward_to: string | null;
  custom_greeting_url: string | null;
  is_active: boolean;
}

function PhoneTab({ profile }: { profile: { tier: string } | null }) {
  const [phone, setPhone] = useState<PlatformPhoneData | null>(null);
  const [routingMode, setRoutingMode] = useState<PhoneRoutingMode>("voicemail");
  const [forwardTo, setForwardTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: phoneData } = await supabase
        .from("platform_phones")
        .select("*")
        .eq("profile_id", user.id)
        .single();

      if (phoneData) {
        setPhone(phoneData as PlatformPhoneData);
        setRoutingMode(phoneData.routing_mode as PhoneRoutingMode);
        setForwardTo(phoneData.forward_to || "");
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function provisionPhone() {
    setProvisioning(true);
    setError(null);

    const res = await fetch("/api/phone/provision", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: phoneData } = await supabase
          .from("platform_phones")
          .select("*")
          .eq("profile_id", user.id)
          .single();
        if (phoneData) {
          setPhone(phoneData as PlatformPhoneData);
          setRoutingMode(phoneData.routing_mode as PhoneRoutingMode);
          setForwardTo(phoneData.forward_to || "");
        }
      }
    }
    setProvisioning(false);
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!phone) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    if ((routingMode === "forward" || routingMode === "both") && !forwardTo) {
      setError("Please enter a phone number to forward calls to.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("platform_phones")
      .update({
        routing_mode: routingMode,
        forward_to: forwardTo || null,
      })
      .eq("id", phone.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setPhone({ ...phone, routing_mode: routingMode, forward_to: forwardTo || null });
    }
    setSaving(false);
  }

  async function releasePhone() {
    if (!confirm("Are you sure you want to release your phone number? This cannot be undone.")) return;

    setReleasing(true);
    setError(null);

    const res = await fetch("/api/phone/provision", { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
    } else {
      setPhone(null);
    }
    setReleasing(false);
  }

  if (loading) {
    return <div className="py-20 text-center text-zinc-500">Loading phone settings...</div>;
  }

  const isPremium = profile?.tier === "premium";

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300 flex items-center gap-2">
          <Check className="h-4 w-4 flex-shrink-0" />
          Settings saved successfully.
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Platform Phone Number
              </CardTitle>
              <CardDescription>
                Get a dedicated phone number with call forwarding and voicemail.
              </CardDescription>
            </div>
            {phone && <Badge variant="success">Active</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {!isPremium ? (
            <div className="text-center py-6">
              <Lock className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-500 mb-4">
                Platform phone numbers are available on the Premium plan.
              </p>
              <Button variant="outline" onClick={() => router.push("/dashboard/settings?tab=billing")}>
                Upgrade to Premium
              </Button>
            </div>
          ) : !phone ? (
            <div className="text-center py-6">
              <Phone className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="font-medium mb-1">Get your dedicated phone number</p>
              <p className="text-sm text-zinc-500 mb-4">
                Receive calls without exposing your personal number. Includes voicemail with transcription.
              </p>
              <Button onClick={provisionPhone} disabled={provisioning}>
                {provisioning ? "Provisioning..." : "Activate Phone Number"}
              </Button>
            </div>
          ) : (
            <form onSubmit={saveSettings} className="space-y-6">
              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500">Your platform number</p>
                    <p className="text-lg font-mono font-medium mt-0.5">{phone.phone_number}</p>
                  </div>
                  <Badge variant={phone.is_active ? "success" : "secondary"}>
                    {phone.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-medium">Call Routing</Label>
                <p className="text-sm text-zinc-500">Choose how incoming calls are handled.</p>

                <div className="grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setRoutingMode("forward")}
                    className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all ${
                      routingMode === "forward"
                        ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
                    }`}
                  >
                    <PhoneForwarded className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                    <div>
                      <p className="font-medium text-sm">Forward</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Calls forwarded to your phone</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoutingMode("voicemail")}
                    className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all ${
                      routingMode === "voicemail"
                        ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
                    }`}
                  >
                    <Voicemail className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                    <div>
                      <p className="font-medium text-sm">Voicemail</p>
                      <p className="text-xs text-zinc-500 mt-0.5">All calls go to voicemail</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoutingMode("both")}
                    className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all ${
                      routingMode === "both"
                        ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
                    }`}
                  >
                    <Phone className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                    <div>
                      <p className="font-medium text-sm">Both</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Try forward, voicemail on no answer</p>
                    </div>
                  </button>
                </div>
              </div>

              {(routingMode === "forward" || routingMode === "both") && (
                <div className="space-y-2">
                  <Label htmlFor="phoneForwardTo">Forward calls to</Label>
                  <Input
                    id="phoneForwardTo"
                    type="tel"
                    value={forwardTo}
                    onChange={(e) => setForwardTo(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    required
                  />
                  <p className="text-xs text-zinc-500">
                    Include country code. Calls will be screened before connecting.
                  </p>
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={releasePhone}
                  disabled={releasing}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {releasing ? "Releasing..." : "Release Number"}
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Phone Security & Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <p><span className="font-medium text-zinc-800 dark:text-zinc-200">Call Screening</span> — Callers announced before you accept</p>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <p><span className="font-medium text-zinc-800 dark:text-zinc-200">Voicemail</span> — Messages with automatic transcription</p>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <p><span className="font-medium text-zinc-800 dark:text-zinc-200">Privacy</span> — Your personal number is never revealed</p>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <p><span className="font-medium text-zinc-800 dark:text-zinc-200">Flexible Routing</span> — Forward, voicemail, or both</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── Main page ───────── */

export default function CommunicationPage() {
  const [profile, setProfile] = useState<{ tier: string; slug: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const defaultTab = searchParams.get("tab") === "phone" ? "phone" : "email";

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("tier, tier_override, slug, email")
        .eq("id", user.id)
        .single();

      if (profileData) {
        const effectiveTier = getEffectiveTier(profileData.tier as Tier, profileData.tier_override as Tier | null);
        setProfile({ ...profileData, tier: effectiveTier });
      }
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  if (loading) {
    return <div className="py-20 text-center text-zinc-500">Loading communication settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Communication Settings</h1>
        <p className="text-zinc-500 mt-1">
          Manage your platform email and phone number.
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="phone">Phone</TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <EmailTab profile={profile} />
        </TabsContent>

        <TabsContent value="phone">
          <PhoneTab profile={profile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
