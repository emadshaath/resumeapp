"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  GitCompare,
  Loader2,
  Sparkles,
  Briefcase,
  Eye,
} from "lucide-react";
import type { VariantData } from "@/types/database";

interface CompareVariant {
  id: string;
  name: string;
  match_score: number | null;
  source: string;
  is_default: boolean;
  created_at: string;
  variant_data: VariantData;
}

interface CompareJob {
  id: string;
  company_name: string;
  job_title: string;
}

interface VariantBundle {
  variant: CompareVariant;
  job: CompareJob | null;
}

function VariantsCompareView() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids") || "";
  const ids = idsParam.split(",").filter(Boolean).slice(0, 2);
  const [bundles, setBundles] = useState<(VariantBundle | null)[]>([null, null]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length !== 2) {
      setError("Pick two variants to compare from the Tailored Variants page.");
      setLoading(false);
      return;
    }
    Promise.all(
      ids.map((id) =>
        fetch(`/api/variants/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then((results) => {
      const next: (VariantBundle | null)[] = results.map((r) =>
        r?.variant ? { variant: r.variant, job: r.job ?? null } : null
      );
      if (next.some((b) => !b)) {
        setError("One or both variants could not be loaded.");
      }
      setBundles(next);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsParam]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-sm text-zinc-500">{error}</p>
        <Link href="/dashboard/variants">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to Tailored Variants
          </Button>
        </Link>
      </div>
    );
  }

  const [a, b] = bundles as [VariantBundle, VariantBundle];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/variants"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Tailored Variants
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-brand" />
          Compare variants
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Side-by-side view of two tailored variants. Differences are not highlighted automatically — read each row and decide which framing fits the role you&apos;re applying to.
        </p>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-2 gap-4">
        <VariantHeader bundle={a} />
        <VariantHeader bundle={b} />
      </div>

      {/* Compare rows */}
      <div className="space-y-4">
        <CompareRow label="Headline">
          <p className="text-sm">{a.variant.variant_data.headline || <Empty />}</p>
          <p className="text-sm">{b.variant.variant_data.headline || <Empty />}</p>
        </CompareRow>

        <CompareRow label="Summary">
          <p className="text-sm whitespace-pre-wrap">{a.variant.variant_data.summary || <Empty />}</p>
          <p className="text-sm whitespace-pre-wrap">{b.variant.variant_data.summary || <Empty />}</p>
        </CompareRow>

        <CompareRow label="Top priorities">
          <PriorityList items={a.variant.variant_data.top_priorities} />
          <PriorityList items={b.variant.variant_data.top_priorities} />
        </CompareRow>

        <CompareRow label="Skill order (top 8)">
          <SkillList items={a.variant.variant_data.skill_order} />
          <SkillList items={b.variant.variant_data.skill_order} />
        </CompareRow>

        <CompareRow label="Hidden skills">
          <SkillList items={a.variant.variant_data.hidden_skills} muted />
          <SkillList items={b.variant.variant_data.hidden_skills} muted />
        </CompareRow>

        <CompareRow label="Hidden sections">
          <SkillList items={a.variant.variant_data.hidden_sections} muted />
          <SkillList items={b.variant.variant_data.hidden_sections} muted />
        </CompareRow>

        <CompareRow label="Experience emphasis">
          <ExperienceEmphasis items={a.variant.variant_data.experience_rewrites} />
          <ExperienceEmphasis items={b.variant.variant_data.experience_rewrites} />
        </CompareRow>

        <CompareRow label="AI reasoning">
          <p className="text-xs text-zinc-500 whitespace-pre-wrap">
            {a.variant.variant_data.ai_reasoning || <Empty />}
          </p>
          <p className="text-xs text-zinc-500 whitespace-pre-wrap">
            {b.variant.variant_data.ai_reasoning || <Empty />}
          </p>
        </CompareRow>
      </div>
    </div>
  );
}

function VariantHeader({ bundle }: { bundle: VariantBundle }) {
  const { variant, job } = bundle;
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold text-sm truncate">{variant.name}</h2>
          {variant.is_default && (
            <Badge className="shrink-0 text-[10px]">Default</Badge>
          )}
        </div>
        {job && (
          <p className="text-xs text-zinc-500 flex items-center gap-1">
            <Briefcase className="h-3 w-3" />
            {job.job_title} at {job.company_name}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {variant.match_score !== null && (
            <Badge variant="accent" className="text-[10px]">
              <Sparkles className="h-3 w-3 mr-0.5" />
              {variant.match_score}% match
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px]">
            {variant.source === "ai" ? "AI-generated" : "Hand-edited"}
          </Badge>
          <span className="text-[10px] text-zinc-400">
            {new Date(variant.created_at).toLocaleDateString()}
          </span>
        </div>
        <Link href={`/dashboard/variants/${variant.id}`}>
          <Button variant="outline" size="sm" className="w-full mt-2">
            <Eye className="h-3.5 w-3.5 mr-1" />
            Open variant
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function CompareRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
        {label}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {Array.isArray(children)
          ? children.map((child, i) => (
              <div
                key={i}
                className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3"
              >
                {child}
              </div>
            ))
          : children}
      </div>
    </div>
  );
}

function Empty() {
  return <span className="text-zinc-400 italic">— not set —</span>;
}

function PriorityList({ items }: { items: string[] | undefined }) {
  if (!items || items.length === 0) return <Empty />;
  return (
    <ol className="text-sm space-y-1 list-decimal pl-4">
      {items.map((p, i) => (
        <li key={i}>{p}</li>
      ))}
    </ol>
  );
}

function SkillList({
  items,
  muted,
}: {
  items: string[] | undefined;
  muted?: boolean;
}) {
  if (!items || items.length === 0) return <Empty />;
  const display = items.slice(0, 8);
  return (
    <div className="flex flex-wrap gap-1.5">
      {display.map((s, i) => (
        <span
          key={i}
          className={`text-[11px] rounded-full px-2 py-0.5 ${
            muted
              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 line-through"
              : "bg-brand-subtle text-brand"
          }`}
        >
          {s}
        </span>
      ))}
      {items.length > 8 && (
        <span className="text-[11px] text-zinc-400">
          +{items.length - 8} more
        </span>
      )}
    </div>
  );
}

function ExperienceEmphasis({
  items,
}: {
  items: VariantData["experience_rewrites"] | undefined;
}) {
  if (!items || items.length === 0) return <Empty />;
  return (
    <ul className="space-y-1 text-xs">
      {items.map((rew) => (
        <li key={rew.id} className="flex items-start gap-2">
          <Badge
            variant={
              rew.emphasis === "high"
                ? "default"
                : rew.emphasis === "low"
                ? "secondary"
                : "outline"
            }
            className="text-[10px] shrink-0"
          >
            {rew.emphasis}
          </Badge>
          <span className="truncate">{rew.id}</span>
        </li>
      ))}
    </ul>
  );
}

export default function VariantsComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
      }
    >
      <VariantsCompareView />
    </Suspense>
  );
}
