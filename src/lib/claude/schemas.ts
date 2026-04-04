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
