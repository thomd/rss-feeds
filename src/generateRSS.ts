import * as fs from "fs";
import * as path from "path";
import RSS from "rss";
import { FeedConfig } from "./config";
import { FeedItem } from "./validateItems";

/**
 * Generate an RSS 2.0 feed file and write it to public/<feed-id>/rss.xml.
 */
export function generateRSS(
  feed: FeedConfig,
  items: FeedItem[],
  outputDir = "public"
): string {
  const feedInstance = new RSS({
    title: feed.name,
    description: `Automatically generated RSS feed for ${feed.name}`,
    feed_url: `${feed.url}`, // placeholder; GitHub Pages URL set post-deploy
    site_url: feed.url,
    generator: "rss-feeds / GitHub Models",
    pubDate: new Date(),
    ttl: 360, // matches the 6-hour refresh cycle
  });

  for (const item of items) {
    feedInstance.item({
      title: item.title,
      url: item.link,
      description: item.description,
      date: item.pubDate ? new Date(item.pubDate) : new Date(),
    });
  }

  const xml = feedInstance.xml({ indent: true });
  const feedDir = path.join(outputDir, feed.id);
  fs.mkdirSync(feedDir, { recursive: true });

  const outputPath = path.join(feedDir, "rss.xml");
  fs.writeFileSync(outputPath, xml, "utf-8");

  console.log(`[generateRSS] Wrote ${items.length} items → ${outputPath}`);
  return outputPath;
}
