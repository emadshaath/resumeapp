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
import {
  Phone,
  PhoneForwarded,
  Voicemail,
  Shield,
  Lock,
  Check,
  AlertCircle,
  Trash2,
} from "lucide-react";

type RoutingMode = "forward" | "voicemail" | "both";

interface PlatformPhoneData {
  id: string;
  phone_number: string;
  routing_mode: RoutingMode;
  forward_to: string | null;
  custom_greeting_url: string | null;
  is_active: boolean;
}

export default function PhonePage() {
  const [profile, setProfile] = useState<{ tier: string } | null>(null);
  const [phone, setPhone] = useState<PlatformPhoneData | null>(null);
  const [routingMode, setRoutingMode] = useState<RoutingMode>("voicemail");
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
      if (!user) { router.push("/login"); return; }

      const [{ data: profileData }, { data: phoneData }] = await Promise.all([
        supabase.from("profiles").select("tier").eq("id", user.id).single(),
        supabase.from("platform_phones").select("*").eq("profile_id", user.id).single(),
      ]);

      if (profileData) setProfile(profileData);
      if (phoneData) {
        setPhone(phoneData as PlatformPhoneData);
        setRoutingMode(phoneData.routing_mode as RoutingMode);
        setForwardTo(phoneData.forward_to || "");
      }
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  async function provisionPhone() {
    setProvisioning(true);
    setError(null);

    const res = await fetch("/api/phone/provision", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
    } else {
      // Reload phone data
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: phoneData } = await supabase
          .from("platform_phones")
          .select("*")
          .eq("profile_id", user.id)
          .single();
        if (phoneData) {
          setPhone(phoneData as PlatformPhoneData);
          setRoutingMode(phoneData.routing_mode as RoutingMode);
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Phone</h1>
        <p className="text-zinc-500 mt-1">Manage your platform phone number and voicemail.</p>
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
              {/* Phone Number Display */}
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

              {/* Routing Mode */}
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

              {/* Forward To */}
              {(routingMode === "forward" || routingMode === "both") && (
                <div className="space-y-2">
                  <Label htmlFor="forwardTo">Forward calls to</Label>
                  <Input
                    id="forwardTo"
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

      {/* Features Card */}
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
