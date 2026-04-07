"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
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
  AlertTriangle,
  FileText,
} from "lucide-react";
import type {
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

/* ── Types ───────────────────────────────────────────── */

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

function getLinkStatus(link: LinkMeta): "active" | "expired" | "deactivated" {
  if (!link.is_active) return "deactivated";
  if (new Date(link.expires_at) < new Date()) return "expired";
  return "active";
}

/* ── Page ────────────────────────────────────────────── */

export default function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const commentPanelRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/reviews/links/${id}/preview`);
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to load review");
        setLoading(false);
        return;
      }
      const json = await res.json();
      setData(json);
      // Set initial active section
      if (json.resume.sections.length > 0) {
        setActiveSection(json.resume.sections[0].id);
      }
    } catch {
      setError("Failed to load review");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Intersection Observer to track which section is in view
  useEffect(() => {
    if (!data) return;
    const observers: IntersectionObserver[] = [];

    // Small delay to ensure refs are attached
    const timer = setTimeout(() => {
      sectionRefs.current.forEach((el, sectionId) => {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                setActiveSection(sectionId);
              }
            });
          },
          { threshold: 0.3, rootMargin: "-80px 0px -40% 0px" }
        );
        observer.observe(el);
        observers.push(observer);
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      observers.forEach((o) => o.disconnect());
    };
  }, [data]);

  // Auto-scroll comment panel when active section changes
  useEffect(() => {
    if (!activeSection || !commentPanelRef.current) return;
    const target = commentPanelRef.current.querySelector(`[data-comment-section="${activeSection}"]`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeSection]);

  function copyLink() {
    if (!data) return;
    const url = `${window.location.origin}/review/${data.link.token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function scrollToSection(sectionId: string) {
    const el = sectionRefs.current.get(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(sectionId);
    }
  }

  /* ── Loading / Error states ──────────── */

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-10 w-10 text-zinc-400" />
        <p className="text-zinc-500">{error || "Review not found"}</p>
        <Link href="/dashboard/reviews">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reviews
          </Button>
        </Link>
      </div>
    );
  }

  const { link, resume, comments } = data;
  const { profile, sections, experiences, educations, skills, certifications, projects, customSections } = resume;
  const status = getLinkStatus(link);
  const fullName = `${profile.first_name} ${profile.last_name}`.trim();

  function getCommentsForSection(sectionId: string | null): CommentData[] {
    return comments.filter((c) => c.section_id === sectionId);
  }

  const generalComments = getCommentsForSection(null);

  /* ── Main render ─────────────────────── */

  return (
    // Break out of the dashboard layout's max-w-5xl and padding
    <div className="-mx-4 sm:-mx-6 -my-6 sm:-my-8">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/95 dark:bg-zinc-900/95 backdrop-blur-sm px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard/reviews">
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <Link2 className="h-4 w-4 text-zinc-400 shrink-0" />
            <code className="text-xs font-mono text-zinc-500 truncate">{link.token.slice(0, 12)}...</code>
            {status === "active" && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs border-0">Active</Badge>
            )}
            {status === "expired" && (
              <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />Expired</Badge>
            )}
            {status === "deactivated" && (
              <Badge variant="secondary" className="text-xs text-red-500"><XCircle className="h-3 w-3 mr-1" />Deactivated</Badge>
            )}
            <span className="text-xs text-zinc-400 hidden sm:inline">
              {comments.length} {comments.length === 1 ? "comment" : "comments"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {status === "active" && (
            <>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={copyLink}>
                {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                {copied ? "Copied" : "Copy Link"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => window.open(`/review/${link.token}`, "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Open
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex h-[calc(100vh-112px)]">
        {/* ── LEFT: Resume Preview (65%) ─────── */}
        <div className="w-[65%] overflow-y-auto border-r border-zinc-200 dark:border-zinc-800">
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
              const commentCount = getCommentsForSection(section.id).length;

              return (
                <section
                  key={section.id}
                  ref={(el) => { if (el) sectionRefs.current.set(section.id, el); }}
                  data-section-id={section.id}
                  className={`scroll-mt-20 rounded-lg p-5 transition-colors ${
                    activeSection === section.id
                      ? "bg-brand/[0.03] ring-1 ring-brand/10"
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
                        onClick={() => scrollToSection(section.id)}
                        className="flex items-center gap-1 text-xs text-brand hover:underline"
                      >
                        <MessageSquare className="h-3 w-3" />
                        {commentCount}
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
        </div>

        {/* ── RIGHT: Comments Panel (35%) ──── */}
        <div
          ref={commentPanelRef}
          className="w-[35%] overflow-y-auto bg-white dark:bg-zinc-950"
        >
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
                    onClick={() => scrollToSection(s.id)}
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
              <MessageSquare className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">No feedback yet</p>
              <p className="text-xs text-zinc-400 mt-1">
                Comments from reviewers will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {/* Section-grouped comments */}
              {sections.map((section) => {
                const sectionComments = getCommentsForSection(section.id);
                if (sectionComments.length === 0) return null;

                return (
                  <div
                    key={section.id}
                    data-comment-section={section.id}
                    className="px-5 py-4"
                  >
                    <button
                      onClick={() => scrollToSection(section.id)}
                      className={`flex items-center gap-2 mb-3 group transition-colors ${
                        activeSection === section.id ? "text-brand" : "text-zinc-500 hover:text-zinc-700"
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
                        <div key={comment.id} className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3">
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
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* General comments */}
              {generalComments.length > 0 && (
                <div
                  data-comment-section="general"
                  className="px-5 py-4"
                >
                  <div className="flex items-center gap-2 mb-3 text-zinc-500">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">General</span>
                    <Badge variant="secondary" className="text-xs">{generalComments.length}</Badge>
                  </div>

                  <div className="space-y-3">
                    {generalComments.map((comment) => (
                      <div key={comment.id} className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3">
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
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
