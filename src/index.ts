import { loadConfig } from "./config";
import { fetchPage } from "./fetchPage";
import { cleanHtml } from "./cleanHtml";
import { callLLM } from "./callLLM";
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

      // Step 2: Clean HTML to reduce noise and token usage
      console.log(`[${feed.id}] Cleaning HTML…`);
      const cleaned = cleanHtml(html, feed.url);

      // Step 3: Call the LLM for structured extraction
      console.log(`[${feed.id}] Calling LLM for extraction…`);
      const rawItems = await callLLM(cleaned, feed.name, feed.prompt);

      // Step 4: Validate LLM output
      const items = validateItems(rawItems);
      if (items.length === 0) {
        console.warn(
          `[${feed.id}] WARNING: No valid items extracted — feed will be empty`
        );
      }

      // Step 5: Generate and write the RSS file
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
