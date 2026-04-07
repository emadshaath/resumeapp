"use client";

import { useState } from "react";
import { SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Link2,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Plus,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import type { LinkedInComparisonResult } from "@/lib/claude/schemas";

interface LinkedInAnalyzerDrawerProps {
  open: boolean;
  onClose: () => void;
  onApplyComplete?: () => void;
}

type Step = "paste" | "results" | "applying" | "done";

export function LinkedInAnalyzerDrawer({ open, onClose, onApplyComplete }: LinkedInAnalyzerDrawerProps) {
  const [step, setStep] = useState<Step>("paste");
  const [linkedinText, setLinkedinText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<LinkedInComparisonResult | null>(null);

  // Selection state for applying changes
  const [selectedProfile, setSelectedProfile] = useState<Set<number>>(new Set());
  const [selectedExperiences, setSelectedExperiences] = useState<Set<number>>(new Set());
  const [selectedEducations, setSelectedEducations] = useState<Set<number>>(new Set());
  const [selectedSkills, setSelectedSkills] = useState<Set<number>>(new Set());
  const [selectedCerts, setSelectedCerts] = useState<Set<number>>(new Set());

  const [applyError, setApplyError] = useState<string | null>(null);

  function reset() {
    setStep("paste");
    setLinkedinText("");
    setLoading(false);
    setError(null);
    setComparison(null);
    setSelectedProfile(new Set());
    setSelectedExperiences(new Set());
    setSelectedEducations(new Set());
    setSelectedSkills(new Set());
    setSelectedCerts(new Set());
    setApplyError(null);
  }

  async function analyze() {
    if (linkedinText.trim().length < 50) {
      setError("Please paste more content from your LinkedIn profile (at least 50 characters).");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/linkedin/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedin_text: linkedinText }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to analyze.");
        return;
      }

      setComparison(data.comparison);
      setStep("results");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelection(set: Set<number>, setFn: (s: Set<number>) => void, index: number) {
    const next = new Set(set);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setFn(next);
  }

  function hasSelections(): boolean {
    return (
      selectedProfile.size > 0 ||
      selectedExperiences.size > 0 ||
      selectedEducations.size > 0 ||
      selectedSkills.size > 0 ||
      selectedCerts.size > 0
    );
  }

  async function applyChanges() {
    if (!comparison) return;

    setStep("applying");
    setApplyError(null);

    const payload: Record<string, unknown> = {};

    // Profile updates
    if (selectedProfile.size > 0) {
      const profileUpdates: Record<string, string | null> = {};
      for (const idx of selectedProfile) {
        const diff = comparison.comparison.profile_differences[idx];
        if (diff) {
          if (diff.field === "headline") profileUpdates.headline = diff.linkedin_value;
          if (diff.field === "location") profileUpdates.location = diff.linkedin_value;
          if (diff.field === "summary") payload.summary = diff.linkedin_value;
        }
      }
      if (Object.keys(profileUpdates).length > 0) payload.profile = profileUpdates;
    }

    // New experiences
    if (selectedExperiences.size > 0) {
      const exps = [];
      for (const idx of selectedExperiences) {
        const exp = comparison.comparison.new_experiences[idx];
        if (exp) {
          const parsed = comparison.parsed_linkedin.experiences.find(
            (e) => e.company_name === exp.company_name && e.position === exp.position
          );
          if (parsed) exps.push(parsed);
        }
      }
      if (exps.length > 0) payload.experiences = exps;
    }

    // New educations
    if (selectedEducations.size > 0) {
      const edus = [];
      for (const idx of selectedEducations) {
        const edu = comparison.comparison.new_educations[idx];
        if (edu) {
          const parsed = comparison.parsed_linkedin.educations.find(
            (e) => e.institution === edu.institution
          );
          if (parsed) edus.push(parsed);
        }
      }
      if (edus.length > 0) payload.educations = edus;
    }

    // New skills
    if (selectedSkills.size > 0) {
      const skills = [];
      for (const idx of selectedSkills) {
        const skill = comparison.comparison.new_skills[idx];
        if (skill) skills.push(skill);
      }
      if (skills.length > 0) payload.skills = skills;
    }

    // New certifications
    if (selectedCerts.size > 0) {
      const certs = [];
      for (const idx of selectedCerts) {
        const cert = comparison.comparison.new_certifications[idx];
        if (cert) certs.push(cert);
      }
      if (certs.length > 0) payload.certifications = certs;
    }

    try {
      const res = await fetch("/api/linkedin/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setApplyError(data.error || "Failed to apply changes.");
        setStep("results");
        return;
      }

      setStep("done");
    } catch {
      setApplyError("Network error. Please try again.");
      setStep("results");
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleDone() {
    onApplyComplete?.();
    handleClose();
  }

  return (
    <SheetContent open={open} onClose={handleClose}>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-[#0A66C2]" />
          LinkedIn Sync
        </SheetTitle>
        <SheetDescription>
          Compare your LinkedIn profile with your resume and sync differences.
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Step 1: Paste LinkedIn text */}
        {step === "paste" && (
          <>
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold">How to copy your LinkedIn profile</h3>
                <ol className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5 list-decimal list-inside">
                  <li>Go to your LinkedIn profile page</li>
                  <li>Select all text on the page (Ctrl+A / Cmd+A)</li>
                  <li>Copy the selected text (Ctrl+C / Cmd+C)</li>
                  <li>Paste it in the box below</li>
                </ol>
                <p className="text-xs text-zinc-500">
                  Tip: Include your About, Experience, Education, Skills, and Certifications sections.
                </p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <label className="text-sm font-medium">LinkedIn Profile Text</label>
              <textarea
                className="w-full min-h-[200px] rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300 resize-y"
                placeholder="Paste your LinkedIn profile text here..."
                value={linkedinText}
                onChange={(e) => setLinkedinText(e.target.value)}
              />
              {linkedinText.length > 0 && (
                <p className="text-xs text-zinc-500">{linkedinText.length.toLocaleString()} characters</p>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <Button onClick={analyze} disabled={loading || linkedinText.trim().length < 50} className="w-full">
              {loading ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
              ) : (
                <><Link2 className="h-4 w-4 mr-2" />Analyze & Compare</>
              )}
            </Button>

            {loading && (
              <div className="flex flex-col items-center py-8">
                <RefreshCw className="h-8 w-8 text-zinc-400 animate-spin mb-3" />
                <p className="text-sm text-zinc-500">Parsing your LinkedIn profile...</p>
                <p className="text-xs text-zinc-400 mt-1">This may take 15-30 seconds</p>
              </div>
            )}
          </>
        )}

        {/* Step 2: Results */}
        {step === "results" && comparison && (
          <>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">
              {comparison.summary}
            </p>

            {applyError && (
              <div className="rounded-md bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
                {applyError}
              </div>
            )}

            <p className="text-xs text-zinc-500">Select the changes you want to apply to your resume:</p>

            {/* Profile differences */}
            {comparison.comparison.profile_differences.length > 0 && (
              <ComparisonSection title="Profile Updates" icon={<ArrowRight className="h-4 w-4 text-blue-500" />}>
                {comparison.comparison.profile_differences.map((diff, i) => (
                  <SelectableItem
                    key={i}
                    selected={selectedProfile.has(i)}
                    onToggle={() => toggleSelection(selectedProfile, setSelectedProfile, i)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs capitalize">{diff.field}</Badge>
                      </div>
                      <div className="text-xs text-zinc-500">
                        Current: <span className="text-zinc-700 dark:text-zinc-300">{diff.current_value || "(empty)"}</span>
                      </div>
                      <div className="text-xs text-zinc-500">
                        LinkedIn: <span className="text-blue-600 dark:text-blue-400">{diff.linkedin_value}</span>
                      </div>
                      <p className="text-xs text-zinc-500 italic">{diff.recommendation}</p>
                    </div>
                  </SelectableItem>
                ))}
              </ComparisonSection>
            )}

            {/* New experiences */}
            {comparison.comparison.new_experiences.length > 0 && (
              <ComparisonSection title="New Experiences" icon={<Plus className="h-4 w-4 text-green-500" />}>
                {comparison.comparison.new_experiences.map((exp, i) => (
                  <SelectableItem
                    key={i}
                    selected={selectedExperiences.has(i)}
                    onToggle={() => toggleSelection(selectedExperiences, setSelectedExperiences, i)}
                  >
                    <div>
                      <p className="text-sm font-medium">{exp.position}</p>
                      <p className="text-xs text-zinc-500">{exp.company_name}</p>
                      <p className="text-xs text-zinc-500 italic mt-1">{exp.reason}</p>
                    </div>
                  </SelectableItem>
                ))}
              </ComparisonSection>
            )}

            {/* Updated experiences */}
            {comparison.comparison.updated_experiences.length > 0 && (
              <ComparisonSection title="Experience Updates" icon={<ArrowRight className="h-4 w-4 text-yellow-500" />}>
                {comparison.comparison.updated_experiences.map((exp, i) => (
                  <div key={i} className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3 space-y-1">
                    <p className="text-sm font-medium">{exp.position} at {exp.company_name}</p>
                    <p className="text-xs text-zinc-500">Changes: {exp.differences}</p>
                    <p className="text-xs text-zinc-500 italic">{exp.recommendation}</p>
                  </div>
                ))}
              </ComparisonSection>
            )}

            {/* New educations */}
            {comparison.comparison.new_educations.length > 0 && (
              <ComparisonSection title="New Education" icon={<Plus className="h-4 w-4 text-green-500" />}>
                {comparison.comparison.new_educations.map((edu, i) => (
                  <SelectableItem
                    key={i}
                    selected={selectedEducations.has(i)}
                    onToggle={() => toggleSelection(selectedEducations, setSelectedEducations, i)}
                  >
                    <div>
                      <p className="text-sm font-medium">{edu.degree || edu.institution}</p>
                      <p className="text-xs text-zinc-500">{edu.institution}</p>
                      <p className="text-xs text-zinc-500 italic mt-1">{edu.reason}</p>
                    </div>
                  </SelectableItem>
                ))}
              </ComparisonSection>
            )}

            {/* New skills */}
            {comparison.comparison.new_skills.length > 0 && (
              <ComparisonSection title="New Skills" icon={<Plus className="h-4 w-4 text-green-500" />}>
                <div className="flex flex-wrap gap-2">
                  {comparison.comparison.new_skills.map((skill, i) => (
                    <button
                      key={i}
                      onClick={() => toggleSelection(selectedSkills, setSelectedSkills, i)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs border transition-colors ${
                        selectedSkills.has(i)
                          ? "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400"
                      }`}
                    >
                      {selectedSkills.has(i) && <Check className="h-3 w-3" />}
                      {skill.name}
                    </button>
                  ))}
                </div>
              </ComparisonSection>
            )}

            {/* New certifications */}
            {comparison.comparison.new_certifications.length > 0 && (
              <ComparisonSection title="New Certifications" icon={<Plus className="h-4 w-4 text-green-500" />}>
                {comparison.comparison.new_certifications.map((cert, i) => (
                  <SelectableItem
                    key={i}
                    selected={selectedCerts.has(i)}
                    onToggle={() => toggleSelection(selectedCerts, setSelectedCerts, i)}
                  >
                    <div>
                      <p className="text-sm font-medium">{cert.name}</p>
                      {cert.issuing_org && <p className="text-xs text-zinc-500">{cert.issuing_org}</p>}
                    </div>
                  </SelectableItem>
                ))}
              </ComparisonSection>
            )}

            {/* Missing from LinkedIn */}
            {comparison.comparison.missing_from_linkedin.length > 0 && (
              <ComparisonSection title="In Resume but not on LinkedIn" icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}>
                <ul className="space-y-1">
                  {comparison.comparison.missing_from_linkedin.map((item, i) => (
                    <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5 shrink-0">-</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </ComparisonSection>
            )}

            {/* No differences */}
            {comparison.comparison.profile_differences.length === 0 &&
              comparison.comparison.new_experiences.length === 0 &&
              comparison.comparison.new_educations.length === 0 &&
              comparison.comparison.new_skills.length === 0 &&
              comparison.comparison.new_certifications.length === 0 && (
                <div className="flex flex-col items-center py-8 text-center">
                  <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
                  <h3 className="font-medium">All synced!</h3>
                  <p className="text-sm text-zinc-500 mt-1">Your resume matches your LinkedIn profile.</p>
                </div>
              )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={reset} className="flex-1">
                Start Over
              </Button>
              {hasSelections() && (
                <Button onClick={applyChanges} className="flex-1">
                  Apply Selected
                </Button>
              )}
            </div>
          </>
        )}

        {/* Step 3: Applying */}
        {step === "applying" && (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-zinc-400 animate-spin mb-4" />
            <p className="text-sm text-zinc-500">Applying changes to your resume...</p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium">Changes Applied!</h3>
            <p className="text-sm text-zinc-500 mt-1 mb-6">
              Your resume has been updated with the selected LinkedIn data.
            </p>
            <Button onClick={handleDone}>Done</Button>
          </div>
        )}
      </div>
    </SheetContent>
  );
}

function ComparisonSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left mb-2"
      >
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          {icon} {title}
        </h4>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
        )}
      </button>
      {expanded && <div className="space-y-2">{children}</div>}
    </div>
  );
}

function SelectableItem({
  selected,
  onToggle,
  children,
}: {
  selected: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full text-left rounded-lg p-3 border transition-colors ${
        selected
          ? "border-green-500 bg-green-50 dark:bg-green-950"
          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
            selected
              ? "bg-green-500 border-green-500 text-white"
              : "border-zinc-300 dark:border-zinc-600"
          }`}
        >
          {selected && <Check className="h-3 w-3" />}
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </button>
  );
}
