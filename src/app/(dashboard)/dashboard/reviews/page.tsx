"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateReviewLinkDialog } from "@/components/dashboard/create-review-link-dialog";
import {
  Link2,
  Plus,
  Copy,
  Check,
  XCircle,
  Clock,
  MessageSquare,
  User,
  ClipboardCheck,
  Inbox,
  Filter,
  ChevronDown,
  ExternalLink,
  Eye,
  Briefcase,
  GraduationCap,
  Wrench,
  Award,
  FolderOpen,
  FileText,
} from "lucide-react";
import type { Tier } from "@/types/database";
import { hasFeature, getEffectiveTier } from "@/lib/stripe/feature-gate";

/* ── Types ───────────────────────────────────────────────── */

interface ReviewLinkItem {
  id: string;
  token: string;
  pseudonymize_options: Record<string, boolean>;
  expires_at: string;
  has_password: boolean;
  is_active: boolean;
  created_at: string;
  comment_count: number;
  url: string;
  status: "active" | "expired" | "deactivated";
}

interface CommentLinkMeta {
  id: string;
  token: string;
  is_active: boolean;
  expires_at: string;
  pseudonymize_options: Record<string, boolean>;
  created_at: string;
}

interface CommentItem {
  id: string;
  review_link_id: string;
  section_id: string | null;
  section_type: string | null;
  reviewer_name: string | null;
  comment_text: string;
  created_at: string;
  review_links: CommentLinkMeta;
}

type GroupMode = "all" | "by-link" | "by-section";

/* ── Helpers ─────────────────────────────────────────────── */

const SECTION_ICONS: Record<string, typeof Briefcase> = {
  experience: Briefcase,
  education: GraduationCap,
  skills: Wrench,
  certifications: Award,
  projects: FolderOpen,
  summary: FileText,
  custom: FileText,
};

const SECTION_LABELS: Record<string, string> = {
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
  projects: "Projects",
  summary: "Summary",
  custom: "Custom",
};

function getSectionLabel(type: string | null): string {
  if (!type) return "General";
  return SECTION_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

function getSectionIcon(type: string | null) {
  if (!type) return MessageSquare;
  return SECTION_ICONS[type] || FileText;
}

function getLinkStatus(link: { is_active: boolean; expires_at: string }): "active" | "expired" | "deactivated" {
  if (!link.is_active) return "deactivated";
  if (new Date(link.expires_at) < new Date()) return "expired";
  return "active";
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) {
    const absDiff = Math.abs(diffMs);
    const diffHours = Math.floor(absDiff / 3600000);
    const diffDays = Math.floor(absDiff / 86400000);
    if (diffHours < 1) return "in <1h";
    if (diffHours < 24) return `in ${diffHours}h`;
    return `in ${diffDays}d`;
  }
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── Components ──────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs border-0">Active</Badge>;
    case "expired":
      return <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />Expired</Badge>;
    case "deactivated":
      return <Badge variant="secondary" className="text-xs text-red-500"><XCircle className="h-3 w-3 mr-1" />Deactivated</Badge>;
    default:
      return null;
  }
}

function SectionTag({ type }: { type: string | null }) {
  const Icon = getSectionIcon(type);
  const label = getSectionLabel(type);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-full px-2.5 py-0.5">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function CommentCard({ comment }: { comment: CommentItem }) {
  return (
    <div className="group rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <User className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {comment.reviewer_name || "Anonymous"}
              </span>
              <SectionTag type={comment.section_type} />
            </div>
          </div>
        </div>
        <span className="text-xs text-zinc-400 whitespace-nowrap shrink-0 mt-0.5">
          {formatRelativeTime(comment.created_at)}
        </span>
      </div>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap pl-11">
        {comment.comment_text}
      </p>
    </div>
  );
}

function LinkHeader({
  link,
  commentCount,
  onCopy,
  onDeactivate,
  copiedId,
}: {
  link: ReviewLinkItem | CommentLinkMeta;
  commentCount: number;
  onCopy: (id: string, url: string) => void;
  onDeactivate: (id: string) => void;
  copiedId: string | null;
}) {
  const status = "status" in link ? (link as ReviewLinkItem).status : getLinkStatus(link);
  const url = "url" in link ? (link as ReviewLinkItem).url : `${window.location.origin}/review/${link.token}`;

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 min-w-0">
        <Link href={`/dashboard/reviews/${link.id}`} className="flex items-center gap-2 hover:text-brand transition-colors" title="View resume & feedback">
          <Link2 className="h-4 w-4 text-zinc-400 shrink-0" />
          <code className="text-xs font-mono text-zinc-500 truncate max-w-[120px] hover:text-brand">
            {link.token.slice(0, 8)}...
          </code>
        </Link>
        <StatusBadge status={status} />
        <span className="text-xs text-zinc-400">
          {commentCount} {commentCount === 1 ? "comment" : "comments"}
        </span>
        {status === "active" && (
          <span className="text-xs text-zinc-400">
            &middot; expires {formatRelativeTime((link as ReviewLinkItem).expires_at ?? link.expires_at)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {status === "active" && (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              title="Copy link"
              onClick={() => onCopy(link.id, url)}
            >
              {copiedId === link.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-zinc-400 hover:text-red-500"
              title="Open review page"
              onClick={() => window.open(url, "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-zinc-400 hover:text-red-500"
              title="Deactivate link"
              onClick={() => onDeactivate(link.id)}
            >
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function FilterBar({
  groupMode,
  onGroupChange,
  totalCount,
  sectionTypes,
  selectedSection,
  onSectionChange,
  linkTokens,
  selectedLink,
  onLinkChange,
}: {
  groupMode: GroupMode;
  onGroupChange: (mode: GroupMode) => void;
  totalCount: number;
  sectionTypes: string[];
  selectedSection: string | null;
  onSectionChange: (s: string | null) => void;
  linkTokens: { id: string; token: string }[];
  selectedLink: string | null;
  onLinkChange: (id: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Group mode buttons */}
      {(["all", "by-link", "by-section"] as const).map((mode) => {
        const labels: Record<GroupMode, string> = {
          all: `All (${totalCount})`,
          "by-link": "By Link",
          "by-section": "By Section",
        };
        return (
          <button
            key={mode}
            onClick={() => { onGroupChange(mode); onSectionChange(null); onLinkChange(null); }}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              groupMode === mode
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {mode === "by-link" && <Filter className="h-3 w-3" />}
            {mode === "by-section" && <Filter className="h-3 w-3" />}
            {labels[mode]}
          </button>
        );
      })}

      {/* Section sub-filter */}
      {groupMode === "by-section" && (
        <div className="flex flex-wrap gap-1 ml-2 pl-2 border-l border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => onSectionChange(null)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              selectedSection === null
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200"
            }`}
          >
            All
          </button>
          {sectionTypes.map((type) => (
            <button
              key={type}
              onClick={() => onSectionChange(type)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors capitalize ${
                selectedSection === type
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200"
              }`}
            >
              {getSectionLabel(type)}
            </button>
          ))}
        </div>
      )}

      {/* Link sub-filter */}
      {groupMode === "by-link" && linkTokens.length > 1 && (
        <div className="flex flex-wrap gap-1 ml-2 pl-2 border-l border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => onLinkChange(null)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              selectedLink === null
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200"
            }`}
          >
            All
          </button>
          {linkTokens.map((lt) => (
            <button
              key={lt.id}
              onClick={() => onLinkChange(lt.id)}
              className={`rounded-full px-2.5 py-1 text-xs font-mono font-medium transition-colors ${
                selectedLink === lt.id
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200"
              }`}
            >
              {lt.token.slice(0, 6)}...
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────── */

export default function ReviewsPage() {
  const [links, setLinks] = useState<ReviewLinkItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<Tier>("free");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [groupMode, setGroupMode] = useState<GroupMode>("all");
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tier, tier_override")
      .eq("id", user.id)
      .single();

    if (profile) setTier(getEffectiveTier(profile.tier as Tier, profile.tier_override as Tier | null));

    const [linksRes, commentsRes] = await Promise.all([
      fetch("/api/reviews/links"),
      fetch("/api/reviews/comments"),
    ]);

    if (linksRes.ok) setLinks(await linksRes.json());
    if (commentsRes.ok) setComments(await commentsRes.json());
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Derived data ──────────────────────────────── */

  const sectionTypes = useMemo(() => {
    const types = new Set<string>();
    comments.forEach((c) => types.add(c.section_type || "general"));
    return Array.from(types).sort();
  }, [comments]);

  const linkTokens = useMemo(() => {
    const seen = new Map<string, { id: string; token: string }>();
    comments.forEach((c) => {
      if (!seen.has(c.review_link_id)) {
        seen.set(c.review_link_id, { id: c.review_link_id, token: c.review_links.token });
      }
    });
    return Array.from(seen.values());
  }, [comments]);

  // Build the grouped/filtered view
  const groupedView = useMemo(() => {
    let filtered = comments;

    if (selectedSection) {
      filtered = filtered.filter((c) => (c.section_type || "general") === selectedSection);
    }
    if (selectedLink) {
      filtered = filtered.filter((c) => c.review_link_id === selectedLink);
    }

    if (groupMode === "by-link") {
      // Group by review_link_id
      const groups = new Map<string, { link: CommentLinkMeta; comments: CommentItem[] }>();
      filtered.forEach((c) => {
        if (!groups.has(c.review_link_id)) {
          groups.set(c.review_link_id, { link: c.review_links, comments: [] });
        }
        groups.get(c.review_link_id)!.comments.push(c);
      });
      return { type: "by-link" as const, groups: Array.from(groups.values()) };
    }

    if (groupMode === "by-section") {
      const groups = new Map<string, CommentItem[]>();
      filtered.forEach((c) => {
        const key = c.section_type || "general";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
      });
      return { type: "by-section" as const, groups: Array.from(groups.entries()).map(([section, items]) => ({ section, comments: items })) };
    }

    // "all" mode — group by link but show as a flat feed
    const groups = new Map<string, { link: CommentLinkMeta; comments: CommentItem[] }>();
    filtered.forEach((c) => {
      if (!groups.has(c.review_link_id)) {
        groups.set(c.review_link_id, { link: c.review_links, comments: [] });
      }
      groups.get(c.review_link_id)!.comments.push(c);
    });
    return { type: "all" as const, groups: Array.from(groups.values()) };
  }, [comments, groupMode, selectedSection, selectedLink]);

  /* ── Actions ───────────────────────────────────── */

  async function deactivateLink(id: string) {
    const res = await fetch(`/api/reviews/links/${id}`, { method: "DELETE" });
    if (res.ok) {
      setLinks((prev) => prev.map((l) => l.id === id ? { ...l, is_active: false, status: "deactivated" as const } : l));
    }
  }

  function copyLink(id: string, url: string) {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  /* ── Render ────────────────────────────────────── */

  const isPremium = hasFeature(tier, "peer_review");

  if (loading) {
    return <div className="py-20 text-center text-zinc-500">Loading...</div>;
  }

  if (!isPremium) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Peer Review</h1>
          <p className="text-zinc-500 mt-1">Get feedback on your resume from peers and mentors.</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ClipboardCheck className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium">Premium Feature</h3>
            <p className="text-sm text-zinc-500 mt-1 text-center max-w-md">
              Peer Review is available on the Premium plan. Share pseudonymized versions of your resume
              and get targeted feedback from peers, mentors, and career coaches.
            </p>
            <Button className="mt-4" onClick={() => router.push("/dashboard/settings?tab=billing")}>
              Upgrade to Premium
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeLinks = links.filter((l) => l.status === "active");
  const totalComments = comments.length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Peer Review</h1>
          <p className="text-zinc-500 mt-1">
            Share pseudonymized resume links and collect feedback.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Create Review Link
        </Button>
      </div>

      {/* Active links summary strip */}
      {links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-xs"
            >
              <Link2 className="h-3.5 w-3.5 text-zinc-400" />
              <code className="font-mono text-zinc-500">{link.token.slice(0, 6)}...</code>
              <StatusBadge status={link.status} />
              <span className="text-zinc-400 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {link.comment_count}
              </span>
              <Link
                href={`/dashboard/reviews/${link.id}`}
                className="text-zinc-400 hover:text-brand transition-colors"
                title="View resume & feedback"
              >
                <Eye className="h-3.5 w-3.5" />
              </Link>
              {link.status === "active" && (
                <button
                  onClick={() => copyLink(link.id, link.url)}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors"
                  title="Copy link"
                >
                  {copiedId === link.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Feedback feed */}
      {totalComments === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Inbox className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium">No feedback yet</h3>
            <p className="text-sm text-zinc-500 mt-1 text-center max-w-md">
              {links.length === 0
                ? "Create a review link and share it to start receiving feedback."
                : "Share your review links to start receiving feedback from reviewers."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Filter bar */}
          <FilterBar
            groupMode={groupMode}
            onGroupChange={setGroupMode}
            totalCount={totalComments}
            sectionTypes={sectionTypes}
            selectedSection={selectedSection}
            onSectionChange={setSelectedSection}
            linkTokens={linkTokens}
            selectedLink={selectedLink}
            onLinkChange={setSelectedLink}
          />

          {/* Feed content */}
          {groupedView.type === "by-section" ? (
            <div className="space-y-6">
              {groupedView.groups.map(({ section, comments: sectionComments }) => {
                const Icon = getSectionIcon(section === "general" ? null : section);
                return (
                  <div key={section}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="h-4 w-4 text-zinc-400" />
                      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 capitalize">
                        {getSectionLabel(section === "general" ? null : section)}
                      </h3>
                      <Badge variant="secondary" className="text-xs">{sectionComments.length}</Badge>
                    </div>
                    <div className="space-y-2 pl-6 border-l-2 border-zinc-200 dark:border-zinc-800">
                      {sectionComments.map((comment) => (
                        <CommentCard key={comment.id} comment={comment} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* "all" and "by-link" both show grouped-by-link with headers */
            <div className="space-y-6">
              {groupedView.groups.map(({ link, comments: linkComments }) => {
                const matchingLink = links.find((l) => l.id === link.id);
                return (
                  <div key={link.id}>
                    <LinkHeader
                      link={matchingLink || link}
                      commentCount={linkComments.length}
                      onCopy={copyLink}
                      onDeactivate={deactivateLink}
                      copiedId={copiedId}
                    />
                    <div className="space-y-2">
                      {linkComments.map((comment) => (
                        <CommentCard key={comment.id} comment={comment} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <CreateReviewLinkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={loadData}
      />
    </div>
  );
}
