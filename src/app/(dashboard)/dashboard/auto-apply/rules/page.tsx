"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, ArrowLeft } from "lucide-react";
import type { AutoApplyRule } from "@/types/database";

const EMPTY_DRAFT = {
  name: "",
  title_keywords: "",
  locations: "",
  remote_types: [] as string[],
  excluded_companies: "",
  min_match_score: 70,
  sources: ["greenhouse", "lever"] as string[],
};

export default function RulesPage() {
  const [rules, setRules] = useState<AutoApplyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/auto-apply/rules");
    const data = await res.json();
    if (res.ok) setRules(data.rules || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function createRule() {
    setSaving(true);
    setError(null);
    const body = {
      name: draft.name,
      title_keywords: csv(draft.title_keywords),
      locations: csv(draft.locations),
      remote_types: draft.remote_types,
      excluded_companies: csv(draft.excluded_companies),
      min_match_score: draft.min_match_score,
      sources: draft.sources,
    };
    const res = await fetch("/api/auto-apply/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Failed to create rule");
      return;
    }
    setDraft(EMPTY_DRAFT);
    await load();
  }

  async function toggleEnabled(rule: AutoApplyRule) {
    await fetch(`/api/auto-apply/rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    await load();
  }

  async function deleteRule(rule: AutoApplyRule) {
    if (!confirm(`Delete rule "${rule.name}"?`)) return;
    await fetch(`/api/auto-apply/rules/${rule.id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <Link
          href="/dashboard/auto-apply"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to queue
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Auto-apply rules</h1>
        <p className="text-sm text-muted-foreground">
          Define what jobs the agent should find and tailor applications for.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New rule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Name">
            <Input
              placeholder="Senior backend — remote US"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </Field>
          <Field label="Title keywords (comma separated)">
            <Input
              placeholder="senior engineer, staff engineer, backend"
              value={draft.title_keywords}
              onChange={(e) =>
                setDraft({ ...draft, title_keywords: e.target.value })
              }
            />
          </Field>
          <Field label="Locations (comma separated, optional)">
            <Input
              placeholder="San Francisco, New York, United States"
              value={draft.locations}
              onChange={(e) => setDraft({ ...draft, locations: e.target.value })}
            />
          </Field>
          <Field label="Remote types">
            <div className="flex gap-2">
              {(["remote", "hybrid", "onsite"] as const).map((rt) => {
                const on = draft.remote_types.includes(rt);
                return (
                  <Button
                    key={rt}
                    type="button"
                    size="sm"
                    variant={on ? "default" : "outline"}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        remote_types: on
                          ? draft.remote_types.filter((x) => x !== rt)
                          : [...draft.remote_types, rt],
                      })
                    }
                  >
                    {rt}
                  </Button>
                );
              })}
            </div>
          </Field>
          <Field label="Exclude companies (comma separated)">
            <Input
              placeholder="foo, bar"
              value={draft.excluded_companies}
              onChange={(e) =>
                setDraft({ ...draft, excluded_companies: e.target.value })
              }
            />
          </Field>
          <Field label={`Minimum match score: ${draft.min_match_score}`}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={draft.min_match_score}
              onChange={(e) =>
                setDraft({ ...draft, min_match_score: Number(e.target.value) })
              }
              className="w-full"
            />
          </Field>
          <Field label="Sources">
            <div className="flex gap-2">
              {(["greenhouse", "lever"] as const).map((s) => {
                const on = draft.sources.includes(s);
                return (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant={on ? "default" : "outline"}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        sources: on
                          ? draft.sources.filter((x) => x !== s)
                          : [...draft.sources, s],
                      })
                    }
                  >
                    {s}
                  </Button>
                );
              })}
            </div>
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            onClick={createRule}
            disabled={saving || !draft.name || draft.sources.length === 0}
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-4 w-4" />
            )}
            Create rule
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Your rules</h2>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rules yet.</p>
        ) : (
          rules.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    {r.enabled ? (
                      <Badge variant="secondary" className="text-[10px]">
                        enabled
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        disabled
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {r.title_keywords.slice(0, 4).join(", ") || "(no keywords)"} •
                    score ≥ {r.min_match_score} • {r.sources.join(", ")}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleEnabled(r)}
                  >
                    {r.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteRule(r)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function csv(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}
