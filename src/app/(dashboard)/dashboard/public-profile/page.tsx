"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TemplatePicker } from "@/components/dashboard/template-picker";
import { createClient } from "@/lib/supabase/client";
import { isValidSlug, slugify } from "@/lib/utils";
import type { Profile } from "@/types/database";
import {
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Globe,
  AlertCircle,
} from "lucide-react";

export default function PublicProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Visibility toggle state — flipped instantly via supabase update; no
  // form Save button gates it. lastVisibilityChange surfaces a brief
  // "Live now" / "Saved as draft" confirmation next to the badge.
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [visibilityMessage, setVisibilityMessage] = useState<string | null>(null);

  // Slug edit state — typing leaves the raw value, but commit only happens
  // when the user clicks Save URL. Mirrors the profile-page validation
  // path (lib/utils slugify + isValidSlug + 23505 unique-conflict).
  const [slugDraft, setSlugDraft] = useState("");
  const [slugDirty, setSlugDirty] = useState(false);
  const [savingSlug, setSavingSlug] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error: fetchErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      if (fetchErr || !data) {
        setError("Could not load your profile.");
        setLoading(false);
        return;
      }
      setProfile(data);
      setSlugDraft(data.slug);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleVisibility(next: boolean) {
    if (!profile) return;
    setTogglingVisibility(true);
    setVisibilityMessage(null);
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ is_published: next })
      .eq("id", profile.id);
    setTogglingVisibility(false);
    if (updateErr) {
      setVisibilityMessage(`Couldn't update visibility: ${updateErr.message}`);
      return;
    }
    setProfile({ ...profile, is_published: next });
    setVisibilityMessage(next ? "Profile is now live." : "Profile saved as draft.");
    // Auto-clear the confirmation copy after a few seconds — the badge
    // itself remains as the persistent state indicator.
    setTimeout(() => setVisibilityMessage(null), 3500);
  }

  async function saveSlug() {
    if (!profile) return;
    const normalized = slugify(slugDraft);
    if (!isValidSlug(normalized)) {
      setSlugError("Use 3–63 lowercase letters, numbers, and hyphens.");
      return;
    }
    setSavingSlug(true);
    setSlugError(null);
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ slug: normalized })
      .eq("id", profile.id);
    setSavingSlug(false);
    if (updateErr) {
      setSlugError(
        updateErr.code === "23505"
          ? "This URL is already taken."
          : updateErr.message
      );
      return;
    }
    setProfile({ ...profile, slug: normalized });
    setSlugDraft(normalized);
    setSlugDirty(false);
  }

  function copySlugUrl() {
    if (!profile) return;
    const url = `${window.location.origin}/p/${profile.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function patchProfile(patch: Partial<Profile>) {
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-xl mx-auto py-10 text-center text-sm text-zinc-500">
        {error || "Profile not found."}
      </div>
    );
  }

  const profileUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/p/${profile.slug}`;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Public Profile</h1>
        <p className="text-zinc-500 mt-1">
          Your live website at <span className="font-mono">rezm.ai/p/{profile.slug}</span>. Toggle visibility, change your URL, and pick a layout.
        </p>
      </div>

      {/* Visibility — page hero */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Visibility
              </CardTitle>
              <CardDescription>
                When live, anyone with the link can view your profile page. When draft, the page returns 404 to visitors.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Badge variant={profile.is_published ? "success" : "secondary"}>
                {profile.is_published ? "Live" : "Draft"}
              </Badge>
              <Switch
                checked={profile.is_published}
                onCheckedChange={toggleVisibility}
                disabled={togglingVisibility}
                aria-label="Toggle profile visibility"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibilityMessage && (
            <p className="text-xs text-zinc-500">{visibilityMessage}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-xs">
              {profileUrl}
            </code>
            <Button variant="outline" size="sm" onClick={copySlugUrl}>
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                </>
              )}
            </Button>
            {profile.is_published && (
              <Link href={profileUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Open
                </Button>
              </Link>
            )}
          </div>
          <p className="text-xs text-zinc-400">
            Search-engine indexing and metadata live in{" "}
            <Link href="/dashboard/seo" className="underline underline-offset-2">SEO settings</Link>.
          </p>
        </CardContent>
      </Card>

      {/* Profile URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile URL</CardTitle>
          <CardDescription>
            Pick the subdomain visitors use to reach your page. Changing this breaks any old links you&apos;ve shared.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              value={slugDraft}
              onChange={(e) => {
                setSlugDraft(e.target.value);
                setSlugDirty(e.target.value !== profile.slug);
                setSlugError(null);
              }}
              onBlur={(e) => {
                const normalized = slugify(e.target.value);
                if (normalized !== e.target.value) setSlugDraft(normalized);
              }}
              className="max-w-xs font-mono"
              required
            />
            <span className="text-sm text-zinc-500">.rezm.ai</span>
            {slugDirty && (
              <Button size="sm" onClick={saveSlug} disabled={savingSlug}>
                {savingSlug ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : null}
                Save URL
              </Button>
            )}
          </div>
          {slugError && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1">
              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
              {slugError}
            </p>
          )}
          <p className="text-xs text-zinc-400">
            3–63 lowercase letters, numbers, and hyphens.
          </p>
        </CardContent>
      </Card>

      {/* Profile Layout — moved from the old Profile Theme tab. Note that
          this only affects the public page; PDF styling is in Resume
          Builder, and accent color (which applies to both) stays in
          Profile. */}
      <TemplatePicker profile={profile} onUpdate={patchProfile} />
    </div>
  );
}
