import * as cheerio from "cheerio";
import { FeedConfig } from "./config";
import { RawFeedItem } from "./validateItems";

/**
 * Extract feed items using explicit CSS selectors defined in feeds.yaml.
 * Used as an alternative to LLM extraction when the page structure is known.
 */
export function extractWithSelectors(
  html: string,
  feed: FeedConfig
): RawFeedItem[] {
  const { selectors, url } = feed;
  if (!selectors) return [];

  const $ = cheerio.load(html);
  const results: RawFeedItem[] = [];

  $(selectors.items).each((_, el) => {
    const item = $(el);

    const title = item.find(selectors.title).first().text().trim();

    // Extract href: from the matched element's own href, or the first <a> within it
    const linkEl = item.find(selectors.link).first();
    let link = linkEl.attr("href") ?? linkEl.find("a").first().attr("href") ?? "";
    if (link && !link.startsWith("http") && !link.startsWith("mailto:")) {
      try {
        link = new URL(link, url).toString();
      } catch {
        // leave malformed href as-is
      }
    }

    const description = item.find(selectors.description).first().text().trim();

    let pubDate: string | null = null;
    if (selectors.pubDate) {
      const dateEl = item.find(selectors.pubDate).first();
      // Prefer machine-readable datetime attribute (e.g. <time datetime="...">)
      pubDate = (dateEl.attr("datetime") ?? dateEl.text().trim()) || null;
    }

    results.push({ title, link, description, pubDate });
  });

  console.log(
    `[extractSelectors] Extracted ${results.length} item(s) using CSS selectors`
  );
  return results;
}
