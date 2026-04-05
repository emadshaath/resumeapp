"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isValidSlug, slugify } from "@/lib/utils";
import type { Profile } from "@/types/database";

export default function ProfileEditorPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data as Profile);
      setLoading(false);
    }
    loadProfile();
  }, [supabase, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    if (!isValidSlug(profile.slug)) {
      setError("Invalid profile URL. Use 3-63 lowercase letters, numbers, and hyphens.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        first_name: profile.first_name,
        last_name: profile.last_name,
        slug: profile.slug,
        headline: profile.headline,
        location: profile.location,
        website_url: profile.website_url,
        is_published: profile.is_published,
      })
      .eq("id", profile.id);

    if (updateError) {
      setError(
        updateError.code === "23505"
          ? "This profile URL is already taken."
          : updateError.message
      );
    } else {
      setSuccess(true);
      router.refresh();
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="py-20 text-center text-zinc-500">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="py-20 text-center text-zinc-500">Profile not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Profile</h1>
        <p className="text-zinc-500 mt-1">Update your personal information and profile settings.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            Profile saved successfully.
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={profile.first_name}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={profile.last_name}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="headline">Professional Headline</Label>
              <Input
                id="headline"
                placeholder="e.g. Senior Software Engineer at Acme Corp"
                value={profile.headline || ""}
                onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g. San Francisco, CA"
                value={profile.location || ""}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://yourwebsite.com"
                value={profile.website_url || ""}
                onChange={(e) => setProfile({ ...profile, website_url: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile URL</CardTitle>
            <CardDescription>
              This is the subdomain where your profile will be publicly accessible.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={profile.slug}
                onChange={(e) => setProfile({ ...profile, slug: slugify(e.target.value) })}
                required
                className="max-w-xs font-mono"
              />
              <span className="text-sm text-zinc-500">.rezm.ai</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Publish Profile</CardTitle>
                <CardDescription>
                  Make your profile visible to the public.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={profile.is_published ? "success" : "secondary"}>
                  {profile.is_published ? "Live" : "Draft"}
                </Badge>
                <Switch
                  checked={profile.is_published}
                  onCheckedChange={(checked) =>
                    setProfile({ ...profile, is_published: checked })
                  }
                />
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
