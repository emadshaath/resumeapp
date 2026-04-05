"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Shield, ArrowRight, Inbox, Forward, Check, AlertCircle, Lock } from "lucide-react";

type RoutingMode = "forward" | "inbox";

interface PlatformEmailData {
  id: string;
  email_address: string;
  routing_mode: RoutingMode;
  forward_to: string | null;
  is_active: boolean;
}

export default function CommunicationPage() {
  const [profile, setProfile] = useState<{ tier: string; slug: string; email: string } | null>(null);
  const [platformEmail, setPlatformEmail] = useState<PlatformEmailData | null>(null);
  const [forwardTo, setForwardTo] = useState("");
  const [routingMode, setRoutingMode] = useState<RoutingMode>("forward");
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
      if (!user) { router.push("/login"); return; }

      const [{ data: profileData }, { data: emailData }] = await Promise.all([
        supabase.from("profiles").select("tier, slug, email").eq("id", user.id).single(),
        supabase.from("platform_emails").select("*").eq("profile_id", user.id).single(),
      ]);

      if (profileData) setProfile(profileData);
      if (emailData) {
        setPlatformEmail(emailData as PlatformEmailData);
        setForwardTo(emailData.forward_to || "");
        setRoutingMode(emailData.routing_mode as RoutingMode);
      }
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  async function provisionEmail() {
    setProvisioning(true);
    setError(null);

    const res = await fetch("/api/email/provision", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
    } else {
      // Reload to get the new email data
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
          setRoutingMode(emailData.routing_mode as RoutingMode);
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

    // Check tier for inbox mode
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
    return <div className="py-20 text-center text-zinc-500">Loading communication settings...</div>;
  }

  const isFree = profile?.tier === "free";
  const isProOrHigher = profile?.tier === "pro" || profile?.tier === "premium";
  const isPremium = profile?.tier === "premium";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Communication</h1>
        <p className="text-zinc-500 mt-1">
          Manage your platform email and contact settings.
        </p>
      </div>

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

      {/* Platform Email */}
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
              <Button variant="outline" onClick={() => router.push("/dashboard/billing")}>
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
              {/* Email Address Display */}
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

              {/* Routing Mode */}
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

              {/* Forward To Address */}
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

      {/* Security Note */}
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
