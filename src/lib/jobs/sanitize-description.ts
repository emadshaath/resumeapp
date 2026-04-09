import sanitizeHtml from "sanitize-html";

const MAX_LENGTH = 50_000;

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr",
  "ul", "ol", "li",
  "strong", "b", "em", "i", "u", "s",
  "a",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td",
  "span", "div",
  "blockquote", "pre", "code",
];

/**
 * Sanitize raw HTML from a job posting. Preserves structural formatting
 * (headings, lists, bold/italic, tables) while stripping scripts, styles,
 * event handlers, and other dangerous elements.
 */
export function sanitizeJobDescription(rawHtml: string): string {
  const truncated = rawHtml.slice(0, MAX_LENGTH);

  return sanitizeHtml(truncated, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
    },
    disallowedTagsMode: "discard",
  });
}

/**
 * Convert plain text (from manual entry) into basic HTML paragraphs.
 * Blank lines become paragraph breaks; single newlines become <br>.
 */
export function plainTextToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}
