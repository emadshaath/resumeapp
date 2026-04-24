const DEFAULT_TIMEOUT_MS = 15_000;

export async function fetchJson<T>(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "rezm-ai/1.0 (+https://rezm.ai)",
          Accept: "application/json",
        },
      });
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${url}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      if (controller.signal.aborted) break;
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
  clearTimeout(timer);
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export function inferRemoteType(
  text: string | null | undefined
): "onsite" | "remote" | "hybrid" | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/\bhybrid\b/.test(t)) return "hybrid";
  if (/\b(remote|work.?from.?home|wfh|anywhere)\b/.test(t)) return "remote";
  if (/\b(on.?site|in.?office|onsite)\b/.test(t)) return "onsite";
  return null;
}

export function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
