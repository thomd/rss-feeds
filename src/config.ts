import * as fs from "fs";
import * as yaml from "js-yaml";
import { z } from "zod";

const SelectorsSchema = z.object({
  items: z.string(),       // CSS selector for the repeating item container
  title: z.string(),       // CSS selector (relative to item) for the title text
  link: z.string(),        // CSS selector (relative to item) for the link href
  description: z.string(), // CSS selector (relative to item) for the description text
  pubDate: z.string().optional(), // CSS selector (relative to item) for the date (optional)
});

const FeedSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  prompt: z.string().optional(),
  selectors: SelectorsSchema.optional(),
});

const ConfigSchema = z.object({
  feeds: z.array(FeedSchema).min(1),
});

export type SelectorsConfig = z.infer<typeof SelectorsSchema>;
export type FeedConfig = z.infer<typeof FeedSchema>;

/**
 * Load and validate feeds.yaml from the project root.
 */
export function loadConfig(filePath = "feeds.yaml"): FeedConfig[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = yaml.load(raw);
  const result = ConfigSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(`Invalid feeds.yaml:\n${result.error.message}`);
  }

  return result.data.feeds;
}
