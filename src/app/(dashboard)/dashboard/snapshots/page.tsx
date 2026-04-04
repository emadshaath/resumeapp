"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  History,
  Save,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  Check,
  GitBranch,
  ArrowRight,
  Plus,
  Minus,
  Pencil,
} from "lucide-react";

interface SnapshotItem {
  id: string;
  label: string;
  snapshot_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface DiffChange {
  type: "added" | "removed" | "modified";
  category: string;
  field: string;
  from: string;
  to: string;
}

interface SnapshotDetail {
  snapshot_data: {
    profile: Record<string, unknown>;
    sections: Record<string, unknown>[];
    experiences: Record<string, unknown>[];
    educations: Record<string, unknown>[];
    skills: Record<string, unknown>[];
    certifications: Record<string, unknown>[];
    projects: Record<string, unknown>[];
    custom_sections: Record<string, unknown>[];
  };
}

const TYPE_LABELS: Record<string, string> = {
  manual: "Manual",
  auto_linkedin: "LinkedIn Sync",
  auto_job_optimizer: "Job Optimizer",
  auto_variant: "Variant Switch",
  auto_restore: "Before Restore",
};

const TYPE_COLORS: Record<string, string> = {
  manual: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  auto_linkedin: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  auto_job_optimizer: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  auto_variant: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  auto_restore: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export default function SnapshotsPage() {
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<SnapshotDetail | null>(null);
  const [diff, setDiff] = useState<DiffChange[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "30" });
      if (filterType !== "all") params.set("type", filterType);

      const res = await fetch(`/api/snapshots?${params}`);
      const data = await res.json();
      if (res.ok) {
        setSnapshots(data.snapshots);
        setTotal(data.total);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [filterType]);

  useEffect(() => { load(); }, [load]);

  async function createSnapshot() {
    if (!newLabel.trim()) return;
    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
      } else {
        setSuccess("Snapshot saved!");
        setNewLabel("");
        setShowCreate(false);
        load();
      }
    } catch {
      setError("Network error.");
    }
    setCreating(false);
  }

  async function toggleExpand(id: string) {
    if (expanded === id) {
      setExpanded(null);
      setDetail(null);
      setDiff(null);
      return;
    }

    setExpanded(id);
    setDetailLoading(true);
    setDetail(null);
    setDiff(null);

    try {
      const [detailRes, diffRes] = await Promise.all([
        fetch(`/api/snapshots/${id}`),
        fetch(`/api/snapshots/${id}/diff`),
      ]);

      if (detailRes.ok) {
        const d = await detailRes.json();
        setDetail(d);
      }
      if (diffRes.ok) {
        const d = await diffRes.json();
        setDiff(d.changes);
      }
    } catch {
      // ignore
    }
    setDetailLoading(false);
  }

  async function handleRestore(id: string) {
    if (!confirm("Restore your profile to this snapshot? A backup of your current state will be saved automatically.")) return;

    setRestoring(id);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/snapshots/${id}/restore`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
      } else {
        setSuccess("Profile restored! A backup snapshot was created automatically.");
        load();
      }
    } catch {
      setError("Network error.");
    }
    setRestoring(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this snapshot? This cannot be undone.")) return;

    setDeleting(id);
    try {
      await fetch(`/api/snapshots/${id}`, { method: "DELETE" });
      setSnapshots(snapshots.filter((s) => s.id !== id));
      setTotal(total - 1);
      if (expanded === id) {
        setExpanded(null);
        setDetail(null);
        setDiff(null);
      }
    } catch {
      // ignore
    }
    setDeleting(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Version History</h1>
          <p className="text-zinc-500 mt-1">
            Save and restore snapshots of your profile.
            <span className="ml-1 text-zinc-400">({total} snapshot{total !== 1 ? "s" : ""})</span>
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="shrink-0 self-start">
          <Save className="h-4 w-4 mr-2" />
          Save Snapshot
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300 flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" /> {success}
        </div>
      )}

      {/* Create Snapshot */}
      {showCreate && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium">Snapshot Label</label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Before applying to Google, Clean version..."
                  onKeyDown={(e) => e.key === "Enter" && createSnapshot()}
                />
              </div>
              <Button onClick={createSnapshot} disabled={creating || !newLabel.trim()}>
                {creating ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="all">All Types</option>
          <option value="manual">Manual</option>
          <option value="auto_restore">Before Restore</option>
          <option value="auto_linkedin">LinkedIn Sync</option>
          <option value="auto_job_optimizer">Job Optimizer</option>
          <option value="auto_variant">Variant Switch</option>
        </select>
        <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Timeline */}
      {loading && snapshots.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <RefreshCw className="h-8 w-8 text-zinc-400 animate-spin" />
          </CardContent>
        </Card>
      )}

      {!loading && snapshots.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <History className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium">No snapshots yet</h3>
            <p className="text-sm text-zinc-500 mt-1 max-w-md text-center">
              Save a snapshot to preserve your current profile state. You can restore it anytime.
            </p>
          </CardContent>
        </Card>
      )}

      {snapshots.length > 0 && (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-700" />

          <div className="space-y-3">
            {snapshots.map((snap, i) => (
              <div key={snap.id} className="relative pl-12">
                {/* Timeline dot */}
                <div className={`absolute left-3.5 top-4 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-950 ${
                  i === 0 ? "bg-blue-500" : "bg-zinc-400 dark:bg-zinc-500"
                }`} />

                <Card className={expanded === snap.id ? "ring-1 ring-blue-500 border-blue-500" : ""}>
                  <CardContent className="p-4">
                    <button
                      onClick={() => toggleExpand(snap.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <GitBranch className="h-4 w-4 text-zinc-400 shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{snap.label}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge className={`text-xs ${TYPE_COLORS[snap.snapshot_type] || ""}`}>
                                {TYPE_LABELS[snap.snapshot_type] || snap.snapshot_type}
                              </Badge>
                              <span className="text-xs text-zinc-500">
                                {new Date(snap.created_at).toLocaleDateString()} at{" "}
                                {new Date(snap.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        </div>
                        {expanded === snap.id ? (
                          <ChevronUp className="h-4 w-4 text-zinc-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-zinc-400" />
                        )}
                      </div>
                    </button>

                    {expanded === snap.id && (
                      <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 space-y-4">
                        {detailLoading && (
                          <div className="flex items-center justify-center py-4">
                            <RefreshCw className="h-5 w-5 text-zinc-400 animate-spin" />
                          </div>
                        )}

                        {/* Snapshot summary */}
                        {detail && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3 text-center">
                              <p className="text-lg font-bold">{detail.snapshot_data.sections?.length || 0}</p>
                              <p className="text-xs text-zinc-500">Sections</p>
                            </div>
                            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3 text-center">
                              <p className="text-lg font-bold">{detail.snapshot_data.experiences?.length || 0}</p>
                              <p className="text-xs text-zinc-500">Experiences</p>
                            </div>
                            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3 text-center">
                              <p className="text-lg font-bold">{detail.snapshot_data.skills?.length || 0}</p>
                              <p className="text-xs text-zinc-500">Skills</p>
                            </div>
                            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3 text-center">
                              <p className="text-lg font-bold">
                                {(detail.snapshot_data.educations?.length || 0) +
                                  (detail.snapshot_data.certifications?.length || 0) +
                                  (detail.snapshot_data.projects?.length || 0)}
                              </p>
                              <p className="text-xs text-zinc-500">Other Items</p>
                            </div>
                          </div>
                        )}

                        {/* Diff from current */}
                        {diff && diff.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                              Changes since this snapshot
                            </p>
                            <div className="space-y-1">
                              {diff.map((change, j) => (
                                <div key={j} className="flex items-center gap-2 text-sm">
                                  {change.type === "added" && <Plus className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                                  {change.type === "removed" && <Minus className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                                  {change.type === "modified" && <Pencil className="h-3.5 w-3.5 text-yellow-500 shrink-0" />}
                                  <span className="text-zinc-600 dark:text-zinc-400">
                                    <span className="font-medium capitalize">{change.category.replace("_", " ")}</span>
                                    {change.type === "modified" ? (
                                      <span> {change.field}: <span className="line-through text-red-400">{change.from}</span> <ArrowRight className="h-3 w-3 inline" /> <span className="text-green-600">{change.to}</span></span>
                                    ) : (
                                      <span> {change.field}: {change.from} → {change.to}</span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {diff && diff.length === 0 && (
                          <p className="text-sm text-zinc-400">No changes since this snapshot.</p>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => handleDelete(snap.id)}
                            disabled={deleting === snap.id}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            {deleting === snap.id ? "Deleting..." : "Delete"}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleRestore(snap.id)}
                            disabled={restoring === snap.id}
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            {restoring === snap.id ? "Restoring..." : "Restore to This Version"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
