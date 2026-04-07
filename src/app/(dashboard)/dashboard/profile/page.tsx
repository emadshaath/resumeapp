"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isValidSlug, slugify } from "@/lib/utils";
import { THEMES, THEME_CSS_VARS } from "@/lib/themes";
import { Camera, Trash2, Loader2 } from "lucide-react";
import type { Profile } from "@/types/database";

export default function ProfileEditorPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingAvatar(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/avatar", { method: "POST", body: formData });
      const data = await res.json();

      if (res.ok) {
        setProfile({ ...profile, avatar_url: data.avatar_url });
      } else {
        setError(data.error || "Failed to upload avatar");
      }
    } catch {
      setError("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleAvatarRemove() {
    if (!profile) return;
    setUploadingAvatar(true);
    setError(null);

    try {
      const res = await fetch("/api/avatar", { method: "DELETE" });
      if (res.ok) {
        setProfile({ ...profile, avatar_url: null });
      } else {
        setError("Failed to remove avatar");
      }
    } catch {
      setError("Failed to remove avatar");
    } finally {
      setUploadingAvatar(false);
    }
  }

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
        linkedin_url: profile.linkedin_url,
        is_published: profile.is_published,
        profile_theme: profile.profile_theme,
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

  const themeColors = THEME_CSS_VARS[profile.profile_theme] || THEME_CSS_VARS["midnight-indigo"];

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
            <CardTitle className="text-lg">Profile Photo</CardTitle>
            <CardDescription>
              Upload a photo for your public profile. Max 2MB, JPEG/PNG/WebP.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="h-24 w-24 rounded-full object-cover border-2 border-zinc-200 dark:border-zinc-700"
                  />
                ) : (
                  <div
                    className="h-24 w-24 rounded-full flex items-center justify-center text-2xl font-bold text-white/90"
                    style={{ background: `linear-gradient(135deg, ${themeColors.heroFrom}, ${themeColors.heroTo})` }}
                  >
                    {profile.first_name[0]}{profile.last_name[0]}
                  </div>
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {profile.avatar_url ? "Change photo" : "Upload photo"}
                </Button>
                {profile.avatar_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAvatarRemove}
                    disabled={uploadingAvatar}
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

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

            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn Profile</Label>
              <Input
                id="linkedin"
                type="url"
                placeholder="https://linkedin.com/in/yourprofile"
                value={profile.linkedin_url || ""}
                onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Theme</CardTitle>
            <CardDescription>
              Choose a color theme for your public profile page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {THEMES.map((theme) => {
                const colors = THEME_CSS_VARS[theme.id];
                const isSelected = profile.profile_theme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setProfile({ ...profile, profile_theme: theme.id })}
                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                      isSelected
                        ? "border-zinc-900 dark:border-white ring-2 ring-zinc-900/20 dark:ring-white/20"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
                    }`}
                  >
                    <div
                      className="h-8 rounded-md mb-2"
                      style={{ background: `linear-gradient(135deg, ${colors.heroFrom}, ${colors.heroTo})` }}
                    />
                    <p className="text-xs font-medium truncate">{theme.name}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{theme.tagline}</p>
                  </button>
                );
              })}
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
