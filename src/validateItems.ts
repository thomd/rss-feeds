import { z } from "zod";
import * as cheerio from "cheerio";

/** Strip HTML tags and decode entities from a string. */
function stripHtml(value: string): string {
  return cheerio.load(value).text().trim();
}


export type RawFeedItem = Record<string, unknown>;

const FeedItemSchema = z.object({
  title: z.string().min(1),
  link: z.string().url(),
  description: z.string().min(1).transform(stripHtml),
  pubDate: z.string().nullish().transform((v) => v ?? undefined),
});

export type FeedItem = z.infer<typeof FeedItemSchema>;

/**
 * Validate an array of raw LLM-extracted items against the feed item schema.
 * Invalid items are logged and skipped rather than crashing the process.
 */
export function validateItems(raw: RawFeedItem[]): FeedItem[] {
  const valid: FeedItem[] = [];

  for (let i = 0; i < raw.length; i++) {
    const result = FeedItemSchema.safeParse(raw[i]);
    if (result.success) {
      valid.push(result.data);
    } else {
      console.warn(
        `[validateItems] Item ${i} failed validation (skipped):`,
        result.error.flatten().fieldErrors
      );
    }
  }

  return valid;
}
