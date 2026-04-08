"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateReviewLinkDialog } from "@/components/dashboard/create-review-link-dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Plus,
  Copy,
  Check,
  ExternalLink,
  XCircle,
  Clock,
  Link2,
  MapPin,
  Briefcase,
  GraduationCap,
  Wrench,
  Award,
  FolderOpen,
  MessageSquare,
  User,
  Loader2,
  ClipboardCheck,
  FileText,
  Inbox,
} from "lucide-react";
import type {
  Tier,
  Profile,
  ResumeSection,
  Experience,
  Education,
  Skill,
  Certification,
  Project,
  CustomSection,
  PseudonymizeOptions,
} from "@/types/database";
import { hasFeature, getEffectiveTier } from "@/lib/stripe/feature-gate";

/* ── Types ───────────────────────────────────────────── */

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

interface CommentData {
  id: string;
  section_id: string | null;
  section_type: string | null;
  reviewer_name: string | null;
  comment_text: string;
  created_at: string;
}

interface LinkMeta {
  id: string;
  token: string;
  is_active: boolean;
  expires_at: string;
  has_password: boolean;
  pseudonymize_options: PseudonymizeOptions;
  created_at: string;
}

interface PreviewData {
  link: LinkMeta;
  resume: {
    profile: Profile;
    sections: ResumeSection[];
    experiences: Experience[];
    educations: Education[];
    skills: Skill[];
    certifications: Certification[];
    projects: Project[];
    customSections: CustomSection[];
  };
  comments: CommentData[];
}

/* ── Helpers ─────────────────────────────────────────── */

const SECTION_ICONS: Record<string, typeof Briefcase> = {
  experience: Briefcase,
  education: GraduationCap,
  skills: Wrench,
  certifications: Award,
  projects: FolderOpen,
  summary: FileText,
  custom: FileText,
};

function getSectionIcon(type: string) {
  const Icon = SECTION_ICONS[type] || FileText;
  return <Icon className="h-4 w-4 text-zinc-400" />;
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) {
    const absDiff = Math.abs(diffMs);
    const h = Math.floor(absDiff / 3600000);
    const d = Math.floor(absDiff / 86400000);
    if (h < 1) return "in <1h";
    if (h < 24) return `in ${h}h`;
    return `in ${d}d`;
  }
  const m = Math.floor(diffMs / 60000);
  const h = Math.floor(diffMs / 3600000);
  const d = Math.floor(diffMs / 86400000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getLinkStatus(link: { is_active: boolean; expires_at: string }): "active" | "expired" | "deactivated" {
  if (!link.is_active) return "deactivated";
  if (new Date(link.expires_at) < new Date()) return "expired";
  return "active";
}

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

/* ── Main Page ───────────────────────────────────────── */

export default function ReviewsPage() {
  const [links, setLinks] = useState<ReviewLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<Tier>("free");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Selected link & preview state
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [mobileCommentsOpen, setMobileCommentsOpen] = useState(false);

  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const commentPanelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  /* ── Load links ─────────────────────── */

  const loadLinks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tier, tier_override")
      .eq("id", user.id)
      .single();

    if (profile) setTier(getEffectiveTier(profile.tier as Tier, profile.tier_override as Tier | null));

    const res = await fetch("/api/reviews/links");
    if (res.ok) {
      const data: ReviewLinkItem[] = await res.json();
      setLinks(data);
      // Auto-select the first link if none selected
      if (data.length > 0 && !selectedLinkId) {
        setSelectedLinkId(data[0].id);
      }
    }
    setLoading(false);
  }, [supabase, router, selectedLinkId]);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  /* ── Load preview for selected link ─── */

  const loadPreview = useCallback(async (linkId: string) => {
    setPreviewLoading(true);
    setPreview(null);
    sectionRefs.current.clear();
    try {
      const res = await fetch(`/api/reviews/links/${linkId}/preview`);
      if (res.ok) {
        const data: PreviewData = await res.json();
        setPreview(data);
        if (data.resume.sections.length > 0) {
          setActiveSection(data.resume.sections[0].id);
        }
      }
    } catch { /* ignore */ }
    setPreviewLoading(false);
  }, []);

  useEffect(() => {
    if (selectedLinkId) loadPreview(selectedLinkId);
  }, [selectedLinkId, loadPreview]);

  /* ── Scroll sync ────────────────────── */

  useEffect(() => {
    if (!preview) return;
    const observers: IntersectionObserver[] = [];

    const timer = setTimeout(() => {
      sectionRefs.current.forEach((el, sectionId) => {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) setActiveSection(sectionId);
            });
          },
          { threshold: 0.3, rootMargin: "-60px 0px -40% 0px" }
        );
        observer.observe(el);
        observers.push(observer);
      });
    }, 150);

    return () => {
      clearTimeout(timer);
      observers.forEach((o) => o.disconnect());
    };
  }, [preview]);

  useEffect(() => {
    if (!activeSection || !commentPanelRef.current) return;
    const target = commentPanelRef.current.querySelector(`[data-comment-section="${activeSection}"]`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeSection]);

  /* ── Actions ────────────────────────── */

  function selectLink(id: string) {
    setSelectedLinkId(id);
  }

  function copyLink(id: string, url: string) {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function deactivateLink(id: string) {
    const res = await fetch(`/api/reviews/links/${id}`, { method: "DELETE" });
    if (res.ok) {
      setLinks((prev) => prev.map((l) => l.id === id ? { ...l, is_active: false, status: "deactivated" as const } : l));
    }
  }

  function scrollToSection(sectionId: string) {
    const el = sectionRefs.current.get(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(sectionId);
    }
  }

  function handleLinkCreated() {
    loadLinks().then(() => {
      // Select the newest link (will be first in the list)
    });
  }

  /* ── Render ─────────────────────────── */

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

  // No links yet — empty state
  if (links.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Peer Review</h1>
            <p className="text-zinc-500 mt-1">Share pseudonymized resume links and collect feedback.</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Create Review Link
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Link2 className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium">No review links yet</h3>
            <p className="text-sm text-zinc-500 mt-1 text-center max-w-md">
              Create a review link to share a pseudonymized version of your resume and start collecting feedback.
            </p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Link
            </Button>
          </CardContent>
        </Card>
        <CreateReviewLinkDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={handleLinkCreated} />
      </div>
    );
  }

  const selectedLink = links.find((l) => l.id === selectedLinkId) || links[0];
  const comments = preview?.comments || [];

  function getCommentsForSection(sectionId: string | null): CommentData[] {
    return comments.filter((c) => c.section_id === sectionId);
  }

  const generalComments = getCommentsForSection(null);

  return (
    // Break out of dashboard layout padding/max-width for full-width two-column
    <div className="-mx-4 sm:-mx-6 -my-6 sm:-my-8 flex flex-col h-[calc(100vh-56px)] md:h-screen">
      {/* ── Top bar: link selector + actions ─── */}
      <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
        {/* Header row */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-zinc-400" />
            Peer Review
          </h1>
          <div className="flex items-center gap-2">
            {selectedLink.status === "active" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => copyLink(selectedLink.id, selectedLink.url)}
                >
                  {copiedId === selectedLink.id ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                  {copiedId === selectedLink.id ? "Copied" : "Copy Link"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs hidden sm:inline-flex"
                  onClick={() => window.open(`/review/${selectedLink.token}`, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Open
                </Button>
              </>
            )}
            <Button size="sm" className="h-8 text-xs" onClick={() => setDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Link
            </Button>
          </div>
        </div>

        {/* Link selector strip */}
        <div className="flex gap-1.5 px-4 sm:px-6 pb-3 overflow-x-auto">
          {links.map((link) => {
            const isSelected = link.id === selectedLinkId;
            return (
              <button
                key={link.id}
                onClick={() => selectLink(link.id)}
                className={`shrink-0 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-all ${
                  isSelected
                    ? "border-brand bg-brand/5 text-brand ring-1 ring-brand/20"
                    : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600"
                }`}
              >
                <Link2 className="h-3 w-3" />
                <code className="font-mono">{link.token.slice(0, 6)}...</code>
                <StatusBadge status={link.status} />
                {link.comment_count > 0 && (
                  <span className="flex items-center gap-0.5 text-zinc-400">
                    <MessageSquare className="h-3 w-3" />
                    {link.comment_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Two-column body ────────────── */}
      {previewLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      ) : !preview ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-500">Failed to load preview</p>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* LEFT: Resume Preview (65%) */}
          <div className="w-full md:w-[65%] overflow-y-auto border-r border-zinc-200 dark:border-zinc-800">
            <ResumePreview
              resume={preview.resume}
              comments={comments}
              activeSection={activeSection}
              sectionRefs={sectionRefs}
              onScrollToSection={scrollToSection}
              onMobileCommentTap={() => setMobileCommentsOpen(true)}
            />
          </div>

          {/* RIGHT: Comments Panel (35%) — desktop only */}
          <div
            ref={commentPanelRef}
            className="hidden md:block w-[35%] overflow-y-auto bg-white dark:bg-zinc-950"
          >
            <CommentsPanel
              sections={preview.resume.sections}
              comments={comments}
              generalComments={generalComments}
              activeSection={activeSection}
              getCommentsForSection={getCommentsForSection}
              onScrollToSection={scrollToSection}
            />
          </div>

          {/* Mobile: Floating button to open comments sheet */}
          {comments.length > 0 && (
            <button
              onClick={() => setMobileCommentsOpen(true)}
              className="md:hidden fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-white shadow-lg hover:bg-brand-hover transition-colors"
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-sm font-medium">{comments.length} {comments.length === 1 ? "Comment" : "Comments"}</span>
            </button>
          )}

          {/* Mobile: Comments sheet */}
          <Sheet open={mobileCommentsOpen} onOpenChange={setMobileCommentsOpen}>
            <SheetContent open={mobileCommentsOpen} onClose={() => setMobileCommentsOpen(false)}>
              <CommentsPanel
                sections={preview.resume.sections}
                comments={comments}
                generalComments={generalComments}
                activeSection={activeSection}
                getCommentsForSection={getCommentsForSection}
                onScrollToSection={(id) => {
                  setMobileCommentsOpen(false);
                  scrollToSection(id);
                }}
              />
            </SheetContent>
          </Sheet>
        </div>
      )}

      <CreateReviewLinkDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={handleLinkCreated} />
    </div>
  );
}

/* ── Resume Preview Component ─────────────────────── */

function ResumePreview({
  resume,
  comments,
  activeSection,
  sectionRefs,
  onScrollToSection,
  onMobileCommentTap,
}: {
  resume: PreviewData["resume"];
  comments: CommentData[];
  activeSection: string | null;
  sectionRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  onScrollToSection: (id: string) => void;
  onMobileCommentTap?: () => void;
}) {
  const { profile, sections, experiences, educations, skills, certifications, projects, customSections } = resume;
  const fullName = `${profile.first_name} ${profile.last_name}`.trim();

  function getCommentCount(sectionId: string): number {
    return comments.filter((c) => c.section_id === sectionId).length;
  }

  return (
    <>
      {/* Resume header */}
      <div className="bg-zinc-900 text-white px-8 py-10">
        <div className="flex items-center gap-5 max-w-2xl">
          <div className="h-16 w-16 rounded-full bg-zinc-700 flex items-center justify-center text-xl font-bold text-white/90 shrink-0">
            {profile.first_name[0]}{(profile.last_name || "")[0] || ""}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">{fullName}</h1>
            {profile.headline && (
              <p className="mt-1 text-sm text-zinc-400">{profile.headline}</p>
            )}
            {profile.location && (
              <div className="mt-2 flex text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {profile.location}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resume sections */}
      <div className="px-8 py-8 space-y-8 max-w-2xl">
        {sections.map((section) => {
          const sectionExperiences = experiences
            .filter((e) => e.section_id === section.id)
            .sort((a, b) => {
              if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
              return (b.start_date || "").localeCompare(a.start_date || "");
            });
          const sectionEducations = educations
            .filter((e) => e.section_id === section.id)
            .sort((a, b) => {
              if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
              return (b.start_date || "").localeCompare(a.start_date || "");
            });
          const sectionSkills = skills.filter((s) => s.section_id === section.id);
          const sectionCerts = certifications.filter((c) => c.section_id === section.id);
          const sectionProjects = projects.filter((p) => p.section_id === section.id);
          const sectionCustom = customSections.filter((c) => c.section_id === section.id);
          const commentCount = getCommentCount(section.id);

          return (
            <section
              key={section.id}
              ref={(el) => { if (el) sectionRefs.current.set(section.id, el); }}
              data-section-id={section.id}
              className={`scroll-mt-16 rounded-lg p-5 transition-all duration-200 ${
                activeSection === section.id
                  ? "bg-brand/[0.04] ring-1 ring-brand/15"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold tracking-tight uppercase text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  {getSectionIcon(section.section_type)}
                  {section.title}
                </h2>
                {commentCount > 0 && (
                  <button
                    onClick={() => {
                      onScrollToSection(section.id);
                      onMobileCommentTap?.();
                    }}
                    className="flex items-center gap-1 text-xs text-brand hover:underline"
                  >
                    <MessageSquare className="h-3 w-3" />
                    {commentCount} {commentCount === 1 ? "comment" : "comments"}
                  </button>
                )}
              </div>

              {/* Summary / Custom */}
              {(section.section_type === "summary" || section.section_type === "custom") && (
                <div className="space-y-2">
                  {sectionCustom.map((item) => (
                    <p key={item.id} className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                      {item.content}
                    </p>
                  ))}
                </div>
              )}

              {/* Experience */}
              {section.section_type === "experience" && (
                <div className="space-y-5">
                  {sectionExperiences.map((exp) => (
                    <div key={exp.id} className="relative pl-5 border-l-2 border-zinc-200 dark:border-zinc-700">
                      <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-zinc-400" />
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-0.5">
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{exp.position}</h3>
                          <p className="text-xs text-zinc-500">
                            {exp.company_name}
                            {exp.location && <span> &middot; {exp.location}</span>}
                          </p>
                        </div>
                        <span className="text-xs text-zinc-400 whitespace-nowrap">
                          {formatDate(exp.start_date)} &ndash; {exp.is_current ? "Present" : formatDate(exp.end_date)}
                        </span>
                      </div>
                      {exp.description && (
                        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Education */}
              {section.section_type === "education" && (
                <div className="space-y-4">
                  {sectionEducations.map((edu) => (
                    <div key={edu.id} className="relative pl-5 border-l-2 border-zinc-200 dark:border-zinc-700">
                      <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-zinc-400" />
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-0.5">
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{edu.institution}</h3>
                          <p className="text-xs text-zinc-500">
                            {[edu.degree, edu.field_of_study].filter(Boolean).join(" in ")}
                            {edu.gpa && <span> &middot; GPA: {edu.gpa}</span>}
                          </p>
                        </div>
                        {(edu.start_date || edu.end_date) && (
                          <span className="text-xs text-zinc-400 whitespace-nowrap">
                            {formatDate(edu.start_date)} &ndash; {edu.is_current ? "Present" : formatDate(edu.end_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Skills */}
              {section.section_type === "skills" && (
                <div className="space-y-3">
                  {(() => {
                    const categories = new Map<string, typeof sectionSkills>();
                    sectionSkills.forEach((skill) => {
                      const cat = skill.category || "General";
                      if (!categories.has(cat)) categories.set(cat, []);
                      categories.get(cat)!.push(skill);
                    });
                    return Array.from(categories.entries()).map(([category, categorySkills]) => (
                      <div key={category}>
                        {categories.size > 1 && (
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">{category}</h4>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {categorySkills.map((skill) => (
                            <Badge key={skill.id} variant="secondary" className="text-xs py-0.5 px-2">
                              {skill.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* Certifications */}
              {section.section_type === "certifications" && (
                <div className="space-y-3">
                  {sectionCerts.map((cert) => (
                    <div key={cert.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-0.5">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{cert.name}</h3>
                        {cert.issuing_org && <p className="text-xs text-zinc-500">{cert.issuing_org}</p>}
                      </div>
                      {cert.issue_date && (
                        <span className="text-xs text-zinc-400 whitespace-nowrap">{formatDate(cert.issue_date)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Projects */}
              {section.section_type === "projects" && (
                <div className="grid gap-3 md:grid-cols-2">
                  {sectionProjects.map((project) => (
                    <div key={project.id} className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{project.name}</h3>
                      {project.description && (
                        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{project.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

/* ── Comments Panel Component ─────────────────────── */

function CommentsPanel({
  sections,
  comments,
  generalComments,
  activeSection,
  getCommentsForSection,
  onScrollToSection,
}: {
  sections: ResumeSection[];
  comments: CommentData[];
  generalComments: CommentData[];
  activeSection: string | null;
  getCommentsForSection: (sectionId: string | null) => CommentData[];
  onScrollToSection: (id: string) => void;
}) {
  return (
    <>
      {/* Panel header */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800 px-5 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-zinc-400" />
            Feedback
            <Badge variant="secondary" className="text-xs">{comments.length}</Badge>
          </h2>
          {/* Section jump pills */}
          <div className="flex gap-1">
            {sections.filter((s) => getCommentsForSection(s.id).length > 0).map((s) => (
              <button
                key={s.id}
                onClick={() => onScrollToSection(s.id)}
                title={s.title}
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs transition-colors ${
                  activeSection === s.id
                    ? "bg-brand text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200"
                }`}
              >
                {getCommentsForSection(s.id).length}
              </button>
            ))}
          </div>
        </div>
      </div>

      {comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <Inbox className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">No feedback yet</p>
          <p className="text-xs text-zinc-400 mt-1">
            Comments from reviewers will appear here, grouped by section.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {/* Section-grouped comments */}
          {sections.map((section) => {
            const sectionComments = getCommentsForSection(section.id);
            if (sectionComments.length === 0) return null;

            return (
              <div key={section.id} data-comment-section={section.id} className="px-5 py-4">
                <button
                  onClick={() => onScrollToSection(section.id)}
                  className={`flex items-center gap-2 mb-3 group transition-colors ${
                    activeSection === section.id ? "text-brand" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  {getSectionIcon(section.section_type)}
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {section.title}
                  </span>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${activeSection === section.id ? "bg-brand/10 text-brand" : ""}`}
                  >
                    {sectionComments.length}
                  </Badge>
                </button>
                <div className="space-y-3">
                  {sectionComments.map((comment) => (
                    <CommentBubble key={comment.id} comment={comment} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* General comments */}
          {generalComments.length > 0 && (
            <div data-comment-section="general" className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3 text-zinc-500">
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">General</span>
                <Badge variant="secondary" className="text-xs">{generalComments.length}</Badge>
              </div>
              <div className="space-y-3">
                {generalComments.map((comment) => (
                  <CommentBubble key={comment.id} comment={comment} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ── Comment Bubble ───────────────────────────────── */

function CommentBubble({ comment }: { comment: CommentData }) {
  return (
    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
            <User className="h-3 w-3 text-zinc-500" />
          </div>
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
            {comment.reviewer_name || "Anonymous"}
          </span>
        </div>
        <span className="text-[10px] text-zinc-400 whitespace-nowrap shrink-0">
          {formatRelativeTime(comment.created_at)}
        </span>
      </div>
      <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
        {comment.comment_text}
      </p>
    </div>
  );
}
