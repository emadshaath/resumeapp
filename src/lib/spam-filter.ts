// Basic spam scoring for contact form submissions
// Returns a score from 0 (clean) to 1 (definitely spam)

const SPAM_PATTERNS = [
  /\b(viagra|cialis|casino|lottery|winner|click here|buy now|act now)\b/i,
  /\b(crypto|bitcoin|investment opportunity|guaranteed return)\b/i,
  /(http[s]?:\/\/){3,}/i, // Multiple URLs
  /(.)\1{10,}/, // Repeated characters
  /[A-Z]{20,}/, // Excessive caps
];

const SUSPICIOUS_EMAIL_DOMAINS = [
  "tempmail.com",
  "throwaway.email",
  "guerrillamail.com",
  "mailinator.com",
  "yopmail.com",
  "sharklasers.com",
];

export function calculateSpamScore(params: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}): number {
  let score = 0;

  const fullText = `${params.name} ${params.subject || ""} ${params.message}`;

  // Check spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(fullText)) {
      score += 0.3;
    }
  }

  // Check suspicious email domains
  const emailDomain = params.email.split("@")[1]?.toLowerCase();
  if (emailDomain && SUSPICIOUS_EMAIL_DOMAINS.includes(emailDomain)) {
    score += 0.4;
  }

  // Very short messages are suspicious
  if (params.message.length < 10) {
    score += 0.2;
  }

  // Name that looks like gibberish
  if (/^[^aeiou]{5,}$/i.test(params.name)) {
    score += 0.2;
  }

  // Excessive links in message
  const linkCount = (params.message.match(/https?:\/\//g) || []).length;
  if (linkCount > 3) {
    score += 0.3;
  }

  return Math.min(score, 1);
}
