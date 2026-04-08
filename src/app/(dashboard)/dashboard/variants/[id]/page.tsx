"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ResumePreview } from "@/components/variants/resume-preview";
import { JobDescriptionDisplay } from "@/components/jobs/job-description-display";
import { CreateReviewLinkDialog } from "@/components/dashboard/create-review-link-dialog";
import type { ResumeData } from "@/lib/pdf/types";
import type { VariantData } from "@/types/database";
import {
  ArrowLeft,
  Download,
  Star,
  Trash2,
  Loader2,
  Sparkles,
  Briefcase,
  Calendar,
  ExternalLink,
  Building2,
  MapPin,
  DollarSign,
  Share2,
} from "lucide-react";

interface PreviewData {
  variant: {
    id: string;
    name: string;
    match_score: number | null;
    source: string;
    is_default: boolean;
    created_at: string;
    variant_data: VariantData;
    resolved_resume: ResumeData | null;
  };
  job: {
    id: string;
    company_name: string;
    job_title: string;
    job_url: string | null;
    status: string;
    location: string | null;
    remote_type: string | null;
    salary_min: number | null;
    salary_max: number | null;
    parsed_data: Record<string, unknown>;
    job_description_html: string | null;
  } | null;
}

export default function VariantPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/variants/${params.id}/preview`);
    if (!res.ok) {
      setError("Failed to load variant");
      setLoading(false);
      return;
    }
    const result = await res.json();
    setData(result);
    setLoading(false);
  }, [params.id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPreview(); }, [fetchPreview]);

  async function handleDelete() {
    if (!confirm("Delete this variant? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/variants/${params.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard/variants");
    } else {
      setDeleting(false);
    }
  }

  async function handleSetDefault() {
    setSettingDefault(true);
    await fetch(`/api/variants/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_default: true }),
    });
    await fetchPreview();
    setSettingDefault(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto py-10 text-center">
        <p className="text-zinc-500">{error || "Variant not found"}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard/variants")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Variants
        </Button>
      </div>
    );
  }

  const { variant, job } = data;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {variant.name}
            </h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {variant.match_score && (
                <Badge variant="accent" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {variant.match_score}% match
                </Badge>
              )}
              {variant.is_default && (
                <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  <Star className="h-3 w-3 mr-1" />
                  Default
                </Badge>
              )}
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(variant.created_at).toLocaleDateString()}
              </span>
            </div>
            {job && (
              <p className="text-sm text-zinc-500 mt-1 flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {job.job_title} at {job.company_name}
                {job.job_url && (
                  <a
                    href={job.job_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:text-brand-hover ml-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {job && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(`/dashboard/jobs/${job.id}/apply`)
                }
              >
                <Briefcase className="h-3.5 w-3.5 mr-1" />
                Quick Apply
              </Button>
            )}
            <a
              href={`/api/autofill/resume.pdf?variant=${variant.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <Download className="h-3.5 w-3.5 mr-1" />
                PDF
              </Button>
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReviewDialogOpen(true)}
            >
              <Share2 className="h-3.5 w-3.5 mr-1" />
              Share for Review
            </Button>
            {!variant.is_default && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSetDefault}
                disabled={settingDefault}
              >
                {settingDefault ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Star className="h-3.5 w-3.5 mr-1" />
                    Set Default
                  </>
                )}
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="resume">
        <TabsList>
          <TabsTrigger value="resume">Resume Preview</TabsTrigger>
          <TabsTrigger value="changes">What Changed</TabsTrigger>
          {job && <TabsTrigger value="job">Saved Job</TabsTrigger>}
        </TabsList>

        {/* Tab 1: Resume Preview */}
        <TabsContent value="resume">
          <Card>
            <CardContent className="p-6">
              {variant.resolved_resume ? (
                <ResumePreview data={variant.resolved_resume} />
              ) : (
                <p className="text-sm text-zinc-500 text-center py-8">
                  No frozen preview available for this variant. It was created
                  before frozen snapshots were enabled.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: What Changed */}
        <TabsContent value="changes">
          <WhatChangedTab variantData={variant.variant_data} />
        </TabsContent>

        {/* Tab 3: Saved Job */}
        {job && (
          <TabsContent value="job">
            <SavedJobTab job={job} />
          </TabsContent>
        )}
      </Tabs>

      <CreateReviewLinkDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        onCreated={() => {}}
        variantId={variant.id}
        variantName={variant.name}
      />
    </div>
  );
}

/* ─── What Changed Tab ─── */
function WhatChangedTab({ variantData }: { variantData: VariantData }) {
  return (
    <div className="space-y-4">
      {/* AI Reasoning */}
      {variantData.ai_reasoning && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              AI Strategy
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {variantData.ai_reasoning}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Top Priorities */}
      {variantData.top_priorities.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-2">Top Priorities</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              {variantData.top_priorities.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Headline */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-2">Tailored Headline</h3>
          <p className="text-sm text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900 rounded px-3 py-2">
            {variantData.headline}
          </p>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-2">Tailored Summary</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {variantData.summary}
          </p>
        </CardContent>
      </Card>

      {/* Experience Rewrites */}
      {variantData.experience_rewrites.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Experience Rewrites</h3>
            <div className="space-y-4">
              {variantData.experience_rewrites.map((rewrite) => (
                <div
                  key={rewrite.id}
                  className="border-l-2 pl-3 border-zinc-200 dark:border-zinc-700"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={
                        rewrite.emphasis === "high"
                          ? "accent"
                          : rewrite.emphasis === "low"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-[10px]"
                    >
                      {rewrite.emphasis} emphasis
                    </Badge>
                  </div>
                  {rewrite.description && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                      {rewrite.description}
                    </p>
                  )}
                  {rewrite.highlights && rewrite.highlights.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                      {rewrite.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-zinc-400 mt-0.5">•</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden Items */}
      {(variantData.hidden_skills.length > 0 ||
        variantData.hidden_sections.length > 0) && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-2">Hidden Items</h3>
            <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
              {variantData.hidden_skills.length > 0 && (
                <span>
                  {variantData.hidden_skills.length} skill
                  {variantData.hidden_skills.length !== 1 ? "s" : ""} hidden
                </span>
              )}
              {variantData.hidden_sections.length > 0 && (
                <span>
                  {variantData.hidden_sections.length} section
                  {variantData.hidden_sections.length !== 1 ? "s" : ""} hidden
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Saved Job Tab ─── */
function SavedJobTab({
  job,
}: {
  job: NonNullable<PreviewData["job"]>;
}) {
  return (
    <div className="space-y-4">
      {/* Job Details Card */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            {job.job_title}
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <Building2 className="h-3.5 w-3.5 text-zinc-400" />
              {job.company_name}
            </div>
            {job.location && (
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                {job.location}
              </div>
            )}
            {job.remote_type && (
              <div className="text-zinc-600 dark:text-zinc-400 capitalize">
                {job.remote_type}
              </div>
            )}
            {(job.salary_min || job.salary_max) && (
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <DollarSign className="h-3.5 w-3.5 text-zinc-400" />
                {job.salary_min && `$${(job.salary_min / 1000).toFixed(0)}k`}
                {job.salary_min && job.salary_max && " – "}
                {job.salary_max && `$${(job.salary_max / 1000).toFixed(0)}k`}
              </div>
            )}
          </div>
          {job.job_url && (
            <a
              href={job.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-brand hover:text-brand-hover mt-3"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View original posting
            </a>
          )}

          {/* Parsed Skills */}
          {Array.isArray(job.parsed_data?.required_skills) &&
            (job.parsed_data.required_skills as string[]).length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-zinc-500 mb-1.5">
                  Required Skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(job.parsed_data.required_skills as string[]).map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          {Array.isArray(job.parsed_data?.preferred_skills) &&
            (job.parsed_data.preferred_skills as string[]).length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-zinc-500 mb-1.5">
                  Preferred Skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(job.parsed_data.preferred_skills as string[]).map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Full Job Description */}
      {job.job_description_html && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Full Job Description</h3>
            <JobDescriptionDisplay html={job.job_description_html} />
          </CardContent>
        </Card>
      )}

      {!job.job_description_html && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-zinc-500">
              No saved job description available.
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Job descriptions are saved when tracking via URL.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
