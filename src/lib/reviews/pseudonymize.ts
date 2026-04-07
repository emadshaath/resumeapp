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

export interface FullResumeData {
  profile: Profile;
  sections: ResumeSection[];
  experiences: Experience[];
  educations: Education[];
  skills: Skill[];
  certifications: Certification[];
  projects: Project[];
  customSections: CustomSection[];
}

// Curated pools of realistic placeholder names
const PERSON_NAMES = [
  "Alex Morgan", "Jordan Lee", "Sam Rivera", "Casey Kim", "Taylor Chen",
  "Morgan Blake", "Riley Quinn", "Avery Patel", "Drew Nakamura", "Jamie Santos",
  "Quinn Foster", "Reese Campbell", "Dakota Liu", "Parker Hayes", "Sage Novak",
];

const COMPANY_NAMES = [
  "Northwind Solutions", "Cascade Dynamics", "Meridian Technologies",
  "Clearpoint Analytics", "Vantage Systems", "Evergreen Digital",
  "Pinnacle Software", "Ironbridge Labs", "Horizon Ventures",
  "Silverline Corp", "Blueshift Inc", "Apex Innovations",
  "Stratos Group", "Crestview Partners", "Nextera Solutions",
  "Luminary Tech", "Redwood Data", "Atlas Engineering",
  "Summit Cloud", "Beacon Industries", "Whitepeak Co",
  "Cobalt Platforms", "Verdant Networks", "Polaris Systems",
  "Keystone Digital", "Riverview Labs", "Ember Technologies",
  "Granite Works", "Sapphire AI", "Trailmark Software",
];

const INSTITUTION_NAMES = [
  "Westbrook University", "Lakeside College", "Ridgemont Institute of Technology",
  "Harborview University", "Pinecrest Academy", "Clearwater State University",
  "Ashford College", "Maplewood University", "Stonebridge Polytechnic",
  "Fairhaven Institute", "Cedarhill University", "Brightfield College",
  "Ironwood State", "Cliffside University", "Oakridge Academy",
];

const ORGANIZATION_NAMES = [
  "Global Certification Institute", "International Standards Board",
  "Professional Development Alliance", "National Accreditation Council",
  "Industry Excellence Foundation", "Certified Professionals Network",
  "Technical Standards Authority", "Knowledge Assessment Institute",
  "Credential Verification Board", "Skills Certification Council",
  "Quality Assurance Federation", "Professional Registry International",
];

/**
 * Creates a seeded pseudo-random number generator using a simple hash.
 * The same token always produces the same sequence of numbers.
 */
function createSeededRng(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Simple LCG (Linear Congruential Generator)
  let state = Math.abs(hash) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Shuffles an array using a seeded RNG (Fisher-Yates).
 * Returns a new array without modifying the original.
 */
function seededShuffle<T>(array: T[], rng: () => number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Creates a deterministic mapping from original names to pseudonymized names.
 * The same token always produces the same mapping, but different tokens
 * produce different mappings.
 */
function createNameMapping(
  originals: string[],
  pool: string[],
  token: string,
  poolPrefix: string
): Map<string, string> {
  const rng = createSeededRng(token + poolPrefix);
  const shuffled = seededShuffle(pool, rng);
  const mapping = new Map<string, string>();

  const unique = [...new Set(originals)];
  unique.forEach((name, i) => {
    mapping.set(name, shuffled[i % shuffled.length]);
  });

  return mapping;
}

/**
 * Pseudonymizes resume data based on the given options.
 * Returns a deep clone with pseudonymized fields.
 * The token is used as a seed so the same link always shows the same replacements.
 */
export function pseudonymizeResume(
  data: FullResumeData,
  options: PseudonymizeOptions,
  token: string
): FullResumeData {
  const cloned = structuredClone(data);
  const rng = createSeededRng(token + "person");

  // Pseudonymize name
  if (options.name) {
    const personIndex = Math.floor(rng() * PERSON_NAMES.length);
    const [firstName, ...lastParts] = PERSON_NAMES[personIndex].split(" ");
    cloned.profile.first_name = firstName;
    cloned.profile.last_name = lastParts.join(" ");
    cloned.profile.slug = "candidate";
    cloned.profile.avatar_url = null;
  }

  // Pseudonymize email
  if (options.email) {
    cloned.profile.email = null as unknown as string;
  }

  // Pseudonymize phone
  if (options.phone) {
    cloned.profile.phone_personal = null;
  }

  // Pseudonymize location
  if (options.location) {
    cloned.profile.location = null;
    cloned.experiences = cloned.experiences.map((exp) => ({
      ...exp,
      location: null,
    }));
    cloned.educations = cloned.educations.map((edu) => ({
      ...edu,
      location: null,
    }));
  }

  // Pseudonymize companies, institutions, and certifying organizations
  if (options.companies) {
    // Build mappings
    const companyOriginals = cloned.experiences.map((e) => e.company_name);
    const companyMap = createNameMapping(companyOriginals, COMPANY_NAMES, token, "company");

    const institutionOriginals = cloned.educations.map((e) => e.institution);
    const institutionMap = createNameMapping(institutionOriginals, INSTITUTION_NAMES, token, "institution");

    const orgOriginals = cloned.certifications
      .map((c) => c.issuing_org)
      .filter((o): o is string => o !== null);
    const orgMap = createNameMapping(orgOriginals, ORGANIZATION_NAMES, token, "org");

    // Apply mappings
    cloned.experiences = cloned.experiences.map((exp) => ({
      ...exp,
      company_name: companyMap.get(exp.company_name) || exp.company_name,
    }));

    cloned.educations = cloned.educations.map((edu) => ({
      ...edu,
      institution: institutionMap.get(edu.institution) || edu.institution,
    }));

    cloned.certifications = cloned.certifications.map((cert) => ({
      ...cert,
      issuing_org: cert.issuing_org
        ? orgMap.get(cert.issuing_org) || cert.issuing_org
        : null,
    }));
  }

  // Always strip sensitive profile fields from review view
  cloned.profile.stripe_customer_id = null;
  cloned.profile.stripe_subscription_id = null;
  cloned.profile.website_url = null;
  cloned.profile.linkedin_url = null;

  return cloned;
}
