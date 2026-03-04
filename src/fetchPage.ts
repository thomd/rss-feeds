import axios from "axios";

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2_000;

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch the HTML content of a URL with retry logic.
 */
export async function fetchPage(url: string): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get<string>(url, {
        timeout: TIMEOUT_MS,
        headers: {
          // Mimic a browser to avoid bot-detection blocks
          "User-Agent":
            "Mozilla/5.0 (compatible; RSSFeedGenerator/1.0; +https://github.com)",
          Accept: "text/html,application/xhtml+xml",
        },
        responseType: "text",
      });
      return response.data;
    } catch (error) {
      lastError = error;
      console.warn(
        `[fetchPage] Attempt ${attempt}/${MAX_RETRIES} failed for ${url}:`,
        error instanceof Error ? error.message : error
      );
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw new Error(
    `Failed to fetch ${url} after ${MAX_RETRIES} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
