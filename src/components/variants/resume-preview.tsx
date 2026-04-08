"use client";

import { Badge } from "@/components/ui/badge";
import { MarkdownText } from "@/components/ui/markdown-text";
import type { ResumeData } from "@/lib/pdf/types";
import type {
  Experience,
  Education,
  Skill,
  Certification,
  Project,
  CustomSection,
} from "@/types/database";
import {
  Briefcase,
  GraduationCap,
  Wrench,
  Award,
  FolderOpen,
  FileText,
  MapPin,
} from "lucide-react";

function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function getSectionIcon(type: string) {
  const className = "h-4 w-4";
  switch (type) {
    case "experience":
      return <Briefcase className={className} />;
    case "education":
      return <GraduationCap className={className} />;
    case "skills":
      return <Wrench className={className} />;
    case "certifications":
      return <Award className={className} />;
    case "projects":
      return <FolderOpen className={className} />;
    default:
      return <FileText className={className} />;
  }
}

export function ResumePreview({ data }: { data: ResumeData }) {
  const {
    profile,
    sections,
    experiences,
    educations,
    skills,
    certifications,
    projects,
    customSections,
  } = data;

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {profile.first_name} {profile.last_name}
        </h2>
        {profile.headline && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            {profile.headline}
          </p>
        )}
        {profile.location && (
          <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
            <MapPin className="h-3 w-3" />
            {profile.location}
          </p>
        )}
      </div>

      {/* Sections */}
      {sections.map((section) => {
        const sectionExperiences = experiences
          .filter((e: Experience) => e.section_id === section.id)
          .sort((a: Experience, b: Experience) => {
            if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
            return (b.start_date || "").localeCompare(a.start_date || "");
          });
        const sectionEducations = educations
          .filter((e: Education) => e.section_id === section.id)
          .sort((a: Education, b: Education) => {
            if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
            return (b.start_date || "").localeCompare(a.start_date || "");
          });
        const sectionSkills = skills.filter(
          (s: Skill) => s.section_id === section.id
        );
        const sectionCerts = certifications.filter(
          (c: Certification) => c.section_id === section.id
        );
        const sectionProjects = projects.filter(
          (p: Project) => p.section_id === section.id
        );
        const sectionCustom = customSections.filter(
          (c: CustomSection) => c.section_id === section.id
        );

        return (
          <section key={section.id}>
            <h3 className="text-sm font-bold tracking-tight uppercase text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              {getSectionIcon(section.section_type)}
              {section.title}
            </h3>

            {/* Summary / Custom */}
            {(section.section_type === "summary" ||
              section.section_type === "custom") && (
              <div className="space-y-2">
                {sectionCustom.map((item: CustomSection) => (
                  <p
                    key={item.id}
                    className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap"
                  >
                    {item.content}
                  </p>
                ))}
              </div>
            )}

            {/* Experience */}
            {section.section_type === "experience" && (
              <div className="space-y-5">
                {sectionExperiences.map((exp: Experience) => (
                  <div
                    key={exp.id}
                    className="relative pl-5 border-l-2 border-zinc-200 dark:border-zinc-700"
                  >
                    <div className="absolute -left-[6px] top-1.5 h-2.5 w-2.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-0.5">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {exp.position}
                        </h4>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          {exp.company_name}
                          {exp.location && (
                            <span className="text-zinc-400 dark:text-zinc-500">
                              {" "}
                              &middot; {exp.location}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="text-xs text-zinc-500 whitespace-nowrap">
                        {formatDate(exp.start_date)} &ndash;{" "}
                        {exp.is_current
                          ? "Present"
                          : formatDate(exp.end_date)}
                      </span>
                    </div>
                    {exp.description && (
                      <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                        <MarkdownText>{exp.description}</MarkdownText>
                      </p>
                    )}
                    {exp.highlights && exp.highlights.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {exp.highlights.map((h: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-zinc-400 mt-0.5 select-none">
                              •
                            </span>
                            <span>
                              <MarkdownText>{h}</MarkdownText>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Education */}
            {section.section_type === "education" && (
              <div className="space-y-4">
                {sectionEducations.map((edu: Education) => (
                  <div
                    key={edu.id}
                    className="relative pl-5 border-l-2 border-zinc-200 dark:border-zinc-700"
                  >
                    <div className="absolute -left-[6px] top-1.5 h-2.5 w-2.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-0.5">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {edu.institution}
                        </h4>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          {[edu.degree, edu.field_of_study]
                            .filter(Boolean)
                            .join(" in ")}
                          {edu.gpa && (
                            <span className="text-zinc-400 dark:text-zinc-500">
                              {" "}
                              &middot; GPA: {edu.gpa}
                            </span>
                          )}
                        </p>
                      </div>
                      {(edu.start_date || edu.end_date) && (
                        <span className="text-xs text-zinc-500 whitespace-nowrap">
                          {formatDate(edu.start_date)} &ndash;{" "}
                          {edu.is_current
                            ? "Present"
                            : formatDate(edu.end_date)}
                        </span>
                      )}
                    </div>
                    {edu.description && (
                      <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                        {edu.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Skills */}
            {section.section_type === "skills" && (
              <div className="space-y-3">
                {(() => {
                  const categories = new Map<string, Skill[]>();
                  sectionSkills.forEach((skill: Skill) => {
                    const cat = skill.category || "General";
                    if (!categories.has(cat)) categories.set(cat, []);
                    categories.get(cat)!.push(skill);
                  });
                  return Array.from(categories.entries()).map(
                    ([category, categorySkills]) => (
                      <div key={category}>
                        {categories.size > 1 && (
                          <p className="text-xs font-medium text-zinc-500 mb-1.5">
                            {category}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {categorySkills.map((skill: Skill) => (
                            <Badge
                              key={skill.id}
                              variant="secondary"
                              className="text-xs py-0.5 px-2"
                            >
                              {skill.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )
                  );
                })()}
              </div>
            )}

            {/* Certifications */}
            {section.section_type === "certifications" && (
              <div className="space-y-3">
                {sectionCerts.map((cert: Certification) => (
                  <div key={cert.id} className="flex items-start gap-3">
                    <Award className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {cert.name}
                      </p>
                      {cert.issuing_org && (
                        <p className="text-xs text-zinc-500">
                          {cert.issuing_org}
                        </p>
                      )}
                      {cert.issue_date && (
                        <p className="text-xs text-zinc-400">
                          Issued {formatDate(cert.issue_date)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Projects */}
            {section.section_type === "projects" && (
              <div className="space-y-4">
                {sectionProjects.map((project: Project) => (
                  <div key={project.id}>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {project.name}
                    </h4>
                    {project.description && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                        {project.description}
                      </p>
                    )}
                    {project.technologies && project.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {project.technologies.map((tech: string) => (
                          <Badge
                            key={tech}
                            variant="outline"
                            className="text-[10px] py-0 px-1.5"
                          >
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {project.highlights && project.highlights.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                        {project.highlights.map((h: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-zinc-400 mt-0.5 select-none">
                              •
                            </span>
                            <span>
                              <MarkdownText>{h}</MarkdownText>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
