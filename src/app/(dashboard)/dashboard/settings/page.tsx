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
  const defaultTab = searchParams.get("tab") === "billing" ? "billing" : "account";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-zinc-500 mt-1">Manage your account and subscription.</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="billing">Billing & Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <AccountTab />
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
