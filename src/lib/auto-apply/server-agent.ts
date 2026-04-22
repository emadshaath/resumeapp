import { getAnthropicClient, AI_MODEL } from "@/lib/claude/client";
import type Anthropic from "@anthropic-ai/sdk";

// Minimal structural types for the playwright-core APIs we use.
// This avoids requiring playwright-core as a TypeScript import at build time.
interface BrowserLike {
  contexts(): BrowserContextLike[];
  newContext(): Promise<BrowserContextLike>;
  close(): Promise<void>;
}
interface BrowserContextLike {
  newPage(): Promise<PageLike>;
}
interface PageLike {
  url(): string;
  title(): Promise<string>;
  goto(url: string, opts?: { waitUntil?: string; timeout?: number }): Promise<unknown>;
  evaluate<T>(fn: (() => T) | string): Promise<T>;
  fill(selector: string, value: string): Promise<void>;
  selectOption(selector: string, value: string | { label: string }): Promise<unknown>;
  click(selector: string): Promise<void>;
  setInputFiles(
    selector: string,
    files: { name: string; mimeType: string; buffer: Buffer }[]
  ): Promise<void>;
}

// Runs a headless browser session against a job application URL, driven by
// Claude via tool-use. Uses a remote browser (Browserbase/Browserless) rather
// than bundling Playwright with local browsers, so this works on Vercel.
//
// Required env:
//   BROWSERBASE_API_KEY  (preferred)
//   BROWSERBASE_PROJECT_ID
// OR
//   BROWSERLESS_URL      (fallback, e.g. wss://chrome.browserless.io)

export interface ServerAgentInput {
  jobUrl: string;
  profileFields: Record<string, unknown>;
  resumePdfUrl: string | null;
  aiAnswers: { question: string; answer: string }[];
  maxSteps?: number;
  timeoutMs?: number;
}

export interface ServerAgentResult {
  success: boolean;
  steps: number;
  durationMs: number;
  costCents: number;
  error: string | null;
  trail: string[];
}

const SYSTEM_PROMPT = `You are an expert job-application agent. Your task: open a job application page, fill it in using the candidate's profile data and drafted answers, and submit it.

Rules:
- Use ONLY the provided profile fields and drafted answers. Never invent information.
- If a required field has no matching data, set it to the best reasonable value or stop and report the issue.
- For file uploads (resume), call upload_resume.
- After the form is fully filled, call click_submit to submit.
- When done (or blocked), call finish with a short status.
- Prefer stable selectors: data-testid, name, id, aria-label. Avoid class-based selectors.
- Do not solve captchas. If one appears, call finish with blocked=true.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_page",
    description: "Returns the current page URL, title, and a simplified representation of visible inputs, buttons, selects, and labels.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "fill",
    description: "Fills a text input, textarea, or contenteditable. Triggers input/change events.",
    input_schema: {
      type: "object" as const,
      properties: {
        selector: { type: "string" },
        value: { type: "string" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "select",
    description: "Select an option in a <select> element by value or visible text.",
    input_schema: {
      type: "object" as const,
      properties: {
        selector: { type: "string" },
        value: { type: "string" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "click",
    description: "Click an element (e.g. a Next button, radio, checkbox).",
    input_schema: {
      type: "object" as const,
      properties: { selector: { type: "string" } },
      required: ["selector"],
    },
  },
  {
    name: "upload_resume",
    description: "Upload the candidate's resume PDF to a file input.",
    input_schema: {
      type: "object" as const,
      properties: { selector: { type: "string" } },
      required: ["selector"],
    },
  },
  {
    name: "click_submit",
    description: "Click the final Submit button for the application.",
    input_schema: {
      type: "object" as const,
      properties: { selector: { type: "string" } },
      required: ["selector"],
    },
  },
  {
    name: "finish",
    description: "End the session. Call with success=true if submitted, false if blocked.",
    input_schema: {
      type: "object" as const,
      properties: {
        success: { type: "boolean" },
        note: { type: "string" },
      },
      required: ["success"],
    },
  },
];

export async function runServerAgent(
  input: ServerAgentInput
): Promise<ServerAgentResult> {
  const started = Date.now();
  const maxSteps = input.maxSteps ?? 25;
  const timeoutMs = input.timeoutMs ?? 90_000;
  const trail: string[] = [];

  // Dynamic import guarded so the Next build doesn't require playwright-core at
  // bundle time. Install it when enabling server-side auto-apply in production.
  type PlaywrightCore = {
    chromium: { connectOverCDP(endpoint: string): Promise<BrowserLike> };
  };
  let playwright: PlaywrightCore | null = null;
  try {
    // Use indirect dynamic import so the bundler doesn't try to resolve it.
    const mod = await (Function(
      "return import('playwright-core')"
    )() as Promise<PlaywrightCore>);
    playwright = mod;
  } catch {
    return {
      success: false,
      steps: 0,
      durationMs: Date.now() - started,
      costCents: 0,
      error:
        "playwright-core is not installed. Run `npm install playwright-core` to enable server-side auto-apply.",
      trail,
    };
  }

  const wsEndpoint = getBrowserWsEndpoint();
  if (!wsEndpoint) {
    return {
      success: false,
      steps: 0,
      durationMs: Date.now() - started,
      costCents: 0,
      error:
        "No remote browser configured. Set BROWSERBASE_API_KEY or BROWSERLESS_URL.",
      trail,
    };
  }

  const browser = await playwright.chromium.connectOverCDP(wsEndpoint);
  const context = browser.contexts()[0] ?? (await browser.newContext());
  const page = await context.newPage();
  let success = false;
  let error: string | null = null;
  let steps = 0;

  try {
    await page.goto(input.jobUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    trail.push(`navigate ${input.jobUrl}`);

    const anthropic = getAnthropicClient();
    const userContext = buildUserContext(input);
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: userContext },
    ];

    while (steps < maxSteps) {
      if (Date.now() - started > timeoutMs) {
        error = "timeout";
        break;
      }
      steps++;

      const resp = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      });

      messages.push({ role: "assistant", content: resp.content });

      const toolUses = resp.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );
      if (toolUses.length === 0) break;

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      let finished = false;
      for (const tu of toolUses) {
        if (tu.name === "finish") {
          const finishInput = tu.input as { success?: boolean; note?: string };
          success = !!finishInput.success;
          if (!success && finishInput.note) error = finishInput.note;
          trail.push(`finish success=${success} ${finishInput.note ?? ""}`);
          finished = true;
          break;
        }
        try {
          const out = await runTool(page, tu.name, tu.input as Record<string, unknown>, input);
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: out.slice(0, 4000),
          });
          trail.push(`${tu.name} -> ok`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: `ERROR: ${msg}`,
            is_error: true,
          });
          trail.push(`${tu.name} -> error ${msg}`);
        }
      }
      if (finished) break;
      messages.push({ role: "user", content: toolResults });
    }

    if (steps >= maxSteps && !success) error = error ?? "max steps exceeded";
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  } finally {
    try {
      await browser.close();
    } catch {
      // ignore
    }
  }

  const durationMs = Date.now() - started;
  return {
    success,
    steps,
    durationMs,
    // Rough cost: Browserbase ~ $0.10/min session, Claude call ~ $0.01/step.
    // This is a placeholder; replace with actual billing data once instrumented.
    costCents: Math.ceil((durationMs / 60_000) * 10 + steps * 1),
    error,
    trail,
  };
}

function getBrowserWsEndpoint(): string | null {
  const bbKey = process.env.BROWSERBASE_API_KEY;
  const bbProject = process.env.BROWSERBASE_PROJECT_ID;
  if (bbKey && bbProject) {
    return `wss://connect.browserbase.com?apiKey=${encodeURIComponent(bbKey)}&projectId=${encodeURIComponent(bbProject)}`;
  }
  const bl = process.env.BROWSERLESS_URL;
  if (bl) return bl;
  return null;
}

function buildUserContext(input: ServerAgentInput): string {
  const fieldLines = Object.entries(input.profileFields)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `- ${k}: ${String(v)}`)
    .join("\n");
  const answerLines = input.aiAnswers
    .filter((a) => a.answer && a.answer !== "[needs user input]")
    .map((a) => `- Q: ${a.question}\n  A: ${a.answer}`)
    .join("\n");
  return `Apply to this job: ${input.jobUrl}

## Candidate profile fields
${fieldLines || "(none)"}

## Pre-drafted answers for likely screener questions
${answerLines || "(none)"}

Resume PDF is available via the upload_resume tool.

Start by calling get_page to inspect the form, then fill fields step-by-step, upload the resume, click through any multi-step pages, and click_submit when ready. Call finish when done.`;
}

async function runTool(
  page: PageLike,
  name: string,
  args: Record<string, unknown>,
  input: ServerAgentInput
): Promise<string> {
  switch (name) {
    case "get_page": {
      const url = page.url();
      const title = await page.title();
      const snapshot = await page.evaluate(
        (() => {
          const els = Array.from(
            document.querySelectorAll(
              "input, select, textarea, button, [role='button']"
            )
          ).slice(0, 60);
          return els.map((el) => {
            const e = el as HTMLElement & {
              name?: string;
              type?: string;
              value?: string;
            };
            const label = findLabel(e);
            return {
              tag: e.tagName.toLowerCase(),
              type: (e as HTMLInputElement).type || null,
              name: (e as HTMLInputElement).name || null,
              id: e.id || null,
              placeholder: (e as HTMLInputElement).placeholder || null,
              aria: e.getAttribute("aria-label"),
              label,
              text: (e.textContent || "").trim().slice(0, 80),
            };
          });

          function findLabel(el: HTMLElement): string | null {
            if (el.id) {
              const l = document.querySelector(`label[for="${el.id}"]`);
              if (l) return (l.textContent || "").trim().slice(0, 80);
            }
            const parent = el.closest("label");
            if (parent) return (parent.textContent || "").trim().slice(0, 80);
            return null;
          }
        }) as unknown as string
      );
      return JSON.stringify({ url, title, elements: snapshot });
    }
    case "fill": {
      const { selector, value } = args as { selector: string; value: string };
      await page.fill(selector, value);
      return `filled ${selector}`;
    }
    case "select": {
      const { selector, value } = args as { selector: string; value: string };
      await page.selectOption(selector, { label: value }).catch(async () => {
        await page.selectOption(selector, value);
      });
      return `selected ${selector}=${value}`;
    }
    case "click": {
      const { selector } = args as { selector: string };
      await page.click(selector);
      return `clicked ${selector}`;
    }
    case "upload_resume": {
      const { selector } = args as { selector: string };
      if (!input.resumePdfUrl) return "no resume available";
      const absUrl = input.resumePdfUrl.startsWith("http")
        ? input.resumePdfUrl
        : `${process.env.NEXT_PUBLIC_APP_URL ?? ""}${input.resumePdfUrl}`;
      const res = await fetch(absUrl);
      if (!res.ok) throw new Error(`resume fetch ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await page.setInputFiles(selector, [
        { name: "resume.pdf", mimeType: "application/pdf", buffer: buf },
      ]);
      return `uploaded resume to ${selector}`;
    }
    case "click_submit": {
      const { selector } = args as { selector: string };
      await page.click(selector);
      // Wait a moment for the form to process
      await new Promise((r) => setTimeout(r, 2000));
      return `clicked submit ${selector}`;
    }
    default:
      throw new Error(`unknown tool ${name}`);
  }
}
