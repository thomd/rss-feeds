import { loadConfig } from "./config";
import { fetchPage } from "./fetchPage";
import { cleanHtml } from "./cleanHtml";
import { callLLM, summarizeDescriptions } from "./callLLM";
import { extractWithSelectors } from "./extractSelectors";
import { validateItems } from "./validateItems";
import { generateRSS } from "./generateRSS";

async function main(): Promise<void> {
  console.log("=== RSS Feed Generator starting ===");

  const feeds = loadConfig("feeds.yaml");
  console.log(`Loaded ${feeds.length} feed(s) from feeds.yaml`);

  let successCount = 0;
  let failureCount = 0;

  for (const feed of feeds) {
    console.log(`\n--- Processing: ${feed.name} (${feed.url}) ---`);
    try {
      // Step 1: Fetch the webpage
      console.log(`[${feed.id}] Fetching page…`);
      const html = await fetchPage(feed.url);

      // Step 2: Extract items — via CSS selectors if defined, otherwise via LLM
      let rawItems;
      if (feed.selectors) {
        console.log(`[${feed.id}] Extracting with CSS selectors…`);
        rawItems = extractWithSelectors(html, feed);
      } else {
        // Clean HTML to reduce noise and token usage before sending to LLM
        console.log(`[${feed.id}] Cleaning HTML…`);
        const cleaned = cleanHtml(html, feed.url);

        console.log(`[${feed.id}] Calling LLM for extraction…`);
        rawItems = await callLLM(cleaned, feed.name, feed.prompt);
      }

      // Step 3: Validate extracted items
      const items = validateItems(rawItems).slice(0, feed.maxItems);

      // Step 4: For selector-based feeds, summarize descriptions via LLM
      if (feed.selectors && items.length > 0) {
        console.log(`[${feed.id}] Summarizing ${items.length} description(s) via LLM…`);
        const summaries = await summarizeDescriptions(items.map((i) => i.description));
        for (let i = 0; i < items.length; i++) {
          items[i].description = summaries[i] ?? items[i].description;
        }
      }
      if (items.length === 0) {
        console.warn(
          `[${feed.id}] WARNING: No valid items extracted — feed will be empty`
        );
      } else {
        console.log(`[${feed.id}] ${items.length} valid item(s):`);
        for (const [i, item] of items.entries()) {
          console.log(`  [${i + 1}] ${item.title}`);
          console.log(`       link:    ${item.link}`);
          if (item.pubDate) {
            console.log(`       pubDate: ${item.pubDate}`);
          }
          const preview = item.description.replace(/\s+/g, " ").slice(0, 120);
          console.log(`       desc:    ${preview}${item.description.length > 120 ? "…" : ""}`);
        }
      }

      // Step 4: Generate and write the RSS file
      const outputPath = generateRSS(feed, items);
      console.log(`[${feed.id}] ✓ Done → ${outputPath}`);
      successCount++;
    } catch (error) {
      console.error(
        `[${feed.id}] ✗ Failed:`,
        error instanceof Error ? error.message : error
      );
      failureCount++;
      // Continue processing remaining feeds
    }
  }

  console.log(
    `\n=== Finished: ${successCount} succeeded, ${failureCount} failed ===`
  );

  // Exit with non-zero code if any feed failed (useful for CI alerting)
  if (failureCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
