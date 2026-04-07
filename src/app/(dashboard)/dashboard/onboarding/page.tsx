"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  Loader2,
  Check,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Briefcase,
  GraduationCap,
  Wrench,
  Award,
  FolderOpen,
  AlignLeft,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ParsedProfile {
  first_name?: string;
  last_name?: string;
  headline?: string | null;
  location?: string | null;
  website_url?: string | null;
  phone_personal?: string | null;
}

interface ParsedExperience {
  company_name: string;
  position: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  description?: string | null;
  highlights?: string[];
}

interface ParsedEducation {
  institution: string;
  degree?: string | null;
  field_of_study?: string | null;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  gpa?: string | null;
  description?: string | null;
}

interface ParsedSkill {
  name: string;
  category?: string | null;
  proficiency?: string | null;
}

interface ParsedCertification {
  name: string;
  issuing_org?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  credential_url?: string | null;
}

interface ParsedProject {
  name: string;
  description?: string | null;
  url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  highlights?: string[];
  technologies?: string[];
}

interface ParsedResume {
  profile?: ParsedProfile;
  summary?: string | null;
  experiences?: ParsedExperience[];
  educations?: ParsedEducation[];
  skills?: ParsedSkill[];
  certifications?: ParsedCertification[];
  projects?: ParsedProject[];
}

type Step = "welcome" | "review" | "saving" | "done";

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("welcome");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedResume | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function toggleSection(key: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function completeOnboarding() {
    await fetch("/api/onboarding/complete", { method: "POST" });
    router.push("/dashboard");
  }

  async function handleFileUpload(file: File) {
    setParsing(true);
    setError(null);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/resume/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to parse resume");
        setParsing(false);
        return;
      }

      setParsed(data.parsed);
      setStep("review");
      const sections = new Set<string>();
      if (data.parsed.profile) sections.add("profile");
      if (data.parsed.summary) sections.add("summary");
      if (data.parsed.experiences?.length) sections.add("experiences");
      if (data.parsed.educations?.length) sections.add("educations");
      if (data.parsed.skills?.length) sections.add("skills");
      if (data.parsed.certifications?.length) sections.add("certifications");
      if (data.parsed.projects?.length) sections.add("projects");
      setExpandedSections(sections);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setParsing(false);
    }
  }

  async function handlePasteUpload(text: string) {
    setParsing(true);
    setError(null);
    setFileName("Pasted text");

    try {
      const res = await fetch("/api/resume/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to parse resume");
        setParsing(false);
        return;
      }

      setParsed(data.parsed);
      setStep("review");
      const sections = new Set<string>();
      if (data.parsed.profile) sections.add("profile");
      if (data.parsed.summary) sections.add("summary");
      if (data.parsed.experiences?.length) sections.add("experiences");
      if (data.parsed.educations?.length) sections.add("educations");
      if (data.parsed.skills?.length) sections.add("skills");
      if (data.parsed.certifications?.length) sections.add("certifications");
      if (data.parsed.projects?.length) sections.add("projects");
      setExpandedSections(sections);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setParsing(false);
    }
  }

  async function handleSave() {
    if (!parsed) return;
    setStep("saving");
    setError(null);

    try {
      const res = await fetch("/api/resume/import/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save resume data");
        setStep("review");
        return;
      }

      setStep("done");
    } catch {
      setError("Network error. Please try again.");
      setStep("review");
    }
  }

  function updateProfile(updates: Partial<ParsedProfile>) {
    if (!parsed) return;
    setParsed({ ...parsed, profile: { ...parsed.profile, ...updates } });
  }

  function updateSummary(summary: string) {
    if (!parsed) return;
    setParsed({ ...parsed, summary: summary || null });
  }

  function removeExperience(index: number) {
    if (!parsed?.experiences) return;
    setParsed({ ...parsed, experiences: parsed.experiences.filter((_, i) => i !== index) });
  }

  function removeEducation(index: number) {
    if (!parsed?.educations) return;
    setParsed({ ...parsed, educations: parsed.educations.filter((_, i) => i !== index) });
  }

  function removeSkill(index: number) {
    if (!parsed?.skills) return;
    setParsed({ ...parsed, skills: parsed.skills.filter((_, i) => i !== index) });
  }

  function removeCertification(index: number) {
    if (!parsed?.certifications) return;
    setParsed({ ...parsed, certifications: parsed.certifications.filter((_, i) => i !== index) });
  }

  function removeProject(index: number) {
    if (!parsed?.projects) return;
    setParsed({ ...parsed, projects: parsed.projects.filter((_, i) => i !== index) });
  }

  function getItemCount(): number {
    if (!parsed) return 0;
    let count = 0;
    if (parsed.summary) count++;
    count += parsed.experiences?.length || 0;
    count += parsed.educations?.length || 0;
    count += parsed.skills?.length || 0;
    count += parsed.certifications?.length || 0;
    count += parsed.projects?.length || 0;
    return count;
  }

  return (
    <div className="flex min-h-[80vh] items-start justify-center px-4 py-8 sm:items-center sm:py-12">
      <div className="w-full max-w-2xl space-y-6">

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {["Upload", "Review", "Done"].map((label, i) => {
            const stepIndex = step === "welcome" ? 0 : step === "review" || step === "saving" ? 1 : 2;
            const isActive = i === stepIndex;
            const isCompleted = i < stepIndex;
            return (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && (
                  <div className={`h-px w-6 sm:w-10 ${isCompleted || isActive ? "bg-brand" : "bg-zinc-300 dark:bg-zinc-700"}`} />
                )}
                <div className="flex items-center gap-1.5">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      isCompleted
                        ? "bg-brand text-white"
                        : isActive
                        ? "border-2 border-brand text-brand"
                        : "border-2 border-zinc-300 text-zinc-400 dark:border-zinc-600 dark:text-zinc-500"
                    }`}
                  >
                    {isCompleted ? <Check className="h-3 w-3" /> : i + 1}
                  </div>
                  <span className={`hidden text-xs sm:inline ${isActive ? "font-medium" : "text-zinc-400 dark:text-zinc-500"}`}>
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Step 1: Welcome + Upload */}
        {step === "welcome" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/10">
                <Sparkles className="h-7 w-7 text-brand" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Let&apos;s set up your profile
              </h1>
              <p className="text-zinc-500 text-sm sm:text-base max-w-md mx-auto">
                Upload your existing resume and we&apos;ll use AI to populate your profile automatically.
              </p>
            </div>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div
                  className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-6 sm:p-10 text-center hover:border-brand/50 dark:hover:border-brand/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileUpload(file);
                  }}
                >
                  {parsing ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-10 w-10 text-brand animate-spin" />
                      <div>
                        <p className="font-medium">Parsing your resume...</p>
                        <p className="text-sm text-zinc-500 mt-1">
                          AI is extracting your profile data from {fileName}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <Upload className="h-6 w-6 text-zinc-500" />
                      </div>
                      <div>
                        <p className="font-medium">
                          Drop your resume here or tap to browse
                        </p>
                        <p className="text-sm text-zinc-500 mt-1">
                          PDF, DOCX, or TXT up to 5MB
                        </p>
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    disabled={parsing}
                  />
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                    onClick={() => setShowPaste(!showPaste)}
                  >
                    {showPaste ? "Hide paste option" : "Or paste resume text instead"}
                  </button>

                  {showPaste && (
                    <div className="mt-3">
                      <PasteForm onSubmit={handlePasteUpload} disabled={parsing} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <button
                type="button"
                onClick={completeOnboarding}
                className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              >
                Skip for now — I&apos;ll set things up manually
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review */}
        {step === "review" && parsed && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Review your profile
              </h2>
              <p className="text-sm text-zinc-500">
                {getItemCount()} items extracted from {fileName}. Edit anything before saving.
              </p>
            </div>

            {/* Profile fields */}
            {parsed.profile && (
              <CollapsibleSection
                title="Profile Information"
                icon={Sparkles}
                expanded={expandedSections.has("profile")}
                onToggle={() => toggleSection("profile")}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">First Name</Label>
                    <Input
                      value={parsed.profile.first_name || ""}
                      onChange={(e) => updateProfile({ first_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Last Name</Label>
                    <Input
                      value={parsed.profile.last_name || ""}
                      onChange={(e) => updateProfile({ last_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Headline</Label>
                    <Input
                      value={parsed.profile.headline || ""}
                      onChange={(e) => updateProfile({ headline: e.target.value || null })}
                      placeholder="e.g. Senior Software Engineer"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Location</Label>
                    <Input
                      value={parsed.profile.location || ""}
                      onChange={(e) => updateProfile({ location: e.target.value || null })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input
                      value={parsed.profile.phone_personal || ""}
                      onChange={(e) => updateProfile({ phone_personal: e.target.value || null })}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Website</Label>
                    <Input
                      value={parsed.profile.website_url || ""}
                      onChange={(e) => updateProfile({ website_url: e.target.value || null })}
                    />
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* Summary */}
            {parsed.summary && (
              <CollapsibleSection
                title="Professional Summary"
                icon={AlignLeft}
                expanded={expandedSections.has("summary")}
                onToggle={() => toggleSection("summary")}
              >
                <Textarea
                  value={parsed.summary}
                  onChange={(e) => updateSummary(e.target.value)}
                  rows={4}
                />
              </CollapsibleSection>
            )}

            {/* Experiences */}
            {parsed.experiences && parsed.experiences.length > 0 && (
              <CollapsibleSection
                title="Work Experience"
                icon={Briefcase}
                badge={`${parsed.experiences.length}`}
                expanded={expandedSections.has("experiences")}
                onToggle={() => toggleSection("experiences")}
              >
                <div className="space-y-3">
                  {parsed.experiences.map((exp, i) => (
                    <div key={i} className="rounded-md border border-zinc-200 dark:border-zinc-700 p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{exp.position || "Untitled Position"}</p>
                          <p className="text-sm text-zinc-500 truncate">
                            {exp.company_name}
                            {exp.location ? ` \u00b7 ${exp.location}` : ""}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {exp.start_date || "?"} &ndash; {exp.is_current ? "Present" : exp.end_date || "?"}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-red-500"
                          onClick={() => removeExperience(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {exp.description && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">{exp.description}</p>
                      )}
                      {exp.highlights && exp.highlights.length > 0 && (
                        <ul className="text-xs text-zinc-600 dark:text-zinc-400 list-disc ml-4 space-y-0.5">
                          {exp.highlights.map((h, j) => (
                            <li key={j}>{h}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Education */}
            {parsed.educations && parsed.educations.length > 0 && (
              <CollapsibleSection
                title="Education"
                icon={GraduationCap}
                badge={`${parsed.educations.length}`}
                expanded={expandedSections.has("educations")}
                onToggle={() => toggleSection("educations")}
              >
                <div className="space-y-3">
                  {parsed.educations.map((edu, i) => (
                    <div key={i} className="rounded-md border border-zinc-200 dark:border-zinc-700 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{edu.institution}</p>
                          <p className="text-sm text-zinc-500 truncate">
                            {[edu.degree, edu.field_of_study].filter(Boolean).join(" in ") || "No degree specified"}
                          </p>
                          {edu.gpa && <p className="text-xs text-zinc-400">GPA: {edu.gpa}</p>}
                          <p className="text-xs text-zinc-400">
                            {edu.start_date || "?"} &ndash; {edu.is_current ? "Present" : edu.end_date || "?"}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-red-500"
                          onClick={() => removeEducation(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Skills */}
            {parsed.skills && parsed.skills.length > 0 && (
              <CollapsibleSection
                title="Skills"
                icon={Wrench}
                badge={`${parsed.skills.length}`}
                expanded={expandedSections.has("skills")}
                onToggle={() => toggleSection("skills")}
              >
                <div className="flex flex-wrap gap-2">
                  {parsed.skills.map((skill, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      {skill.name}
                      {skill.category && (
                        <span className="text-xs text-zinc-400 ml-1">({skill.category})</span>
                      )}
                      <button
                        onClick={() => removeSkill(i)}
                        className="ml-1 rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-600 p-0.5"
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Certifications */}
            {parsed.certifications && parsed.certifications.length > 0 && (
              <CollapsibleSection
                title="Certifications"
                icon={Award}
                badge={`${parsed.certifications.length}`}
                expanded={expandedSections.has("certifications")}
                onToggle={() => toggleSection("certifications")}
              >
                <div className="space-y-3">
                  {parsed.certifications.map((cert, i) => (
                    <div key={i} className="rounded-md border border-zinc-200 dark:border-zinc-700 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{cert.name}</p>
                          {cert.issuing_org && (
                            <p className="text-sm text-zinc-500 truncate">{cert.issuing_org}</p>
                          )}
                          {cert.issue_date && (
                            <p className="text-xs text-zinc-400">Issued: {cert.issue_date}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-red-500"
                          onClick={() => removeCertification(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Projects */}
            {parsed.projects && parsed.projects.length > 0 && (
              <CollapsibleSection
                title="Projects"
                icon={FolderOpen}
                badge={`${parsed.projects.length}`}
                expanded={expandedSections.has("projects")}
                onToggle={() => toggleSection("projects")}
              >
                <div className="space-y-3">
                  {parsed.projects.map((proj, i) => (
                    <div key={i} className="rounded-md border border-zinc-200 dark:border-zinc-700 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{proj.name}</p>
                          {proj.description && (
                            <p className="text-sm text-zinc-500 line-clamp-2">{proj.description}</p>
                          )}
                          {proj.technologies && proj.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {proj.technologies.map((t, j) => (
                                <Badge key={j} variant="outline" className="text-xs">
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-red-500"
                          onClick={() => removeProject(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Action buttons */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("welcome");
                  setParsed(null);
                  setError(null);
                }}
              >
                Start over
              </Button>
              <Button onClick={handleSave} className="w-full sm:w-auto">
                Save & continue
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Saving */}
        {step === "saving" && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 text-brand animate-spin mb-4" />
              <p className="font-medium">Saving your profile...</p>
              <p className="text-sm text-zinc-500 mt-1">
                Creating your resume sections.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                <Check className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">You&apos;re all set!</h2>
              <p className="text-sm text-zinc-500 mt-1 mb-6 text-center max-w-sm">
                Your profile and resume sections have been created. Head to your dashboard to review and publish.
              </p>
              <Button onClick={completeOnboarding} size="lg">
                Go to Dashboard
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  icon: Icon,
  badge,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ElementType;
  badge?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={onToggle}
      >
        <Icon className="h-4 w-4 text-zinc-500 shrink-0" />
        <span className="font-medium text-sm flex-1">{title}</span>
        {badge && (
          <Badge variant="secondary" className="text-xs">
            {badge}
          </Badge>
        )}
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-zinc-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        )}
      </div>
      {expanded && (
        <CardContent className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

function PasteForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (text: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState("");

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Paste your resume content here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        disabled={disabled}
      />
      <Button
        onClick={() => onSubmit(text)}
        disabled={disabled || text.trim().length < 50}
        className="w-full sm:w-auto"
      >
        {disabled ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Parsing...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4 mr-1" />
            Parse Resume
          </>
        )}
      </Button>
      {text.trim().length > 0 && text.trim().length < 50 && (
        <p className="text-xs text-zinc-500">
          Please paste at least 50 characters of resume content.
        </p>
      )}
    </div>
  );
}
