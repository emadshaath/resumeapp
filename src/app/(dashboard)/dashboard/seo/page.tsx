"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Globe, Eye } from "lucide-react";

interface SeoData {
  id?: string;
  meta_title: string;
  meta_description: string;
  og_image_url: string;
  custom_keywords: string[];
}

export default function SeoPage() {
  const [seo, setSeo] = useState<SeoData>({
    meta_title: "",
    meta_description: "",
    og_image_url: "",
    custom_keywords: [],
  });
  const [keywordInput, setKeywordInput] = useState("");
  const [profileSlug, setProfileSlug] = useState("");
  const [profileName, setProfileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const [{ data: profile }, { data: seoData }] = await Promise.all([
        supabase.from("profiles").select("slug, first_name, last_name, headline").eq("id", user.id).single(),
        supabase.from("seo_settings").select("*").eq("profile_id", user.id).single(),
      ]);

      if (profile) {
        setProfileSlug(profile.slug);
        setProfileName(`${profile.first_name} ${profile.last_name}`);

        if (seoData) {
          setSeo({
            id: seoData.id,
            meta_title: seoData.meta_title || "",
            meta_description: seoData.meta_description || "",
            og_image_url: seoData.og_image_url || "",
            custom_keywords: seoData.custom_keywords || [],
          });
        } else {
          // Set defaults from profile
          setSeo({
            meta_title: `${profile.first_name} ${profile.last_name}${profile.headline ? ` - ${profile.headline}` : ""}`,
            meta_description: profile.headline || `${profile.first_name} ${profile.last_name}'s professional profile`,
            og_image_url: "",
            custom_keywords: [],
          });
        }
      }
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  function addKeyword() {
    const kw = keywordInput.trim().toLowerCase();
    if (kw && !seo.custom_keywords.includes(kw)) {
      setSeo({ ...seo, custom_keywords: [...seo.custom_keywords, kw] });
      setKeywordInput("");
    }
  }

  function removeKeyword(keyword: string) {
    setSeo({ ...seo, custom_keywords: seo.custom_keywords.filter((k) => k !== keyword) });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      profile_id: user.id,
      meta_title: seo.meta_title || null,
      meta_description: seo.meta_description || null,
      og_image_url: seo.og_image_url || null,
      custom_keywords: seo.custom_keywords.length > 0 ? seo.custom_keywords : null,
    };

    let result;
    if (seo.id) {
      result = await supabase.from("seo_settings").update(payload).eq("id", seo.id);
    } else {
      result = await supabase.from("seo_settings").insert(payload).select().single();
      if (result.data) {
        setSeo({ ...seo, id: result.data.id });
      }
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      setSuccess(true);
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="py-20 text-center text-zinc-500">Loading SEO settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SEO Settings</h1>
        <p className="text-zinc-500 mt-1">Optimize how your profile appears in search engines and social media.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            SEO settings saved successfully.
          </div>
        )}

        {/* Google Search Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Preview
            </CardTitle>
            <CardDescription>How your profile appears in Google search results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 bg-white dark:bg-zinc-900">
              <p className="text-sm text-green-700 dark:text-green-400 truncate">
                {profileSlug}.resumeprofile.com
              </p>
              <p className="text-lg text-brand font-medium mt-0.5 truncate">
                {seo.meta_title || `${profileName} | ResumeProfile`}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                {seo.meta_description || `${profileName}'s professional profile on ResumeProfile`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Social Media Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Social Media Preview
            </CardTitle>
            <CardDescription>How your profile appears when shared on social media</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900 max-w-md">
              {seo.og_image_url ? (
                <div className="h-44 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                  <img src={seo.og_image_url} alt="OG Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-44 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center">
                  <span className="text-4xl font-bold text-zinc-400">
                    {profileName.split(" ").map(n => n[0]).join("")}
                  </span>
                </div>
              )}
              <div className="p-3">
                <p className="text-xs text-zinc-500 uppercase">resumeprofile.com</p>
                <p className="font-medium text-sm mt-0.5 truncate">
                  {seo.meta_title || profileName}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                  {seo.meta_description || `${profileName}'s professional profile`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Meta Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metaTitle">
                Meta Title
                <span className="text-xs text-zinc-400 ml-2">{seo.meta_title.length}/60</span>
              </Label>
              <Input
                id="metaTitle"
                value={seo.meta_title}
                onChange={(e) => setSeo({ ...seo, meta_title: e.target.value })}
                placeholder={profileName}
                maxLength={60}
              />
              <p className="text-xs text-zinc-500">Recommended: 50-60 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaDescription">
                Meta Description
                <span className="text-xs text-zinc-400 ml-2">{seo.meta_description.length}/160</span>
              </Label>
              <Textarea
                id="metaDescription"
                value={seo.meta_description}
                onChange={(e) => setSeo({ ...seo, meta_description: e.target.value })}
                placeholder={`${profileName}'s professional profile`}
                maxLength={160}
                rows={3}
              />
              <p className="text-xs text-zinc-500">Recommended: 120-160 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ogImage">Open Graph Image URL</Label>
              <Input
                id="ogImage"
                type="url"
                value={seo.og_image_url}
                onChange={(e) => setSeo({ ...seo, og_image_url: e.target.value })}
                placeholder="https://example.com/your-image.png"
              />
              <p className="text-xs text-zinc-500">Recommended size: 1200x630px. Leave empty for auto-generated.</p>
            </div>
          </CardContent>
        </Card>

        {/* Keywords */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Keywords</CardTitle>
            <CardDescription>Add relevant keywords to help search engines understand your profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="Add a keyword..."
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
              />
              <Button type="button" variant="outline" onClick={addKeyword}>
                Add
              </Button>
            </div>
            {seo.custom_keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {seo.custom_keywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="gap-1.5 pr-1.5">
                    {kw}
                    <button
                      type="button"
                      onClick={() => removeKeyword(kw)}
                      className="ml-1 rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-600 p-0.5"
                    >
                      <span className="sr-only">Remove {kw}</span>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save SEO Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
