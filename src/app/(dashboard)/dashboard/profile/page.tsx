"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isValidSlug, slugify } from "@/lib/utils";
import { THEMES, THEME_CSS_VARS } from "@/lib/themes";
import { Camera, Trash2, Loader2, ClipboardList } from "lucide-react";
import { TemplatePicker } from "@/components/dashboard/template-picker";
import type { Profile } from "@/types/database";

export default function ProfileEditorPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  // "templates" kept as a legacy alias for old bookmarks; canonical value is "theme".
  const defaultTab =
    tabParam === "apply" ? "apply"
    : tabParam === "theme" || tabParam === "templates" ? "theme"
    : "profile";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  // Lazy init: without this, a fresh client on every render re-fires the load
  // effect and an in-flight refetch overwrites keystrokes the user just typed.
  const [supabase] = useState(() => createClient());
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

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

  const patchProfile = useCallback(
    (patch: Partial<Profile>) => setProfile((prev) => (prev ? { ...prev, ...patch } : prev)),
    []
  );

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
        patchProfile({ avatar_url: data.avatar_url });
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
        patchProfile({ avatar_url: null });
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

    // Normalize slug at submit time — typing leaves it raw so selection/caret
    // behave correctly; slugify only runs on blur and here.
    const normalizedSlug = slugify(profile.slug);
    if (normalizedSlug !== profile.slug) {
      patchProfile({ slug: normalizedSlug });
    }

    if (!isValidSlug(normalizedSlug)) {
      setError("Invalid profile URL. Use 3-63 lowercase letters, numbers, and hyphens.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        first_name: profile.first_name,
        last_name: profile.last_name,
        slug: normalizedSlug,
        headline: profile.headline,
        email: profile.email,
        phone_personal: profile.phone_personal,
        show_email: profile.show_email,
        show_phone: profile.show_phone,
        show_location: profile.show_location,
        show_website: profile.show_website,
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

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="theme">Profile Theme</TabsTrigger>
          <TabsTrigger value="apply">Application Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
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
                      onChange={(e) => patchProfile({ first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      value={profile.last_name}
                      onChange={(e) => patchProfile({ last_name: e.target.value })}
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
                    onChange={(e) => patchProfile({ headline: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={profile.email || ""}
                      onChange={(e) => patchProfile({ email: e.target.value })}
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        id="show_email"
                        checked={profile.show_email}
                        onCheckedChange={(v) => patchProfile({ show_email: v })}
                      />
                      <Label htmlFor="show_email" className="text-xs text-zinc-500">
                        Show on resume
                      </Label>
                    </div>
                    <p className="text-xs text-zinc-500">
                      This is the email displayed on your resume — independent of the one you sign in with.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 555 123 4567"
                      value={profile.phone_personal || ""}
                      onChange={(e) => patchProfile({ phone_personal: e.target.value })}
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        id="show_phone"
                        checked={profile.show_phone}
                        onCheckedChange={(v) => patchProfile({ show_phone: v })}
                      />
                      <Label htmlFor="show_phone" className="text-xs text-zinc-500">
                        Show on resume
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g. San Francisco, CA"
                    value={profile.location || ""}
                    onChange={(e) => patchProfile({ location: e.target.value })}
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      id="show_location"
                      checked={profile.show_location}
                      onCheckedChange={(v) => patchProfile({ show_location: v })}
                    />
                    <Label htmlFor="show_location" className="text-xs text-zinc-500">
                      Show on resume
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://yourwebsite.com"
                    value={profile.website_url || ""}
                    onChange={(e) => patchProfile({ website_url: e.target.value })}
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      id="show_website"
                      checked={profile.show_website}
                      onCheckedChange={(v) => patchProfile({ show_website: v })}
                    />
                    <Label htmlFor="show_website" className="text-xs text-zinc-500">
                      Show on resume
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn Profile</Label>
                  <Input
                    id="linkedin"
                    type="url"
                    placeholder="https://linkedin.com/in/yourprofile"
                    value={profile.linkedin_url || ""}
                    onChange={(e) => patchProfile({ linkedin_url: e.target.value })}
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
                        onClick={() => patchProfile({ profile_theme: theme.id })}
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
                    onChange={(e) => patchProfile({ slug: e.target.value })}
                    onBlur={(e) => patchProfile({ slug: slugify(e.target.value) })}
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
                      onCheckedChange={(checked) => patchProfile({ is_published: checked })}
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
        </TabsContent>

        <TabsContent value="theme">
          <TemplatePicker profile={profile} onUpdate={patchProfile} />
        </TabsContent>

        <TabsContent value="apply">
          <ApplicationPreferencesTab profile={profile} patchProfile={patchProfile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const APP_PREF_FIELDS: (keyof Profile)[] = [
  "work_authorization", "sponsorship_required", "gender_identity", "pronouns",
  "race_ethnicity", "veteran_status", "disability_status", "lgbtq_identity",
  "salary_expectation", "notice_period", "preferred_work_setting", "how_heard_default",
];

function ApplicationPreferencesTab({
  profile,
  patchProfile,
}: {
  profile: Profile;
  patchProfile: (patch: Partial<Profile>) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [supabase] = useState(() => createClient());

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const update: Record<string, string | null> = {};
    for (const key of APP_PREF_FIELDS) {
      update[key] = profile[key] as string | null || null;
    }

    const { error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", profile.id);

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Application preferences saved." });
    }
    setSaving(false);
  }

  function updatePref(key: keyof Profile, value: string) {
    patchProfile({ [key]: value } as Partial<Profile>);
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
                value={profile.work_authorization || ""}
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
                value={profile.sponsorship_required || ""}
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
                value={profile.preferred_work_setting || ""}
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
                value={profile.notice_period || ""}
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
                value={profile.salary_expectation || ""}
                onChange={(e) => updatePref("salary_expectation", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="how_heard_default">Default &quot;How did you hear?&quot;</Label>
              <Input
                id="how_heard_default"
                placeholder="e.g. LinkedIn, Company website, Referral"
                value={profile.how_heard_default || ""}
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
                value={profile.gender_identity || ""}
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
                value={profile.pronouns || ""}
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
                value={profile.race_ethnicity || ""}
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
                value={profile.veteran_status || ""}
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
                value={profile.disability_status || ""}
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
                value={profile.lgbtq_identity || ""}
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
