"use client";

import { useEffect, useState } from "react";
import { Briefcase, GraduationCap, Code, Award, MapPin, Globe, Star } from "lucide-react";

const experiences = [
  { company: "TechCorp", role: "Senior Engineer", years: "2022 - Present" },
  { company: "StartupIO", role: "Full Stack Developer", years: "2020 - 2022" },
  { company: "DigitalCo", role: "Frontend Developer", years: "2018 - 2020" },
];

const skills = ["React", "TypeScript", "Node.js", "Python", "AWS", "GraphQL", "Docker", "Figma"];

const sections = [
  { id: "header", delay: 0 },
  { id: "experience", delay: 400 },
  { id: "skills", delay: 800 },
  { id: "education", delay: 1200 },
  { id: "score", delay: 1600 },
];

export function HeroMockup() {
  const [visibleSections, setVisibleSections] = useState<string[]>([]);
  const [activeSkill, setActiveSkill] = useState(0);
  const [scoreValue, setScoreValue] = useState(0);

  // Stagger section reveals
  useEffect(() => {
    sections.forEach(({ id, delay }) => {
      const timer = setTimeout(() => {
        setVisibleSections((prev) => [...prev, id]);
      }, delay + 500); // +500ms initial delay
      return () => clearTimeout(timer);
    });
  }, []);

  // Animate skill highlight
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSkill((prev) => (prev + 1) % skills.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Animate score
  useEffect(() => {
    if (!visibleSections.includes("score")) return;
    let current = 0;
    const target = 92;
    const interval = setInterval(() => {
      current += 2;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      setScoreValue(current);
    }, 20);
    return () => clearInterval(interval);
  }, [visibleSections]);

  const isVisible = (id: string) => visibleSections.includes(id);

  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Glow effect behind card */}
      <div
        className="absolute -inset-4 rounded-3xl opacity-20 blur-2xl"
        style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-accent))" }}
      />

      {/* Main card */}
      <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <div className="ml-3 flex-1 h-5 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center px-2">
            <span className="text-[10px] text-zinc-400 font-mono">sarah-chen.rezm.ai</span>
          </div>
        </div>

        {/* Profile header */}
        <div
          className="p-5 text-white transition-all duration-700"
          style={{
            background: "linear-gradient(135deg, var(--hero-from), var(--hero-to))",
            opacity: isVisible("header") ? 1 : 0,
            transform: isVisible("header") ? "none" : "translateY(10px)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold backdrop-blur-sm">
              SC
            </div>
            <div>
              <h3 className="font-bold text-sm">Sarah Chen</h3>
              <p className="text-xs text-white/70">Senior Software Engineer</p>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/50">
                <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> San Francisco</span>
                <span className="flex items-center gap-0.5"><Globe className="h-2.5 w-2.5" /> sarahchen.dev</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content sections */}
        <div className="p-4 space-y-4">
          {/* Experience */}
          <div
            className="transition-all duration-700"
            style={{
              opacity: isVisible("experience") ? 1 : 0,
              transform: isVisible("experience") ? "none" : "translateY(12px)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Briefcase className="h-3.5 w-3.5 text-brand" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Experience</h4>
            </div>
            <div className="space-y-2">
              {experiences.map((exp, i) => (
                <div
                  key={exp.company}
                  className="flex items-center justify-between pl-3 border-l-2 transition-colors duration-500"
                  style={{
                    borderColor: i === 0 ? "var(--brand)" : undefined,
                  }}
                >
                  <div>
                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{exp.role}</p>
                    <p className="text-[10px] text-zinc-500">{exp.company}</p>
                  </div>
                  <span className="text-[10px] text-zinc-400">{exp.years}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div
            className="transition-all duration-700"
            style={{
              opacity: isVisible("skills") ? 1 : 0,
              transform: isVisible("skills") ? "none" : "translateY(12px)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Code className="h-3.5 w-3.5 text-brand" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Skills</h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill, i) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium transition-all duration-300"
                  style={{
                    backgroundColor: i === activeSkill ? "var(--brand)" : undefined,
                    color: i === activeSkill ? "var(--brand-foreground)" : undefined,
                  }}
                >
                  {i !== activeSkill && (
                    <span className="text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                      {skill}
                    </span>
                  )}
                  {i === activeSkill && skill}
                </span>
              ))}
            </div>
          </div>

          {/* Education */}
          <div
            className="transition-all duration-700"
            style={{
              opacity: isVisible("education") ? 1 : 0,
              transform: isVisible("education") ? "none" : "translateY(12px)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <GraduationCap className="h-3.5 w-3.5 text-brand" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Education</h4>
            </div>
            <div className="pl-3 border-l-2 border-zinc-200 dark:border-zinc-700">
              <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Stanford University</p>
              <p className="text-[10px] text-zinc-500">B.S. Computer Science, 2018</p>
            </div>
          </div>
        </div>

        {/* AI Score floating badge */}
        <div
          className="absolute top-14 -right-3 transition-all duration-700"
          style={{
            opacity: isVisible("score") ? 1 : 0,
            transform: isVisible("score") ? "none" : "scale(0.5) translateX(20px)",
          }}
        >
          <div className="rounded-xl bg-white dark:bg-zinc-800 shadow-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 flex items-center gap-2">
            <div className="relative h-9 w-9">
              <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-zinc-100 dark:text-zinc-700" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  strokeWidth="3" strokeLinecap="round"
                  className="text-green-500"
                  strokeDasharray={`${(scoreValue / 100) * 94.25} 94.25`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-green-600">{scoreValue}</span>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-zinc-700 dark:text-zinc-300">AI Score</p>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="h-2 w-2"
                    style={{
                      color: "var(--brand-accent)",
                      fill: star <= 4 ? "var(--brand-accent)" : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Views floating badge */}
        <div
          className="absolute bottom-20 -left-3 transition-all duration-700"
          style={{
            opacity: isVisible("experience") ? 1 : 0,
            transform: isVisible("experience") ? "none" : "scale(0.5) translateX(-20px)",
            transitionDelay: "200ms",
          }}
        >
          <div className="rounded-lg bg-white dark:bg-zinc-800 shadow-lg border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5 flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-full flex items-center justify-center text-brand-foreground" style={{ backgroundColor: "var(--brand)" }}>
              <BarChart className="h-3 w-3" />
            </div>
            <div>
              <p className="text-[9px] font-semibold text-zinc-700 dark:text-zinc-300">1,247 views</p>
              <p className="text-[8px] text-green-600">+23% this week</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BarChart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="12" width="4" height="8" rx="1" />
      <rect x="10" y="8" width="4" height="12" rx="1" />
      <rect x="17" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}
