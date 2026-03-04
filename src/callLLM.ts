import OpenAI from "openai";
import { RawFeedItem } from "./validateItems";

const MAX_RETRIES = 3;
const MODEL = process.env.GITHUB_MODEL || "gpt-4o-mini";

/** Shared OpenAI client (lazy-initialised on first use). */
function getClient(): OpenAI {
  const apiKey = process.env.GITHUB_TOKEN;
  if (!apiKey) throw new Error("GITHUB_TOKEN environment variable is not set");
  return new OpenAI({ baseURL: "https://models.inference.ai.azure.com", apiKey });
}

const EXTRACT_SYSTEM_PROMPT = `You are an expert HTML content extractor that identifies RSS feed items from webpage HTML.

Your task:
1. Analyze the provided HTML content
2. Identify repeating content blocks that represent a list of items (e.g. news articles, releases, blog posts, announcements)
3. For each item, extract:
   - title: the headline or name of the item (string, required)
   - link: the URL of the item — use absolute URLs (string, required)
   - description: a brief summary or the first paragraph of the item (string, required)
   - pubDate: the publication date if present, in ISO 8601 or RFC 822 format (string, optional)

Output ONLY a valid JSON array (no markdown, no explanation, no code fences).
If no items are found, output an empty array: []

JSON schema:
[
  {
    "title": "string (required)",
    "link": "string (required, absolute URL)",
    "description": "string (required)",
    "pubDate": "string (optional, ISO8601 or RFC822)"
  }
]`;

const SUMMARIZE_SYSTEM_PROMPT = `You are a technical writer that summarizes text into exactly one concise sentence.
You will receive a JSON array of description strings.
Return a JSON array of the same length, where each entry is the original description summarized to one sentence.
Output ONLY a valid JSON array of strings (no markdown, no explanation, no code fences).`;

/**
 * Call the GitHub Models LLM to extract structured feed items from cleaned HTML.
 */
export async function callLLM(
  cleanedHtml: string,
  feedName: string,
  feedPrompt?: string
): Promise<RawFeedItem[]> {
  const client = getClient();

  const systemPrompt = feedPrompt
    ? `${EXTRACT_SYSTEM_PROMPT}\n\nAdditional instructions for this feed:\n${feedPrompt}`
    : EXTRACT_SYSTEM_PROMPT;

  const userPrompt = `Extract RSS feed items from the following HTML for a feed named "${feedName}".

HTML content:
${cleanedHtml}`;

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const content = response.choices[0]?.message?.content?.trim() ?? "";

      // Strip accidental markdown code fences if model ignores instructions
      const jsonText = content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsed: unknown = JSON.parse(jsonText);

      if (!Array.isArray(parsed)) {
        throw new Error("LLM response is not a JSON array");
      }

      console.log(
        `[callLLM] Extracted ${parsed.length} raw item(s) on attempt ${attempt}`
      );
      return parsed as RawFeedItem[];
    } catch (error) {
      lastError = error;
      console.warn(
        `[callLLM] Attempt ${attempt}/${MAX_RETRIES} failed:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  throw new Error(
    `LLM extraction failed after ${MAX_RETRIES} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

/**
 * Summarize an array of descriptions to one sentence each using the LLM.
 * All descriptions are batched into a single API call.
 * Falls back to the original descriptions if the LLM call fails.
 */
export async function summarizeDescriptions(
  descriptions: string[]
): Promise<string[]> {
  if (descriptions.length === 0) return [];

  const client = getClient();

  const userPrompt = JSON.stringify(descriptions);

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: SUMMARIZE_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      });

      const content = response.choices[0]?.message?.content?.trim() ?? "";

      const jsonText = content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsed: unknown = JSON.parse(jsonText);

      if (!Array.isArray(parsed) || parsed.length !== descriptions.length) {
        throw new Error(
          `Expected array of length ${descriptions.length}, got ${Array.isArray(parsed) ? parsed.length : typeof parsed}`
        );
      }

      console.log(
        `[summarizeDescriptions] Summarized ${parsed.length} description(s) on attempt ${attempt}`
      );
      return parsed as string[];
    } catch (error) {
      lastError = error;
      console.warn(
        `[summarizeDescriptions] Attempt ${attempt}/${MAX_RETRIES} failed:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  console.warn(
    `[summarizeDescriptions] Falling back to original descriptions after ${MAX_RETRIES} failed attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
  return descriptions;
}
