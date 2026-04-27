"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Sparkles,
  Trash2,
  Building2,
  Briefcase,
  Star,
  StarOff,
  Loader2,
  FileText,
  ExternalLink,
  Clock,
  Eye,
  Layers,
  AlertCircle,
  Copy,
  GitCompare,
  X,
  Check,
} from "lucide-react";
import type { ProfileVariant } from "@/types/database";

interface VariantWithJob extends Omit<ProfileVariant, "variant_data"> {
  variant_data?: Record<string, unknown>;
  job: { company_name: string; job_title: string } | null;
  is_stale?: boolean;
}

export default function VariantsPage() {
  const [variants, setVariants] = useState<VariantWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cloning, setCloning] = useState<string | null>(null);

  const fetchVariants = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/variants");
    if (res.ok) {
      const data = await res.json();
      setVariants(data.variants || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  async function setDefault(id: string) {
    await fetch(`/api/variants/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_default: true }),
    });
    fetchVariants();
  }

  async function cloneVariant(id: string) {
    setCloning(id);
    const res = await fetch(`/api/variants/${id}/clone`, { method: "POST" });
    if (res.ok) {
      await fetchVariants();
    }
    setCloning(null);
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteVariant(id: string) {
    const target = variants.find((v) => v.id === id);
    const jobLine = target?.job
      ? `\n\nThis variant is linked to "${target.job.job_title} at ${target.job.company_name}". After deletion, Quick Apply for that job will fall back to your default variant — or, if none, your base resume.`
      : "";
    if (!confirm(`Delete this variant?${jobLine}\n\nThis cannot be undone.`)) return;
    await fetch(`/api/variants/${id}`, { method: "DELETE" });
    fetchVariants();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile Variants</h1>
          <p className="text-zinc-500 mt-1">
            AI-tailored versions of your resume for specific jobs
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          {variants.length} variant{variants.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Explanation card */}
      <Card className="border-brand-subtle bg-brand-subtle/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-brand shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">How variants work</p>
            <p className="text-zinc-500 mt-1">
              When you use "Smart Tailor" on a job application, AI generates an optimized
              version of your resume for that specific role. Each variant adjusts your headline,
              reorders skills, and rewrites experience bullets — using only your real data.
              The tailored PDF and Quick Apply Card automatically use the linked variant.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Compare action bar — appears when the user multi-selects from the
          card checkboxes. Capped at two for v1 since side-by-side rendering
          is the only mode the compare page supports. */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-brand bg-brand-subtle/40 p-3">
          <div className="flex items-center gap-2 text-sm">
            <GitCompare className="h-4 w-4 text-brand shrink-0" />
            <span>
              {selected.size} selected
              {selected.size > 2 && " (compare uses the first two)"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
            <Link
              href={`/dashboard/variants/compare?ids=${Array.from(selected).slice(0, 2).join(",")}`}
              className={selected.size < 2 ? "pointer-events-none opacity-50" : ""}
            >
              <Button size="sm" disabled={selected.size < 2}>
                <GitCompare className="h-3.5 w-3.5 mr-1" />
                Compare
              </Button>
            </Link>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
      ) : variants.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <Sparkles className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
              <p className="text-sm font-medium">No variants yet</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                Tailored Variants are AI-generated copies of your resume, optimized per job. They start from your base resume — so set that up first.
              </p>
            </div>
            <ol className="mx-auto max-w-md space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold">1</span>
                <div className="flex-1">
                  <Link href="/dashboard/sections" className="font-medium hover:underline inline-flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    Build your base resume
                  </Link>
                  <p className="text-xs text-zinc-500 mt-0.5">Add sections in Resume Builder. Variants snapshot from this.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold">2</span>
                <div className="flex-1">
                  <Link href="/dashboard/jobs" className="font-medium hover:underline inline-flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    Add a job and tailor it
                  </Link>
                  <p className="text-xs text-zinc-500 mt-0.5">Open a job in Job Tracker and click &ldquo;Tailor for this Job&rdquo; to create your first variant.</p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {variants.map((v) => (
            <a key={v.id} href={`/dashboard/variants/${v.id}`} className="block group">
              <Card
                className={`transition-shadow group-hover:shadow-md ${v.is_default ? "border-brand" : ""} ${
                  selected.has(v.id) ? "ring-2 ring-brand" : ""
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleSelected(v.id); }}
                      className={`mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                        selected.has(v.id)
                          ? "bg-brand border-brand text-white"
                          : "border-zinc-300 dark:border-zinc-700 hover:border-brand"
                      }`}
                      aria-label={selected.has(v.id) ? "Deselect variant" : "Select variant for compare"}
                      title="Select to compare with another variant"
                    >
                      {selected.has(v.id) && <Check className="h-3 w-3" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm truncate">{v.name}</CardTitle>
                      {v.job && (
                        <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                          <Building2 className="h-3 w-3" />
                          {v.job.job_title} at {v.job.company_name}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {v.is_default && (
                        <Badge
                          className="text-[10px]"
                          title="Default variant: used by PDF download and Quick Apply when a job has no variant of its own."
                        >
                          Default
                        </Badge>
                      )}
                      {v.is_stale && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300"
                          title="Stale: your base resume has been edited since this variant was created. Open the variant and Refresh from base to pick up your changes."
                        >
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Stale
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    {v.match_score && (
                      <div className="flex items-center gap-1">
                        <span className="text-lg font-bold text-brand">{v.match_score}%</span>
                        <span className="text-[10px] text-zinc-400">match</span>
                      </div>
                    )}
                    <Badge
                      variant="secondary"
                      className="text-[10px]"
                      title={
                        v.source === "ai"
                          ? "AI-generated: created by Smart Tailor for a job. Re-running tailor replaces it."
                          : "Hand-edited: created or modified manually. Your edits will not be overwritten by re-tailor unless you choose to."
                      }
                    >
                      {v.source === "ai" ? "AI-generated" : "Hand-edited"}
                    </Badge>
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(v.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.preventDefault()}>
                    <a href={`/dashboard/variants/${v.id}`} onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Preview
                      </Button>
                    </a>
                    {!v.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setDefault(v.id); }}
                        title="Use this variant for PDF download and Quick Apply whenever the job has no variant of its own."
                      >
                        <Star className="h-3.5 w-3.5 mr-1" />
                        Set Default
                      </Button>
                    )}
                    {v.job_application_id && (
                      <a href={`/dashboard/jobs/${v.job_application_id}/apply`} onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm">
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          Quick Apply
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); cloneVariant(v.id); }}
                      disabled={cloning === v.id}
                      title="Duplicate this variant. The copy starts unlinked from any job and is hand-edited from there."
                    >
                      {cloning === v.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); deleteVariant(v.id); }}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 ml-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
