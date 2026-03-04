import * as cheerio from "cheerio";

/** Maximum character length of cleaned HTML sent to the LLM. */
const MAX_CHARS = 12_000;

/**
 * Remove noise elements and return cleaned HTML string.
 * Truncates to MAX_CHARS to stay within LLM token limits.
 */
export function cleanHtml(html: string, baseUrl: string): string {
  const $ = cheerio.load(html);

  // Remove elements that add noise but not content
  $(
    "script, style, noscript, iframe, svg, canvas, " +
      "nav, header, footer, aside, form, button, input, select, textarea, " +
      "[aria-hidden='true'], .cookie-banner, .ad, .advertisement"
  ).remove();

  // Remove HTML comments
  $("*")
    .contents()
    .filter(function () {
      return this.type === "comment";
    })
    .remove();

  // Resolve relative links to absolute URLs so the RSS feed is usable
  const parsedBase = new URL(baseUrl);
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (href && !href.startsWith("http") && !href.startsWith("mailto:")) {
      try {
        $(el).attr("href", new URL(href, parsedBase).toString());
      } catch {
        // Leave malformed hrefs as-is
      }
    }
  });

  // Extract the main content area if present, else fall back to body
  const mainContent =
    $("main, article, [role='main'], #content, .content, #main").first();
  const textSource = mainContent.length ? mainContent : $("body");

  const cleaned = textSource.html() ?? $("body").text();

  // Truncate to token-safe length
  if (cleaned.length > MAX_CHARS) {
    console.warn(
      `[cleanHtml] Content truncated from ${cleaned.length} to ${MAX_CHARS} chars`
    );
    return cleaned.slice(0, MAX_CHARS);
  }

  return cleaned;
}
