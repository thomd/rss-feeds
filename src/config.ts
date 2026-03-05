import * as fs from "fs";
import * as yaml from "js-yaml";
import { z } from "zod";

const DescriptionSelectorSchema = z.union([
  z.string(), // plain CSS selector — no summarization
  z.object({
    selector: z.string(), // CSS selector for the description text
    prompt: z.string(),   // summarize via LLM using this prompt
  }),
]);

const SelectorsSchema = z.object({
  items: z.string(),
  title: z.string(),
  link: z.string(),
  description: DescriptionSelectorSchema,
  pubDate: z.string().optional(),
});

export type DescriptionSelectorConfig = z.infer<typeof DescriptionSelectorSchema>;

const FeedSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  prompt: z.string().optional(),
  selectors: SelectorsSchema.optional(),
  maxItems: z.number().int().positive().default(10),
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
