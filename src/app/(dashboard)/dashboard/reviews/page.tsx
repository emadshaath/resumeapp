"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
} from "lucide-react";
import type { Tier } from "@/types/database";
import { hasFeature } from "@/lib/stripe/feature-gate";

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

interface CommentItem {
  id: string;
  review_link_id: string;
  section_id: string | null;
  section_type: string | null;
  reviewer_name: string | null;
  comment_text: string;
  created_at: string;
  review_links: {
    token: string;
    created_at: string;
  };
}

export default function ReviewsPage() {
  const [links, setLinks] = useState<ReviewLinkItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<Tier>("free");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Get tier
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier")
      .eq("id", user.id)
      .single();

    if (profile) setTier(profile.tier as Tier);

    // Fetch links and comments in parallel
    const [linksRes, commentsRes] = await Promise.all([
      fetch("/api/reviews/links"),
      fetch("/api/reviews/comments"),
    ]);

    if (linksRes.ok) {
      const data = await linksRes.json();
      setLinks(data);
    }

    if (commentsRes.ok) {
      const data = await commentsRes.json();
      setComments(data);
    }

    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { loadData(); }, [loadData]);

  async function deactivateLink(id: string) {
    const res = await fetch(`/api/reviews/links/${id}`, { method: "DELETE" });
    if (res.ok) {
      setLinks((prev) =>
        prev.map((l) => l.id === id ? { ...l, is_active: false, status: "deactivated" as const } : l)
      );
    }
  }

  function copyLink(id: string, url: string) {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Peer Review</h1>
          <p className="text-zinc-500 mt-1">
            Share pseudonymized resume links and collect feedback.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {activeLinks.length > 0 && (
            <Badge variant="default">{activeLinks.length} active</Badge>
          )}
          {totalComments > 0 && (
            <Badge variant="secondary">{totalComments} comments</Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="links">
        <TabsList>
          <TabsTrigger value="links">Review Links</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="links">
          <div className="space-y-4">
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Review Link
            </Button>

            {links.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Link2 className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
                  <h3 className="text-lg font-medium">No review links yet</h3>
                  <p className="text-sm text-zinc-500 mt-1">
                    Create a review link to start collecting feedback on your resume.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {links.map((link) => (
                  <Card key={link.id}>
                    <div className="px-4 py-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex-shrink-0">
                            <Link2 className="h-5 w-5 text-zinc-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="text-sm font-mono truncate max-w-[200px]">
                                {link.token.slice(0, 8)}...
                              </code>
                              <StatusBadge status={link.status} />
                              {link.has_password && (
                                <Badge variant="secondary" className="text-xs">Password</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                              <span>Created {formatRelativeTime(link.created_at)}</span>
                              <span>Expires {formatRelativeTime(link.expires_at)}</span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {link.comment_count}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {link.status === "active" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyLink(link.id, link.url)}
                              >
                                {copiedId === link.id ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deactivateLink(link.id)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Pseudonymize options summary */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Object.entries(link.pseudonymize_options)
                          .filter(([, v]) => v)
                          .map(([key]) => (
                            <Badge key={key} variant="secondary" className="text-xs capitalize">
                              {key}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="feedback">
          {comments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Inbox className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
                <h3 className="text-lg font-medium">No feedback yet</h3>
                <p className="text-sm text-zinc-500 mt-1">
                  Share your review links to start receiving feedback from reviewers.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {comments.map((comment) => (
                <Card key={comment.id}>
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <User className="h-3.5 w-3.5 text-zinc-500" />
                      </div>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {comment.reviewer_name || "Anonymous"}
                      </span>
                      {comment.section_type ? (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {comment.section_type}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          General
                        </Badge>
                      )}
                      <span className="text-xs text-zinc-400 ml-auto">
                        {formatRelativeTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                      {comment.comment_text}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateReviewLinkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={loadData}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">Active</Badge>;
    case "expired":
      return <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />Expired</Badge>;
    case "deactivated":
      return <Badge variant="secondary" className="text-xs text-red-500"><XCircle className="h-3 w-3 mr-1" />Deactivated</Badge>;
    default:
      return null;
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Future dates
  if (diffMs < 0) {
    const absDiff = Math.abs(diffMs);
    const diffHours = Math.floor(absDiff / 3600000);
    const diffDays = Math.floor(absDiff / 86400000);
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
