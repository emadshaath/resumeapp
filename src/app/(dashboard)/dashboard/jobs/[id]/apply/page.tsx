"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Check,
  Download,
  ArrowLeft,
  Briefcase,
  Building2,
  MapPin,
  ExternalLink,
  User,
  Mail,
  Phone,
  Globe,
  GraduationCap,
  Wrench,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type { JobApplication } from "@/types/database";

interface AutofillFields {
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  website_url: string | null;
  location: string | null;
  headline: string | null;
  current_title: string | null;
  current_company: string | null;
  years_experience: string | null;
  education_summary: string | null;
  skills_summary: string | null;
  profile_url: string | null;
}

function CopyField({ label, value, icon: Icon }: { label: string; value: string | null; icon: React.ElementType }) {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  function copy() {
    navigator.clipboard.writeText(value!);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-3 w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-brand hover:bg-brand-subtle/50 transition-colors text-left group active:scale-[0.98]"
    >
      <div className="h-9 w-9 rounded-full bg-brand-subtle flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-brand" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
      <div className="shrink-0">
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4 text-zinc-300 group-hover:text-brand transition-colors" />
        )}
      </div>
    </button>
  );
}

export default function QuickApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<JobApplication | null>(null);
  const [fields, setFields] = useState<AutofillFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [marked, setMarked] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/jobs/${id}`).then((r) => r.json()),
      fetch("/api/autofill/profile").then((r) => r.json()),
    ]).then(([jobData, profileData]) => {
      setJob(jobData.job);
      setFields(profileData.fields);
      setLoading(false);
    });
  }, [id]);

  async function markApplied() {
    if (!job) return;
    setMarking(true);
    await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "applied" }),
    });
    setMarking(false);
    setMarked(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }

  if (!job || !fields) {
    return (
      <div className="text-center py-20 text-zinc-500">Job not found</div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Back button */}
      <button
        onClick={() => router.push("/dashboard/jobs")}
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Jobs
      </button>

      {/* Job header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-brand-subtle flex items-center justify-center shrink-0">
              <Briefcase className="h-5 w-5 text-brand" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold truncate">{job.job_title}</h1>
              <p className="text-sm text-zinc-500 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {job.company_name}
              </p>
              {job.location && (
                <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  {job.location}
                </p>
              )}
            </div>
          </div>
          {job.job_url && (
            <a
              href={job.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-1.5 text-sm text-brand hover:text-brand-hover transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open job posting
            </a>
          )}
        </CardContent>
      </Card>

      {/* Quick copy fields */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quick Copy Fields</CardTitle>
          <p className="text-xs text-zinc-500">Tap any field to copy to clipboard</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <CopyField label="Full Name" value={fields.full_name} icon={User} />
          <CopyField label="First Name" value={fields.first_name} icon={User} />
          <CopyField label="Last Name" value={fields.last_name} icon={User} />
          <CopyField label="Email" value={fields.email} icon={Mail} />
          <CopyField label="Phone" value={fields.phone} icon={Phone} />
          <CopyField label="Location" value={fields.location} icon={MapPin} />
          <CopyField label="Website / Portfolio" value={fields.website_url} icon={Globe} />
          <CopyField label="Profile URL" value={fields.profile_url} icon={Globe} />
          <CopyField label="Current Title" value={fields.current_title} icon={Briefcase} />
          <CopyField label="Current Company" value={fields.current_company} icon={Building2} />
          <CopyField label="Years of Experience" value={fields.years_experience} icon={Briefcase} />
          <CopyField label="Education" value={fields.education_summary} icon={GraduationCap} />
          <CopyField label="Skills" value={fields.skills_summary} icon={Wrench} />
        </CardContent>
      </Card>

      {/* Download resume */}
      <Card>
        <CardContent className="p-4">
          <a
            href="/api/autofill/resume.pdf"
            download
            className="flex items-center gap-3 text-sm font-medium text-brand hover:text-brand-hover transition-colors"
          >
            <div className="h-9 w-9 rounded-full bg-brand-subtle flex items-center justify-center">
              <Download className="h-4 w-4 text-brand" />
            </div>
            Download Resume
          </a>
        </CardContent>
      </Card>

      {/* Mark as applied */}
      <div className="pb-6">
        {marked ? (
          <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Marked as Applied</span>
          </div>
        ) : (
          <Button
            className="w-full h-12 text-base"
            onClick={markApplied}
            disabled={marking || job.status === "applied"}
          >
            {marking ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-5 w-5 mr-2" />
            )}
            {job.status === "applied" ? "Already Applied" : "Mark as Applied"}
          </Button>
        )}
      </div>
    </div>
  );
}
