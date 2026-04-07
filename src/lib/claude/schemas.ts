export interface SectionReview {
  section_name: string;
  section_type: string;
  score: number;
  feedback: string;
  recommendations: string[];
}

export interface FullReviewResult {
  overall_score: number;
  ats_score: number;
  summary: string;
  strengths: string[];
  sections: SectionReview[];
  ats_issues: string[];
  quick_wins: string[];
  missing_sections: string[];
}

export interface SuggestionItem {
  type: "improve" | "add" | "rewrite" | "remove";
  text: string;
  example?: string;
}

export interface SectionSuggestions {
  suggestions: SuggestionItem[];
}

export interface ApplyRecommendationResult {
  updates: {
    id: string;
    fields: Record<string, unknown>;
  }[];
  inserts: Record<string, unknown>[];
  explanation: string;
}

export interface LinkedInComparisonResult {
  parsed_linkedin: {
    headline: string | null;
    location: string | null;
    summary: string | null;
    experiences: {
      company_name: string;
      position: string;
      location: string | null;
      start_date: string | null;
      end_date: string | null;
      is_current: boolean;
      description: string | null;
      highlights: string[];
    }[];
    educations: {
      institution: string;
      degree: string | null;
      field_of_study: string | null;
      start_date: string | null;
      end_date: string | null;
      description: string | null;
    }[];
    skills: { name: string; category: string | null }[];
    certifications: {
      name: string;
      issuing_org: string | null;
      issue_date: string | null;
    }[];
  };
  comparison: {
    profile_differences: {
      field: string;
      current_value: string | null;
      linkedin_value: string;
      recommendation: string;
    }[];
    new_experiences: {
      company_name: string;
      position: string;
      reason: string;
    }[];
    updated_experiences: {
      company_name: string;
      position: string;
      differences: string;
      recommendation: string;
    }[];
    new_educations: {
      institution: string;
      degree: string | null;
      reason: string;
    }[];
    new_skills: { name: string; category: string | null }[];
    new_certifications: { name: string; issuing_org: string | null }[];
    missing_from_linkedin: string[];
  };
  summary: string;
}
