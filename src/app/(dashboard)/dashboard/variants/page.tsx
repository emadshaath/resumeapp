"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import type { ProfileVariant } from "@/types/database";

interface VariantWithJob extends Omit<ProfileVariant, "variant_data"> {
  variant_data?: Record<string, unknown>;
  job: { company_name: string; job_title: string } | null;
}

export default function VariantsPage() {
  const [variants, setVariants] = useState<VariantWithJob[]>([]);
  const [loading, setLoading] = useState(true);

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

  async function deleteVariant(id: string) {
    if (!confirm("Delete this variant?")) return;
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
      ) : variants.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Sparkles className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-medium">No variants yet</p>
            <p className="text-xs text-zinc-500 mt-1">
              Go to the Job Tracker, open a job, and click "Tailor for this Job" to create your first variant.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => window.location.href = "/dashboard/jobs"}
            >
              <Briefcase className="h-4 w-4 mr-1" />
              Go to Job Tracker
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {variants.map((v) => (
            <a key={v.id} href={`/dashboard/variants/${v.id}`} className="block group">
              <Card className={`transition-shadow group-hover:shadow-md ${v.is_default ? "border-brand" : ""}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm truncate">{v.name}</CardTitle>
                      {v.job && (
                        <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                          <Building2 className="h-3 w-3" />
                          {v.job.job_title} at {v.job.company_name}
                        </p>
                      )}
                    </div>
                    {v.is_default && (
                      <Badge className="shrink-0 text-[10px]">Default</Badge>
                    )}
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
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {v.source}
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
