"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Briefcase,
  Building2,
  MapPin,
  ExternalLink,
  ChevronRight,
  Link2,
  Loader2,
  X,
  Clock,
  TrendingUp,
  Target,
  GripVertical,
  Copy,
  Check,
  Calendar,
  DollarSign,
  FileText,
  Trash2,
  Sparkles,
  Zap,
} from "lucide-react";
import { VariantDiff } from "@/components/jobs/variant-diff";
import { JobDescriptionDisplay } from "@/components/jobs/job-description-display";
import type { JobApplication, JobStatus, VariantData } from "@/types/database";

const STATUS_COLUMNS: { key: JobStatus; label: string; color: string }[] = [
  { key: "saved", label: "Saved", color: "bg-zinc-500" },
  { key: "applied", label: "Applied", color: "bg-blue-500" },
  { key: "screening", label: "Screening", color: "bg-yellow-500" },
  { key: "interview", label: "Interview", color: "bg-purple-500" },
  { key: "offer", label: "Offer", color: "bg-green-500" },
  { key: "accepted", label: "Accepted", color: "bg-emerald-600" },
  { key: "rejected", label: "Rejected", color: "bg-red-500" },
  { key: "withdrawn", label: "Withdrawn", color: "bg-zinc-400" },
];

function getStatusColor(status: JobStatus) {
  return STATUS_COLUMNS.find((c) => c.key === status)?.color || "bg-zinc-500";
}

function daysSince(date: string) {
  const d = new Date(date);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export default function JobsPage() {
  const supabase = createClient();
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [pipeline, setPipeline] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"board" | "list">("board");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobApplication | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/jobs?${params}`);
    if (res.ok) {
      const data = await res.json();
      setJobs(data.jobs || []);
      setPipeline(data.pipeline || {});
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const totalApplied = (pipeline["applied"] || 0) + (pipeline["screening"] || 0) +
    (pipeline["interview"] || 0) + (pipeline["offer"] || 0) + (pipeline["accepted"] || 0);
  const totalInterviews = pipeline["interview"] || 0;
  const totalOffers = pipeline["offer"] || 0;
  const responseRate = totalApplied > 0
    ? Math.round(((pipeline["screening"] || 0) + (pipeline["interview"] || 0) + (pipeline["offer"] || 0) + (pipeline["accepted"] || 0)) / totalApplied * 100)
    : 0;

  async function updateJobStatus(jobId: string, newStatus: JobStatus) {
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) fetchJobs();
  }

  async function deleteJob(jobId: string) {
    if (!confirm("Delete this job application?")) return;
    const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    if (res.ok) {
      setSelectedJob(null);
      fetchJobs();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Job Tracker</h1>
          <p className="text-zinc-500 mt-1">Track your job applications and pipeline</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Job
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-brand" />
              <span className="text-xs text-zinc-500">Total Applied</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalApplied}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand" />
              <span className="text-xs text-zinc-500">Response Rate</span>
            </div>
            <p className="text-2xl font-bold mt-1">{responseRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-brand" />
              <span className="text-xs text-zinc-500">Interviews</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalInterviews}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand" />
              <span className="text-xs text-zinc-500">Offers</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalOffers}</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-md border border-zinc-200 dark:border-zinc-800 p-0.5">
          <button
            onClick={() => setView("board")}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              view === "board"
                ? "bg-brand text-brand-foreground"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              view === "list"
                ? "bg-brand text-brand-foreground"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Board or List View */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
      ) : view === "board" ? (
        <KanbanBoard
          jobs={jobs}
          onStatusChange={updateJobStatus}
          onSelect={setSelectedJob}
        />
      ) : (
        <ListView
          jobs={jobs}
          onSelect={setSelectedJob}
        />
      )}

      {/* Add Job Modal */}
      {showAddModal && (
        <AddJobModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            fetchJobs();
          }}
        />
      )}

      {/* Job Detail Drawer */}
      {selectedJob && (
        <JobDetailDrawer
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onStatusChange={(status) => {
            updateJobStatus(selectedJob.id, status);
            setSelectedJob(null);
          }}
          onDelete={() => deleteJob(selectedJob.id)}
          onUpdate={fetchJobs}
        />
      )}
    </div>
  );
}

/* ─── Kanban Board ─── */
function KanbanBoard({
  jobs,
  onStatusChange,
  onSelect,
}: {
  jobs: JobApplication[];
  onStatusChange: (id: string, status: JobStatus) => void;
  onSelect: (job: JobApplication) => void;
}) {
  const activeStatuses: JobStatus[] = ["saved", "applied", "screening", "interview", "offer"];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
      {activeStatuses.map((status) => {
        const col = STATUS_COLUMNS.find((c) => c.key === status)!;
        const colJobs = jobs.filter((j) => j.status === status);

        return (
          <div key={status} className="flex-shrink-0 w-64 sm:w-72">
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
              <span className="text-sm font-medium">{col.label}</span>
              <Badge variant="secondary" className="ml-auto text-xs">
                {colJobs.length}
              </Badge>
            </div>
            <div className="space-y-2 min-h-[200px]">
              {colJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onClick={() => onSelect(job)}
                  onStatusChange={onStatusChange}
                />
              ))}
              {colJobs.length === 0 && (
                <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center text-xs text-zinc-400">
                  No jobs
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Job Card (Kanban) ─── */
function JobCard({
  job,
  onClick,
  onStatusChange,
}: {
  job: JobApplication;
  onClick: () => void;
  onStatusChange: (id: string, status: JobStatus) => void;
}) {
  const nextStatus = getNextStatus(job.status);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow group"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{job.job_title}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Building2 className="h-3 w-3 text-zinc-400 shrink-0" />
              <p className="text-xs text-zinc-500 truncate">{job.company_name}</p>
            </div>
          </div>
          {job.match_score && (
            <Badge variant="accent" className="text-[10px] shrink-0">
              {job.match_score}%
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {job.location && (
            <span className="flex items-center gap-0.5 text-[10px] text-zinc-400">
              <MapPin className="h-2.5 w-2.5" />
              {job.location}
            </span>
          )}
          {job.salary_max && (
            <span className="text-[10px] text-zinc-400">
              ${Math.round(job.salary_max / 1000)}k
            </span>
          )}
          {job.applied_date && (
            <span className="text-[10px] text-zinc-400 ml-auto">
              {daysSince(job.applied_date)}d ago
            </span>
          )}
        </div>

        {nextStatus && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(job.id, nextStatus);
            }}
            className="mt-2 w-full text-[10px] text-brand hover:text-brand-hover font-medium flex items-center justify-center gap-1 py-1 rounded border border-brand-subtle hover:bg-brand-subtle transition-colors opacity-0 group-hover:opacity-100"
          >
            Move to {STATUS_COLUMNS.find((c) => c.key === nextStatus)?.label}
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── List View ─── */
function ListView({
  jobs,
  onSelect,
}: {
  jobs: JobApplication[];
  onSelect: (job: JobApplication) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left p-3 font-medium text-zinc-500">Company</th>
                <th className="text-left p-3 font-medium text-zinc-500">Role</th>
                <th className="text-left p-3 font-medium text-zinc-500 hidden sm:table-cell">Status</th>
                <th className="text-left p-3 font-medium text-zinc-500 hidden md:table-cell">Location</th>
                <th className="text-left p-3 font-medium text-zinc-500 hidden md:table-cell">Applied</th>
                <th className="text-left p-3 font-medium text-zinc-500 hidden lg:table-cell">Score</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  onClick={() => onSelect(job)}
                  className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition-colors"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-zinc-400 shrink-0" />
                      <span className="font-medium truncate max-w-[150px]">{job.company_name}</span>
                    </div>
                  </td>
                  <td className="p-3 truncate max-w-[200px]">{job.job_title}</td>
                  <td className="p-3 hidden sm:table-cell">
                    <Badge
                      variant="secondary"
                      className="text-xs capitalize"
                    >
                      <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${getStatusColor(job.status)}`} />
                      {job.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-zinc-500 hidden md:table-cell truncate max-w-[120px]">
                    {job.location || "—"}
                  </td>
                  <td className="p-3 text-zinc-500 hidden md:table-cell">
                    {job.applied_date || "—"}
                  </td>
                  <td className="p-3 hidden lg:table-cell">
                    {job.match_score ? (
                      <Badge variant="accent" className="text-xs">{job.match_score}%</Badge>
                    ) : "—"}
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-400">
                    No jobs tracked yet. Add your first job application!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Add Job Modal ─── */
function AddJobModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [mode, setMode] = useState<"url" | "manual">("url");
  const [url, setUrl] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState<string | null>(null);
  const [form, setForm] = useState({
    company_name: "",
    job_title: "",
    job_url: "",
    location: "",
    remote_type: "" as string,
    salary_min: "",
    salary_max: "",
    status: "saved" as JobStatus,
    notes: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  async function parseUrl() {
    if (!url) return;
    setParsing(true);
    setError("");
    try {
      const res = await fetch("/api/jobs/parse-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to parse URL");
        setParsing(false);
        return;
      }
      const { parsed, description_html } = await res.json();
      if (description_html) setDescriptionHtml(description_html);
      setForm({
        company_name: parsed.company_name || "",
        job_title: parsed.job_title || "",
        job_url: url,
        location: parsed.location || "",
        remote_type: parsed.remote_type || "",
        salary_min: parsed.salary_min ? String(parsed.salary_min) : "",
        salary_max: parsed.salary_max ? String(parsed.salary_max) : "",
        status: "saved",
        notes: parsed.description_summary || "",
        description: "",
      });
      setMode("manual"); // Switch to manual to show/edit parsed fields
    } catch {
      setError("Failed to fetch job posting");
    }
    setParsing(false);
  }

  async function saveJob() {
    if (!form.company_name || !form.job_title) {
      setError("Company name and job title are required");
      return;
    }
    setSaving(true);
    setError("");

    // Use parsed HTML if available, otherwise convert manual description to HTML
    let finalDescriptionHtml = descriptionHtml;
    if (!finalDescriptionHtml && form.description.trim()) {
      finalDescriptionHtml = form.description
        .split(/\n\s*\n/)
        .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
        .join("");
    }

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: form.company_name,
        job_title: form.job_title,
        job_url: form.job_url || null,
        location: form.location || null,
        remote_type: form.remote_type || null,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        status: form.status,
        notes: form.notes || null,
        job_description_html: finalDescriptionHtml || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save");
      setSaving(false);
      return;
    }
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Add Job Application</h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Mode tabs */}
          <div className="flex gap-1 rounded-md border border-zinc-200 dark:border-zinc-800 p-0.5">
            <button
              onClick={() => setMode("url")}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                mode === "url"
                  ? "bg-brand text-brand-foreground"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <Link2 className="h-4 w-4 inline mr-1.5" />
              Paste URL
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                mode === "manual"
                  ? "bg-brand text-brand-foreground"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <FileText className="h-4 w-4 inline mr-1.5" />
              Manual Entry
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {mode === "url" && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-500">
                Paste a job posting URL and AI will extract the details automatically.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="https://company.com/jobs/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={parseUrl} disabled={!url || parsing}>
                  {parsing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Parse"
                  )}
                </Button>
              </div>
              {parsing && (
                <p className="text-xs text-zinc-400 flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Fetching and analyzing job posting...
                </p>
              )}
            </div>
          )}

          {mode === "manual" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">Company *</label>
                  <Input
                    placeholder="Company name"
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">Job Title *</label>
                  <Input
                    placeholder="Job title"
                    value={form.job_title}
                    onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Job URL</label>
                <Input
                  placeholder="https://..."
                  value={form.job_url}
                  onChange={(e) => setForm({ ...form, job_url: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">Location</label>
                  <Input
                    placeholder="City, State"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">Remote Type</label>
                  <select
                    value={form.remote_type}
                    onChange={(e) => setForm({ ...form, remote_type: e.target.value })}
                    className="w-full h-10 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="onsite">Onsite</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">Salary Min</label>
                  <Input
                    type="number"
                    placeholder="50000"
                    value={form.salary_min}
                    onChange={(e) => setForm({ ...form, salary_min: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">Salary Max</label>
                  <Input
                    type="number"
                    placeholder="100000"
                    value={form.salary_max}
                    onChange={(e) => setForm({ ...form, salary_max: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as JobStatus })}
                  className="w-full h-10 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm"
                >
                  {STATUS_COLUMNS.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>

              {!descriptionHtml && (
                <div>
                  <label className="text-xs font-medium text-zinc-500 mb-1 block">
                    Job Description
                    <span className="font-normal text-zinc-400 ml-1">(optional)</span>
                  </label>
                  <textarea
                    placeholder="Paste the job description here to save a local copy..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm min-h-[100px] resize-y"
                  />
                </div>
              )}
              {descriptionHtml && (
                <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 p-3 text-xs text-green-700 dark:text-green-400 flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0" />
                  Job description captured from URL
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Notes</label>
                <textarea
                  placeholder="Any notes about this application..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm min-h-[80px] resize-y"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={saveJob} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Save Job
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Job Detail Drawer ─── */
function JobDetailDrawer({
  job,
  onClose,
  onStatusChange,
  onDelete,
  onUpdate,
}: {
  job: JobApplication;
  onClose: () => void;
  onStatusChange: (status: JobStatus) => void;
  onDelete: () => void;
  onUpdate: () => void;
}) {
  const [events, setEvents] = useState<Array<{
    id: string;
    from_status: string | null;
    to_status: string;
    notes: string | null;
    created_at: string;
  }>>([]);
  const [notes, setNotes] = useState(job.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [tailorResult, setTailorResult] = useState<{
    variant_data: VariantData;
    match_score: number;
  } | null>(null);
  const [savingVariant, setSavingVariant] = useState(false);
  const [tailorError, setTailorError] = useState("");

  useEffect(() => {
    fetch(`/api/jobs/${job.id}`)
      .then((r) => r.json())
      .then((data) => setEvents(data.events || []));
  }, [job.id]);

  async function handleTailor() {
    setTailoring(true);
    setTailorError("");
    try {
      const res = await fetch("/api/variants/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_application_id: job.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setTailorError(data.error || "Tailoring failed");
        setTailoring(false);
        return;
      }
      const data = await res.json();
      setTailorResult({
        variant_data: data.variant_data,
        match_score: data.match_score,
      });
    } catch {
      setTailorError("Failed to generate tailored variant");
    }
    setTailoring(false);
  }

  async function handleSaveVariant(variantData: VariantData, name: string) {
    setSavingVariant(true);
    const res = await fetch("/api/variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        variant_data: variantData,
        match_score: tailorResult?.match_score,
        job_application_id: job.id,
        source: "ai",
      }),
    });
    setSavingVariant(false);
    if (res.ok) {
      setTailorResult(null);
      onUpdate();
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSavingNotes(false);
    onUpdate();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 w-full max-w-md overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 p-4 z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold truncate">{job.job_title}</h2>
              <p className="text-sm text-zinc-500 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {job.company_name}
              </p>
            </div>
            <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Quick info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3">
              <span className="text-xs text-zinc-500 block">Status</span>
              <Badge variant="secondary" className="mt-1 capitalize">
                <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${getStatusColor(job.status)}`} />
                {job.status}
              </Badge>
            </div>
            {job.match_score && (
              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3">
                <span className="text-xs text-zinc-500 block">Match Score</span>
                <span className="text-lg font-bold text-brand">{job.match_score}%</span>
              </div>
            )}
            {job.location && (
              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3">
                <span className="text-xs text-zinc-500 block">Location</span>
                <span className="text-sm font-medium flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  {job.location}
                </span>
              </div>
            )}
            {(job.salary_min || job.salary_max) && (
              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3">
                <span className="text-xs text-zinc-500 block">Salary</span>
                <span className="text-sm font-medium flex items-center gap-1 mt-0.5">
                  <DollarSign className="h-3 w-3" />
                  {job.salary_min && `$${(job.salary_min / 1000).toFixed(0)}k`}
                  {job.salary_min && job.salary_max && " – "}
                  {job.salary_max && `$${(job.salary_max / 1000).toFixed(0)}k`}
                </span>
              </div>
            )}
            {job.applied_date && (
              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3">
                <span className="text-xs text-zinc-500 block">Applied</span>
                <span className="text-sm font-medium flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3 w-3" />
                  {job.applied_date}
                </span>
              </div>
            )}
            {job.remote_type && (
              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3">
                <span className="text-xs text-zinc-500 block">Work Type</span>
                <span className="text-sm font-medium capitalize mt-0.5">{job.remote_type}</span>
              </div>
            )}
          </div>

          {/* Job URL */}
          {job.job_url && (
            <a
              href={job.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-brand hover:text-brand-hover transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              View original posting
            </a>
          )}

          {/* Job Description */}
          {job.job_description_html && (
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3">Job Description</h3>
              <JobDescriptionDisplay html={job.job_description_html} />
            </div>
          )}

          {/* Smart Tailor */}
          <div className="border border-brand-subtle rounded-lg p-4 bg-brand-subtle/30">
            {tailorResult ? (
              <VariantDiff
                variantData={tailorResult.variant_data}
                matchScore={tailorResult.match_score}
                jobTitle={job.job_title}
                companyName={job.company_name}
                jobApplicationId={job.id}
                onAccept={handleSaveVariant}
                onReject={() => setTailorResult(null)}
                saving={savingVariant}
              />
            ) : (
              <div className="text-center">
                <Sparkles className="h-6 w-6 text-brand mx-auto mb-2" />
                <p className="text-sm font-medium mb-1">Smart Tailor</p>
                <p className="text-xs text-zinc-500 mb-3">
                  AI will optimize your resume for this specific role
                </p>
                {tailorError && (
                  <p className="text-xs text-red-500 mb-2">{tailorError}</p>
                )}
                <Button
                  size="sm"
                  onClick={handleTailor}
                  disabled={tailoring}
                >
                  {tailoring ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      Analyzing & Tailoring...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-1" />
                      Tailor for this Job
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Quick Apply link */}
          <a
            href={`/dashboard/jobs/${job.id}/apply`}
            className="flex items-center gap-2 text-sm text-brand hover:text-brand-hover font-medium transition-colors"
          >
            <FileText className="h-4 w-4" />
            Open Quick Apply Card
          </a>

          {/* Status change */}
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-2 block">Move to Status</label>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_COLUMNS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => onStatusChange(s.key)}
                  disabled={s.key === job.status}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                    s.key === job.status
                      ? "bg-brand text-brand-foreground border-brand"
                      : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-brand hover:text-brand"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm min-h-[80px] resize-y"
              placeholder="Add notes..."
            />
            <Button
              size="sm"
              variant="outline"
              className="mt-1.5"
              onClick={saveNotes}
              disabled={savingNotes || notes === (job.notes || "")}
            >
              {savingNotes ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Save Notes
            </Button>
          </div>

          {/* Timeline */}
          {events.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-zinc-500 mb-3">Activity Timeline</h3>
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="flex gap-3 text-sm">
                    <div className="mt-1">
                      <div className="h-2 w-2 rounded-full bg-brand" />
                    </div>
                    <div>
                      <p className="text-zinc-700 dark:text-zinc-300">
                        {event.from_status ? (
                          <>
                            <span className="capitalize">{event.from_status}</span>
                            {" → "}
                            <span className="capitalize font-medium">{event.to_status}</span>
                          </>
                        ) : (
                          <span>Job added as <span className="capitalize font-medium">{event.to_status}</span></span>
                        )}
                      </p>
                      {event.notes && <p className="text-xs text-zinc-400 mt-0.5">{event.notes}</p>}
                      <p className="text-xs text-zinc-400">{new Date(event.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Danger zone */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete Job
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */
function getNextStatus(current: JobStatus): JobStatus | null {
  const flow: Partial<Record<JobStatus, JobStatus>> = {
    saved: "applied",
    applied: "screening",
    screening: "interview",
    interview: "offer",
    offer: "accepted",
  };
  return flow[current] || null;
}
