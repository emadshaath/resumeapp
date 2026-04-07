"use client";

import { Badge } from "@/components/ui/badge";
import { MapPin, Briefcase, GraduationCap, Wrench, Award, FolderOpen, ExternalLink } from "lucide-react";
import { ReviewCommentForm } from "./review-comment-form";
import { ReviewCommentsList, type ReviewCommentData } from "./review-comments-list";
import type { Profile, ResumeSection, Experience, Education, Skill, Certification, Project, CustomSection } from "@/types/database";
import { ensureAbsoluteUrl } from "@/lib/utils";

interface ReviewResumeViewProps {
  profile: Profile;
  sections: ResumeSection[];
  experiences: Experience[];
  educations: Education[];
  skills: Skill[];
  certifications: Certification[];
  projects: Project[];
  customSections: CustomSection[];
  comments: ReviewCommentData[];
  token: string;
  password?: string;
  onNewComment: (comment: ReviewCommentData) => void;
}

export function ReviewResumeView({
  profile,
  sections,
  experiences,
  educations,
  skills,
  certifications,
  projects,
  customSections,
  comments,
  token,
  password,
  onNewComment,
}: ReviewResumeViewProps) {
  const fullName = `${profile.first_name} ${profile.last_name}`.trim();

  function getCommentsForSection(sectionId: string | null): ReviewCommentData[] {
    return comments.filter((c) => c.section_id === sectionId);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-6 py-2 text-center">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          You are reviewing a pseudonymized resume. Leave feedback below each section.
        </p>
      </div>

      {/* Header */}
      <header className="bg-zinc-900 text-white">
        <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="h-20 w-20 rounded-full bg-zinc-700 flex items-center justify-center text-2xl font-bold text-white/90">
              {profile.first_name[0]}{(profile.last_name || "")[0] || ""}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{fullName}</h1>
              {profile.headline && (
                <p className="mt-2 text-zinc-400">{profile.headline}</p>
              )}
              {profile.location && (
                <div className="mt-3 flex justify-center sm:justify-start text-sm text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-10 md:py-14">
        <div className="space-y-10">
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
            const sectionComments = getCommentsForSection(section.id);

            return (
              <section key={section.id} className="scroll-mt-8">
                <h2 className="text-lg font-bold tracking-tight uppercase text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  {getSectionIcon(section.section_type)}
                  {section.title}
                </h2>

                {/* Summary / Custom */}
                {(section.section_type === "summary" || section.section_type === "custom") && (
                  <div className="space-y-3">
                    {sectionCustom.map((item) => (
                      <p key={item.id} className="text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </p>
                    ))}
                  </div>
                )}

                {/* Experience */}
                {section.section_type === "experience" && (
                  <div className="space-y-7">
                    {sectionExperiences.map((exp) => (
                      <div key={exp.id} className="relative pl-6 border-l-2 border-zinc-200 dark:border-zinc-700">
                        <div className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                          <div>
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{exp.position}</h3>
                            <p className="text-zinc-600 dark:text-zinc-400">
                              {exp.company_name}
                              {exp.location && <span className="text-zinc-400 dark:text-zinc-500"> &middot; {exp.location}</span>}
                            </p>
                          </div>
                          <span className="text-sm text-zinc-500 whitespace-nowrap">
                            {formatDate(exp.start_date)} &ndash; {exp.is_current ? "Present" : formatDate(exp.end_date)}
                          </span>
                        </div>
                        {exp.description && (
                          <p className="mt-2.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Education */}
                {section.section_type === "education" && (
                  <div className="space-y-6">
                    {sectionEducations.map((edu) => (
                      <div key={edu.id} className="relative pl-6 border-l-2 border-zinc-200 dark:border-zinc-700">
                        <div className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                          <div>
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{edu.institution}</h3>
                            <p className="text-zinc-600 dark:text-zinc-400">
                              {[edu.degree, edu.field_of_study].filter(Boolean).join(" in ")}
                              {edu.gpa && <span className="text-zinc-400 dark:text-zinc-500"> &middot; GPA: {edu.gpa}</span>}
                            </p>
                          </div>
                          {(edu.start_date || edu.end_date) && (
                            <span className="text-sm text-zinc-500 whitespace-nowrap">
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
                  <div className="space-y-4">
                    {(() => {
                      const categories = new Map<string, Skill[]>();
                      sectionSkills.forEach((skill) => {
                        const cat = skill.category || "General";
                        if (!categories.has(cat)) categories.set(cat, []);
                        categories.get(cat)!.push(skill);
                      });
                      return Array.from(categories.entries()).map(([category, categorySkills]) => (
                        <div key={category}>
                          {categories.size > 1 && (
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">{category}</h4>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {categorySkills.map((skill) => (
                              <Badge key={skill.id} variant="secondary" className="text-sm py-1 px-3">
                                {skill.name}
                                {skill.proficiency && (
                                  <span className="ml-1.5 text-zinc-400 font-normal text-xs">
                                    {skill.proficiency}
                                  </span>
                                )}
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
                  <div className="space-y-4">
                    {sectionCerts.map((cert) => (
                      <div key={cert.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                        <div>
                          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            {cert.name}
                            {cert.credential_url && (
                              <a href={ensureAbsoluteUrl(cert.credential_url)} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-600 transition-colors">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </h3>
                          {cert.issuing_org && (
                            <p className="text-sm text-zinc-500">{cert.issuing_org}</p>
                          )}
                        </div>
                        {cert.issue_date && (
                          <span className="text-sm text-zinc-500 whitespace-nowrap">{formatDate(cert.issue_date)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Projects */}
                {section.section_type === "projects" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {sectionProjects.map((project) => (
                      <div key={project.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          {project.name}
                          {project.url && (
                            <a href={ensureAbsoluteUrl(project.url)} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-600 transition-colors">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </h3>
                        {project.description && (
                          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            {project.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Section feedback area */}
                <div className="mt-4 pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                  <ReviewCommentsList comments={sectionComments} />
                  <ReviewCommentForm
                    token={token}
                    sectionId={section.id}
                    sectionType={section.section_type}
                    password={password}
                    onSubmitted={onNewComment}
                  />
                </div>
              </section>
            );
          })}

          {/* General Feedback */}
          <section className="scroll-mt-8">
            <h2 className="text-lg font-bold tracking-tight uppercase text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              General Feedback
            </h2>
            <p className="text-sm text-zinc-500 mb-4">
              Share your overall thoughts about this resume.
            </p>
            <ReviewCommentsList comments={getCommentsForSection(null)} />
            <ReviewCommentForm
              token={token}
              password={password}
              onSubmitted={onNewComment}
            />
          </section>
        </div>

        {/* Footer */}
        <footer className="text-center py-10 mt-8">
          <p className="text-sm text-zinc-400">
            Peer Review powered by{" "}
            <a
              href={process.env.NEXT_PUBLIC_APP_URL || "/"}
              className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              rezm.ai
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}

function getSectionIcon(type: string) {
  const className = "h-5 w-5 text-zinc-400";
  switch (type) {
    case "experience": return <Briefcase className={className} />;
    case "education": return <GraduationCap className={className} />;
    case "skills": return <Wrench className={className} />;
    case "certifications": return <Award className={className} />;
    case "projects": return <FolderOpen className={className} />;
    default: return null;
  }
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
