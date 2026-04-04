export type Tier = "free" | "pro" | "premium";
export type SectionType =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "certifications"
  | "projects"
  | "custom";
export type Proficiency = "beginner" | "intermediate" | "advanced" | "expert";

export interface Profile {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
  headline: string | null;
  email: string;
  avatar_url: string | null;
  location: string | null;
  website_url: string | null;
  phone_personal: string | null;
  tier: Tier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResumeSection {
  id: string;
  profile_id: string;
  section_type: SectionType;
  title: string;
  display_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface Experience {
  id: string;
  section_id: string;
  profile_id: string;
  company_name: string;
  position: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  highlights: string[];
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Education {
  id: string;
  section_id: string;
  profile_id: string;
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  gpa: string | null;
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  section_id: string;
  profile_id: string;
  name: string;
  proficiency: Proficiency | null;
  category: string | null;
  display_order: number;
  created_at: string;
}

export interface Certification {
  id: string;
  section_id: string;
  profile_id: string;
  name: string;
  issuing_org: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  credential_url: string | null;
  display_order: number;
  created_at: string;
}

export interface Project {
  id: string;
  section_id: string;
  profile_id: string;
  name: string;
  description: string | null;
  url: string | null;
  start_date: string | null;
  end_date: string | null;
  highlights: string[];
  technologies: string[];
  display_order: number;
  created_at: string;
}

export interface CustomSection {
  id: string;
  section_id: string;
  profile_id: string;
  content: string | null;
  display_order: number;
  created_at: string;
}

export interface ContactSubmission {
  id: string;
  profile_id: string;
  sender_name: string;
  sender_email: string;
  subject: string | null;
  message: string;
  is_read: boolean;
  is_spam: boolean;
  created_at: string;
}

export interface PageView {
  id: string;
  profile_id: string;
  visitor_id: string | null;
  path: string;
  referrer: string | null;
  country: string | null;
  device_type: string | null;
  browser: string | null;
  viewed_at: string;
}

export interface AIReview {
  id: string;
  profile_id: string;
  review_type: "full" | "section";
  overall_score: number | null;
  ats_score: number | null;
  recommendations: Record<string, unknown>;
  model_used: string | null;
  tokens_used: number | null;
  created_at: string;
}

export interface PlatformPhone {
  id: string;
  profile_id: string;
  phone_number: string;
  twilio_sid: string;
  friendly_name: string | null;
  routing_mode: "forward" | "voicemail" | "both";
  forward_to: string | null;
  custom_greeting_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VoicemailRecord {
  id: string;
  profile_id: string;
  phone_id: string;
  caller_number: string;
  caller_city: string | null;
  caller_state: string | null;
  caller_country: string | null;
  call_sid: string;
  recording_url: string | null;
  recording_sid: string | null;
  recording_duration: number | null;
  transcription: string | null;
  transcription_status: "pending" | "completed" | "failed";
  is_read: boolean;
  is_spam: boolean;
  created_at: string;
}

export interface ProfileSnapshot {
  id: string;
  profile_id: string;
  label: string;
  snapshot_type: "manual" | "auto_linkedin" | "auto_job_optimizer" | "auto_variant" | "auto_restore";
  snapshot_data: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SeoSettings {
  id: string;
  profile_id: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  custom_keywords: string[] | null;
  created_at: string;
  updated_at: string;
}
