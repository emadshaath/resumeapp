"use client";

import { useEffect, useState, useCallback, use } from "react";
import { PasswordGate } from "@/components/review/password-gate";
import { ReviewResumeView } from "@/components/review/review-resume-view";
import type { ReviewCommentData } from "@/components/review/review-comments-list";
import type { Profile, ResumeSection, Experience, Education, Skill, Certification, Project, CustomSection } from "@/types/database";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ReviewData {
  profile: Profile;
  sections: ResumeSection[];
  experiences: Experience[];
  educations: Education[];
  skills: Skill[];
  certifications: Certification[];
  projects: Project[];
  customSections: CustomSection[];
  comments: ReviewCommentData[];
}

export default function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [data, setData] = useState<ReviewData | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchReview = useCallback(async (pwd?: string) => {
    try {
      const headers: Record<string, string> = {};
      if (pwd) headers["x-review-password"] = pwd;

      const res = await fetch(`/api/reviews/${token}`, { headers });
      const json = await res.json();

      if (res.status === 401 && json.requiresPassword) {
        setNeedsPassword(true);
        if (pwd) setPasswordError("Incorrect password");
        setLoading(false);
        setPasswordLoading(false);
        return;
      }

      if (!res.ok) {
        setError(json.error || "Failed to load review");
        setLoading(false);
        setPasswordLoading(false);
        return;
      }

      setData(json as ReviewData);
      setNeedsPassword(false);
      setPasswordError("");
      setLoading(false);
      setPasswordLoading(false);
    } catch {
      setError("Failed to load review. Please try again.");
      setLoading(false);
      setPasswordLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  function handlePasswordSubmit(pwd: string) {
    setPasswordLoading(true);
    setPasswordError("");
    setPassword(pwd);
    fetchReview(pwd);
  }

  function handleNewComment(comment: ReviewCommentData) {
    setData((prev) => prev ? { ...prev, comments: [...prev.comments, comment] } : prev);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <div className="text-center space-y-4">
          <AlertTriangle className="mx-auto h-12 w-12 text-zinc-400" />
          <h1 className="text-xl font-semibold">{error}</h1>
          <p className="text-sm text-zinc-500">This link may have expired or been deactivated.</p>
        </div>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <PasswordGate
        onSubmit={handlePasswordSubmit}
        error={passwordError}
        loading={passwordLoading}
      />
    );
  }

  if (!data) return null;

  return (
    <ReviewResumeView
      profile={data.profile}
      sections={data.sections}
      experiences={data.experiences}
      educations={data.educations}
      skills={data.skills}
      certifications={data.certifications}
      projects={data.projects}
      customSections={data.customSections}
      comments={data.comments}
      token={token}
      password={password}
      onNewComment={handleNewComment}
    />
  );
}
